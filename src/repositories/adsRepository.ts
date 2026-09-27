import { db } from '../db/index.js';
import { IAdsRepository } from './interfaces/IAdsRepository.js';

export class JSONAdsRepository implements IAdsRepository {
  createAd(ad: any) { return db.createAd(ad); }
  getAds(placement?: string) { return db.getAds(placement); }
}

export const adsRepository: IAdsRepository = new JSONAdsRepository();
