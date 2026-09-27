import { db } from "../../src/db/index.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: "شناسه فروشنده (id) الزامی است." });
  }

  try {
    const vendor = db.getVendorById(id);
    if (!vendor) {
      return res.status(404).json({ error: "فروشنده یافت نشد." });
    }

    // Omit sensitive/internal fields if necessary, but we'll send the public info
    const vendorInfo = {
      companyName: vendor.companyName,
      logoUrl: vendor.logoUrl,
      aboutUs: vendor.aboutUs,
      address: vendor.address,
      city: vendor.city,
      phones: vendor.phones
    };

    const allProducts = db.getProducts();
    const vendorProducts = allProducts.filter(p => p.vendorId === id);

    return res.status(200).json({
      vendor: vendorInfo,
      products: vendorProducts
    });
  } catch (error) {
    console.error("Get Vendor Error:", error);
    return res.status(500).json({ error: "خطا در دریافت اطلاعات فروشنده" });
  }
}
