import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Upload, Play, Eye, Home, ShieldAlert, LogIn, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PersianPromptModal } from '../../components/common/PersianPromptModal';
import { PersianConfirmModal } from '../../components/common/PersianConfirmModal';

export default function MyProjects() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const [uploadDocModalProjectId, setUploadDocModalProjectId] = useState<string | null>(null);
  const [submitReviewProjectId, setSubmitReviewProjectId] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    city: '',
    capacityKw: '',
    technology: 'monocrystalline',
    projectLifetimeYears: '25'
  });

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/assets", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // Just keeping the ones owned by user (though API should handle this if not ADMIN)
        setProjects(data.filter((p: any) => p.ownerId === user?.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUser(null);
          setAuthLoading(false);
          return;
        }

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const userRoles: string[] = user ? (Array.isArray(user.roles) ? user.roles : [user.role || 'CUSTOMER']) : [];
  const isProjectOwner = userRoles.some(r => r.toUpperCase() === "PROJECT_OWNER");
  const isAdmin = userRoles.some(r => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "SUPER_ADMIN");
  const isPendingReview = userRoles.some(r => r.toUpperCase() === "PROJECT_OWNER_PENDING");

  useEffect(() => {
    if (authLoading) return;
    if (user && (isProjectOwner || isAdmin)) {
      fetchProjects();
    }
  }, [authLoading, user, isProjectOwner, isAdmin]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectName: formData.projectName,
          location: { city: formData.city, lat: null, lon: null },
          capacityKw: Number(formData.capacityKw),
          technology: formData.technology,
          projectLifetimeYears: Number(formData.projectLifetimeYears)
        })
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ projectName: '', city: '', capacityKw: '', technology: 'monocrystalline', projectLifetimeYears: '25' });
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = (projectId: string) => {
    setUploadDocModalProjectId(projectId);
  };

  const handleUploadDocSubmit = async (values: Record<string, string>) => {
    if (!uploadDocModalProjectId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/assets/${uploadDocModalProjectId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ documentType: values.documentType, fileUrl: values.fileUrl })
      });
      if (res.ok) {
        showSuccess("مدرک با موفقیت برای پروژه بارگذاری گردید.");
        setUploadDocModalProjectId(null);
        fetchProjects();
      } else {
        const errJson = await res.json().catch(() => ({}));
        showError(errJson.error || "خطا در بارگذاری مدرک");
      }
    } catch (err: any) {
      showError(err.message || "خطا در ارتباط با سرور");
    }
  };

  const handleSubmitForReview = (projectId: string) => {
    setSubmitReviewProjectId(projectId);
  };

  const handleConfirmSubmitForReview = async () => {
    if (!submitReviewProjectId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/assets/${submitReviewProjectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectStatus: "SUBMITTED" })
      });
      if (res.ok) {
        showSuccess("پروژه برای بررسی کارشناسان ارسال شد.");
        setSubmitReviewProjectId(null);
        fetchProjects();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "خطا در ارسال پروژه");
      }
    } catch (err: any) {
      showError(err.message || "خطا در برقراری ارتباط با سرور");
    }
  };

  const handleRequestRole = async () => {
    setRequestStatus('submitting');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/request-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setRequestStatus('submitted');
        const meRes = await fetch("/api/auth/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user);
        }
      } else {
        setRequestStatus('error');
      }
    } catch {
      setRequestStatus('error');
    }
  };

  if (authLoading) {
    return <div className="p-12 text-center text-zinc-600 dark:text-zinc-400 font-medium">در حال تایید هویت...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
          <LogIn size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">نیاز به ورود به حساب کاربری</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
          جهت مشاهده و مدیریت پروژه‌های خورشیدی، لطفاً وارد حساب خود شوید.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <LogIn size={16} />
          ورود یا ثبت‌نام
        </Link>
      </div>
    );
  }

  if (!isProjectOwner && !isAdmin) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">دسترسی به بخش مدیریت پروژه‌ها</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
          ثبت و مدیریت پروژه‌ها نیازمند تأیید هویت کاربری به عنوان مالک پروژه خورشیدی (PROJECT_OWNER) است.
        </p>

        {isPendingReview || requestStatus === 'submitted' ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-center justify-center gap-2">
            <Clock size={16} className="shrink-0 text-amber-600" />
            <span>درخواست شما ثبت شده و در انتظار بررسی و تأیید مدیریت سامانه می‌باشد.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleRequestRole}
              disabled={requestStatus === 'submitting'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {requestStatus === 'submitting' ? 'در حال ثبت درخواست...' : 'درخواست فعال‌سازی نقش مالک پروژه'}
            </button>
            {requestStatus === 'error' && (
              <p className="text-xs text-rose-600 dark:text-rose-400">خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">پروژه‌های من</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">مدیریت دارایی‌ها و مستندات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/target-select" className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium">
            <Home size={16} />
            بازگشت به خانه
          </Link>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> ایجاد پروژه جدید
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-4">مشخصات پروژه جدید</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">نام پروژه</label>
              <input required value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} type="text" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">شهر</label>
              <input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} type="text" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">ظرفیت (کیلووات)</label>
              <input required value={formData.capacityKw} onChange={e => setFormData({...formData, capacityKw: e.target.value})} type="number" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">تکنولوژی</label>
              <select value={formData.technology} onChange={e => setFormData({...formData, technology: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="monocrystalline">مونوکریستال</option>
                <option value="polycrystalline">پلی‌کریستال</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">انصراف</button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium">ذخیره پروژه</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>در حال بارگذاری...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500">شما هنوز پروژه‌ای ثبت نکرده‌اید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{project.projectName}</h3>
                <div className="flex gap-4 mt-2 text-sm text-zinc-500">
                  <span>وضعیت: <strong className="text-zinc-700 dark:text-zinc-300">{project.projectStatus}</strong></span>
                  <span>ظرفیت: <strong>{project.capacityKw} kW</strong></span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/solar-assets/${project.id}`} className="p-2 text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 rounded-lg" title="مشاهده">
                  <Eye size={18} />
                </Link>
                <button onClick={() => handleUploadDoc(project.id)} className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors">
                  <Upload size={16} /> آپلود مدرک
                </button>
                {project.projectStatus === 'DRAFT' && (
                  <button onClick={() => handleSubmitForReview(project.id)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors">
                    <Play size={16} /> ارسال برای بررسی
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      <PersianPromptModal
        isOpen={!!uploadDocModalProjectId}
        onClose={() => setUploadDocModalProjectId(null)}
        title="بارگذاری مدرک پروژه"
        description="نوع مدرک و آدرس فایل مربوط به این پروژه را مشخص نمایید."
        fields={[
          {
            id: 'documentType',
            label: 'نوع مدرک',
            type: 'select',
            required: true,
            options: [
              { value: 'ownership', label: 'سند مالکیت ساختگاه (ownership)' },
              { value: 'permit', label: 'مجوز احداث و اتصال به شبکه (permit)' },
              { value: 'epc_contract', label: 'قرارداد پیمانکاری احداث (epc_contract)' },
              { value: 'environmental', label: 'مجوز محیط زیست و استعلامات (environmental)' },
              { value: 'technical_spec', label: 'مشخصات فنی و کاتالوگ تجهیزات (technical_spec)' },
              { value: 'other', label: 'سایر اسناد و مدارک فنی (other)' }
            ]
          },
          {
            id: 'fileUrl',
            label: 'آدرس اینترنتی فایل مدرک (URL)',
            type: 'url',
            required: true,
            placeholder: 'https://...',
            helpText: 'لینک مستقیم یا ابری فایل مدرک با فرمت معتبر اینترنتی'
          }
        ]}
        submitText="بارگذاری مدرک"
        cancelText="انصراف"
        onSubmit={handleUploadDocSubmit}
      />

      {/* Submit for Review Confirmation Modal */}
      <PersianConfirmModal
        isOpen={!!submitReviewProjectId}
        onClose={() => setSubmitReviewProjectId(null)}
        onConfirm={handleConfirmSubmitForReview}
        title="ارسال پروژه جهت بررسی و تایید"
        message="آیا از ارسال نهایی پروژه جهت بررسی کارشناسان اطمینان دارید؟ پس از ارسال، وضعیت پروژه به «ارسال شده» تغییر می‌یابد."
        confirmText="ارسال برای بررسی"
        cancelText="انصراف"
        variant="primary"
      />
    </div>
  );
}
