import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MetricPoint } from '@/services/metricsAggregator';

interface DynamicChartProps {
  title: string;
  data: MetricPoint[];
  type?: 'line' | 'area' | 'bar';
  color?: string;
  height?: number;
  delay?: number;
  showLegend?: boolean;
}

export function DynamicChart({
  title,
  data,
  type = 'line',
  color = '#00c8ff',
  height = 250,
  delay = 0,
  showLegend = false,
}: DynamicChartProps) {
  // Transformar dados para formato do Recharts
  const chartData = data.map((point, index) => ({
    time: new Date(point.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    value: point.value,
    label: point.label,
    timestamp: point.timestamp,
  }));

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.1)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
            <YAxis stroke="rgba(255,255,255,0.3)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(12,20,40,0.9)',
                border: `1px solid ${color}`,
                borderRadius: '8px',
              }}
              formatter={(value: any) => [Number(value).toFixed(2), 'Valor']}
            />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${title})`}
              isAnimationActive={true}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.1)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
            <YAxis stroke="rgba(255,255,255,0.3)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(12,20,40,0.9)',
                border: `1px solid ${color}`,
                borderRadius: '8px',
              }}
              formatter={(value: any) => [Number(value).toFixed(2), 'Valor']}
            />
            {showLegend && <Legend />}
            <Bar dataKey="value" fill={color} isAnimationActive={true} />
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.1)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
            <YAxis stroke="rgba(255,255,255,0.3)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(12,20,40,0.9)',
                border: `1px solid ${color}`,
                borderRadius: '8px',
              }}
              formatter={(value: any) => [Number(value).toFixed(2), 'Valor']}
            />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={true}
            />
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-lg p-6 neon-border"
    >
      <h3 className="font-semibold mb-6 text-lg">{title}</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Aguardando dados...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
