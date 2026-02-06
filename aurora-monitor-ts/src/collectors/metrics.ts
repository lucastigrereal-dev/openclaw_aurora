/**
 * Coletor de Métricas do Sistema
 *
 * Coleta métricas de CPU, memória, disco, rede e processo
 * de forma eficiente e thread-safe.
 */

import * as os from 'os';
import * as v8 from 'v8';
import { MetricsConfig } from '../core/config';

export interface CPUMetrics {
  percent: number;
  user: number;
  system: number;
  cores: number;
  loadAverage: number[];
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  percent: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface NetworkMetrics {
  bytesReceived: number;
  bytesSent: number;
}

export interface EventLoopMetrics {
  lag: number;
  utilization: number;
}

export interface ProcessMetrics {
  pid: number;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  activeHandles: number;
  activeRequests: number;
}

export interface GCMetrics {
  heapSizeLimit: number;
  totalHeapSize: number;
  usedHeapSize: number;
  mallocedMemory: number;
  peakMallocedMemory: number;
}

export interface SystemMetrics {
  timestamp: Date;
  hostname: string;
  platform: NodeJS.Platform;
  nodeVersion: string;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  eventLoop?: EventLoopMetrics;
  process: ProcessMetrics;
  gc: GCMetrics;
}

interface CPUSample {
  idle: number;
  total: number;
}

export class MetricsCollector {
  private config: MetricsConfig;
  private history: SystemMetrics[] = [];
  private lastCpuSample: CPUSample | null = null;
  private lastEventLoopCheck = 0;
  private eventLoopLag = 0;

  constructor(config: MetricsConfig) {
    this.config = config;
    this.startEventLoopMonitor();
  }

  private startEventLoopMonitor(): void {
    const checkInterval = 100; // Check every 100ms

    const check = () => {
      const now = Date.now();
      if (this.lastEventLoopCheck > 0) {
        const expected = checkInterval;
        const actual = now - this.lastEventLoopCheck;
        this.eventLoopLag = Math.max(0, actual - expected);
      }
      this.lastEventLoopCheck = now;

      if (this.config.enabled) {
        setTimeout(check, checkInterval);
      }
    };

    setTimeout(check, checkInterval);
  }

  /**
   * Coleta todas as métricas do sistema.
   */
  async collect(): Promise<SystemMetrics> {
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
      cpu: this.collectCPU(),
      memory: this.collectMemory(),
      disk: await this.collectDisk(),
      network: this.collectNetwork(),
      eventLoop: this.collectEventLoop(),
      process: this.collectProcess(),
      gc: this.collectGC(),
    };

    // Adiciona ao histórico
    this.history.push(metrics);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    return metrics;
  }

  private collectCPU(): CPUMetrics {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type of Object.keys(cpu.times) as (keyof typeof cpu.times)[]) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const currentSample: CPUSample = { idle: totalIdle, total: totalTick };
    let percent = 0;

    if (this.lastCpuSample) {
      const idleDiff = currentSample.idle - this.lastCpuSample.idle;
      const totalDiff = currentSample.total - this.lastCpuSample.total;
      percent = totalDiff > 0 ? 100 - (idleDiff / totalDiff) * 100 : 0;
    }

    this.lastCpuSample = currentSample;

    // Calculate user and system time
    let userTime = 0;
    let systemTime = 0;
    for (const cpu of cpus) {
      userTime += cpu.times.user;
      systemTime += cpu.times.sys;
    }

    return {
      percent: Math.round(percent * 100) / 100,
      user: userTime,
      system: systemTime,
      cores: cpus.length,
      loadAverage: os.loadavg(),
    };
  }

  private collectMemory(): MemoryMetrics {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const memUsage = process.memoryUsage();

    return {
      total,
      used,
      free,
      percent: Math.round((used / total) * 10000) / 100,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0,
      rss: memUsage.rss,
    };
  }

  private async collectDisk(): Promise<DiskMetrics> {
    // Node.js não tem API nativa para disco, retorna estimativa
    // Em produção, use 'diskusage' ou 'check-disk-space'
    try {
      const { execSync } = await import('child_process');

      if (os.platform() !== 'win32') {
        const output = execSync('df -k / | tail -1', { encoding: 'utf8' });
        const parts = output.trim().split(/\s+/);
        if (parts.length >= 4) {
          const total = parseInt(parts[1], 10) * 1024;
          const used = parseInt(parts[2], 10) * 1024;
          const free = parseInt(parts[3], 10) * 1024;
          return {
            total,
            used,
            free,
            percent: Math.round((used / total) * 10000) / 100,
          };
        }
      }
    } catch {
      // Fallback: retorna valores zerados
    }

    return { total: 0, used: 0, free: 0, percent: 0 };
  }

  private collectNetwork(): NetworkMetrics {
    const interfaces = os.networkInterfaces();
    let bytesReceived = 0;
    let bytesSent = 0;

    // Node.js não expõe bytes transferred diretamente
    // Isso requer bibliotecas externas ou /proc/net/dev no Linux
    // Retornamos 0 por padrão

    return { bytesReceived, bytesSent };
  }

  private collectEventLoop(): EventLoopMetrics {
    return {
      lag: this.eventLoopLag,
      utilization: 0, // Requer perf_hooks.monitorEventLoopDelay
    };
  }

  private collectProcess(): ProcessMetrics {
    return {
      pid: process.pid,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
      activeRequests: (process as any)._getActiveRequests?.()?.length || 0,
    };
  }

  private collectGC(): GCMetrics {
    const heapStats = v8.getHeapStatistics();
    return {
      heapSizeLimit: heapStats.heap_size_limit,
      totalHeapSize: heapStats.total_heap_size,
      usedHeapSize: heapStats.used_heap_size,
      mallocedMemory: heapStats.malloced_memory,
      peakMallocedMemory: heapStats.peak_malloced_memory,
    };
  }

  /**
   * Retorna última métrica coletada.
   */
  getLatest(): SystemMetrics | null {
    return this.history[this.history.length - 1] || null;
  }

  /**
   * Retorna histórico de métricas.
   */
  getHistory(count?: number): SystemMetrics[] {
    if (count) {
      return this.history.slice(-count);
    }
    return [...this.history];
  }

  /**
   * Calcula taxa de variação de uma métrica.
   */
  getRate(
    metricPath: string,
    windowMs: number = 60000
  ): number {
    const now = Date.now();
    const cutoff = now - windowMs;

    const samples = this.history.filter(
      (m) => m.timestamp.getTime() > cutoff
    );

    if (samples.length < 2) return 0;

    const first = samples[0];
    const last = samples[samples.length - 1];
    const timeDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / 1000;

    if (timeDiff <= 0) return 0;

    // Extrai valor usando path (ex: 'memory.heapUsed')
    const getValue = (obj: any, path: string): number => {
      const parts = path.split('.');
      let val = obj;
      for (const part of parts) {
        val = val?.[part];
      }
      return typeof val === 'number' ? val : 0;
    };

    const firstVal = getValue(first, metricPath);
    const lastVal = getValue(last, metricPath);

    return (lastVal - firstVal) / timeDiff;
  }

  /**
   * Limpa histórico.
   */
  clearHistory(): void {
    this.history = [];
  }
}
