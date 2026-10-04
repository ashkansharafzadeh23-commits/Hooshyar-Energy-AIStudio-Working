import React, { useRef, useState } from 'react';
import { usePlacementStore, STANDARD_MODULES } from '../../store/usePlacementStore';
import * as THREE from 'three';
import { snapToGrid } from '../../utils/snapping';
import { ThreeEvent } from '@react-three/fiber';

export function PanelPlacementTool({ children }: { children: React.ReactNode }) {
  const { 
    addPanel, 
    selectedPanelId, 
    setSelectedPanelId, 
    isPlacementMode, 
    gridSnap, 
    panelOrientation, 
    selectedModuleId,
    roofConfig,
    panelTiltOffset
  } = usePlacementStore();

  const pointerDownRef = useRef<{ clientX: number; clientY: number; timestamp: number } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<[number, number, number] | null>(null);
  const [hoverRotation, setHoverRotation] = useState<[number, number, number]>([0, 0, 0]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = {
      clientX: e.nativeEvent.clientX,
      clientY: e.nativeEvent.clientY,
      timestamp: Date.now()
    };
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPlacementMode) {
      if (hoverPosition) setHoverPosition(null);
      return;
    }
    const { point, face, object } = e;
    if (!face || point.y < 3) {
      if (hoverPosition) setHoverPosition(null);
      return;
    }

    const snap = gridSnap || 0.5;
    const x = snapToGrid(point.x, snap);
    const z = snapToGrid(point.z, snap);
    const y = point.y + 0.08;

    const normal = face.normal.clone().transformDirection(object.matrixWorld);
    const target = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(target, normal);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    setHoverPosition([x, y, z]);
    setHoverRotation([euler.x, euler.y, euler.z]);
  };

  const handlePointerOut = () => {
    if (hoverPosition) setHoverPosition(null);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!pointerDownRef.current) return;

    const dx = e.nativeEvent.clientX - pointerDownRef.current.clientX;
    const dy = e.nativeEvent.clientY - pointerDownRef.current.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - pointerDownRef.current.timestamp;
    pointerDownRef.current = null;

    // Strict movement threshold: > 6px movement or > 350ms duration indicates orbit/pan/drag gesture, NEVER place!
    if (distance > 6 || duration > 350) {
      return;
    }

    e.stopPropagation();

    // If an existing panel was selected, clicking empty space deselects it
    if (selectedPanelId) {
      setSelectedPanelId(null);
      return;
    }

    // Only place modules when placement mode is actively enabled
    if (!isPlacementMode) {
      return;
    }

    const { point, face, object } = e;
    if (!face) return;

    // Ensure placement happens on roof surfaces (above ground level)
    if (point.y < 3) return;

    const snap = gridSnap || 0.5;
    const x = snapToGrid(point.x, snap);
    const z = snapToGrid(point.z, snap);
    const y = point.y + 0.08; // realistic mounting rail standoff clearance above roof surface

    // Compute surface normal & orientation
    const normal = face.normal.clone().transformDirection(object.matrixWorld);
    const target = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(target, normal);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    // If on flat roof, tilt module towards South (180 deg) with standard rack tilt
    let rotX = euler.x;
    let rotY = euler.y;
    let rotZ = euler.z;

    if (roofConfig.type === 'flat') {
      const rackTiltRad = THREE.MathUtils.degToRad(panelTiltOffset || 15);
      rotX = -Math.PI / 2 + rackTiltRad;
    }

    addPanel({
      id: `pnl_${Date.now()}_${Math.round(x * 10)}_${Math.round(z * 10)}`,
      position: [x, y, z],
      rotation: [rotX, rotY, rotZ],
      orientation: panelOrientation,
      modelId: selectedModuleId,
      efficiency: undefined, // Authoritative engineering efficiency unmeasured/unsupplied
      renderingCoefficient: 1.0, // Visual layout rendering coefficient
    });
  };

  const modSpec = STANDARD_MODULES.find(m => m.id === selectedModuleId) || STANDARD_MODULES[0];
  const isLandscape = panelOrientation === 'landscape';
  const ghostW = isLandscape ? modSpec.length : modSpec.width;
  const ghostL = isLandscape ? modSpec.width : modSpec.length;

  return (
    <group 
      onPointerDown={handlePointerDown} 
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      {children}

      {/* Subtle Ghost Placement Indicator on Hover with subtle green valid indicator */}
      {isPlacementMode && hoverPosition && (
        <group position={hoverPosition} rotation={hoverRotation}>
          <mesh>
            <boxGeometry args={[ghostW, ghostL, 0.04]} />
            <meshStandardMaterial 
              color="#10b981" 
              transparent 
              opacity={0.5} 
              emissive="#059669"
              emissiveIntensity={0.4}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(ghostW + 0.02, ghostL + 0.02, 0.05)]} />
            <lineBasicMaterial color="#10b981" linewidth={2.5} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}
