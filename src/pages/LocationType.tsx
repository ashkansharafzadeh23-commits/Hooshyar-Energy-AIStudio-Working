import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LocationType } from '../types';
import { Home as HomeIcon, Factory, Warehouse, Tractor, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdBanner } from '../components/AdBanner';

export default function LocationTypePage() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();

  const handleSelect = (type: LocationType) => {
    updateState({ locationType: type });
    navigate('/area-city');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center max-w-3xl mx-auto pt-4"
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">کجا می‌خواهید تجهیزات را نصب کنید؟</h2>
        <p className="text-gray-500 text-lg">نوع مکان خود را انتخاب کنید</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
        <button
          onClick={() => handleSelect('residential')}
          className="p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-right"
        >
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <HomeIcon size={28} />
          </div>
          <div>
            <h3 className="font-bold text-xl mb-1">خانه مسکونی</h3>
            <p className="text-gray-500 text-sm">آپارتمان، ویلا، مجتمع مسکونی</p>
          </div>
        </button>

        <button
          onClick={() => handleSelect('industrial_warehouse')}
          className="p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-right"
        >
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
            <Warehouse size={28} />
          </div>
          <div>
            <h3 className="font-bold text-xl mb-1">سوله صنعتی</h3>
            <p className="text-gray-500 text-sm">کارگاه، انبار، تولیدی کوچک</p>
          </div>
        </button>

        <button
          onClick={() => handleSelect('factory')}
          className="p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-right"
        >
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
            <Factory size={28} />
          </div>
          <div>
            <h3 className="font-bold text-xl mb-1">کارخانه</h3>
            <p className="text-gray-500 text-sm">خط تولید سنگین، تاسیسات بزرگ</p>
          </div>
        </button>

        <button
          onClick={() => handleSelect('agricultural')}
          className="p-6 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-right"
        >
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <Tractor size={28} />
          </div>
          <div>
            <h3 className="font-bold text-xl mb-1">زمین کشاورزی</h3>
            <p className="text-gray-500 text-sm">پمپ آب، گلخانه، دامداری</p>
          </div>
        </button>
      </div>
      <div className="mt-8 w-full max-w-2xl mx-auto"><AdBanner layout="card" /></div>
    </motion.div>
  );
}
