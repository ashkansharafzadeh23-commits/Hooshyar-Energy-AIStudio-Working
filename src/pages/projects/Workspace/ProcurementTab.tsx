import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Box, Package, ShoppingCart, Truck } from 'lucide-react';
import { BillOfQuantities, ProcurementRFQ, VendorQuote, PurchaseOrder, DeliveryRecord } from '../../../types/procurement';

interface ProcurementTabProps {
  projectId: string;
}

export const ProcurementTab: React.FC<ProcurementTabProps> = ({ projectId }) => {
  const [boqs, setBoqs] = useState<BillOfQuantities[]>([]);
  const [rfqs, setRfqs] = useState<ProcurementRFQ[]>([]);
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [boqRes, rfqRes, poRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/boqs`),
          fetch(`/api/projects/${projectId}/rfqs`),
          fetch(`/api/projects/${projectId}/purchase-orders`)
        ]);

        if (boqRes.ok) setBoqs(await boqRes.json());
        if (rfqRes.ok) {
          const fetchedRfqs = await rfqRes.json();
          setRfqs(fetchedRfqs);
          
          // fetch quotes for all rfqs
          const allQuotes: VendorQuote[] = [];
          for (const rfq of fetchedRfqs) {
            const qRes = await fetch(`/api/rfqs/${rfq.id}/quotes`);
            if (qRes.ok) {
              const qData = await qRes.json();
              allQuotes.push(...qData);
            }
          }
          setQuotes(allQuotes);
        }
        if (poRes.ok) setPos(await poRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">مدیریت تأمین تجهیزات</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus size={16} />
          ایجاد BOQ جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Box size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{boqs.length}</div>
            <div className="text-sm text-gray-500">نسخه‌های BOQ</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{rfqs.length}</div>
            <div className="text-sm text-gray-500">استعلام‌های فعال</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <ShoppingCart size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{pos.length}</div>
            <div className="text-sm text-gray-500">سفارشات خرید (PO)</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Truck size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-500">محموله‌های در راه</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 font-medium">
          لیست استعلام‌ها (RFQs)
        </div>
        <div className="p-4">
          {rfqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              استعلامی برای این پروژه ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-4">
              {rfqs.map(rfq => (
                <div key={rfq.id} className="flex justify-between items-center border border-gray-100 p-4 rounded-lg">
                  <div>
                    <div className="font-bold text-gray-900">{rfq.title}</div>
                    <div className="text-sm text-gray-500">{rfq.procurementRfqCode}</div>
                  </div>
                  <div className="text-left">
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                      {rfq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
