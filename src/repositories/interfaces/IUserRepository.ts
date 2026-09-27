export interface IUserRepository {
  getUserById(id: string): any;
  getUserByPhone(phone: string): any;
  getUsers(): any[];
  createUser(user: any): any;
  updateUser(id: string, updates: any): any;
  saveOTP(phone: string, code: string): void;
  verifyOTP(phone: string, code: string): boolean;
  getHistoryByUserId(userId: string): any[];
}
