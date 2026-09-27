const fs = require('fs');
const content = fs.readFileSync('src/components/PanelComparisonTable.tsx', 'utf8');

const updated = content.replace(
  'interface Props {',
  `import { useState } from 'react';\nimport { Settings, Zap, CheckCircle2 } from 'lucide-react';\n\ninterface Props {`
).replace(
  'export function PanelComparisonTable({ panelOptions }: Props) {',
  `export function PanelComparisonTable({ panelOptions }: Props) {\n  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);`
).replace(
  '  if (groupedOptions.length === 0) return null;',
  `  if (groupedOptions.length === 0) return null;

  const generateCompatibleEquipment = (opt: any) => {
    const kwp = opt.data.actualSystemKwp || 5;
    const count = opt.data.panelCount || 10;
    const isThreePhase = kwp > 10;
    
    const inverters = [
      { brand: 'Growatt', model: \`MIN \${Math.ceil(kwp)}000TL-X\`, type: isThreePhase ? 'سه فاز' : 'تک فاز', price: Math.ceil(kwp * 4.5) * 10000000 },
      { brand: 'SMA', model: \`Sunny Boy \${Math.ceil(kwp)}.0\`, type: isThreePhase ? 'سه فاز' : 'تک فاز', price: Math.ceil(kwp * 7) * 10000000 },
      { brand: 'Fronius', model: \`Primo \${Math.ceil(kwp)}.0-1\`, type: isThreePhase ? 'سه فاز' : 'تک فاز', price: Math.ceil(kwp * 6.5) * 10000000 }
    ];
    
    const cables = [
      { type: 'کابل خورشیدی 4mm² (مخصوص استرینگ)', spec: 'استاندارد TUV، مقاوم در برابر UV', pricePerMeter: 35000 },
      { type: 'کابل خورشیدی 6mm² (فواصل طولانی‌تر)', spec: 'استاندارد TUV، افت ولتاژ کمتر', pricePerMeter: 48000 },
      { type: \`کابل AC خروجی اینورتر (\${isThreePhase ? '5' : '3'} رشته)\`, spec: 'کابل مسی افشان', pricePerMeter: isThreePhase ? 120000 : 75000 }
    ];
    
    return { inverters, cables };
  };`
).replace(
  '              {groupedOptions.map((opt, i) => (',
  `              {groupedOptions.map((opt, i) => (\n                <td key={i} className="py-4 px-4 text-center border-t border-zinc-200 dark:border-zinc-800">\n                  <button \n                    onClick={() => setSelectedGroupIndex(selectedGroupIndex === i ? null : i)}\n                    className={\`w-full py-2 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 \${selectedGroupIndex === i ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'}\`}\n                  >\n                    {selectedGroupIndex === i ? <><CheckCircle2 size={16}/> انتخاب شده</> : 'انتخاب این پنل'}\n                  </button>\n                </td>\n              ))}\n            </tr>\n            <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">\n              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">راندمان فضایی</td>\n              {groupedOptions.map((opt, i) => (`
);

fs.writeFileSync('src/components/PanelComparisonTable.tsx', updated);
