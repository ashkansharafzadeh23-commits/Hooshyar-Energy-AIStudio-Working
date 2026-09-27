import React, { useState } from 'react';
import { BillOfQuantities, BOQItem as BOQItemType } from '../../types/procurement';
import { BOQItem } from './BOQItem';
import { CommercialEmptyState } from './CommercialEmptyState';
import { formatCurrencyIRR } from '../../utils/formatters';
import { Plus, Send, CheckSquare, Layers, Search, Cpu, Zap, Sun, ShieldAlert, Sliders } from 'lucide-react';

interface BOQWorkspaceProps {
  boq?: BillOfQuantities;
  items: BOQItemType[];
  isOwnerOrEPC: boolean;
  onCreateVendorRFQ: (selectedItemIds: string[]) => void;
  onAddItem?: () => void;
  className?: string;
}

export const BOQWorkspace: React.FC<BOQWorkspaceProps> = ({
  boq,
  items,
  isOwnerOrEPC,
  onCreateVendorRFQ,
  onAddItem,
  className = ''
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelect = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map(i => i.id));
    }
  };

  // Logical groupings based on category
  const categoryGroups: { id: string; label: string; categories: string[] }[] = [
    { id: 'ALL', label: 'همه اقلام', categories: [] },
    { id: 'PANEL', label: 'پنل خورشیدی', categories: ['SOLAR_PANEL'] },
    { id: 'INVERTER', label: 'اینورتر', categories: ['INVERTER'] },
    { id: 'STRUCTURE', label: 'سازه و استراکچر', categories: ['MOUNTING_STRUCTURE'] },
    { id: 'CABLE', label: 'کابل و اتصالات', categories: ['DC_CABLE', 'AC_CABLE', 'CONNECTOR'] },
    { id: 'PROTECTION', label: 'تابلو و حفاظت', categories: ['COMBINER_BOX', 'DC_PROTECTION', 'AC_PROTECTION', 'TRANSFORMER', 'SWITCHGEAR', 'CONTROL_PANEL'] },
    { id: 'MONITORING', label: 'پایش و میترینگ', categories: ['MONITORING_SYSTEM', 'METERING'] },
    { id: 'OTHER', label: 'سایر ملزومات', categories: ['CIVIL_MATERIAL', 'SPARE_PART', 'OTHER'] }
  ];

  const filteredItems = items.filter(item => {
    // Category filter
    if (activeCategory !== 'ALL') {
      const group = categoryGroups.find(g => g.id === activeCategory);
      if (group && !group.categories.includes(item.category)) {
        return false;
      }
    }
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const type = (item.itemType || '').toLowerCase();
      const spec = (item.technicalSpecification || '').toLowerCase();
      const brand = (item.brandPreference || '').toLowerCase();
      return desc.includes(q) || type.includes(q) || spec.includes(q) || brand.includes(q);
    }
    return true;
  });

  if (!boq || items.length === 0) {
    return (
      <CommercialEmptyState
        title="فهرست تجهیزات پروژه هنوز ایجاد نشده است."
        description="فهرست اقلام و مشخصات فنی (BOQ) پس از تأیید طراحی اولیه و توسط تیم مهندسی یا پیمانکار بارگذاری می‌گردد."
        actionText={isOwnerOrEPC && onAddItem ? "تعریف نخستین ردیف تجهیزات" : undefined}
        onAction={onAddItem}
        icon="package"
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
              فهرست مشخصات و مقادیر تجهیزات ({items.length} قلم تجهیز)
            </h4>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              ویرایش {boq.version || 1}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            اقلام مورد نیاز جهت استعلام قیمت از فروشندگان تجهیزات (Vendor RFQ) را انتخاب کنید.
          </p>
        </div>

        {/* Primary Action Button */}
        {isOwnerOrEPC && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selectedItemIds.length === 0}
              onClick={() => onCreateVendorRFQ(selectedItemIds)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>استعلام قیمت از تأمین‌کنندگان ({selectedItemIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categoryGroups.map(group => {
              const count = group.id === 'ALL'
                ? items.length
                : items.filter(i => group.categories.includes(i.category)).length;

              if (count === 0 && group.id !== 'ALL') return null;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveCategory(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[38px] ${
                    activeCategory === group.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                  }`}
                >
                  <span>{group.label}</span>
                  <span className="mr-1 text-[11px] opacity-80 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder="جستجو در مشخصات یا برند..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[38px] pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Selection helper bar */}
        {filteredItems.length > 0 && isOwnerOrEPC && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs text-slate-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={selectAll}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {selectedItemIds.length === filteredItems.length ? 'لغو انتخاب همه' : 'انتخاب همه اقلام نمایان'}
              </span>
            </button>

            <span>
              {selectedItemIds.length} از {filteredItems.length} قلم انتخاب شده
            </span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2.5">
        {filteredItems.map(item => (
          <BOQItem
            key={item.id}
            item={item}
            isSelected={selectedItemIds.includes(item.id)}
            onToggleSelect={isOwnerOrEPC ? () => toggleSelect(item.id) : undefined}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-xs text-slate-400">
            ردیف تجهیزاتی منطبق با فیلتر یافت نشد.
          </div>
        )}
      </div>
    </div>
  );
};
