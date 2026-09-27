import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Sky, Stars } from '@react-three/drei';
import { BuildingModel } from './BuildingModel';
import { PanelPlacementTool } from './PanelPlacementTool';
import { PanelAsset } from './PanelAsset';
import { EnvironmentScenery } from './EnvironmentScenery';
import { usePlacementStore } from '../../store/usePlacementStore';
import * as THREE from 'three';

export function SceneCanvas() {
  const { panels, timeOfDay } = usePlacementStore();

  const timeProgress = (timeOfDay - 6) / 24; 
  const angle = timeProgress * Math.PI * 2;
  
  const distance = 400;
  const sunX = Math.cos(angle) * distance;
  const sunY = Math.sin(angle) * distance;
  const sunZ = 50; 
  
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  
  // During night, flip the position so the "moon" acts as the light source from above
  const lightPosition: [number, number, number] = isNight 
    ? [-sunX, -sunY, -sunZ] // Opposite of sun
    : [sunX, sunY, sunZ];

  const { sunColor, ambientColor, lightIntensity } = useMemo(() => {
    let sc = new THREE.Color('#ffffff');
    let ac = new THREE.Color('#ffffff');
    
    let intensity = Math.sin(angle);
    if (intensity < 0) intensity = 0;

    if (timeOfDay >= 5 && timeOfDay < 8) {
      const p = (timeOfDay - 5) / 3;
      sc.lerpColors(new THREE.Color('#ff7b00'), new THREE.Color('#ffc87a'), p);
      ac.lerpColors(new THREE.Color('#0b1021'), new THREE.Color('#7a8b99'), p);
    } else if (timeOfDay >= 16 && timeOfDay < 19) {
      const p = (timeOfDay - 16) / 3;
      sc.lerpColors(new THREE.Color('#ffc87a'), new THREE.Color('#ff4500'), p);
      ac.lerpColors(new THREE.Color('#7a8b99'), new THREE.Color('#2d283e'), p);
    } else if (isNight) {
      sc.set('#93c5fd'); 
      ac.set('#0f172a');
      intensity = 0.2; 
    } else {
      sc.set('#fffdeb');
      ac.set('#bae6fd');
    }

    return { 
       sunColor: sc.getStyle(), 
       ambientColor: ac.getStyle(),
       lightIntensity: isNight ? 0.3 : Math.max(intensity * 2, 0.2)
    };
  }, [timeOfDay, angle, isNight]);

  return (
    <div className="w-full h-full bg-transparent rounded-2xl overflow-hidden relative min-h-[500px]">
      <Canvas 
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]} 
        camera={{ position: [15, 4, 25], fov: 45, near: 0.1, far: 5000 }} 
        gl={{ 
          alpha: true,
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping, 
          toneMappingExposure: 1.1, 
          preserveDrawingBuffer: true 
        }}
      >
        <Suspense fallback={null}>
          <hemisphereLight intensity={isNight ? 0.2 : 0.4} color={ambientColor} groundColor={isNight ? "#020617" : "#4a5d23"} />
          
          <directionalLight 
            position={lightPosition} 
            castShadow 
            intensity={lightIntensity} 
            color={sunColor}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0005}
          >
            <orthographicCamera attach="shadow-camera" args={[-60, 60, 60, -60, 0.1, 1000]} />
          </directionalLight>

          <Sky 
            sunPosition={[sunX, sunY, sunZ]} 
            turbidity={((timeOfDay >= 5 && timeOfDay < 8) || (timeOfDay >= 16 && timeOfDay < 19)) ? 8 : (isNight ? 1 : 0.5)} 
            rayleigh={isNight ? 0.1 : 0.8} 
            mieCoefficient={isNight ? 0.001 : 0.005} 
            mieDirectionalG={0.8}
            distance={4500} 
          />
          {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}

          <EnvironmentScenery />

          {!isNight && <Environment preset="city" />}
          {isNight && <Environment preset="night" />}

          <PanelPlacementTool>
            <BuildingModel />
          </PanelPlacementTool>

          {panels.map(panel => (
            <PanelAsset key={panel.id} panel={panel} />
          ))}

          <ContactShadows resolution={2048} scale={100} blur={2} opacity={0.6} far={20} color="#000000" />
          <OrbitControls makeDefault target={[0, 2, 0]} maxPolarAngle={Math.PI / 2 - 0.01} minDistance={10} maxDistance={150} />
        </Suspense>
      </Canvas>
    </div>
  );
}
