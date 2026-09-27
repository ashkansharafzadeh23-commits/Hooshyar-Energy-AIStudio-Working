const fs = require('fs');
let code = fs.readFileSync('src/pages/PowerPlantSetup.tsx', 'utf-8');

const sendButton = `
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-blue-100 shadow-sm text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">ثبت درخواست در داشبورد</h3>
            <p className="text-gray-600 mb-6 max-w-lg">
              کاربر گرامی، در صورت تمایل می‌توانید مشخصات نیروگاه خود را در داشبورد ثبت کنید تا برای شرکت‌های مجری (EPC) ارسال شود و آن‌ها پیشنهاد خود را به شما اعلام کنند. 
              اطلاعات تماس شما نزد ما محفوظ می‌ماند.
            </p>
            <button 
              onClick={() => {
                const requests = JSON.parse(localStorage.getItem('epc_requests') || '[]');
                const newReq = {
                  id: Date.now().toString(),
                  userId: 'user_1',
                  ...formData,
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  replies: []
                };
                requests.push(newReq);
                localStorage.setItem('epc_requests', JSON.stringify(requests));
                setIsSent(true);
              }}
              disabled={isSent}
              className={\`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-colors shadow-md \${isSent ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'}\`}
            >
              {isSent ? <CheckCircle size={24} /> : <Send size={24} />}
              {isSent ? 'درخواست شما در داشبورد ثبت و برای شرکت‌ها ارسال شد' : 'ثبت درخواست احداث برای شرکت‌های مجری (EPC)'}
            </button>
            {isSent && (
              <Link to="/user-dashboard" className="mt-4 text-blue-600 font-bold hover:underline flex items-center gap-1">
                ورود به داشبورد من <ArrowLeft size={16} />
              </Link>
            )}
          </motion.div>
        )}
`;

code = code.replace("      </main>", sendButton + "\n      </main>");
fs.writeFileSync('src/pages/PowerPlantSetup.tsx', code);
