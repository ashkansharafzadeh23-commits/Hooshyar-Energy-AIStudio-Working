export interface IAdsRepository {
  createAd(ad: any): any;
  updateAd(id: string, updates: any): any;
  getAds(placement?: string): any[];
  getAllAds(status?: string): any[];
  getAdById(id: string): any;
  getUserAds(userId: string): any[];
  updateAdStatus(id: string, status: "pending_review" | "active" | "expired" | "rejected", metadata?: { reviewedBy?: string; reviewedAt?: string; rejectionReason?: string }): any;
}
