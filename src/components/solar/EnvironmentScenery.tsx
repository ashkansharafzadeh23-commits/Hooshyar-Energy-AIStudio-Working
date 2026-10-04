import React, { useMemo } from 'react';
import * as THREE from 'three';
import { usePlacementStore } from '../../store/usePlacementStore';

let sharedGridTexture: THREE.CanvasTexture | null = null;

function getArchitecturalGridTexture(): THREE.CanvasTexture {
  if (sharedGridTexture) return sharedGridTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    sharedGridTexture = new THREE.CanvasTexture(canvas);
    return sharedGridTexture;
  }

  // Engineering CAD ground surface tone
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Minor grid lines (1m intervals)
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
  ctx.lineWidth = 1;
  const step = 512 / 10;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Major grid lines (5m intervals)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += step * 5) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  sharedGridTexture = new THREE.CanvasTexture(canvas);
  sharedGridTexture.wrapS = THREE.RepeatWrapping;
  sharedGridTexture.wrapT = THREE.RepeatWrapping;
  return sharedGridTexture;
}

export function EnvironmentScenery() {
  const { timeOfDay, showGrid, buildingType } = usePlacementStore();
  const isNight = timeOfDay < 5.25 || timeOfDay > 18.75;
  const gridTexture = useMemo(() => getArchitecturalGridTexture(), []);

  // Proportion the active engineering site pad realistically to the building footprint
  const { siteW, siteD, bldgW, bldgD } = useMemo(() => {
    switch (buildingType) {
      case 'factory': return { siteW: 56, siteD: 64, bldgW: 36, bldgD: 44 };
      case 'warehouse': return { siteW: 46, siteD: 54, bldgW: 28, bldgD: 36 };
      case 'farm': return { siteW: 34, siteD: 42, bldgW: 18, bldgD: 26 };
      case 'house': default: return { siteW: 28, siteD: 32, bldgW: 14, bldgD: 18 };
    }
  }, [buildingType]);

  const repeatX = Math.round(siteW / 5);
  const repeatY = Math.round(siteD / 5);

  const texture = useMemo(() => {
    if (!gridTexture) return null;
    const clone = gridTexture.clone();
    clone.needsUpdate = true;
    clone.repeat.set(repeatX, repeatY);
    return clone;
  }, [gridTexture, repeatX, repeatY]);

  return (
    <group>
      {/* 1. Extended Seamless Ground Base (Soft natural terrain, prevents any camera angle seeing empty void) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial 
          color={isNight ? '#090e1a' : '#e2e8f0'} 
          roughness={0.92} 
          metalness={0.03}
        />
      </mesh>

      {/* 2. Architectural CAD Site Ground Pad (Proportioned to building footprint) */}
      {showGrid && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[siteW, siteD]} />
          <meshStandardMaterial 
            map={texture || undefined} 
            color={isNight ? '#0f172a' : '#ffffff'} 
            roughness={0.85} 
            metalness={0.05}
          />
        </mesh>
      )}

      {/* 3. Structural Concrete Building Apron & Perimeter Paved Terrace (Clear physical separation) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[bldgW + 2.2, bldgD + 2.2]} />
        <meshStandardMaterial 
          color={isNight ? '#1e293b' : '#cbd5e1'} 
          roughness={0.8} 
          metalness={0.08}
        />
      </mesh>

      {/* 4. Residential Site Walkway & Driveway Paving (Adds realistic spatial scale) */}
      {buildingType === 'house' && (
        <group position={[0, 0.005, siteD * 0.28]}>
          {/* Main front approach pathway */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[2.8, siteD * 0.42]} />
            <meshStandardMaterial color={isNight ? '#1e293b' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          {/* Flanking subdued landscape verge */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.5, -0.002, 0]} receiveShadow>
            <planeGeometry args={[5.5, siteD * 0.42]} />
            <meshStandardMaterial color={isNight ? '#0f172a' : '#dcfce7'} roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.5, -0.002, 0]} receiveShadow>
            <planeGeometry args={[5.5, siteD * 0.42]} />
            <meshStandardMaterial color={isNight ? '#0f172a' : '#dcfce7'} roughness={0.95} />
          </mesh>
        </group>
      )}

      {/* 5. Commercial / Industrial Concrete Apron */}
      {(buildingType === 'factory' || buildingType === 'warehouse') && (
        <group position={[0, 0.005, siteD * 0.3]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[siteW * 0.75, siteD * 0.38]} />
            <meshStandardMaterial color={isNight ? '#1e293b' : '#cbd5e1'} roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* 6. Site Boundary Setback Perimeter (Dashed line) */}
      <lineSegments position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(siteW - 2, siteD - 2)]} />
        <lineDashedMaterial 
          color={isNight ? '#334155' : '#64748b'} 
          dashSize={2} 
          gapSize={1.5} 
        />
      </lineSegments>

      {/* 7. Subtle Professional Cardinal Compass Orientation Markers */}
      {/* South (180° S - Primary Solar Orientation) */}
      <group position={[0, 0.025, siteD / 2 - 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial color={isNight ? '#1e293b' : '#2563eb'} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color={isNight ? '#3b82f6' : '#1d4ed8'} />
        </mesh>
      </group>

      {/* North (0° N) */}
      <group position={[0, 0.025, -siteD / 2 + 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.3, 32]} />
          <meshBasicMaterial color={isNight ? '#1e293b' : '#94a3b8'} />
        </mesh>
      </group>
    </group>
  );
}
