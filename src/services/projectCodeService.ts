import { projectRepository } from '../repositories/projectRepository.js';

export function generateProjectCode(): string {
  const allProjects = projectRepository.findAll() || [];
  let maxNum = 0;
  for (const p of allProjects) {
    if (p.projectCode && typeof p.projectCode === 'string') {
      const match = p.projectCode.match(/HSE-IR-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(6, '0');
  return `HSE-IR-${padded}`;
}
