import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SystemMetrics {
  cpu: number;
  ram: number;
  disk: number;
  gpu: number;
  uptime: number;
  timestamp: number;
}

export interface SkillExecution {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running';
  duration: number;
  timestamp: number;
  cost: number;
}

export interface SystemStatus {
  moltbot: 'online' | 'offline' | 'reconnecting';
  ollama: 'online' | 'offline';
  telegram: 'online' | 'offline';
  latency: number;
  metrics: SystemMetrics;
  lastExecution: SkillExecution | null;
  recentExecutions: SkillExecution[];
  activeFlows: number;
  totalExecutions: number;
  successRate: number;
}

interface SystemContextType {
  status: SystemStatus;
  updateStatus: (partial: Partial<SystemStatus>) => void;
  addExecution: (execution: SkillExecution) => void;
  updateMetrics: (metrics: Partial<SystemMetrics>) => void;
  isKillSwitchActive: boolean;
  setKillSwitch: (active: boolean) => void;
}

const defaultStatus: SystemStatus = {
  moltbot: 'offline',
  ollama: 'offline',
  telegram: 'offline',
  latency: 0,
  metrics: {
    cpu: 0,
    ram: 0,
    disk: 0,
    gpu: 0,
    uptime: 0,
    timestamp: Date.now(),
  },
  lastExecution: null,
  recentExecutions: [],
  activeFlows: 0,
  totalExecutions: 0,
  successRate: 0,
};

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SystemStatus>(defaultStatus);
  const [isKillSwitchActive, setKillSwitch] = useState(false);

  const updateStatus = useCallback((partial: Partial<SystemStatus>) => {
    setStatus((prev) => ({ ...prev, ...partial }));
  }, []);

  const addExecution = useCallback((execution: SkillExecution) => {
    setStatus((prev) => ({
      ...prev,
      lastExecution: execution,
      recentExecutions: [execution, ...prev.recentExecutions].slice(0, 10),
      totalExecutions: prev.totalExecutions + 1,
      successRate:
        prev.totalExecutions === 0
          ? execution.status === 'success'
            ? 100
            : 0
          : ((prev.successRate * prev.totalExecutions +
              (execution.status === 'success' ? 100 : 0)) /
              (prev.totalExecutions + 1)) *
            100,
    }));
  }, []);

  const updateMetrics = useCallback((metrics: Partial<SystemMetrics>) => {
    setStatus((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        ...metrics,
        timestamp: Date.now(),
      },
    }));
  }, []);

  return (
    <SystemContext.Provider
      value={{
        status,
        updateStatus,
        addExecution,
        updateMetrics,
        isKillSwitchActive,
        setKillSwitch,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within SystemProvider');
  }
  return context;
}
