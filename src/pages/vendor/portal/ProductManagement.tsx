import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Search, X, CheckCircle2, AlertCircle, Package, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPersianNumber, formatCurrencyIRR } from '../../../utils/formatters';
import { PersianConfirmModal } from '../../../components/common/PersianConfirmModal';

export interface Product {
  id: string | number;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  price: number;
  stock: boolean;
  warrantyYears?: number;
  specs?: string;
}

export interface ProductManagementProps {
  previewMode?: boolean;
  initialProducts?: Product[];
}

export const DEV_PREVIEW_PRODUCTS: Product[] = [
  { 
    id: 'prod_dev_01', 
    name: 'پنل خورشیدی JA Solar 550W هالف سل', 
    category: 'پنل خورشیدی', 
    brand: 'JA Solar', 
    model: 'JAM54S31-550/MR', 
    price: 4500000, 
    stock: true,
    warrantyYears: 12,
    specs: '۵۵۰ وات مونوکریستال، راندمان ۲۱.۳٪'
  },
  { 
    id: 'prod_dev_02', 
    name: 'اینورتر خورشیدی ۵ کیلووات متصل به شبکه Growatt', 
    category: 'اینورتر', 
    brand: 'Growatt', 
    model: 'MIN 5000TL-X', 
    price: 32000000, 
    stock: true,
    warrantyYears: 5,
    specs: 'تک فاز، راندمان ۹۸.۴٪، مانیتورینگ وای‌فای'
  },
  { 
    id: 'prod_dev_03', 
    name: 'باتری خورشیدی ۱۰۰ آمپر ساعت ژل دیپ سایکل صبا', 
    category: 'باتری', 
    brand: 'Saba Battery', 
    model: '12V 100Ah Deep Cycle', 
    price: 6500000, 
    stock: false,
    warrantyYears: 2,
    specs: '۱۲ ولت، ژل سیلد، مناسب سیستم‌های آفگرید'
  },
  { 
    id: 'prod_dev_04', 
    name: 'استراکچر آلومینیومی سقفی مقاوم در برابر باد', 
    category: 'استراکچر', 
    brand: 'Hooshyar Mount', 
    model: 'AL-ROOF-01', 
    price: 1200000, 
    stock: true,
    warrantyYears: 10,
    specs: 'آلیاژ ۶۰۰۵-T5، مقاوم تا ۱۲۰ کیلومتر باد'
  }
];

