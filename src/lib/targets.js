import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { macroTargets, useSettings } from './store';

// Cân nặng gần nhất trong nhật ký (dùng để tính mục tiêu tự động)
export function useLatestWeight() {
  return useLiveQuery(() => db.bodyMetrics.orderBy('date').last(), [])?.weightKg ?? null;
}

// Mục tiêu dinh dưỡng hiện hành, tự cập nhật khi đổi Cài đặt hoặc ghi cân mới
export function useTargets() {
  const s = useSettings();
  const w = useLatestWeight();
  return macroTargets(s, w);
}
