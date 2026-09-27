import React, { useMemo } from 'react';
import * as THREE from 'three';
import { usePlacementStore } from '../../store/usePlacementStore';

const textureCache = new Map<string, THREE.CanvasTexture>();

function getBrickTexture(color: string) {
  if (textureCache.has('brick_' + color)) return textureCache.get('brick_' + color);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Base color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  
  // Add some noise
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  // Mortar lines
  ctx.fillStyle = '#e2e8f0';
  for (let y = 0; y < 256; y += 32) {
    ctx.fillRect(0, y, 256, 3);
    for (let x = 0; x < 256; x += 64) {
      const offsetX = (y / 32) % 2 === 0 ? 0 : 32;
      ctx.fillRect(x + offsetX, y, 3, 32);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('brick_' + color, texture);
  return texture;
}

function getMetalRoofTexture(color: string = "#64748b") {
  if (textureCache.has('metal_roof_' + color)) return textureCache.get('metal_roof_' + color);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Base color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  
  // Metal ridges
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let x = 0; x < 256; x += 16) {
    ctx.fillRect(x, 0, 3, 256);
  }
  
  // Add some noise for metal
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('metal_roof_' + color, texture);
  return texture;
}

export function BuildingModel() {
  const { buildingType, roofConfig } = usePlacementStore();

  const { width, depth, height, color } = useMemo(() => {
    switch (buildingType) {
      case 'factory': return { width: 40, depth: 50, height: 10, color: '#9ca3af' };
      case 'warehouse': return { width: 30, depth: 40, height: 8, color: '#e5e7eb' };
      case 'farm': return { width: 18, depth: 25, height: 6, color: '#b91c1c' }; // Red barn
      case 'house': default: return { width: 15, depth: 20, height: 6, color: '#F5F5DC' };
    }
  }, [buildingType]);

  const tiltRad = THREE.MathUtils.degToRad(roofConfig.type === 'flat' ? 0 : roofConfig.tilt);

  // Generate textures dynamically based on color
  const wallTexture = useMemo(() => {
    const tex = getBrickTexture(color);
    if (tex) {
      // We must clone it so we can set repeat independently if needed, 
      // but wait, modifying repeat on shared texture will affect others.
      const clone = tex.clone();
      clone.needsUpdate = true;
      clone.repeat.set(width / 4, height / 4);
      return clone;
    }
    return tex;
  }, [color, width, height]);

  const roofColor = buildingType === 'house' ? '#ffffff' : (buildingType === 'farm' ? '#7F1D1D' : '#64748b');
  const metalTexture = useMemo(() => {
    const tex = getMetalRoofTexture(roofColor);
    if (tex) {
      const clone = tex.clone();
      clone.needsUpdate = true;
      clone.repeat.set(width / 2, depth / 2);
      return clone;
    }
    return tex;
  }, [width, depth, roofColor]);

  return (
    <group>
      {/* Main Building Walls */}
      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={wallTexture ? '#ffffff' : color} 
          map={wallTexture || undefined} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Windows & Doors Details */}
      {buildingType === 'house' && (
        <group>
          {/* Main Door */}
          <mesh position={[0, 1.5, depth / 2 + 0.01]} castShadow>
            <boxGeometry args={[2, 3, 0.1]} />
            <meshStandardMaterial color="#451a03" roughness={0.7} />
          </mesh>
          {/* Windows Front */}
          <mesh position={[4, 2.5, depth / 2 + 0.01]} castShadow>
            <boxGeometry args={[2.5, 2, 0.1]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} roughness={0.05} metalness={0.9} envMapIntensity={1.5} />
          </mesh>
          <mesh position={[-4, 2.5, depth / 2 + 0.01]} castShadow>
            <boxGeometry args={[2.5, 2, 0.1]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} roughness={0.05} metalness={0.9} envMapIntensity={1.5} />
          </mesh>
          {/* Trim at the bottom */}
          <mesh position={[0, 0.2, depth / 2 + 0.02]} receiveShadow>
            <boxGeometry args={[width, 0.4, 0.1]} />
            <meshStandardMaterial color="#4b5563" roughness={0.9} />
          </mesh>
          {/* Chimney */}
          <mesh position={[-width / 2 + 2, height + 2, 0]} castShadow>
            <boxGeometry args={[1.5, 4, 1.5]} />
            <meshStandardMaterial color={wallTexture ? '#ffffff' : '#b45309'} map={wallTexture || undefined} roughness={0.9} />
          </mesh>
        </group>
      )}

      {(buildingType === 'factory' || buildingType === 'warehouse') && (
        <group>
          {/* Large Garage Door */}
          <mesh position={[0, 2.5, depth / 2 + 0.01]} castShadow>
            <boxGeometry args={[6, 5, 0.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Side Door */}
          <mesh position={[width / 2 + 0.01, 1.5, 0]} castShadow>
            <boxGeometry args={[0.1, 3, 1.5]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Strip Windows */}
          <mesh position={[0, height - 1.5, depth / 2 + 0.01]} castShadow>
            <boxGeometry args={[width - 4, 1.5, 0.1]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} roughness={0.05} metalness={0.9} envMapIntensity={1.5} />
          </mesh>
        </group>
      )}

      {buildingType === 'farm' && (
        <group>
          {/* Barn Door */}
          <mesh position={[0, 2, depth / 2 + 0.01]} castShadow>
            <boxGeometry args={[4, 4, 0.1]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
          </mesh>
          {/* Wood Trims */}
          <mesh position={[width / 2 + 0.01, height / 2, 0]} castShadow>
            <boxGeometry args={[0.1, height, depth]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[-width / 2 - 0.01, height / 2, 0]} castShadow>
            <boxGeometry args={[0.1, height, depth]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        </group>
      )}
      
      {/* Roof */}
      {roofConfig.type === 'flat' ? (
        <group position={[0, height + 0.05, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
            <planeGeometry args={[width + 0.5, depth + 0.5]} />
            <meshStandardMaterial 
              color={metalTexture ? '#ffffff' : roofColor} 
              map={metalTexture || undefined} 
              side={THREE.DoubleSide} 
              roughness={0.6}
              metalness={0.5} 
            />
          </mesh>
          {/* Parapet Wall */}
          <mesh position={[0, 0.25, depth / 2 + 0.25]} castShadow>
            <boxGeometry args={[width + 0.5, 0.5, 0.1]} />
            <meshStandardMaterial color={wallTexture ? '#ffffff' : color} map={wallTexture || undefined} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.25, -depth / 2 - 0.25]} castShadow>
            <boxGeometry args={[width + 0.5, 0.5, 0.1]} />
            <meshStandardMaterial color={wallTexture ? '#ffffff' : color} map={wallTexture || undefined} roughness={0.8} />
          </mesh>
          <mesh position={[width / 2 + 0.25, 0.25, 0]} castShadow>
            <boxGeometry args={[0.1, 0.5, depth + 0.5]} />
            <meshStandardMaterial color={wallTexture ? '#ffffff' : color} map={wallTexture || undefined} roughness={0.8} />
          </mesh>
          <mesh position={[-width / 2 - 0.25, 0.25, 0]} castShadow>
            <boxGeometry args={[0.1, 0.5, depth + 0.5]} />
            <meshStandardMaterial color={wallTexture ? '#ffffff' : color} map={wallTexture || undefined} roughness={0.8} />
          </mesh>
        </group>
      ) : (
        <group position={[0, height, 0]}>
          {/* Front Pitch */}
          <mesh rotation={[-Math.PI / 2 + tiltRad, 0, 0]} position={[0, (depth/4) * Math.sin(tiltRad), depth/4]} receiveShadow castShadow>
            <planeGeometry args={[width + 2, depth/2 / Math.cos(tiltRad) + 2]} />
            <meshStandardMaterial 
              color={metalTexture ? '#ffffff' : roofColor} 
              map={metalTexture || undefined} 
              side={THREE.DoubleSide} 
              roughness={buildingType === 'farm' ? 0.7 : 0.4} 
              metalness={buildingType === 'farm' ? 0.2 : 0.7} 
            />
          </mesh>
          {/* Back Pitch */}
          <mesh rotation={[-Math.PI / 2 - tiltRad, 0, 0]} position={[0, (depth/4) * Math.sin(tiltRad), -depth/4]} receiveShadow castShadow>
             <planeGeometry args={[width + 2, depth/2 / Math.cos(tiltRad) + 2]} />
             <meshStandardMaterial 
              color={metalTexture ? '#ffffff' : roofColor} 
              map={metalTexture || undefined} 
              side={THREE.DoubleSide} 
              roughness={buildingType === 'farm' ? 0.7 : 0.4} 
              metalness={buildingType === 'farm' ? 0.2 : 0.7} 
            />
          </mesh>
          {/* Gable Ends */}
          <mesh position={[width/2, (depth/4) * Math.sin(tiltRad)/2, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
             <planeGeometry args={[depth, (depth/4) * Math.sin(tiltRad)]} />
             <meshStandardMaterial color={wallTexture ? '#ffffff' : color} map={wallTexture || undefined} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          <mesh position={[-width/2, (depth/4) * Math.sin(tiltRad)/2, 0]} rotation={[0, -Math.PI/2, 0]} castShadow receiveShadow>
             <planeGeometry args={[depth, (depth/4) * Math.sin(tiltRad)]} />
             <meshStandardMaterial color={wallTexture ? '#ffffff' : color} map={wallTexture || undefined} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}
