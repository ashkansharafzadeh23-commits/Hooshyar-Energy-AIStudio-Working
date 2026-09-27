import React, { useState } from 'react';
import { TelemetryReading } from '../../types/monitoring';
import { TelemetryEmptyState } from './TelemetryEmptyState';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface TelemetryChartProps {
  readings: TelemetryReading[];
  metricType: string;
  metricLabel: string;
  unit: string;
  hasSources?: boolean;
  onConfigureClick?: () => void;
  canConfigure?: boolean;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  readings,
  metricType,
  metricLabel,
  unit,
  hasSources = true,
  onConfigureClick,
  canConfigure = false,
}) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Filter only readings matching metricType and valid values
  const validReadings = readings
    .filter((r) => r.metricType === metricType && typeof r.value === 'number' && !isNaN(r.value))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (validReadings.length < 2) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {metricLabel} ({unit})
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            روند تغییرات تله‌متری بر اساس داده‌های ثبت‌شده
          </p>
        </div>
        <TelemetryEmptyState
          hasSources={hasSources}
          onConfigureClick={onConfigureClick}
          canConfigure={canConfigure}
        />
      </div>
    );
  }

  // Calculate real statistical boundaries
  const values = validReadings.map((r) => r.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const sumVal = values.reduce((acc, v) => acc + v, 0);
  const avgVal = sumVal / values.length;

  // Timestamps
  const minTime = new Date(validReadings[0].timestamp).getTime();
  const maxTime = new Date(validReadings[validReadings.length - 1].timestamp).getTime();
  const timeSpan = Math.max(maxTime - minTime, 1);

  // Chart dimensions inside SVG viewBox="0 0 600 240"
  const width = 600;
  const height = 240;
  const padTop = 25;
  const padBottom = 40;
  const padLeft = 20;
  const padRight = 65;

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  // Value span
  const valSpan = maxVal === minVal ? (maxVal === 0 ? 1 : maxVal * 0.2) : maxVal - minVal;
  const yMin = maxVal === minVal ? Math.max(0, minVal - valSpan) : minVal;
  const yMax = maxVal === minVal ? minVal + valSpan : maxVal;
  const yRange = yMax - yMin || 1;

  // Compute points
  const points = validReadings.map((r, i) => {
    const t = new Date(r.timestamp).getTime();
    // X is RTL: earliest on right or left? In Persian charts, time usually flows from left to right (chronological) or right to left.
    // Left-to-right is standard for time-series charts even in RTL dashboards, but let's place earliest at left and latest at right.
    const xFraction = (t - minTime) / timeSpan;
    const x = padLeft + xFraction * innerWidth;
    const yFraction = (r.value - yMin) / yRange;
    const y = padTop + innerHeight - yFraction * innerHeight;
    return { x, y, reading: r, index: i };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  // Fill area under line
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} Z`;

  // Grid steps (min, mid, max)
  const midVal = (yMin + yMax) / 2;
  const gridSteps = [
    { val: yMax, y: padTop },
    { val: midVal, y: padTop + innerHeight / 2 },
    { val: yMin, y: padTop + innerHeight },
  ];

  const hoveredPoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{metricLabel}</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({unit})</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            نمودار واقعی تله‌متری ثبت‌شده • {toPersianDigits(validReadings.length)} نمونه معتبر
          </p>
        </div>

        {/* Statistical summary pill */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div>
            کمینه: <strong className="font-semibold text-slate-900 dark:text-white font-mono">{formatPersianNumber(minVal, 1)}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div>
            بیشینه: <strong className="font-semibold text-slate-900 dark:text-white font-mono">{formatPersianNumber(maxVal, 1)}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div>
            میانگین: <strong className="font-semibold text-slate-900 dark:text-white font-mono">{formatPersianNumber(avgVal, 1)}</strong>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[2.5/1] min-h-[200px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={`grad-${metricType}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {gridSteps.map((step, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={step.y}
                x2={padLeft + innerWidth}
                y2={step.y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/80"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padLeft + innerWidth + 8}
                y={step.y + 4}
                className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                textAnchor="start"
              >
                {formatPersianNumber(step.val, step.val % 1 === 0 ? 0 : 1)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaD} fill={`url(#grad-${metricType})`} />

          {/* Polyline line */}
          <path
            d={pathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Points */}
          {points.map((p) => {
            const isHovered = hoveredPointIndex === p.index;
            return (
              <g key={p.index}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3}
                  className="fill-white dark:fill-slate-900 stroke-amber-500 transition-all cursor-pointer"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  onMouseEnter={() => setHoveredPointIndex(p.index)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-2 rounded-xl text-xs shadow-lg space-y-0.5"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div className="font-extrabold flex items-center gap-1">
              <span className="font-mono">{formatPersianNumber(hoveredPoint.reading.value, 1)}</span>
              <span className="text-[11px] font-normal">{unit}</span>
            </div>
            <div className="text-[10px] text-slate-300 dark:text-slate-600">
              {formatPersianDateTime(hoveredPoint.reading.timestamp)}
            </div>
          </div>
        )}
      </div>

      {/* X-axis time boundaries */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
        <span>{formatPersianDateTime(validReadings[0].timestamp)}</span>
        <span>{formatPersianDateTime(validReadings[validReadings.length - 1].timestamp)}</span>
      </div>
    </div>
  );
};
