import React from "react";
import { useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfileEdit() {
  const [formData, setFormData] = useState({
    name: 'نیرو گستران پارس',
    description: 'تامین کننده تجهیزات انرژی خورشیدی و ژنراتور',
    address: 'تهران، خیابان لاله‌زار، مجتمع تجاری...',
    phone: '021-12345678',
    website: 'www.nirogoostar.com',
    lat: '35.6892',
    lng: '51.3890',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('اطلاعات با موفقیت ذخیره شد.');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="border-b border-[#E4E7EC] pb-4">
        <h1 className="text-2xl font-black text-[#1A1D23]">پروفایل شرکت</h1>
        <p className="text-sm text-[#5A6072] mt-1">اطلاعات عمومی فروشگاه که به مشتریان نمایش داده می‌شود</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-3xl border border-[#E4E7EC] shadow-sm">
        
        {/* Logo Upload */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-[#F7F8FA] border-2 border-dashed border-[#E4E7EC] rounded-2xl flex flex-col items-center justify-center text-[#5A6072] hover:border-[#FF9E2C] hover:text-[#FF9E2C] transition-colors cursor-pointer relative overflow-hidden">
            <Camera size={24} className="mb-2" />
            <span className="text-[10px] font-bold">تغییر لوگو</span>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#1A1D23] text-sm mb-1">لوگوی شرکت</h3>
            <p className="text-xs text-[#5A6072] leading-relaxed max-w-sm">
              یک تصویر با فرمت JPG یا PNG و حداکثر حجم ۲ مگابایت با نسبت ابعاد مربعی انتخاب کنید.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#E4E7EC]">
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">نام شرکت / فروشگاه</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">درباره فروشگاه</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors resize-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">شماره تماس ثابت</label>
            <input 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors"
              dir="ltr" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">وب‌سایت (اختیاری)</label>
            <input 
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors"
              dir="ltr" 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">آدرس دقیق</label>
            <textarea 
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF9E2C] transition-colors resize-none" 
            />
          </div>
        </div>

        <div className="pt-6 border-t border-[#E4E7EC] flex justify-end">
          <button 
            type="submit"
            className="bg-[#1A1D23] text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors"
          >
            <Save size={18} />
            ذخیره تغییرات
          </button>
        </div>
      </form>
    </motion.div>
  );
}
