import React, { useMemo } from 'react';
import * as THREE from 'three';
import { usePlacementStore } from '../../store/usePlacementStore';

const textureCache = new Map<string, THREE.CanvasTexture>();

function getArchitecturalWallTexture(type: 'house' | 'factory' | 'warehouse' | 'farm') {
  const cacheKey = 'arch_wall_type_' + type;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (type === 'house') {
    // Warm natural residential stucco plaster finish (avoids stark synthetic pure white)
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, 512, 512);

    // Fine organic plaster micro-stippling for tactile architectural depth
    ctx.fillStyle = 'rgba(214, 211, 209, 0.22)';
    for (let i = 0; i < 7000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    // Very subtle horizontal architectural coursing / reveal lines
    ctx.strokeStyle = 'rgba(168, 162, 158, 0.14)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  } else if (type === 'factory') {
    // Commercial precast concrete architectural sandwich panels
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x <= 512; x += 128) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x, 0, 3, 512);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + 3, 0, 1, 512);
    }
    ctx.fillStyle = 'rgba(100, 116, 139, 0.08)';
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  } else if (type === 'warehouse') {
    // Industrial ribbed architectural steel cladding
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x <= 512; x += 24) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x, 0, 4, 512);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x + 4, 0, 2, 512);
    }
  } else if (type === 'farm') {
    // Traditional agricultural vertical timber board & batten
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x <= 512; x += 32) {
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(x, 0, 3, 512);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(x + 3, 0, 2, 512);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

function getArchitecturalRoofTexture(type: 'flat' | 'metal' | 'residential') {
  const cacheKey = 'arch_roof_type_' + type;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (type === 'flat') {
    // Commercial light grey TPO / PVC ballasted membrane with heat-welded seams
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 6000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
  } else if (type === 'residential') {
    // Architectural dimensional multi-tone shingles with realistic slate granule relief
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Micro-granule tactile stippling
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 5000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    // Shingle rows with layered horizontal relief
    for (let y = 0; y <= 512; y += 24) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, y, 512, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, y + 4, 512, 1.5);
      const offset = (y % 48 === 0) ? 0 : 32;
      for (let x = offset; x <= 512; x += 64) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, 2.5, 24);
      }
    }
  } else {
    // Standing seam solar-ready corrugated metal roof
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x <= 512; x += 32) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, 0, 3, 512);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 3, 0, 1.5, 512);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function BuildingModel() {
  const { buildingType, roofConfig, isPlacementMode } = usePlacementStore();

  const { width, depth, height, roofTypeToUse } = useMemo(() => {
    switch (buildingType) {
      case 'factory': 
        return { width: 36, depth: 44, height: 9.0, roofTypeToUse: 'flat' as const };
      case 'warehouse': 
        return { width: 28, depth: 36, height: 7.5, roofTypeToUse: 'metal' as const };
      case 'farm': 
        return { width: 18, depth: 26, height: 6.0, roofTypeToUse: 'metal' as const };
      case 'house': 
      default: 
        return { width: 14, depth: 18, height: 5.5, roofTypeToUse: 'residential' as const };
    }
  }, [buildingType]);

  const tiltRad = THREE.MathUtils.degToRad(roofConfig.type === 'flat' ? 0 : roofConfig.tilt);

  const wallTexture = useMemo(() => {
    const tex = getArchitecturalWallTexture(buildingType);
    if (tex) {
      const clone = tex.clone();
      clone.needsUpdate = true;
      clone.repeat.set(Math.max(1, Math.round(width / 6)), Math.max(1, Math.round(height / 3)));
      return clone;
    }
    return null;
  }, [buildingType, width, height]);

  const roofTexture = useMemo(() => {
    const tex = getArchitecturalRoofTexture(roofConfig.type === 'flat' ? 'flat' : roofTypeToUse);
    if (tex) {
      const clone = tex.clone();
      clone.needsUpdate = true;
      clone.repeat.set(Math.max(1, Math.round(width / 4)), Math.max(1, Math.round(depth / 4)));
      return clone;
    }
    return null;
  }, [roofConfig.type, roofTypeToUse, width, depth]);

  return (
    <group>
      {/* ============================================================== */}
      {/* 1. MAIN BUILDING WALL STRUCTURE & BASE PLINTH                   */}
      {/* ============================================================== */}
      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          map={wallTexture || undefined} 
          color={buildingType === 'house' ? '#faf7f2' : '#ffffff'}
          roughness={buildingType === 'warehouse' ? 0.45 : (buildingType === 'house' ? 0.78 : 0.85)} 
          metalness={buildingType === 'warehouse' ? 0.35 : 0.04}
        />
      </mesh>

      {/* Architectural Concrete Foundation Plinth (Defines Ground Separation) */}
      <mesh position={[0, 0.18, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 0.35, 0.36, depth + 0.35]} />
        <meshStandardMaterial color="#334155" roughness={0.88} />
      </mesh>

      {/* Vertical Cornerboards / Corner Trims (Provides Real Thickness & Shadow Depth) */}
      {[-width / 2, width / 2].map((x, xi) =>
        [-depth / 2, depth / 2].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[0.22, height, 0.22]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
          </mesh>
        ))
      )}

      {/* ============================================================== */}
      {/* 2. ARCHITECTURAL DETAILS BY BUILDING TYPE                      */}
      {/* ============================================================== */}
      {/* A. RESIDENTIAL HOUSE DETAILS */}
      {buildingType === 'house' && (
        <group>
          {/* Main Entryway with Recessed Alcove & Modern Architectural Door */}
          <group position={[0, 0, depth / 2]}>
            {/* Concrete Front Porch Steps */}
            <mesh position={[0, 0.15, 0.8]} receiveShadow castShadow>
              <boxGeometry args={[3.2, 0.3, 1.6]} />
              <meshStandardMaterial color="#64748b" roughness={0.88} />
            </mesh>
            <mesh position={[0, 0.3, 0.45]} receiveShadow castShadow>
              <boxGeometry args={[2.8, 0.3, 0.9]} />
              <meshStandardMaterial color="#475569" roughness={0.88} />
            </mesh>
            {/* Recessed Door Alcove Frame */}
            <mesh position={[0, 1.45, 0.02]} castShadow>
              <boxGeometry args={[1.8, 2.6, 0.14]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Architectural Entrance Door (Warm Walnut / Modern Graphite Timber Finish) */}
            <mesh position={[0, 1.4, 0.05]} castShadow>
              <boxGeometry args={[1.5, 2.4, 0.06]} />
              <meshStandardMaterial color="#27221e" roughness={0.42} metalness={0.15} />
            </mesh>
            {/* Stainless Steel Vertical Pull Bar Handle */}
            <mesh position={[0.55, 1.35, 0.1]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.85]} />
              <meshStandardMaterial color="#f1f5f9" metalness={0.95} roughness={0.12} />
            </mesh>
            {/* Modern Floating Entry Canopy Slab with Realistic Thickness */}
            <mesh position={[0, 2.85, 0.65]} castShadow receiveShadow>
              <boxGeometry args={[2.8, 0.14, 1.3]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.25} />
            </mesh>
            {/* Stainless Steel Canopy Tie Rods */}
            <mesh position={[-1.25, 3.4, 0.65]} rotation={[0.45, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 1.2]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
            <mesh position={[1.25, 3.4, 0.65]} rotation={[0.45, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 1.2]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
          </group>

          {/* Recessed Windows with Real Depth, Sills & Reflective Solar-Control Glazing */}
          {[
            { pos: [3.8, 1.8, depth / 2], w: 2.2, h: 1.8 },
            { pos: [-3.8, 1.8, depth / 2], w: 2.2, h: 1.8 },
            { pos: [3.8, 4.0, depth / 2], w: 2.0, h: 1.5 },
            { pos: [-3.8, 4.0, depth / 2], w: 2.0, h: 1.5 }
          ].map((win, idx) => (
            <group key={idx} position={win.pos as [number, number, number]}>
              {/* Outer Architectural Wall Reveal Casing (Gives window actual reveal depth in facade) */}
              <mesh position={[0, 0, 0.01]} castShadow>
                <boxGeometry args={[win.w + 0.16, win.h + 0.16, 0.14]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
              </mesh>
              {/* Projecting Architectural Window Sill (Stone / Extruded Aluminum) */}
              <mesh position={[0, -win.h / 2 - 0.045, 0.11]} castShadow receiveShadow>
                <boxGeometry args={[win.w + 0.28, 0.09, 0.26]} />
                <meshStandardMaterial color="#475569" roughness={0.75} />
              </mesh>
              {/* Recessed Anthracite Aluminum Window Frame */}
              <mesh position={[0, 0, 0.04]} castShadow>
                <boxGeometry args={[win.w, win.h, 0.1]} />
                <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.65} />
              </mesh>
              {/* Architectural Reflective Double-Glazing (Deep blue-gray solar glass, NEVER flat black) */}
              <mesh position={[0, 0, 0.06]}>
                <planeGeometry args={[win.w - 0.14, win.h - 0.14]} />
                <meshStandardMaterial 
                  color="#162c46" 
                  emissive="#0c1b2c"
                  emissiveIntensity={0.14}
                  roughness={0.1} 
                  metalness={0.76} 
                  transparent 
                  opacity={0.88} 
                />
              </mesh>
              {/* Vertical Center Mullion */}
              <mesh position={[0, 0, 0.07]}>
                <boxGeometry args={[0.06, win.h - 0.14, 0.03]} />
                <meshStandardMaterial color="#1e293b" metalness={0.65} roughness={0.35} />
              </mesh>
              {/* Horizontal Transom Glazing Bar */}
              <mesh position={[0, win.h * 0.15, 0.07]}>
                <boxGeometry args={[win.w - 0.14, 0.04, 0.03]} />
                <meshStandardMaterial color="#1e293b" metalness={0.65} roughness={0.35} />
              </mesh>
            </group>
          ))}

          {/* Roof Drainage Gutters & Downspouts (Realistic Residential Water Management) */}
          {roofConfig.type === 'gable' && (
            <group position={[0, height, 0]}>
              {/* Front Eaves Gutter Channel */}
              <mesh position={[0, -0.06, depth / 2 + 0.42]} castShadow>
                <boxGeometry args={[width + 1.0, 0.14, 0.12]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Rear Eaves Gutter Channel */}
              <mesh position={[0, -0.06, -depth / 2 - 0.42]} castShadow>
                <boxGeometry args={[width + 1.0, 0.14, 0.12]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Vertical Downspout on Right Front Corner */}
              <mesh position={[width / 2 + 0.12, -height / 2, depth / 2 + 0.25]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, height]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          )}

          {/* Rooftop Brick Chimney Stack */}
          <group position={[width / 3, height + 1.2, -depth / 6]} castShadow receiveShadow>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[1.1, 1.6, 1.1]} />
              <meshStandardMaterial color="#475569" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.45, 0]}>
              <boxGeometry args={[1.3, 0.1, 1.3]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
          </group>
        </group>
      )}

      {/* B. COMMERCIAL FACTORY DETAILS */}
      {buildingType === 'factory' && (
        <group>
          {[-7, 7].map((xOffset, i) => (
            <group key={i} position={[xOffset, 2.5, depth / 2 + 0.04]}>
              <mesh castShadow>
                <boxGeometry args={[5.2, 4.8, 0.08]} />
                <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[-3.1, -1.8, 0.6]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 1.2]} />
                <meshStandardMaterial color="#eab308" metalness={0.4} roughness={0.3} />
              </mesh>
              <mesh position={[3.1, -1.8, 0.6]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 1.2]} />
                <meshStandardMaterial color="#eab308" metalness={0.4} roughness={0.3} />
              </mesh>
            </group>
          ))}
          {/* Rooftop Industrial HVAC Units */}
          <group position={[-width / 3.5, height + 0.7, -depth / 4]} castShadow receiveShadow>
            <mesh>
              <boxGeometry args={[3.2, 1.3, 2.4]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.8, 0.8, 0.2, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </group>
      )}

      {/* C. INDUSTRIAL WAREHOUSE DETAILS */}
      {buildingType === 'warehouse' && (
        <group>
          <mesh position={[0, 2.5, depth / 2 + 0.04]} castShadow>
            <boxGeometry args={[5.8, 4.8, 0.08]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      )}

      {/* D. AGRICULTURAL FARM DETAILS */}
      {buildingType === 'farm' && (
        <group>
          <group position={[0, 2.0, depth / 2 + 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[4.2, 3.8, 0.08]} />
              <meshStandardMaterial color="#450a0a" roughness={0.7} />
            </mesh>
          </group>
        </group>
      )}

      {/* ============================================================== */}
      {/* 3. ROOF SYSTEMS: FLAT DECK OR GABLE PITCH                      */}
      {/* ============================================================== */}
      {roofConfig.type === 'flat' ? (
        <group position={[0, height, 0]}>
          {/* Main Flat Roof Deck with Subtle Placement Glow when Placement Tool is active */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0.02, 0]} 
            receiveShadow 
            castShadow
          >
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial 
              map={roofTexture || undefined} 
              color={isPlacementMode ? '#e2e8f0' : '#ffffff'}
              emissive={isPlacementMode ? '#38bdf8' : '#000000'}
              emissiveIntensity={isPlacementMode ? 0.08 : 0}
              side={THREE.DoubleSide} 
              roughness={0.65}
              metalness={0.15} 
            />
          </mesh>
          
          {/* Structural Parapet Walls with Anodized Sheetmetal Coping Caps */}
          <group position={[0, 0.35, 0]}>
            <mesh position={[0, 0, depth / 2 + 0.1]} castShadow receiveShadow>
              <boxGeometry args={[width + 0.3, 0.7, 0.2]} />
              <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, -depth / 2 - 0.1]} castShadow receiveShadow>
              <boxGeometry args={[width + 0.3, 0.7, 0.2]} />
              <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[width / 2 + 0.1, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.7, depth]} />
              <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[-width / 2 - 0.1, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.7, depth]} />
              <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.5} />
            </mesh>
          </group>
        </group>
      ) : (
        <group position={[0, height, 0]}>
          {/* Front Pitch (South-facing slope in default orientation) with Real Thickness */}
          <mesh 
            rotation={[-Math.PI / 2 + tiltRad, 0, 0]} 
            position={[0, (depth / 4) * Math.sin(tiltRad), depth / 4]} 
            receiveShadow 
            castShadow
          >
            <planeGeometry args={[width + 0.8, (depth / 2) / Math.cos(tiltRad) + 0.6]} />
            <meshStandardMaterial 
              map={roofTexture || undefined} 
              color={isPlacementMode ? '#f1f5f9' : '#fafafa'}
              emissive={isPlacementMode ? '#38bdf8' : '#000000'}
              emissiveIntensity={isPlacementMode ? 0.08 : 0}
              side={THREE.DoubleSide} 
              roughness={0.52} 
              metalness={0.22} 
            />
          </mesh>

          {/* Back Pitch */}
          <mesh 
            rotation={[-Math.PI / 2 - tiltRad, 0, 0]} 
            position={[0, (depth / 4) * Math.sin(tiltRad), -depth / 4]} 
            receiveShadow 
            castShadow
          >
            <planeGeometry args={[width + 0.8, (depth / 2) / Math.cos(tiltRad) + 0.6]} />
            <meshStandardMaterial 
              map={roofTexture || undefined} 
              color="#fafafa" 
              side={THREE.DoubleSide} 
              roughness={0.52} 
              metalness={0.22} 
            />
          </mesh>

          {/* Roof Fascia & Overhang Eaves Trim */}
          <mesh position={[0, -0.05, depth / 2 + 0.35]} castShadow>
            <boxGeometry args={[width + 0.9, 0.18, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.05, -depth / 2 - 0.35]} castShadow>
            <boxGeometry args={[width + 0.9, 0.18, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Heavy Architectural Ridge Cap Apex */}
          <mesh position={[0, (depth / 2) * Math.sin(tiltRad) + 0.06, 0]} castShadow>
            <boxGeometry args={[width + 1.0, 0.14, 0.38]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
          </mesh>

          {/* Triangular Gable End Walls */}
          <mesh 
            position={[width / 2, (depth / 4) * Math.sin(tiltRad) / 2, 0]} 
            rotation={[0, Math.PI / 2, 0]} 
            castShadow 
            receiveShadow
          >
            <planeGeometry args={[depth, (depth / 4) * Math.sin(tiltRad)]} />
            <meshStandardMaterial 
              map={wallTexture || undefined} 
              color={buildingType === 'house' ? '#faf7f2' : '#ffffff'}
              side={THREE.DoubleSide} 
              roughness={0.78} 
            />
          </mesh>
          <mesh 
            position={[-width / 2, (depth / 4) * Math.sin(tiltRad) / 2, 0]} 
            rotation={[0, -Math.PI / 2, 0]} 
            castShadow 
            receiveShadow
          >
            <planeGeometry args={[depth, (depth / 4) * Math.sin(tiltRad)]} />
            <meshStandardMaterial 
              map={wallTexture || undefined} 
              color={buildingType === 'house' ? '#faf7f2' : '#ffffff'}
              side={THREE.DoubleSide} 
              roughness={0.78} 
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
