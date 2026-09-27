import { JSONProjectRepository } from './JSONProjectRepository.js';
import { IProjectRepository } from './interfaces/IProjectRepository.js';

export const projectRepository: IProjectRepository = new JSONProjectRepository();
