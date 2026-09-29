export interface IAdsRepository {
  createAd(ad: any): any;
  getAds(placement?: string): any[];
  getAllAds(status?: string): any[];
  getAdById(id: string): any;
  updateAdStatus(id: string, status: "pending_review" | "active" | "expired" | "rejected", metadata?: { reviewedBy?: string; reviewedAt?: string; rejectionReason?: string }): any;
}
