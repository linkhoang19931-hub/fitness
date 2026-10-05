import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  restSeconds: 90,
  soundOn: true,
  vibrateOn: true,
  startWeight: 81,
  goalWeight: 70,
  proteinMin: 140,
  proteinMax: 160,
  fatCap: 30,
  maintenanceKcal: 2400,
  deficitKcal: 500,
  sex: 'male',
  age: null,
  heightCm: null,
  activity: 1.55,
};

// Cấu hình người dùng — lưu LocalStorage qua Zustand persist (URD 2.1)
export const useSettings = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'shuru-settings', version: 1 }
  )
);

export const pickSettings = (s) => Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, s[k]]));

// Mục tiêu dinh dưỡng suy ra từ cấu hình:
//  Kcal mục tiêu = Kcal duy trì − mức thâm hụt
//  Carbs = phần Kcal còn lại sau Protein (mức trên) và Fat (trần) / 4
export function macroTargets(s) {
  const kcal = Math.max(0, s.maintenanceKcal - s.deficitKcal);
  const carbs = Math.max(0, Math.round((kcal - s.proteinMax * 4 - s.fatCap * 9) / 4));
  return { kcal, carbs, proteinMin: s.proteinMin, proteinMax: s.proteinMax, fatCap: s.fatCap };
}

// TDEE theo công thức Mifflin–St Jeor × hệ số vận động
export function calcTDEE({ sex, age, heightCm, weightKg, activity }) {
  if (!age || !heightCm || !weightKg) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
  return { bmr: Math.round(bmr), tdee: Math.round((bmr * activity) / 10) * 10 };
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Ít vận động', hint: 'Ngồi văn phòng, không tập' },
  { value: 1.375, label: 'Nhẹ', hint: 'Tập 1–3 buổi/tuần' },
  { value: 1.55, label: 'Vừa', hint: 'Tập 4–6 buổi/tuần, việc văn phòng' },
  { value: 1.725, label: 'Nhiều', hint: 'Tập nặng 6–7 buổi/tuần hoặc việc chân tay' },
];

// Trạng thái phiên (không lưu): bộ đếm nghỉ
export const useRest = create((set) => ({
  endAt: null,
  total: 0,
  start: (seconds) => set({ endAt: Date.now() + seconds * 1000, total: seconds }),
  adjust: (delta) =>
    set((st) => {
      if (!st.endAt) return st;
      const endAt = Math.max(Date.now() + 1000, st.endAt + delta * 1000);
      return { endAt, total: Math.max(st.total + delta, 1) };
    }),
  stop: () => set({ endAt: null, total: 0 }),
}));
