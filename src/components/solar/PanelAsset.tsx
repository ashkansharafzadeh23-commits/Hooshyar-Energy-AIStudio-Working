import React from 'react';
import { PanelInstance } from '../../types/solar';
import { usePlacementStore } from '../../store/usePlacementStore';
import { ThreeEvent } from '@react-three/fiber';

export function PanelAsset({ panel }: { panel: PanelInstance }) {
  const { selectedPanelId, setSelectedPanelId } = usePlacementStore();
  const isSelected = selectedPanelId === panel.id;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedPanelId(panel.id);
  };

  return (
    <mesh 
      position={panel.position} 
      rotation={panel.rotation} 
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1.0, 1.6, 0.05]} />
      <meshStandardMaterial 
        color={isSelected ? '#FF9E2C' : '#1A5F7A'} 
        emissive={isSelected ? '#FF9E2C' : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  );
}
