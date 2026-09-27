export function exportCanvasToPNG(filename: string = 'solar-plan.png') {
  const canvas = document.querySelector(`canvas`) as HTMLCanvasElement;
  if (!canvas) return;
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  a.click();
}
