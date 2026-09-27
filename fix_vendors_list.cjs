const fs = require('fs');
let code = fs.readFileSync('src/pages/VendorsList.tsx', 'utf-8');

const targetToRemove = `      <div className="w-full mb-6">
        
        {/* Option 4: Contractors */}
        <Link to="/contractor-auth" className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-amber-500 transition-all flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 group-hover:bg-amber-100 transition-colors"></div>
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 z-10 group-hover:scale-110 transition-transform">
            <Building2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-gray-800">شرکت ها برای احداث نیروگاه</h2>
          <p className="text-gray-600 mb-8 z-10 flex-1">
            مخصوص شرکت‌های مجری و پیمانکاران احداث نیروگاه جهت ثبت‌نام و فعالیت.
          </p>
          <div className="w-full bg-amber-50 text-amber-600 font-bold py-3 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 z-10">
            <LogIn size={20} />
            ورود / ثبت‌نام
          </div>
        </Link>
      </div>`;

if (code.includes(targetToRemove)) {
    code = code.replace(targetToRemove, "");
    const option4 = `
        {/* Option 4: Contractors */}
        <Link to="/contractor-auth" className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-amber-500 transition-all flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 group-hover:bg-amber-100 transition-colors"></div>
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 z-10 group-hover:scale-110 transition-transform">
            <Building2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-gray-800">شرکت ها برای احداث نیروگاه</h2>
          <p className="text-gray-600 mb-8 z-10 flex-1">
            مخصوص شرکت‌های مجری و پیمانکاران احداث نیروگاه جهت ثبت‌نام و فعالیت.
          </p>
          <div className="w-full bg-amber-50 text-amber-600 font-bold py-3 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 z-10">
            <LogIn size={20} />
            ورود / ثبت‌نام
          </div>
        </Link>`;
    code = code.replace('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">', '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">' + option4);
    fs.writeFileSync('src/pages/VendorsList.tsx', code);
} else {
    console.log("Could not find target string.");
}
