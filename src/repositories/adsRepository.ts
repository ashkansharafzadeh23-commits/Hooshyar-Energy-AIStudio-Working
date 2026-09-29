import { db } from '../db/index.js';
import { IAdsRepository } from './interfaces/IAdsRepository.js';

export class JSONAdsRepository implements IAdsRepository {
  createAd(ad: any) { return db.createAd(ad); }
  getAds(placement?: string) { return db.getAds(placement); }
  getAllAds(status?: string) { return db.getAllAds(status); }
  getAdById(id: string) { return db.getAdById(id); }
  updateAdStatus(id: string, status: "pending_review" | "active" | "expired" | "rejected", metadata?: { reviewedBy?: string; reviewedAt?: string; rejectionReason?: string }) {
    return db.updateAdStatus(id, status, metadata);
  }
}

export const adsRepository: IAdsRepository = new JSONAdsRepository();
