import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Upload, Play, Eye, Home } from 'lucide-react';

export default function MyProjects() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const res = await fetch("/api/auth/me", { headers });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Fallback dev admin user if no auth is available during tests
          setUser({ id: "dev_user", roles: ["PROJECT_OWNER", "ADMIN"] });
        }
      } catch (e) {
        setUser({ id: "dev_user", roles: ["PROJECT_OWNER", "ADMIN"] });
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    // We allow dummy dev_user for testing the UI
    fetchProjects();
  }, [authLoading]);
  

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

  const handleUploadDoc = async (projectId: string) => {
    const type = window.prompt("نوع مدرک؟ (مثلا: ownership, permit, epc_contract)");
    if (!type) return;
    const url = window.prompt("لینک فایل (فرضی)؟");
    if (!url) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/assets/${projectId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ documentType: type, fileUrl: url })
      });
      if (res.ok) {
        alert("مدرک آپلود شد.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitForReview = async (projectId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/assets/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectStatus: "SUBMITTED" })
      });
      if (res.ok) {
        alert("پروژه برای بررسی ارسال شد.");
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || "خطا در ارسال");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestRole = async () => {
    const token = localStorage.getItem("token");
    await fetch("/api/user/dev-make-admin", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    alert("دسترسی مالک پروژه و ادمین به شما داده شد. صفحه را رفرش کنید.");
    window.location.reload();
  };

  if (authLoading) return <div className="p-12 text-center">در حال تایید هویت...</div>;

  if (!user?.roles?.includes("PROJECT_OWNER") && !user?.roles?.includes("ADMIN")) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <h2 className="text-xl font-bold mb-4">دسترسی محدود</h2>
        <p className="text-zinc-600 mb-6">شما نقش مالک پروژه (PROJECT_OWNER) را ندارید.</p>
        <button onClick={requestRole} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          دریافت دسترسی (Dev Helper)
        </button>
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
    </div>
  );
}
