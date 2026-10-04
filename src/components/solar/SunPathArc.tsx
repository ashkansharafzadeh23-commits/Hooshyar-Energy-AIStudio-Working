import React, { useMemo } from 'react';
import * as THREE from 'three';
import { usePlacementStore } from '../../store/usePlacementStore';
import { getSolarState } from '../../utils/solarCalculations';

export function SunPathArc() {
  const { timeOfDay, showSunPath, buildingType } = usePlacementStore();

  const radius = useMemo(() => {
    switch (buildingType) {
      case 'factory': return 75;
      case 'warehouse': return 65;
      case 'farm': return 50;
      case 'house': default: return 45;
    }
  }, [buildingType]);

  const buildingRoofHeight = useMemo(() => {
    switch (buildingType) {
      case 'factory': return 9.5;
      case 'warehouse': return 10.5;
      case 'farm': return 9.0;
      case 'house': default: return 7.5;
    }
  }, [buildingType]);

  // Arc path representing solar trajectory from East (+X) across South (+Z) to West (-X)
  const segments = 64;
  const lineObject = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 to 1
      const phi = t * Math.PI; // 0 to PI
      const x = Math.cos(phi) * radius; // +R (East) -> 0 -> -R (West)
      const y = Math.sin(phi) * (radius * 0.82); // 0 -> peak zenith -> 0
      const z = Math.sin(phi) * (radius * 0.55); // 0 -> South tilt (+Z) -> 0
      pts.push(new THREE.Vector3(x, Math.max(0.2, y), z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: '#f59e0b',
      dashSize: 2.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.45,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [radius]);

  // Synchronized Canonical Solar State
  const solar = useMemo(() => getSolarState(timeOfDay, radius), [timeOfDay, radius]);
  const { sunVector, isNight } = solar;

  // Thin directional sun ray from current sun position to roof center
  const rayLineObject = useMemo(() => {
    if (isNight) return null;
    const roofCenter = new THREE.Vector3(0, buildingRoofHeight, 0);
    const geom = new THREE.BufferGeometry().setFromPoints([sunVector, roofCenter]);
    const mat = new THREE.LineDashedMaterial({
      color: '#fbbf24',
      dashSize: 1.5,
      gapSize: 2.0,
      transparent: true,
      opacity: 0.35,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [isNight, sunVector, buildingRoofHeight]);

  if (!showSunPath) return null;

  return (
    <group>
      {/* 1. Curved Celestial Sun Trajectory Arc */}
      <primitive object={lineObject} />

      {/* 2. Visual Sun Celestial Sphere & Corona (Derived from shared solar state) */}
      {!isNight && (
        <group position={sunVector}>
          {/* Glowing Sun Core */}
          <mesh>
            <sphereGeometry args={[2.5, 24, 24]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          {/* Subtle Outer Corona Halo */}
          <mesh>
            <sphereGeometry args={[4.2, 24, 24]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.25} />
          </mesh>
        </group>
      )}

      {/* 3. Subtle Directional Sunlight Ray from Sun to Roof */}
      {!isNight && rayLineObject && (
        <primitive object={rayLineObject} />
      )}

      {/* 4. Cardinal Solar Compass Points */}
      {/* East (شرق) */}
      <group position={[radius + 2, 0.2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* South (جنوب - Primary PV Orientation) */}
      <group position={[0, 0.2, radius * 0.55 + 3]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.0, 16]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* West (غرب) */}
      <group position={[-radius - 2, 0.2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 16]} />
          <meshBasicMaterial color="#ea580c" transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}
