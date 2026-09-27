import { db } from '../db/index.js';
import { IUserRepository } from './interfaces/IUserRepository.js';

export class JSONUserRepository implements IUserRepository {
  getUserById(id: string) { return db.getUserById(id); }
  getUserByPhone(phone: string) { return db.getUserByPhone(phone); }
  getUsers() { return db.getUsers(); }
  createUser(user: any) { return db.createUser(user); }
  updateUser(id: string, updates: any) { return db.updateUser(id, updates); }
  saveOTP(phone: string, code: string) { db.saveOTP(phone, code); }
  verifyOTP(phone: string, code: string) { return db.verifyOTP(phone, code); }
  getHistoryByUserId(userId: string) { return db.getHistoryByUserId(userId); }
}

export const userRepository: IUserRepository = new JSONUserRepository();
