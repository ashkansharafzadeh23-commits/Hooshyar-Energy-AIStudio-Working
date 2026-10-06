import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Upload, 
  Loader2, 
  Check, 
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrencyIRR } from '../../../utils/formatters';
import { PersianConfirmModal } from '../../../components/common/PersianConfirmModal';
import { useToast } from '../../../context/ToastContext';
import {
  VendorProductItem,
  getVendorProducts,
  createVendorProduct,
  updateVendorProduct,
  updateVendorProductAvailability,
  deleteVendorProduct,
  uploadPartnerMedia
} from '../../../services/partnerMediaService';

export interface ProductManagementProps {
  previewMode?: boolean;
  initialProducts?: VendorProductItem[];
}

export const DEV_PREVIEW_PRODUCTS: VendorProductItem[] = [
  { 
    id: 'prod_dev_01', 
    name: 'پنل خورشیدی JA Solar 550W هالف سل', 
    category: 'پنل خورشیدی', 
    brand: 'JA Solar', 
    model: 'JAM54S31-550/MR', 
    price: 4500000, 
    inStock: true,
    availability: 'AVAILABLE',
    warrantyYears: 12,
    description: '۵۵۰ وات مونوکریستال، راندمان ۲۱.۳٪',
    images: []
  },
  { 
    id: 'prod_dev_02', 
    name: 'اینورتر خورشیدی ۵ کیلووات متصل به شبکه Growatt', 
    category: 'اینورتر', 
    brand: 'Growatt', 
    model: 'MIN 5000TL-X', 
    price: 32000000, 
    inStock: true,
    availability: 'AVAILABLE',
    warrantyYears: 5,
    description: 'تک فاز، راندمان ۹۸.۴٪، مانیتورینگ وای‌فای',
    images: []
  },
  { 
    id: 'prod_dev_03', 
    name: 'باتری خورشیدی ۱۰۰ آمپر ساعت ژل دیپ سایکل صبا', 
    category: 'باتری', 
    brand: 'Saba Battery', 
    model: '12V 100Ah Deep Cycle', 
    price: 6500000, 
    inStock: false,
    availability: 'UNAVAILABLE',
    warrantyYears: 2,
    description: '۱۲ ولت، ژل سیلد، مناسب سیستم‌های آفگرید',
    images: []
  },
  { 
    id: 'prod_dev_04', 
    name: 'استراکچر آلومینیومی سقفی مقاوم در برابر باد', 
    category: 'استراکچر', 
    brand: 'Hooshyar Mount', 
    model: 'AL-ROOF-01', 
    price: 1200000, 
    inStock: true,
    availability: 'AVAILABLE',
    warrantyYears: 10,
    description: 'آلیاژ ۶۰۰۵-T5، مقاوم تا ۱۲۰ کیلومتر باد',
    images: []
  }
];