export default function ProductManagement({
  previewMode = false,
  initialProducts
}: ProductManagementProps) {
  // STRICT SEPARATION: In production (previewMode !== true), NEVER fall back to DEV fixtures
  const [products, setProducts] = useState<Product[]>(() => {
    if (previewMode) {
      return initialProducts !== undefined ? initialProducts : DEV_PREVIEW_PRODUCTS;
    }
    return initialProducts || [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'پنل خورشیدی',
    brand: '',
    model: '',
    price: '',
    specs: '',
    stock: true
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.includes(searchTerm) || 
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'همه' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    
    const created: Product = {
      id: `prod_${Date.now()}`,
      name: newProduct.name,
      category: newProduct.category,
      brand: newProduct.brand || 'عمومی',
      model: newProduct.model || 'استاندارد',
      price: Number(newProduct.price),
      stock: newProduct.stock,
      specs: newProduct.specs
    };

    setProducts(prev => [created, ...prev]);
    setIsModalOpen(false);
    setNewProduct({
      name: '',
      category: 'پنل خورشیدی',
      brand: '',
      model: '',
      price: '',
      specs: '',
      stock: true
    });
  };

  const handleDeleteConfirm = () => {
    if (!productToDelete) return;
    setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
    setProductToDelete(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6 font-sans"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            مدیریت کاتالوگ محصولات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ثبت، به‌روزرسانی قیمت و مدیریت موجودی تجهیزات خورشیدی در کاتالوگ پلتفرم
          </p>
        </div>
        
        {/* Add Product Button: disabled in production because backend persistence is not yet active */}
        {previewMode ? (
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0 min-h-[44px] cursor-pointer"
          >
            <Plus size={18} />
            <span>افزودن محصول جدید (پیش‌نمایش)</span>
          </button>
        ) : (
          <button 
            type="button"
            disabled
            title="ثبت مستقیم محصول در پروداکشن در انتظار تکمیل زیرساخت انبارداری است (فعلاً در دسترس نیست)"
            className="bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700 cursor-not-allowed shrink-0 min-h-[44px]"
          >
            <Plus size={18} />
            <span>افزودن محصول جدید</span>
          </button>
        )}
      </div>

      {/* Production Truthful Notice */}
      {!previewMode && (
        <div className="p-4 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
          <Info size={18} className="text-[#0284C7] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              وضعیت اتصال کاتالوگ تجهیزات
            </span>
            <p className="leading-relaxed text-[11px]">
              یکپارچه‌سازی برخط انبار و ثبت مستقیم تجهیزات فروشگاهی در نسخه جاری در حال ارتقا است. تجهیزات ثبت‌شده از طریق قراردادهای تجاری در این بخش قرار می‌گیرند.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (Only shown if products exist) */}
      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="جستجو بر اساس نام محصول، برند، یا مدل تجهیز..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-zinc-800 min-h-[44px]"
          >
            <option value="همه">همه دسته‌ها</option>
            <option value="پنل خورشیدی">پنل خورشیدی</option>
            <option value="اینورتر">اینورتر</option>
            <option value="باتری">باتری</option>
            <option value="استراکچر">استراکچر</option>
          </select>
        </div>
      )}

      {/* Truthful Empty State when no products exist */}
      {products.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              هنوز محصولی برای این حساب ثبت نشده است.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              تجهیزات و اقلام تأمین پس از اعتبارسنجی بازرگانی و اتصال به انبارداری مرکزی در این کاتالوگ قرار خواهند گرفت.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Products Table */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Package size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-600">محصولی با این مشخصات یافت نشد</p>
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700">
                    <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">نام و مدل کالا</th>
                    <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">دسته‌بندی</th>
                    <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">قیمت واحد</th>
                    <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">وضعیت موجودی</th>
                    <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">مشخصات فنی</th>
                    <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{p.name}</div>
                        {(p.brand || p.model) && (
                          <div dir="ltr" className="text-[11px] text-slate-400 font-mono pt-0.5 text-right">
                            <span className="font-semibold">{p.brand}</span>
                            {p.model && <span className="opacity-80"> • {p.model}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {p.category}
                      </td>
                      <td className="p-3.5 font-black text-blue-700 dark:text-blue-300">
                        {p.price ? `${formatPersianNumber(Math.round(p.price / 10000))} هزار تومان` : <span className="text-slate-400 font-normal">اطلاعات موجود نیست</span>}
                      </td>
                      <td className="p-3.5">
                        {p.stock ? (
                          <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-bold text-[11px] border border-emerald-200">
                            موجود در انبار
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold text-[11px]">
                            ناموجود
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-xs truncate">
                        {p.specs || 'ثبت نشده'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer transition-colors"
                          title="حذف کالا"
                          aria-label="حذف کالا"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Products Cards (No Horizontal Clipping on 320/360/375/390/430px) */}
          <div className="block md:hidden space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200">
                <Package size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-xs">کالایی یافت نشد</p>
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div 
                  key={p.id}
                  className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{p.category}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.name}</h4>
                      {(p.brand || p.model) && (
                        <div dir="ltr" className="text-[11px] text-slate-400 font-mono text-right pt-0.5">
                          <span className="font-semibold">{p.brand}</span>
                          {p.model && <span className="opacity-80"> • {p.model}</span>}
                        </div>
                      )}
                    </div>
                    {p.stock ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px] shrink-0 border border-emerald-200">
                        موجود
                      </span>
                    ) : (
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold text-[10px] shrink-0">
                        ناموجود
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">قیمت:</span>
                      <span className="font-black text-blue-700 dark:text-blue-300">
                        {p.price ? `${formatPersianNumber(Math.round(p.price / 10000))} هزار تومان` : 'نامشخص'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setProductToDelete(p)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 bg-red-50/80 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/60 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer border border-red-200/60 dark:border-red-900/40"
                      title="حذف کالا از کاتالوگ"
                      aria-label={`حذف کالا ${p.name}`}
                    >
                      <Trash2 size={15} />
                      <span className="text-[11px]">حذف کالا</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Add Product Modal (Preview Mode Testing Only) */}
      {isModalOpen && previewMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                  افزودن محصول جدید به کاتالوگ
                </h3>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block pt-0.5">
                  حالت پیش‌نمایش: تغییرات موقت بوده و در دیتابیس سرور ذخیره نمی‌شود.
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نام کامل کالا <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="مثال: پنل خورشیدی ۵۵۰ وات مونوکریستال هالف‌سل"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    دسته‌بندی <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  >
                    <option value="پنل خورشیدی">پنل خورشیدی</option>
                    <option value="اینورتر">اینورتر</option>
                    <option value="باتری">باتری</option>
                    <option value="استراکچر">استراکچر</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    قیمت (ریال) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    required
                    min={1000}
                    placeholder="مثال: ۴۵۰۰۰۰۰"
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">برند</label>
                  <input 
                    type="text"
                    placeholder="JA Solar, Sungrow, ..."
                    value={newProduct.brand}
                    onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مدل</label>
                  <input 
                    type="text"
                    placeholder="JAM54S31"
                    value={newProduct.model}
                    onChange={e => setNewProduct({ ...newProduct, model: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مشخصات فنی خلاصه</label>
                <textarea 
                  rows={2}
                  placeholder="توان نامی، راندمان، استانداردهای تست و تاییدیه توانیر..."
                  value={newProduct.specs}
                  onChange={e => setNewProduct({ ...newProduct, specs: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="inStockCheck"
                  checked={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: e.target.checked })}
                  className="rounded w-4 h-4 text-[#0284C7]"
                />
                <label htmlFor="inStockCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  کالا در حال حاضر موجود در انبار است
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 min-h-[44px] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl font-bold min-h-[44px] shadow-xs cursor-pointer"
                >
                  ذخیره در کاتالوگ (پیش‌نمایش)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal via PersianConfirmModal */}
      <PersianConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        variant="danger"
        title="حذف محصول از کاتالوگ"
        message={`آیا از حذف محصول «${productToDelete?.name || ''}» از کاتالوگ فروشگاه اطمینان دارید؟`}
        confirmText="بله، حذف شود"
        cancelText="انصراف"
      />
    </motion.div>
  );
}
