import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation, Phone, Search, X, Scale, Check, ShieldCheck, Clock, Store, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Fix Leaflet's default icon path issues with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PublicVendor {
  id: string;
  companyName: string;
  logoUrl?: string;
  aboutUs?: string;
  categories: string[];
  address?: string;
  city?: string;
  workingHours?: string;
  website?: string;
  verified: boolean;
  phones?: { label: string; number: string }[];
  lat?: number;
  lng?: number;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);  
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return Math.round(d);
}

export default function SellersList() {
  const [vendors, setVendors] = useState<PublicVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [maxDistance, setMaxDistance] = useState(5000);
  
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // Do NOT fabricate user location
          setUserLocation(null);
        }
      );
    }
  }, []);

  useEffect(() => {
    async function loadVendors() {
      try {
        setLoading(true);
        const res = await fetch('/api/vendors');
        if (res.ok) {
          const data = await res.json();
          const items: PublicVendor[] = (Array.isArray(data) ? data : []).map((v: any) => {
            return {
              ...v,
              lat: typeof v.lat === 'number' ? v.lat : undefined,
              lng: typeof v.lng === 'number' ? v.lng : undefined
            };
          });
          setVendors(items);
        }
      } catch (err) {
        console.error('Failed to load vendors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

  // Calculate distance for all vendors and filter
  const processedVendors = vendors.map(v => {
    let distance: number | null = null;
    if (userLocation && typeof v.lat === 'number' && typeof v.lng === 'number') {
      distance = getDistanceFromLatLonInKm(userLocation[0], userLocation[1], v.lat, v.lng);
    }
    return { ...v, distance };
  }).filter(v => {
    const matchesSearch = 
      v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (v.city && v.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.categories && v.categories.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesDistance = v.distance === null || v.distance <= maxDistance;
    return matchesSearch && matchesDistance;
  }).sort((a, b) => {
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  const handleToggleCompare = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) return prev.filter(vid => vid !== id);
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const compareVendors = vendors.filter(v => selectedForCompare.includes(v.id));

  return (
    <div className="relative font-sans">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/partners" className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 inline-flex items-center gap-1">
            <ArrowLeft size={14} />
            <span>همکاری با هوشیار انرژی</span>
          </Link>
        </div>
        <Link
          to="/vendor-auth"
          className="bg-blue-600 text-white font-bold py-1.5 px-4 rounded-xl hover:bg-blue-700 transition-colors text-xs flex items-center gap-1.5"
        >
          <Store size={14} />
          ثبت فروشگاه و تأمین‌کننده
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-[calc(100vh-10rem)] flex flex-col sm:flex-row gap-4 sm:gap-6"
      >
        <div className="w-full sm:w-1/3 flex flex-col gap-4 order-2 sm:order-1 h-1/2 sm:h-full">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm shrink-0">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">لیست تأمین‌کنندگان تجهیزات</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">فروشگاه‌های معتبر قطعات و ادوات فتوولتائیک</p>
            
            {/* Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-2.5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="جستجو (نام شرکت، شهر، تجهیزات...)" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">حداکثر فاصله جغرافیایی</label>
                <select 
                  value={maxDistance} 
                  onChange={e => setMaxDistance(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value={5000}>سراسر کشور</option>
                  <option value={50}>تا ۵۰ کیلومتر</option>
                  <option value={150}>تا ۱۵۰ کیلومتر</option>
                  <option value={500}>تا ۵۰۰ کیلومتر</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <div className="text-center p-6 text-xs text-zinc-400">در حال دریافت فهرست تأمین‌کنندگان...</div>
            ) : processedVendors.length === 0 ? (
              <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <Store size={36} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">تأمین‌کننده‌ای یافت نشد.</p>
              </div>
            ) : processedVendors.map(vendor => (
              <div key={vendor.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 transition-colors shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{vendor.companyName}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {vendor.categories.map((c, i) => (
                        <span key={i} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  {vendor.verified ? (
                    <span className="text-emerald-600 dark:text-emerald-400" title="تأمین‌کننده احراز هویت شده">
                      <ShieldCheck size={16} />
                    </span>
                  ) : (
                    <span className="text-slate-400" title="عضو شبکه تأمین‌کنندگان">
                      <Clock size={15} />
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-zinc-500 flex flex-col gap-1.5 mt-1">
                  <div className="flex items-start gap-1.5">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-blue-500" />
                    <span>{vendor.city || 'سراسری'}{vendor.address ? `، ${vendor.address}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400 text-[11px]">
                    <Navigation size={12} className="shrink-0" />
                    <span>
                      {vendor.distance !== null 
                        ? `فاصله تخمینی: ${vendor.distance} کیلومتر` 
                        : 'فاصله قابل محاسبه نیست'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleToggleCompare(vendor.id)}
                    className={`flex-1 text-xs py-2 rounded-lg text-center font-bold transition-colors border flex items-center justify-center gap-1
                      ${selectedForCompare.includes(vendor.id) 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                      }`}
                  >
                    {selectedForCompare.includes(vendor.id) ? (
                      <><Check size={14} /> انتخاب شده</>
                    ) : (
                      <><Scale size={14} /> مقایسه</>
                    )}
                  </button>
                  {vendor.phones && vendor.phones.length > 0 && (
                    <a 
                      href={`tel:${vendor.phones[0].number}`}
                      className="w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100 dark:border-emerald-800"
                      title="تماس مستقیم"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-full sm:w-2/3 h-1/2 sm:h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden order-1 sm:order-2 z-0 relative">
          <MapContainer 
            center={userLocation || [32.4279, 53.6880]} 
            zoom={userLocation ? 11 : 5} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {userLocation && (
              <Marker position={userLocation}>
                <Popup>موقعیت تقریبی شما</Popup>
              </Marker>
            )}
            
            {processedVendors
              .filter(vendor => typeof vendor.lat === 'number' && typeof vendor.lng === 'number')
              .map(vendor => (
                <Marker key={vendor.id} position={[vendor.lat!, vendor.lng!]}>
                  <Popup>
                    <div className="text-right font-sans" dir="rtl">
                      <strong className="block mb-1 text-sm">{vendor.companyName}</strong>
                      <span className="text-xs text-gray-600 block mb-2">{vendor.categories.join('، ')}</span>
                      <Link to={`/vendor/${vendor.id}`} className="text-blue-600 text-xs font-bold block">مشاهده فروشگاه &larr;</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </motion.div>

      {/* Floating Compare Button */}
      <AnimatePresence>
        {selectedForCompare.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-zinc-900 text-white px-6 py-3 rounded-full shadow-xl shadow-blue-900/20 flex items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-blue-400" />
              <span className="text-sm font-bold">{selectedForCompare.length} مورد برای مقایسه</span>
            </div>
            {selectedForCompare.length === 2 && (
              <button 
                onClick={() => setIsCompareModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
              >
                مشاهده مقایسه
              </button>
            )}
            <button 
              onClick={() => setSelectedForCompare([])}
              className="p-1 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {isCompareModalOpen && compareVendors.length === 2 && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCompareModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <Scale className="text-blue-500" />
                  مقایسه تأمین‌کنندگان
                </h2>
                <button 
                  onClick={() => setIsCompareModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-3 gap-0 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                  {/* Headers */}
                  <div className="col-span-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 border-l border-b border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500 flex items-center">
                    مشخصات
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-l border-b border-zinc-200 dark:border-zinc-800 text-center font-bold text-blue-600 dark:text-blue-400">
                    {compareVendors[0].companyName}
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 text-center font-bold text-blue-600 dark:text-blue-400">
                    {compareVendors[1].companyName}
                  </div>
                  
                  {/* Status */}
                  <div className="col-span-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 border-l border-b border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500">
                    وضعیت احراز هویت
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-l border-b border-zinc-200 dark:border-zinc-800 text-center">
                    {compareVendors[0].verified ? 'احراز شده' : 'عضو شبکه'}
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 text-center">
                    {compareVendors[1].verified ? 'احراز شده' : 'عضو شبکه'}
                  </div>

                  {/* Categories */}
                  <div className="col-span-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 border-l border-b border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500">
                    دسته‌های تجهیزات
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-l border-b border-zinc-200 dark:border-zinc-800 text-center">
                    {compareVendors[0].categories.join('، ')}
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 text-center">
                    {compareVendors[1].categories.join('، ')}
                  </div>

                  {/* City */}
                  <div className="col-span-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 border-l border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500">
                    شهر و استان
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-l border-zinc-200 dark:border-zinc-800 text-center">
                    {compareVendors[0].city || 'سراسری'}
                  </div>
                  <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 border-zinc-200 dark:border-zinc-800 text-center">
                    {compareVendors[1].city || 'سراسری'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
