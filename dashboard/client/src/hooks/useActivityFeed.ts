import { useState, useCallback } from 'react';

export interface Activity {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'execution' | 'connection' | 'metric';
  title: string;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UseActivityFeedOptions {
  maxItems?: number;
}

export function useActivityFeed({ maxItems = 50 }: UseActivityFeedOptions = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = useCallback(
    (activity: Omit<Activity, 'id' | 'timestamp'>) => {
      const newActivity: Activity = {
        ...activity,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };

      setActivities((prev) => [newActivity, ...prev.slice(0, maxItems - 1)]);
      return newActivity;
    },
    [maxItems]
  );

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getActivitiesByType = useCallback(
    (type: Activity['type']) => {
      return activities.filter((a) => a.type === type);
    },
    [activities]
  );

  const getRecentActivities = useCallback(
    (limit: number = 10) => {
      return activities.slice(0, limit);
    },
    [activities]
  );

  return {
    activities,
    addActivity,
    clearActivities,
    removeActivity,
    getActivitiesByType,
    getRecentActivities,
  };
}
