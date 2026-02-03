import { motion } from 'framer-motion';
import { Search, Filter, Download } from 'lucide-react';
import { useState } from 'react';

const executions = [
  {
    id: '#1247',
    skill: 'browser.open',
    status: 'success',
    duration: 2.1,
    timestamp: '12:45:32',
    input: 'https://example.com',
    output: 'Screenshot 1920x1080',
  },
  {
    id: '#1246',
    skill: 'file.read',
    status: 'success',
    duration: 0.3,
    timestamp: '12:44:15',
    input: '/home/user/doc.txt',
    output: '2.5KB',
  },
  {
    id: '#1245',
    skill: 'exec.bash',
    status: 'failed',
    duration: 1.2,
    timestamp: '12:42:48',
    input: 'ls -la /root',
    output: 'Permission denied',
  },
  {
    id: '#1244',
    skill: 'vision.ocr',
    status: 'success',
    duration: 3.5,
    timestamp: '12:40:22',
    input: 'screenshot.png',
    output: '450 caracteres extraídos',
  },
];

export default function Executions() {
  const [selectedExecution, setSelectedExecution] = useState<(typeof executions)[0] | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 items-center"
      >
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar execução..."
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent"
          />
        </div>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <Filter size={20} />
        </button>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <Download size={20} />
        </button>
      </motion.div>

      {/* Executions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-lg p-6 neon-border overflow-x-auto"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">ID</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">SKILL</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">STATUS</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">TEMPO</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">TIMESTAMP</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((exec, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedExecution(exec)}
              >
                <td className="py-3 px-4 font-mono text-xs">{exec.id}</td>
                <td className="py-3 px-4 font-medium">⚡ {exec.skill}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(exec.status)}`} />
                    <span className="capitalize">{exec.status}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{exec.duration}s</td>
                <td className="py-3 px-4 text-muted-foreground text-xs">{exec.timestamp}</td>
                <td className="py-3 px-4">
                  <button className="text-accent hover:underline text-xs">Ver detalhes</button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Details Modal */}
      {selectedExecution && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-lg p-6 neon-border"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">📋 DETALHES DA EXECUÇÃO</h3>
            <button
              onClick={() => setSelectedExecution(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">ID</p>
                <p className="font-mono text-sm">{selectedExecution.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Skill</p>
                <p className="font-medium">{selectedExecution.skill}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className={`font-semibold ${getStatusColor(selectedExecution.status)}`}>
                  {selectedExecution.status.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Duração</p>
                <p className="font-mono">{selectedExecution.duration}s</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Input</p>
              <div className="bg-black/30 rounded p-3 font-mono text-xs text-foreground/70">
                {selectedExecution.input}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Output</p>
              <div className="bg-black/30 rounded p-3 font-mono text-xs text-foreground/70">
                {selectedExecution.output}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
