import React from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';

export function EnvironmentScenery() {
  const { buildingType } = usePlacementStore();

  return (
    <group>
      {/* Ground Plane (Asphalt color) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color={buildingType === 'farm' ? '#7C9A4B' : '#374151'} roughness={0.9} />
      </mesh>

      {/* Scenery details based on type */}
      {buildingType === 'house' && (
        <group>
          {/* Road */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 12]} receiveShadow>
            <planeGeometry args={[5000, 6]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
          {/* Sidewalk */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 8]} receiveShadow>
            <planeGeometry args={[5000, 2]} />
            <meshStandardMaterial color="#4b5563" roughness={0.9} />
          </mesh>

          {/* Neighboring Box 1 */}
          <mesh position={[15, 2.5, 0]} receiveShadow castShadow>
             <boxGeometry args={[8, 5, 10]} />
             <meshStandardMaterial color="#d1d5db" />
          </mesh>
          <mesh position={[-15, 2.5, 0]} receiveShadow castShadow>
             <boxGeometry args={[8, 5, 10]} />
             <meshStandardMaterial color="#e5e7eb" />
          </mesh>

          {/* Trees */}
          <group position={[10, 0, 8.5]}>
             <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 2]} />
                <meshStandardMaterial color="#654321" /> {/* Brown trunk */}
             </mesh>
             <mesh position={[0, 3, 0]} castShadow>
                <coneGeometry args={[2, 4]} />
                <meshStandardMaterial color="#228B22" /> {/* Green leaves */}
             </mesh>
          </group>
          
          <group position={[-10, 0, 8.5]}>
             <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 2]} />
                <meshStandardMaterial color="#654321" /> {/* Brown trunk */}
             </mesh>
             <mesh position={[0, 3.5, 0]} castShadow>
                <coneGeometry args={[2.2, 4.5]} />
                <meshStandardMaterial color="#2E8B57" /> {/* Green leaves */}
             </mesh>
          </group>
        </group>
      )}

      {buildingType === 'farm' && (
        <group>
          {/* Dirt paths */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 15]} receiveShadow>
            <planeGeometry args={[5000, 4]} />
            <meshStandardMaterial color="#8B5A2B" roughness={1} />
          </mesh>
          {/* Farm field lines (crops) */}
          {Array.from({ length: 40 }).map((_, i) => (
             <mesh key={`f1-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[25, 0.02, -30 + i * 2]} receiveShadow>
                <planeGeometry args={[40, 0.5]} />
                <meshStandardMaterial color="#4A5D23" />
             </mesh>
          ))}
          {Array.from({ length: 40 }).map((_, i) => (
             <mesh key={`f2-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-25, 0.02, -30 + i * 2]} receiveShadow>
                <planeGeometry args={[40, 0.5]} />
                <meshStandardMaterial color="#4A5D23" />
             </mesh>
          ))}
          
          {/* A few trees */}
          <group position={[20, 0, 20]}>
             <mesh position={[0, 1.5, 0]} castShadow>
                <cylinderGeometry args={[0.4, 0.5, 3]} />
                <meshStandardMaterial color="#8B4513" /> {/* Brown trunk */}
             </mesh>
             <mesh position={[0, 5, 0]} castShadow>
                <sphereGeometry args={[3, 16, 16]} />
                <meshStandardMaterial color="#228B22" /> {/* Green leaves */}
             </mesh>
          </group>
        </group>
      )}

      {(buildingType === 'factory' || buildingType === 'warehouse') && (
        <group>
          {/* Industrial lot */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
          {/* Road */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 35]} receiveShadow>
            <planeGeometry args={[5000, 10]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>

          {/* Other industrial buildings */}
          <mesh position={[30, 4, 0]} receiveShadow castShadow>
             <boxGeometry args={[20, 8, 20]} />
             <meshStandardMaterial color="#9ca3af" />
          </mesh>
          <mesh position={[-30, 5, -10]} receiveShadow castShadow>
             <boxGeometry args={[25, 10, 20]} />
             <meshStandardMaterial color="#d1d5db" />
          </mesh>

          {/* Container boxes */}
          <mesh position={[15, 1.25, 20]} receiveShadow castShadow>
             <boxGeometry args={[6, 2.5, 2.5]} />
             <meshStandardMaterial color="#1E90FF" />
          </mesh>
          <mesh position={[15, 3.75, 20]} receiveShadow castShadow>
             <boxGeometry args={[6, 2.5, 2.5]} />
             <meshStandardMaterial color="#FF4500" />
          </mesh>
        </group>
      )}
    </group>
  );
}
