import React, { useMemo } from 'react';
import { PanelInstance } from '../../types/solar';
import { usePlacementStore, STANDARD_MODULES } from '../../store/usePlacementStore';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

// Shared singleton textures & geometries for optimal WebGL performance
let sharedCellTexture: THREE.CanvasTexture | null = null;

function getCellTexture(): THREE.CanvasTexture {
  if (sharedCellTexture) return sharedCellTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    sharedCellTexture = new THREE.CanvasTexture(canvas);
    return sharedCellTexture;
  }

  // Deep dark blue-black anti-reflective silicon wafer base (Real Monocrystalline PV)
  ctx.fillStyle = '#060d18';
  ctx.fillRect(0, 0, 1024, 1024);

  // 6x12 half-cut solar cell matrix (Standard commercial 144 half-cell PV module)
  const cols = 6;
  const rows = 12;
  const cellW = 1024 / cols;
  const cellH = 1024 / rows;
  const gap = 3;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * cellW + gap;
      const y = r * cellH + gap;
      const w = cellW - gap * 2;
      const h = cellH - gap * 2;

      // Individual monocrystalline cell with subtle passivated emitter gradient
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#091527');
      grad.addColorStop(0.35, '#0c1c34');
      grad.addColorStop(0.7, '#081324');
      grad.addColorStop(1, '#050c18');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // Monocrystalline pseudo-square chamfered corners
      ctx.fillStyle = '#060d18';
      const chamfer = 6;
      ctx.fillRect(x, y, chamfer, chamfer);
      ctx.fillRect(x + w - chamfer, y, chamfer, chamfer);
      ctx.fillRect(x, y + h - chamfer, chamfer, chamfer);
      ctx.fillRect(x + w - chamfer, y + h - chamfer, chamfer, chamfer);

      // Fine multi-busbar silver wires (9 MBB lines per half cell)
      ctx.fillStyle = 'rgba(215, 225, 235, 0.45)';
      for (let b = 1; b <= 9; b++) {
        const bx = x + (w * b) / 10;
        ctx.fillRect(bx, y, 1.2, h);
      }

      // Micro-fingers (horizontal grid lines)
      ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      for (let f = 4; f < h; f += 5) {
        ctx.fillRect(x, y + f, w, 0.5);
      }
    }
  }

  // Center string busbar connection ribbon
  ctx.fillStyle = 'rgba(203, 213, 225, 0.65)';
  ctx.fillRect(0, 510, 1024, 4);

  sharedCellTexture = new THREE.CanvasTexture(canvas);
  sharedCellTexture.wrapS = THREE.RepeatWrapping;
  sharedCellTexture.wrapT = THREE.RepeatWrapping;
  return sharedCellTexture;
}

export function PanelAsset({ panel }: { panel: PanelInstance }) {
  const { selectedPanelId, setSelectedPanelId, selectedModuleId } = usePlacementStore();
  const isSelected = selectedPanelId === panel.id;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedPanelId(panel.id);
  };

  const cellMap = useMemo(() => getCellTexture(), []);

  // Determine physical module dimensions
  const modSpec = STANDARD_MODULES.find(m => m.id === (panel.modelId || selectedModuleId)) || STANDARD_MODULES[0];
  const isLandscape = panel.orientation === 'landscape';

  const moduleWidth = isLandscape ? modSpec.length : modSpec.width;
  const moduleLength = isLandscape ? modSpec.width : modSpec.length;
  const frameThickness = modSpec.thickness || 0.035;

  return (
    <group 
      position={panel.position} 
      rotation={panel.rotation} 
      onClick={handleClick}
    >
      {/* 1. Photovoltaic Active Cell Surface (Deep blue-black silicon wafer under anti-reflective glass) */}
      <mesh position={[0, 0, frameThickness * 0.25]} castShadow receiveShadow>
        <planeGeometry args={[moduleWidth - 0.035, moduleLength - 0.035]} />
        <meshStandardMaterial 
          map={cellMap}
          color="#0b172a"
          roughness={0.08}
          metalness={0.62}
          emissive="#020617"
          emissiveIntensity={0.04}
        />
      </mesh>

      {/* 2. Anodized Aluminum Perimeter Frame */}
      {/* Maintains realistic architectural aluminum finish; NEVER recolors module itself amber */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[moduleWidth, moduleLength, frameThickness]} />
        <meshStandardMaterial 
          color="#475569" 
          metalness={0.88}
          roughness={0.28}
        />
      </mesh>

      {/* 3. Subtle Selection Outline (Clear Amber Accent, preserves module materials) */}
      {isSelected && (
        <lineSegments position={[0, 0, frameThickness * 0.55]}>
          <edgesGeometry args={[new THREE.BoxGeometry(moduleWidth + 0.02, moduleLength + 0.02, 0.01)]} />
          <lineBasicMaterial color="#f59e0b" linewidth={2.5} />
        </lineSegments>
      )}

      {/* 4. Mounting Rails & Structural Brackets (Dual aluminum unistrut rails) */}
      <group position={[0, 0, -frameThickness * 0.9]}>
        {/* Left rail */}
        <mesh position={[-moduleWidth * 0.28, 0, 0]} castShadow>
          <boxGeometry args={[0.045, moduleLength + 0.08, 0.035]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.35} />
        </mesh>
        {/* Right rail */}
        <mesh position={[moduleWidth * 0.28, 0, 0]} castShadow>
          <boxGeometry args={[0.045, moduleLength + 0.08, 0.035]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.35} />
        </mesh>
        {/* Mounting L-Feet Stand-off brackets (creating realistic ~8cm roof clearance) */}
        <mesh position={[-moduleWidth * 0.28, moduleLength * 0.35, -0.03]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[-moduleWidth * 0.28, -moduleLength * 0.35, -0.03]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[moduleWidth * 0.28, moduleLength * 0.35, -0.03]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[moduleWidth * 0.28, -moduleLength * 0.35, -0.03]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
