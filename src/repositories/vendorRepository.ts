import { db } from '../db/index.js';

export const vendorRepository = {
  findAll: () => db.getVendors(),
  findById: (id: string) => db.getVendorById(id),
  create: (vendor: any) => db.createVendor(vendor),
  update: (id: string, updates: any) => (db as any).updateVendor(id, updates),
};
