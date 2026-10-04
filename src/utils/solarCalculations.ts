import * as THREE from 'three';

export interface SolarState {
  timeOfDay: number; // 0 to 24
  isNight: boolean;
  sunPosition: [number, number, number];
  sunVector: THREE.Vector3;
  sunColor: string;
  ambientColor: string;
  lightIntensity: number;
  shadowCameraExtents: number;
}

/**
 * Canonical Solar Position & Lighting Engine
 * Shared synchronously between SceneCanvas (DirectionalLight, Sky, Ambient)
 * and SunPathArc (Celestial Sun Orb, Trajectory Arc, Solar Rays).
 *
 * Trajectory:
 *  06:00 - Low morning sun from East (+X) -> casts long shadows West (-X)
 *  12:00 - High zenith sun from South (+Z) -> casts short shadows North (-Z)
 *  18:00 - Low evening sun from West (-X) -> casts long shadows East (+X)
 */
export function getSolarState(timeOfDay: number, radius: number = 55): SolarState {
  // Clamp daylight calculation between 05:30 and 18:30
  const isNight = timeOfDay < 5.25 || timeOfDay > 18.75;
  const daylight = Math.max(5.25, Math.min(18.75, timeOfDay));
  const t = (daylight - 5.25) / 13.5; // 0 (dawn) -> 0.5 (noon) -> 1.0 (dusk)
  const phi = Math.max(0, Math.min(Math.PI, t * Math.PI));

  // Trajectory coordinates
  // East is +X, West is -X
  const x = Math.cos(phi) * radius;
  // Zenith peak at noon
  const y = Math.sin(phi) * (radius * 0.82);
  // Solar azimuth bias towards geographic South (+Z in our scene coordinate frame)
  const z = Math.sin(phi) * (radius * 0.55);

  const sunVector = new THREE.Vector3(x, Math.max(0.2, y), z);

  // Sunlight and ambient light color modulation based on solar altitude
  const sc = new THREE.Color('#fffef0');
  const ac = new THREE.Color('#ffffff');
  let intensity = Math.sin(phi);

  if (timeOfDay >= 5.25 && timeOfDay < 7.5) {
    // Dawn golden hour: warm amber morning light from East
    const p = (timeOfDay - 5.25) / 2.25;
    sc.lerpColors(new THREE.Color('#ea580c'), new THREE.Color('#fef08a'), p);
    ac.lerpColors(new THREE.Color('#0f172a'), new THREE.Color('#64748b'), p);
    intensity = Math.max(0.4, intensity * 1.5);
  } else if (timeOfDay >= 16.5 && timeOfDay <= 18.75) {
    // Dusk golden hour: deep warm golden evening light from West
    const p = (timeOfDay - 16.5) / 2.25;
    sc.lerpColors(new THREE.Color('#fde047'), new THREE.Color('#c2410c'), p);
    ac.lerpColors(new THREE.Color('#64748b'), new THREE.Color('#1e1b4b'), p);
    intensity = Math.max(0.4, (1 - p) * 1.5);
  } else if (isNight) {
    // Cool architectural nighttime ambient with legible moonlight
    sc.set('#93c5fd');
    ac.set('#1e293b');
    intensity = 0.45;
  } else {
    // Clean, high-CRI natural 5500K daylighting
    sc.set('#fffef5');
    ac.set('#e2e8f0');
    intensity = Math.max(0.7, intensity * 2.0);
  }

  // Position for directional light
  const lightPosition: [number, number, number] = isNight
    ? [-x, 15, -z]
    : [x, Math.max(y, 8), z];

  return {
    timeOfDay,
    isNight,
    sunPosition: lightPosition,
    sunVector,
    sunColor: sc.getStyle(),
    ambientColor: ac.getStyle(),
    lightIntensity: intensity,
    shadowCameraExtents: radius * 0.8
  };
}
