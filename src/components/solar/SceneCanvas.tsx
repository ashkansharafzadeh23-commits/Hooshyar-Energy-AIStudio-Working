import React, { Suspense, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Sky, Stars, GizmoHelper, GizmoViewport } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BuildingModel } from './BuildingModel';
import { PanelPlacementTool } from './PanelPlacementTool';
import { PanelAsset } from './PanelAsset';
import { EnvironmentScenery } from './EnvironmentScenery';
import { SunPathArc } from './SunPathArc';
import { usePlacementStore } from '../../store/usePlacementStore';
import { getSolarState } from '../../utils/solarCalculations';
import * as THREE from 'three';

export type CameraPreset = '3d' | 'top' | 'south' | 'front' | 'side' | 'reset';

// =========================================================================
// FIT CAMERA TO BOUNDS (Dynamic Aspect-Ratio Adaptive Framing)
// Accurately bounds building, roof, and installed PV array to occupy:
// - 55% to 70% of viewport width
// - 45% to 65% of viewport height
// On both compact mobile viewports (aspect 4:3 / 1.15:1) and desktop.
// =========================================================================
export function fitCameraToBuilding(
  buildingType: string,
  roofConfig: { type: string; tilt: number },
  aspect: number,
  preset: CameraPreset = '3d',
  fov: number = 42,
  panels: Array<{ position: [number, number, number] }> = []
): { position: THREE.Vector3; target: THREE.Vector3 } {
  // 1. Determine building physical base geometry
  let width = 14;
  let depth = 18;
  let wallH = 5.5;

  if (buildingType === 'factory') {
    width = 36;
    depth = 44;
    wallH = 9.0;
  } else if (buildingType === 'warehouse') {
    width = 28;
    depth = 36;
    wallH = 7.5;
  } else if (buildingType === 'farm') {
    width = 18;
    depth = 26;
    wallH = 6.0;
  }

  const tiltRad = THREE.MathUtils.degToRad(roofConfig.type === 'flat' ? 0 : roofConfig.tilt);
  const roofApex = roofConfig.type === 'flat' 
    ? 0.7 
    : (depth / 4) * Math.sin(tiltRad);
  const totalH = wallH + roofApex;

  // 2. Compute true physical bounding box (Building + Roof + Installed PV Array)
  const bbox = new THREE.Box3(
    new THREE.Vector3(-width / 2, 0, -depth / 2),
    new THREE.Vector3(width / 2, totalH, depth / 2)
  );

  // Expand bounds to include any placed solar panels
  if (panels && panels.length > 0) {
    for (const p of panels) {
      bbox.expandByPoint(new THREE.Vector3(p.position[0], p.position[1], p.position[2]));
    }
  }

  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Vertical & Horizontal FOV half-angles
  const fovVRad = (fov / 2) * (Math.PI / 180);
  const tanV = Math.tan(fovVRad);
  const safeAspect = Math.max(0.4, aspect);
  const tanH = tanV * safeAspect;

  // Target occupancy: 64% width, 52% height (ensures building is vertically centered with zero lower void)
  const targetOccW = 0.64;
  const targetOccH = 0.52;

  // PRESET: TOP (2D Plan View)
  if (preset === 'top') {
    const dH = (size.x / 2) / (tanH * targetOccW);
    const dV = (size.z / 2) / (tanV * targetOccH);
    const dist = Math.max(dH, dV);
    return {
      position: new THREE.Vector3(center.x, totalH + dist, center.z + 0.001),
      target: new THREE.Vector3(center.x, totalH, center.z)
    };
  }

  // PRESET: SOUTH (Facing South Roof Slope)
  if (preset === 'south') {
    const targetY = center.y + 0.2;
    const dH = (size.x / 2) / (tanH * targetOccW);
    const dV = (size.y / 2) / (tanV * targetOccH);
    const dist = Math.max(dH, dV);
    const dir = new THREE.Vector3(0, 0.32, 0.94).normalize();
    const southTarget = new THREE.Vector3(center.x, targetY, center.z);
    return {
      position: southTarget.clone().add(dir.multiplyScalar(dist)),
      target: southTarget
    };
  }

  // PRESET: FRONT (South Elevation)
  if (preset === 'front') {
    const dH = (size.x / 2) / (tanH * targetOccW);
    const dV = (size.y / 2) / (tanV * targetOccH);
    const dist = Math.max(dH, dV);
    const dir = new THREE.Vector3(0, 0.12, 0.99).normalize();
    const frontTarget = new THREE.Vector3(center.x, center.y, center.z);
    return {
      position: frontTarget.clone().add(dir.multiplyScalar(dist)),
      target: frontTarget
    };
  }

  // PRESET: SIDE (East Elevation)
  if (preset === 'side') {
    const dH = (size.z / 2) / (tanH * targetOccW);
    const dV = (size.y / 2) / (tanV * targetOccH);
    const dist = Math.max(dH, dV);
    const dir = new THREE.Vector3(0.99, 0.12, 0).normalize();
    const sideTarget = new THREE.Vector3(center.x, center.y, center.z);
    return {
      position: sideTarget.clone().add(dir.multiplyScalar(dist)),
      target: sideTarget
    };
  }

  // DEFAULT: ISOMETRIC 3D CAD VIEW
  // Balanced South-South-East perspective (azimuth 28° from South, elevation 22°)
  // Ensures South roof faces camera cleanly while centering the building vertically.
  const dir = new THREE.Vector3(0.48, 0.38, 0.86).normalize();

  // Projected width and height in camera plane
  const projW = size.x * 0.88 + size.z * 0.48;
  const projH = size.y * 0.92 + size.z * 0.35;

  const dH = (projW / 2) / (tanH * targetOccW);
  const dV = (projH / 2) / (tanV * targetOccH);
  const dist = Math.max(dH, dV);

  // Target placed at true geometric vertical center of structure (prevents empty lower void)
  const balancedTarget = new THREE.Vector3(center.x, center.y * 0.95 + 0.15, center.z);

  return {
    position: balancedTarget.clone().add(dir.multiplyScalar(dist)),
    target: balancedTarget
  };
}

