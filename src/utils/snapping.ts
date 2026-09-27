export function snapToGrid(value: number, gridSize: number = 0.5): number {
  return Math.round(value / gridSize) * gridSize;
}

export function checkOverlap(pos1: [number, number, number], pos2: [number, number, number], sizeX: number, sizeY: number): boolean {
  const dx = Math.abs(pos1[0] - pos2[0]);
  const dz = Math.abs(pos1[2] - pos2[2]);
  return dx < sizeX && dz < sizeY;
}
