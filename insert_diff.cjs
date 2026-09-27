const fs = require('fs');
let code = fs.readFileSync('src/pages/Result.tsx', 'utf8');

// State for diffSummary
code = code.replace(
  'const [currentInput, setCurrentInput] = useState<any>(state);',
  'const [currentInput, setCurrentInput] = useState<any>(state);\n  const [diffSummary, setDiffSummary] = useState<any>(null);'
);

// Update in fetch handleFollowup
code = code.replace(
  'setCurrentInput(data.updatedInput);',
  'setCurrentInput(data.updatedInput);\n        setDiffSummary(data.diffSummary);'
);

// Show diffSummary in Solar panel
// I will just insert a tiny badge next to the panel count.
// Let's find: <span className="font-bold text-zinc-900 dark:text-zinc-100">{panel.panelCount} عدد</span>
code = code.replace(
  '<span className="font-bold text-zinc-900 dark:text-zinc-100">{panel.panelCount} عدد</span>',
  '<span className="font-bold text-zinc-900 dark:text-zinc-100">{panel.panelCount} عدد</span>\n                      {diffSummary?.panelCountDelta !== undefined && (\n                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diffSummary.panelCountDelta > 0 ? "bg-red-100 text-red-600" : diffSummary.panelCountDelta < 0 ? "bg-green-100 text-green-600" : "hidden"}`}>\n                          {diffSummary.panelCountDelta > 0 ? "+" : ""}{diffSummary.panelCountDelta}\n                        </span>\n                      )}'
);

// And show systemPowerKwDelta next to KW
// <span className="font-bold text-zinc-900 dark:text-zinc-100">{panel.actualSystemKwp} kW</span>
code = code.replace(
  '<span className="font-bold text-zinc-900 dark:text-zinc-100">{panel.actualSystemKwp} kW</span>',
  '<span className="font-bold text-zinc-900 dark:text-zinc-100">{panel.actualSystemKwp} kW</span>\n                      {diffSummary?.systemPowerKwDelta !== undefined && (\n                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diffSummary.systemPowerKwDelta > 0 ? "bg-red-100 text-red-600" : diffSummary.systemPowerKwDelta < 0 ? "bg-green-100 text-green-600" : "hidden"}`}>\n                          {diffSummary.systemPowerKwDelta > 0 ? "+" : ""}{diffSummary.systemPowerKwDelta} kW\n                        </span>\n                      )}'
);

fs.writeFileSync('src/pages/Result.tsx', code);
