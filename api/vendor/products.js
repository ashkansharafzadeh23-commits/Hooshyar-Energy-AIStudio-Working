import { db } from "../../src/db/index.js";

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { vendorId, category, brand, model, specs, price, images, description, inStock, warrantyYears } = req.body;
    
    if (!vendorId || !category || !brand || !model || price === undefined) {
      return res.status(400).json({ error: "فیلدهای الزامی محصول وارد نشده‌اند." });
    }

    try {
      const vendor = db.getVendorById(vendorId);
      if (!vendor) {
         return res.status(404).json({ error: "فروشنده یافت نشد." });
      }

      const newProduct = db.createProduct({
        vendorId,
        category,
        brand,
        model,
        specs: specs || {},
        price: Number(price),
        currency: "IRR",
        images: images || [],
        description: description || "",
        inStock: inStock !== undefined ? inStock : true,
        warrantyYears: warrantyYears || 0
      });

      return res.status(200).json({ message: "محصول با موفقیت اضافه شد", product: newProduct });
    } catch (error) {
      console.error("Create Product Error:", error);
      return res.status(500).json({ error: "خطا در ثبت محصول" });
    }
  } 
  else if (req.method === 'GET') {
    const { vendorId } = req.query;
    
    if (!vendorId) {
      return res.status(400).json({ error: "vendorId الزامی است." });
    }

    try {
      const allProducts = db.getProducts();
      const vendorProducts = allProducts.filter(p => p.vendorId === vendorId);
      
      return res.status(200).json({ products: vendorProducts });
    } catch (error) {
      console.error("Get Products Error:", error);
      return res.status(500).json({ error: "خطا در دریافت لیست محصولات" });
    }
  } 
  else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
