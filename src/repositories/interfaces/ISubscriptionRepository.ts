export interface ISubscriptionRepository {
  getSubscriptionPlans(): any[];
  getSubscriptionPlanById(id: string): any;
  createSubscription(sub: any): any;
  getSubscriptionById(id: string): any;
  getUserSubscriptions(userId: string): any[];
  createTransaction(tx: any): any;
  updateTransaction(id: string, updates: any): any;
  updateTransactionAuthority(id: string, authority: string): any;
  updateTransactionStatus(id: string, status: string): any;
  getTransactionByAuthority(authority: string): any;
}
