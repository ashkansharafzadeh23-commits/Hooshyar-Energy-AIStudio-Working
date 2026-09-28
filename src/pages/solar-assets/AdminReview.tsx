import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Eye, ShieldAlert, LogIn } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function AdminReview() {
  const { showSuccess, showError } = useToast();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/assets", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // Show SUBMITTED projects to admin
        setProjects(data.filter((p: any) => p.projectStatus === "SUBMITTED"));
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
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const res = await fetch("/api/auth/me", { headers });
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

  useEffect(() => {
    if (authLoading) return;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ||
      (Array.isArray(user?.roles) && user.roles.some((r: string) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "SUPER_ADMIN"));
    if (isAdmin) {
      fetchProjects();
    }
  }, [authLoading, user]);
  

  const handleStatusChange = async (projectId: string, status: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/assets/${projectId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectStatus: status, verificationNotes: "بررسی ادمین" })
      });
      if (res.ok) {
        const statusLabel = status === 'APPROVED' ? 'تأیید شد' : status === 'REJECTED' ? 'رد شد' : status;
        showSuccess(`وضعیت پروژه با موفقیت به "${statusLabel}" تغییر یافت.`);
        fetchProjects();
      } else {
        showError('خطا در به‌روزرسانی وضعیت پروژه');
      }
    } catch (err) {
      console.error(err);
      showError('خطا در برقراری ارتباط با سرور');
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
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">نیاز به ورود به حساب</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
          جهت مشاهده و بررسی پروژه‌ها، لطفاً ابتدا وارد حساب کاربری مجاز خود شوید.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <LogIn size={16} />
          ورود به سامانه
        </Link>
      </div>
    );
  }

  const isAdminUser = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ||
    (Array.isArray(user?.roles) && user.roles.some((r: string) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "SUPER_ADMIN"));

  if (!isAdminUser) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-900/60 p-8 max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-rose-800 dark:text-rose-300">دسترسی مسدود است</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
          حساب کاربری شما دارای مجوز مدیر ارشد سامانه (ADMIN) نمی‌باشد. این صفحه ویژه بررسی مدارک و صلاحیت پروژه‌های ثبت‌شده توسط مدیران فنی است.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">پنل مدیریت: بررسی پروژه‌ها</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">پروژه‌های در انتظار تایید</p>
        </div>
      </div>

      {loading ? (
        <p>در حال بارگذاری...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500">هیچ پروژه‌ای در صف بررسی نیست.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{project.projectName}</h3>
                <div className="flex gap-4 mt-2 text-sm text-zinc-500">
                  <span>مالک: <strong>{project.ownerId}</strong></span>
                  <span>ظرفیت: <strong>{project.capacityKw} kW</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/solar-assets/${project.id}`} className="p-2 text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 rounded-lg" title="مشاهده">
                  <Eye size={18} />
                </Link>
                <button onClick={() => handleStatusChange(project.id, 'APPROVED')} className="flex items-center gap-1 px-3 py-2 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors">
                  <Check size={16} /> تایید
                </button>
                <button onClick={() => handleStatusChange(project.id, 'REJECTED')} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors">
                  <X size={16} /> رد
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
