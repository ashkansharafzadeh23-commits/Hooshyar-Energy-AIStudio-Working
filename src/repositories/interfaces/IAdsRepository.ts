export interface IAdsRepository {
  createAd(ad: any): any;
  getAds(placement?: string): any[];
}
