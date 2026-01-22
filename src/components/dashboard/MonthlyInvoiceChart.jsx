import { useTranslation } from 'react-i18next';

/**
 * MonthlyInvoiceChart - A simple SVG line chart for monthly invoice totals
 * No external charting library needed - pure CSS/SVG
 */
export default function MonthlyInvoiceChart({ data = [], currency = 'SEK' }) {
  const { t } = useTranslation();
  
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  // Ensure we have 12 months of data, fill with 0 if missing
  const monthlyData = months.map((month, index) => {
    const found = data.find(d => d.month === index + 1);
    return {
      month,
      value: found?.total || 0,
    };
  });

  // Calculate chart dimensions
  const chartWidth = 800;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate max value for y-axis scale
  const maxValue = Math.max(...monthlyData.map(d => d.value), 1);
  const yAxisMax = Math.ceil(maxValue / 600) * 600 || 600; // Round to nearest 600

  // Generate y-axis ticks
  const yTicks = [];
  for (let i = 0; i <= 5; i++) {
    yTicks.push(Math.round((yAxisMax / 5) * i));
  }

  // Generate path points
  const points = monthlyData.map((d, i) => {
    const x = padding.left + (i * (innerWidth / 11));
    const y = padding.top + innerHeight - (d.value / yAxisMax) * innerHeight;
    return { x, y, value: d.value };
  });

  // Create SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const formatValue = (value) => {
    if (value >= 1000) {
      return `${Math.round(value / 100) / 10}k`;
    }
    return value.toString();
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('dashboard.sentInvoicesTotal')}
      </h3>
      
      <div className="relative overflow-x-auto">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-auto min-h-[200px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y-axis grid lines */}
          {yTicks.map((tick, i) => {
            const y = padding.top + innerHeight - (tick / yAxisMax) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeDasharray={i === 0 ? "0" : "4,4"}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y}
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {formatValue(tick)}
                </text>
              </g>
            );
          })}

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            className="stroke-teal-500 dark:stroke-teal-400"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className="fill-teal-500 dark:fill-teal-400"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                className="fill-teal-500/20 dark:fill-teal-400/20"
              />
            </g>
          ))}

          {/* X-axis labels */}
          {monthlyData.map((d, i) => {
            const x = padding.left + (i * (innerWidth / 11));
            return (
              <text
                key={d.month}
                x={x}
                y={chartHeight - 8}
                className="text-xs fill-gray-500 dark:fill-gray-400"
                textAnchor="middle"
              >
                {t(`dashboard.months.${d.month}`)}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="w-3 h-3 rounded-full bg-teal-500 dark:bg-teal-400"></span>
            <span>{currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
