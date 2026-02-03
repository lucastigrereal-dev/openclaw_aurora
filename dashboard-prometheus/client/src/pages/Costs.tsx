import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const costData = [
  { provider: 'Ollama (Local)', cost: 0, percent: 0 },
  { provider: 'OpenAI', cost: 0, percent: 0 },
  { provider: 'Claude', cost: 0, percent: 0 },
  { provider: 'Kommo API', cost: 12.5, percent: 45 },
  { provider: 'Notion API', cost: 5.2, percent: 18 },
  { provider: 'Telegram', cost: 0, percent: 0 },
  { provider: 'Gmail', cost: 0, percent: 0 },
];

const monthlyData = [
  { month: 'Jan', cost: 45 },
  { month: 'Fev', cost: 52 },
  { month: 'Mar', cost: 48 },
  { month: 'Abr', cost: 61 },
  { month: 'Mai', cost: 55 },
  { month: 'Jun', cost: 58 },
];

const colors = ['#00c8ff', '#0088ff', '#00ff88', '#ffaa00', '#ff0088', '#aa00ff', '#00ffff'];

export default function Costs() {
  const totalCost = costData.reduce((sum, item) => sum + item.cost, 0);
  const monthlyAvg = (monthlyData.reduce((sum, item) => sum + item.cost, 0) / monthlyData.length).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass rounded-lg p-6 neon-border">
          <p className="text-sm text-muted-foreground mb-2">Custo Atual</p>
          <p className="text-3xl font-bold text-accent">${totalCost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">Este mês</p>
        </div>
        <div className="glass rounded-lg p-6 neon-border">
          <p className="text-sm text-muted-foreground mb-2">Média Mensal</p>
          <p className="text-3xl font-bold text-accent">${monthlyAvg}</p>
          <p className="text-xs text-muted-foreground mt-2">Últimos 6 meses</p>
        </div>
        <div className="glass rounded-lg p-6 neon-border">
          <p className="text-sm text-muted-foreground mb-2">Previsão Anual</p>
          <p className="text-3xl font-bold text-accent">${(parseFloat(monthlyAvg) * 12).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-2">Projeção</p>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-lg p-6 neon-border"
        >
          <h3 className="font-semibold mb-6">📈 TENDÊNCIA MENSAL</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(12,20,40,0.8)',
                  border: '1px solid rgba(0,200,255,0.3)',
                }}
              />
              <Bar dataKey="cost" fill="#00c8ff" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Provider Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-lg p-6 neon-border"
        >
          <h3 className="font-semibold mb-6">🥧 CUSTO POR PROVEDOR</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={costData.filter((item) => item.cost > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="cost"
              >
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(12,20,40,0.8)',
                  border: '1px solid rgba(0,200,255,0.3)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Detailed Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-lg p-6 neon-border"
      >
        <h3 className="font-semibold mb-6">💰 DETALHAMENTO</h3>
        <div className="space-y-3">
          {costData.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
            >
              <span className="font-medium">{item.provider}</span>
              <div className="flex items-center gap-4">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.percent}%` }}
                    className="h-full bg-gradient-to-r from-accent to-accent/50"
                  />
                </div>
                <span className="text-sm text-accent font-semibold w-16 text-right">
                  ${item.cost.toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Budget Alert */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-lg p-6 neon-border border-yellow-500/30"
      >
        <p className="text-sm">
          <span className="font-semibold text-yellow-500">⚠️ Dica:</span> Você está usando principalmente APIs
          pagas (Kommo + Notion). Considere usar mais Ollama local para reduzir custos.
        </p>
      </motion.div>
    </div>
  );
}