interface CameraControllerProps {
  preset: CameraPreset | null;
  onPresetHandled: () => void;
}

export function CameraController({ preset, onPresetHandled }: CameraControllerProps) {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const targetLook = useRef<THREE.Vector3 | null>(null);
  const isAnimating = useRef(false);

  const { buildingType, roofConfig, panels } = usePlacementStore();

  const applyFraming = useCallback((p: CameraPreset = '3d') => {
    const aspect = size.width / Math.max(1, size.height);
    const framing = fitCameraToBuilding(buildingType, roofConfig, aspect, p, 42, panels);
    targetPos.current = framing.position;
    targetLook.current = framing.target;
    isAnimating.current = true;
  }, [buildingType, roofConfig, size.width, size.height, panels]);

  // Re-fit camera whenever preset is requested
  useEffect(() => {
    if (!preset) return;
    applyFraming(preset === 'reset' ? '3d' : preset);
    onPresetHandled();
  }, [preset, applyFraming, onPresetHandled]);

  // Re-fit camera automatically when building type or roof type changes
  useEffect(() => {
    applyFraming('3d');
  }, [buildingType, roofConfig.type, applyFraming]);

  useFrame((_, delta) => {
    if (isAnimating.current && targetPos.current && targetLook.current && controlsRef.current) {
      camera.position.lerp(targetPos.current, Math.min(1, delta * 7));
      controlsRef.current.target.lerp(targetLook.current, Math.min(1, delta * 7));
      controlsRef.current.update();

      if (camera.position.distanceTo(targetPos.current) < 0.12) {
        camera.position.copy(targetPos.current);
        controlsRef.current.target.copy(targetLook.current);
        controlsRef.current.update();
        isAnimating.current = false;
        targetPos.current = null;
        targetLook.current = null;
      }
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      target={[0, 4, 0]} 
      maxPolarAngle={Math.PI / 2 - 0.02} 
      minDistance={4} 
      maxDistance={160} 
      enableDamping={true}
      dampingFactor={0.06}
    />
  );
}

interface SceneCanvasProps {
  cameraPreset?: CameraPreset | null;
  onPresetHandled?: () => void;
  showDebugGizmo?: boolean;
}

export function SceneCanvas({ 
  cameraPreset = null, 
  onPresetHandled = () => {},
  showDebugGizmo = false 
}: SceneCanvasProps) {
  const { panels, timeOfDay, buildingType } = usePlacementStore();

  const radius = useMemo(() => {
    switch (buildingType) {
      case 'factory': return 75;
      case 'warehouse': return 65;
      case 'farm': return 50;
      case 'house': default: return 45;
    }
  }, [buildingType]);

  // Shared Canonical Solar State (Synchronized with SunPathArc)
  const solar = useMemo(() => getSolarState(timeOfDay, radius), [timeOfDay, radius]);
  const { sunPosition, sunColor, ambientColor, lightIntensity, isNight } = solar;

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      <Canvas 
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]} 
        camera={{ position: [18, 14, 22], fov: 42, near: 0.1, far: 3000 }} 
        gl={{ 
          alpha: false,
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping, 
          toneMappingExposure: 1.05, 
          preserveDrawingBuffer: true 
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={[isNight ? '#0b1120' : '#f1f5f9']} />
        <Suspense fallback={null}>
          {/* Natural Hemisphere Ambient Light (Provides clear architectural visibility even at night) */}
          <hemisphereLight 
            intensity={isNight ? 0.58 : 0.5} 
            color={isNight ? "#38bdf8" : ambientColor} 
            groundColor={isNight ? "#0f172a" : "#475569"} 
          />
          
          {/* Directional Sunlight with Soft PCF Shadows (Dynamically driven by shared solar state) */}
          <directionalLight 
            position={sunPosition} 
            castShadow 
            intensity={lightIntensity} 
            color={sunColor}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0003}
          >
            <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 0.5, 500]} />
          </directionalLight>

          {/* Night Cool Moonlight Fill (Ensures building, roof facets & solar panels remain clearly legible) */}
          {isNight && (
            <directionalLight 
              position={[-20, 25, 20]} 
              intensity={0.32} 
              color="#93c5fd" 
            />
          )}

          {/* Daylight Sky Dome */}
          <Sky 
            sunPosition={sunPosition} 
            turbidity={((timeOfDay >= 5.25 && timeOfDay < 7.5) || (timeOfDay >= 16.5 && timeOfDay <= 18.75)) ? 6 : (isNight ? 1 : 0.4)} 
            rayleigh={isNight ? 0.1 : 0.65} 
            mieCoefficient={isNight ? 0.001 : 0.005} 
            mieDirectionalG={0.8}
            distance={3000} 
          />
          {isNight && <Stars radius={80} depth={40} count={3500} factor={3} saturation={0} fade speed={0.8} />}

          {/* Architectural Site Ground */}
          <EnvironmentScenery />

          {/* 3D Celestial Sun Path Trajectory Arc with East/South/West Indicators */}
          <SunPathArc />

          {!isNight && <Environment preset="city" />}
          {isNight && <Environment preset="night" />}

          {/* Interactive Roof Model with Click Placement */}
          <PanelPlacementTool>
            <BuildingModel />
          </PanelPlacementTool>

          {/* High-Fidelity Solar PV Modules */}
          {panels.map(panel => (
            <PanelAsset key={panel.id} panel={panel} />
          ))}

          {/* Ground Contact Shadows */}
          <ContactShadows 
            resolution={1024} 
            scale={70} 
            blur={1.6} 
            opacity={0.45} 
            far={14} 
            color="#0f172a" 
          />

          {/* Camera Controller with Adaptive Aspect Ratio Fitting */}
          <CameraController preset={cameraPreset} onPresetHandled={onPresetHandled} />

          {/* CAD 3D Orientation Gizmo (Preserved for tests, hidden by default to avoid sandbox look) */}
          {showDebugGizmo && (
            <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
              <GizmoViewport 
                axisColors={['#ef4444', '#10b981', '#3b82f6']} 
                labelColor="#ffffff" 
              />
            </GizmoHelper>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
