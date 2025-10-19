'use client';

import { motion } from 'framer-motion';
import type { HistoricalDataPoint } from '@/types/admin/dashboard';

interface TrendChartProps {
  title: string;
  data: HistoricalDataPoint[];
  color?: 'blue' | 'green' | 'purple' | 'orange';
  suffix?: string;
  height?: number;
}

const colorConfig = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    fill: 'fill-blue-500/20',
    stroke: 'stroke-blue-500',
  },
  green: {
    gradient: 'from-green-500 to-emerald-500',
    fill: 'fill-green-500/20',
    stroke: 'stroke-green-500',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    fill: 'fill-purple-500/20',
    stroke: 'stroke-purple-500',
  },
  orange: {
    gradient: 'from-orange-500 to-yellow-500',
    fill: 'fill-orange-500/20',
    stroke: 'stroke-orange-500',
  },
};

export function TrendChart({ 
  title, 
  data, 
  color = 'blue', 
  suffix = '', 
  height = 150 
}: TrendChartProps) {
  const config = colorConfig[color];
  
  // Filter out null values and get valid data points
  const validData = data.filter(d => d.value !== null && d.value !== undefined);
  
  if (validData.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h4 className="text-sm font-medium text-white/80 mb-4">{title}</h4>
        <div className="flex items-center justify-center h-32 text-white/40 text-sm">
          No data available
        </div>
      </div>
    );
  }

  const values = validData.map(d => d.value as number);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  
  // Calculate SVG path for line chart
  const width = 100;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const points = validData.map((d, i) => {
    const x = padding + (i / (validData.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value as number - minValue) / range) * chartHeight;
    return { x, y };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  // Get current and previous values for trend indicator
  const currentValue = values[values.length - 1];
  const previousValue = values[values.length - 2] || values[0];
  const changePercent = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-1">{title}</h4>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                {currentValue.toFixed(1)}{suffix}
              </span>
              {changePercent !== 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  changePercent > 0 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full"
          preserveAspectRatio="none"
        >
          {/* Area gradient */}
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className={config.fill.replace('fill-', 'stop-color-')} stopOpacity="0.3" />
              <stop offset="100%" className={config.fill.replace('fill-', 'stop-color-')} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill={`url(#gradient-${color})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Line */}
          <motion.path
            d={pathData}
            fill="none"
            className={config.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          {/* Data points */}
          {points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="3"
              className={config.fill.replace('/20', '')}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
            />
          ))}
        </svg>

        {/* X-axis labels (first and last date) */}
        <div className="flex justify-between mt-3 text-xs text-white/40">
          <span>{new Date(validData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span>{new Date(validData[validData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </motion.div>
  );
}
