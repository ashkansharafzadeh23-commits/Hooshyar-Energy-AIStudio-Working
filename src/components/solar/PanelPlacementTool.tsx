import React from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';
import * as THREE from 'three';
import { snapToGrid } from '../../utils/snapping';
import { ThreeEvent } from '@react-three/fiber';

export function PanelPlacementTool({ children }: { children: React.ReactNode }) {
  const { addPanel, selectedPanelId, setSelectedPanelId } = usePlacementStore();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (selectedPanelId) {
       setSelectedPanelId(null);
       return;
    }
    
    // Calculate placement
    const { point, face, object } = e;
    if (!face) return;
    
    // Snap to grid
    const x = snapToGrid(point.x, 0.5);
    const z = snapToGrid(point.z, 0.5);
    const y = point.y + 0.05; // slightly above roof

    // Get rotation from normal
    const normal = face.normal.clone().transformDirection(object.matrixWorld);
    const target = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(target, normal);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    addPanel({
      id: `pnl_${Date.now()}_${Math.round(x * 10)}_${Math.round(z * 10)}`,
      position: [x, y, z],
      rotation: [euler.x, euler.y, euler.z],
      efficiency: undefined, // Authoritative engineering efficiency unmeasured/unsupplied
      renderingCoefficient: 1.0, // Visual layout rendering coefficient
    });
  };

  return (
    <group onPointerDown={handlePointerDown}>
      {children}
    </group>
  );
}
