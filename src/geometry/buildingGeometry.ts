import * as THREE from 'three';
import { RoofConfig } from '../types/solar';

export function getRoofPlane(config: RoofConfig, width: number, depth: number) {
  const tiltRad = THREE.MathUtils.degToRad(config.tilt);
  const normal = new THREE.Vector3(0, Math.cos(tiltRad), Math.sin(tiltRad)).normalize();
  return { normal };
}
