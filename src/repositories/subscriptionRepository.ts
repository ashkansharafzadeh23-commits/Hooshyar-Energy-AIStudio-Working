import { db } from '../db/index.js';
import { ISubscriptionRepository } from './interfaces/ISubscriptionRepository.js';

export class JSONSubscriptionRepository implements ISubscriptionRepository {
  getSubscriptionPlans() { return db.getSubscriptionPlans(); }
  getSubscriptionPlanById(id: string) { return db.getSubscriptionPlanById(id); }
  createSubscription(sub: any) { return db.createSubscription(sub); }
  getSubscriptionById(id: string) { return db.getSubscriptionById(id); }
  getUserSubscriptions(userId: string) { return db.getUserSubscriptions(userId); }
  createTransaction(tx: any) { return db.createTransaction(tx); }
  updateTransaction(id: string, updates: any) { return db.updateTransaction(id, updates); }
  updateTransactionAuthority(id: string, authority: string) { return db.updateTransactionAuthority(id, authority); }
  updateTransactionStatus(id: string, status: string) { return db.updateTransactionStatus(id, status); }
  getTransactionByAuthority(authority: string) { return db.getTransactionByAuthority(authority); }
}

export const subscriptionRepository: ISubscriptionRepository = new JSONSubscriptionRepository();
