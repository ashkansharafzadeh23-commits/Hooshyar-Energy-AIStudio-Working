import { db } from "../../src/db/index.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { companyName, email, categories, address, city, phones, aboutUs } = req.body;

  if (!companyName || !email) {
    return res.status(400).json({ error: "نام شرکت و ایمیل الزامی است." });
  }

  try {
    const newVendor = db.createVendor({
      companyName,
      logoUrl: "",
      aboutUs: aboutUs || "",
      categories: categories || [],
      address: address || "",
      city: city || "",
      phones: phones || [],
      website: "",
    });

    return res.status(200).json({ 
      vendorId: newVendor.id, 
      status: newVendor.status 
    });
  } catch (error) {
    console.error("Vendor Registration Error:", error);
    return res.status(500).json({ error: "خطا در ثبت فروشنده" });
  }
}
