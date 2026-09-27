import React from "react";
import { useState } from 'react';
import { Plus, Edit3, Trash2, Search, X, Upload, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductManagement() {
  const [products, setProducts] = useState([
    { id: 1, name: 'پنل خورشیدی JA Solar 550W', category: 'پنل خورشیدی', price: 4500000, stock: true },
    { id: 2, name: 'اینورتر 5kW Growatt', category: 'اینورتر', price: 32000000, stock: true },
    { id: 3, name: 'باتری 100Ah صبا', category: 'باتری', price: 6500000, stock: false },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'پنل خورشیدی',
    price: '',
    description: '',
    technicalSpecs: '',
    stock: true
  });
  
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      // In a real app, you would upload these to a server and get URLs.
      // Here we just use createObjectURL for preview.
      const newImages = filesArray.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    
    setProducts(prev => [
      {
        id: Date.now(),
        name: newProduct.name,
        category: newProduct.category,
        price: Number(newProduct.price),
        stock: newProduct.stock
      },
      ...prev
    ]);
    
    setIsModalOpen(false);
    setNewProduct({
      name: '',
      category: 'پنل خورشیدی',
      price: '',
      description: '',
      technicalSpecs: '',
      stock: true
    });
    setImages([]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 relative"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E4E7EC] pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1D23]">مدیریت محصولات</h1>
          <p className="text-sm text-[#5A6072] mt-1">افزودن، ویرایش و بروزرسانی قیمت و موجودی محصولات</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#FF9E2C] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#E8590C] transition-colors shadow-sm shrink-0"
        >
          <Plus size={18} />
          محصول جدید
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#E4E7EC] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#E4E7EC] flex gap-4 bg-[#F7F8FA]/50">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6072]" />
            <input 
              type="text" 
              placeholder="جستجوی محصول..."
              className="w-full border border-[#E4E7EC] rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-[#FF9E2C]"
            />
          </div>
          <select className="border border-[#E4E7EC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF9E2C] text-[#5A6072] bg-white">
            <option>همه دسته‌ها</option>
            <option>پنل خورشیدی</option>
            <option>اینورتر</option>
            <option>باتری</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F7F8FA] text-[#5A6072] border-b border-[#E4E7EC]">
              <tr>
                <th className="px-6 py-4 font-bold">نام محصول</th>
                <th className="px-6 py-4 font-bold">دسته‌بندی</th>
                <th className="px-6 py-4 font-bold">قیمت (تومان)</th>
                <th className="px-6 py-4 font-bold">وضعیت موجودی</th>
                <th className="px-6 py-4 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-[#E4E7EC] hover:bg-[#F7F8FA]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1A1D23]">{product.name}</td>
                  <td className="px-6 py-4 text-[#5A6072]">{product.category}</td>
                  <td className="px-6 py-4 font-bold">{product.price.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                      product.stock 
                        ? 'bg-[#1F9254]/10 text-[#1F9254] border border-[#1F9254]/20' 
                        : 'bg-[#D64545]/10 text-[#D64545] border border-[#D64545]/20'
                    }`}>
                      {product.stock ? 'موجود' : 'ناموجود'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ویرایش">
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => setProducts(products.filter(p => p.id !== product.id))}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-10 p-6 sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-4 mb-6 sticky top-0 bg-white z-20">
                <h2 className="text-xl font-black text-[#1A1D23]">ثبت محصول جدید</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-[#5A6072] hover:bg-[#F7F8FA] rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                {/* Images */}
                <div>
                  <label className="block text-sm font-bold text-[#1A1D23] mb-3">تصاویر محصول (حداکثر ۵ تصویر)</label>
                  <div className="flex flex-wrap gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl border border-[#E4E7EC] overflow-hidden group">
                        <img src={img} alt={`product-${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        >
                          <XCircle size={24} />
                        </button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <label className="w-24 h-24 border-2 border-dashed border-[#E4E7EC] rounded-xl flex flex-col items-center justify-center text-[#5A6072] hover:border-[#FF9E2C] hover:text-[#FF9E2C] transition-colors cursor-pointer bg-[#F7F8FA]">
                        <Upload size={20} className="mb-1" />
                        <span className="text-[10px] font-bold">آپلود عکس</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">نام محصول</label>
                    <input 
                      required
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors"
                      placeholder="مثال: پنل 550 وات فلان"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">دسته‌بندی</label>
                    <select 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors bg-white"
                    >
                      <option>پنل خورشیدی</option>
                      <option>اینورتر</option>
                      <option>باتری</option>
                      <option>ژنراتور</option>
                      <option>تجهیزات نصب</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">قیمت (تومان)</label>
                    <input 
                      type="number"
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors"
                      placeholder="۴,۵۰۰,۰۰۰"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">وضعیت موجودی</label>
                    <select 
                      value={newProduct.stock ? 'true' : 'false'}
                      onChange={e => setNewProduct({...newProduct, stock: e.target.value === 'true'})}
                      className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors bg-white"
                    >
                      <option value="true">موجود در انبار</option>
                      <option value="false">ناموجود</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">توضیحات معرفی محصول</label>
                  <textarea 
                    rows={4}
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors resize-none"
                    placeholder="ویژگی‌های کلیدی و کاربردهای محصول را بنویسید..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">مشخصات فنی</label>
                  <textarea 
                    rows={4}
                    value={newProduct.technicalSpecs}
                    onChange={e => setNewProduct({...newProduct, technicalSpecs: e.target.value})}
                    className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors resize-none"
                    placeholder="ابعاد، وزن، راندمان، ولتاژ، گارانتی و..."
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-4 border-t border-[#E4E7EC]">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-[#5A6072] hover:bg-[#F7F8FA] transition-colors border border-[#E4E7EC]"
                  >
                    انصراف
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#FF9E2C] text-white hover:bg-[#E8590C] transition-colors shadow-sm"
                  >
                    ثبت و ذخیره محصول
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