export default function ProductManagement({
  previewMode = false,
  initialProducts
}: ProductManagementProps) {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<VendorProductItem[]>(() => {
    if (previewMode) {
      return initialProducts !== undefined ? initialProducts : DEV_PREVIEW_PRODUCTS;
    }
    return initialProducts || [];
  });
  const [loading, setLoading] = useState(!previewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('همه');
  
  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<VendorProductItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'پنل خورشیدی',
    brand: '',
    model: '',
    price: '',
    warrantyYears: '5',
    description: '',
    availability: 'AVAILABLE' as 'AVAILABLE' | 'UNAVAILABLE',
    images: [] as string[]
  });

  const loadProducts = async () => {
    if (previewMode) return;
    try {
      setLoading(true);
      const items = await getVendorProducts();
      setProducts(items);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [previewMode]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'پنل خورشیدی',
      brand: '',
      model: '',
      price: '',
      warrantyYears: '5',
      description: '',
      availability: 'AVAILABLE',
      images: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: VendorProductItem) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      brand: p.brand || '',
      model: p.model || '',
      price: p.price ? String(p.price) : '',
      warrantyYears: p.warrantyYears ? String(p.warrantyYears) : '0',
      description: p.description || '',
      availability: p.availability || (p.inStock ? 'AVAILABLE' : 'UNAVAILABLE'),
      images: Array.isArray(p.images) ? p.images : []
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewMode) {
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, images: [url, ...prev.images] }));
      showSuccess('تصویر در پیش‌نمایش بارگذاری شد.', 'پیش‌نمایش تصویر');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await uploadPartnerMedia(file, 'VENDOR_PRODUCT');
      setFormData(prev => ({
        ...prev,
        images: [res.downloadUrl, ...prev.images]
      }));
      showSuccess('تصویر کالا با موفقیت بارگذاری شد.', 'بارگذاری موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در بارگذاری تصویر کالا.', 'خطای بارگذاری');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const payload = {
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      model: formData.model,
      price: formData.price ? Number(formData.price) : undefined,
      warrantyYears: formData.warrantyYears ? Number(formData.warrantyYears) : 0,
      description: formData.description,
      availability: formData.availability,
      inStock: formData.availability === 'AVAILABLE',
      images: formData.images
    };

    if (previewMode) {
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p));
        showSuccess('محصول در پیش‌نمایش ویرایش شد.', 'ویرایش کالا');
      } else {
        const created: VendorProductItem = {
          id: `prod_dev_${Date.now()}`,
          ...payload
        };
        setProducts(prev => [created, ...prev]);
        showSuccess('محصول جدید در پیش‌نمایش اضافه شد.', 'ثبت کالا');
      }
      setIsModalOpen(false);
      return;
    }

    try {
      setSubmitting(true);
      if (editingProduct) {
        const updated = await updateVendorProduct(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        showSuccess('اطلاعات محصول با موفقیت به‌روزرسانی شد.', 'ویرایش موفق');
      } else {
        const created = await createVendorProduct(payload);
        setProducts(prev => [created, ...prev]);
        showSuccess('محصول با موفقیت در کاتالوگ فروشگاه ثبت شد.', 'ثبت کالا');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'خطا در ذخیره محصول.', 'خطای عملیات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (product: VendorProductItem) => {
    const current = product.availability || (product.inStock ? 'AVAILABLE' : 'UNAVAILABLE');
    const newStatus: 'AVAILABLE' | 'UNAVAILABLE' = current === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';

    if (previewMode) {
      setProducts(prev => prev.map(p => p.id === product.id ? {
        ...p,
        availability: newStatus,
        inStock: newStatus === 'AVAILABLE'
      } : p));
      showSuccess(`وضعیت به ${newStatus === 'AVAILABLE' ? 'موجود' : 'ناموجود'} تغییر یافت.`, 'تغییر موجودی');
      return;
    }

    try {
      await updateVendorProductAvailability(product.id, newStatus);
      setProducts(prev => prev.map(p => p.id === product.id ? {
        ...p,
        availability: newStatus,
        inStock: newStatus === 'AVAILABLE'
      } : p));
      showSuccess(`وضعیت محصول به ${newStatus === 'AVAILABLE' ? 'موجود' : 'ناموجود'} تغییر یافت.`, 'موجودی انبار');
    } catch (err: any) {
      showError(err.message || 'خطا در تغییر وضعیت موجودی.', 'خطای عملیات');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    if (previewMode) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setProductToDelete(null);
      showSuccess('محصول از پیش‌نمایش حذف شد.', 'حذف کالا');
      return;
    }

    try {
      await deleteVendorProduct(productToDelete.id);
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      showSuccess('محصول با موفقیت از کاتالوگ حذف شد.', 'حذف موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در حذف محصول.', 'خطای عملیات');
    } finally {
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.includes(searchTerm) || 
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'همه' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            مدیریت کاتالوگ محصولات و موجودی
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ثبت تجهیزات، بارگذاری تصاویر و کنترل وضعیت موجودی (موجود / ناموجود)
          </p>
        </div>
        
        <button 
          type="button"
          onClick={openAddModal}
          className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0 min-h-[44px] cursor-pointer"
        >
          <Plus size={18} />
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
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
          <option value="سایر تجهیزات">سایر تجهیزات</option>
        </select>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
          <Loader2 className="animate-spin mx-auto mb-2 text-[#0284C7]" size={28} />
          در حال دریافت کاتالوگ محصولات...
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              هنوز محصولی برای این حساب ثبت نشده است.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              شما می‌توانید تجهیزات خورشیدی خود را همراه با تصویر، مشخصات فنی و وضعیت موجودی انبار ثبت نمایید.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-[#0284C7] text-white px-5 py-2.5 rounded-xl font-bold text-xs min-h-[44px]"
          >
            <Plus size={16} />
            ثبت اولین محصول
          </button>
        </div>
      ) : (
        /* Product Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map(product => {
            const isAvail = product.availability === 'AVAILABLE' || (product.availability !== 'UNAVAILABLE' && product.inStock !== false);
            const firstImg = product.images?.[0];

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-full h-44 bg-slate-100 dark:bg-zinc-800 rounded-xl mb-3 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden relative">
                    {firstImg ? (
                      <img src={firstImg} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                        <Package size={32} />
                        <span className="text-[10px]">بدون تصویر</span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 bg-white/95 dark:bg-zinc-900/95 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-200 dark:border-zinc-700">
                      {product.category}
                    </div>

                    {/* Quick Availability Badge */}
                    <div className="absolute bottom-2 left-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(product)}
                        title="برای تغییر وضعیت موجودی کلیک کنید"
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded shadow-xs transition-colors cursor-pointer ${
                          isAvail 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-slate-700 hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        {isAvail ? <Check size={12} /> : <XCircle size={12} />}
                        <span>{isAvail ? 'موجود در انبار' : 'ناموجود'}</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    {product.name}
                  </h3>

                  {(product.brand || product.model) && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      {product.brand} {product.model ? `(${product.model})` : ''}
                    </div>
                  )}

                  {product.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">قیمت:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {product.price && product.price > 0 ? formatCurrencyIRR(product.price) : 'استعلامی'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="ویرایش محصول"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="حذف محصول"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {editingProduct ? 'ویرایش کالا در کاتالوگ' : 'افزودن محصول جدید به کاتالوگ'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نام کامل محصول <span className="text-red-500">*</span>
                </label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: پنل خورشیدی ۵۵۰ وات مونوکریستال JA Solar"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">دسته‌بندی</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  >
                    <option value="پنل خورشیدی">پنل خورشیدی</option>
                    <option value="اینورتر">اینورتر</option>
                    <option value="باتری">باتری</option>
                    <option value="استراکچر">استراکچر</option>
                    <option value="سایر تجهیزات">سایر تجهیزات</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">وضعیت موجودی انبار</label>
                  <select 
                    value={formData.availability}
                    onChange={e => setFormData({ ...formData, availability: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  >
                    <option value="AVAILABLE">موجود در انبار (AVAILABLE)</option>
                    <option value="UNAVAILABLE">ناموجود (UNAVAILABLE)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">برند / شرکت سازنده</label>
                  <input 
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="مثال: Growatt / Longi"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مدل یا پارت‌نامبر</label>
                  <input 
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder="مثال: MIN-5000TL"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">قیمت واحد (تومان)</label>
                  <input 
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="مثال: ۴۵۰۰۰۰۰"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مدت گارانتی (سال)</label>
                  <input 
                    type="number"
                    value={formData.warrantyYears}
                    onChange={e => setFormData({ ...formData, warrantyYears: e.target.value })}
                    placeholder="مثال: ۵"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شرح مشخصات فنی</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="شرح کوتاه ویژگی‌های الکتریکی، راندمان، ابعاد و شرایط تحویل..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              {/* Product Images Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تصاویر محصول (مخزن امن ابری)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden group">
                      <img src={img} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="حذف تصویر"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-slate-400 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors cursor-pointer shrink-0">
                    {uploadingImage ? (
                      <Loader2 className="animate-spin text-[#0284C7]" size={20} />
                    ) : (
                      <>
                        <Upload size={18} />
                        <span className="text-[9px] font-bold mt-0.5">افزودن</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp" 
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-bold min-h-[44px] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingProduct ? 'ذخیره تغییرات' : 'ثبت محصول'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <PersianConfirmModal 
        isOpen={Boolean(productToDelete)}
        title="حذف محصول از کاتالوگ"
        message={`آیا از حذف محصول «${productToDelete?.name}» اطمینان دارید؟ این عمل غیرقابل بازگشت است.`}
        confirmText="حذف نهایی"
        cancelText="انصراف"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setProductToDelete(null)}
      />
    </div>
  );
}
