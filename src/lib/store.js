import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { activityFactor } from './program';

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
  activity: 1.525,
  trainingDays: 6,
  job: 'desk',
  autoTargets: true,
  lossRate: 0.5, // kg/tuần
  proteinPerKg: 2.0,
  weekPromptSeen: null,
  programEdits: {}, // bài thêm/bỏ theo từng buổi, áp dụng cho các lần sau
  cycleStartAt: null, // mốc "bắt đầu lại chu kỳ từ D1" (ms); dữ liệu cũ giữ nguyên
};

// Cấu hình người dùng — lưu LocalStorage qua Zustand persist (URD 2.1)
export const useSettings = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      resetCycle: () => set({ cycleStartAt: Date.now() }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'shuru-settings', version: 1 }
  )
);

// Bản nháp cài đặt: chỉnh xong mới bấm "Lưu cài đặt" (giữ nguyên khi chuyển tab)
export const useDraft = create((set) => ({
  draft: null,
  setDraft: (patch) => set((st) => ({ draft: { ...(st.draft || {}), ...patch } })),
  clear: () => set({ draft: null }),
}));

export const pickSettings = (s) => Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, s[k]]));

export const LOSS_RATES = [
  { value: 0.25, label: '0,25', hint: 'Nhẹ nhàng' },
  { value: 0.5, label: '0,5', hint: 'Khuyến nghị' },
  { value: 0.75, label: '0,75', hint: 'Nhanh' },
  { value: 1, label: '1,0', hint: 'Rất nhanh' },
];
const KCAL_PER_KG = 7700; // năng lượng ước tính trong 1 kg mỡ cơ thể

// Mục tiêu dinh dưỡng mỗi ngày.
//  Chế độ tự động: TDEE (Mifflin–St Jeor theo cân hiện tại) − thâm hụt theo tốc độ giảm mong muốn;
//  Protein = g/kg × cân hiện tại (±0,2 g/kg); Fat = trần do người dùng đặt; Carbs = phần Kcal còn lại.
//  Chế độ thủ công: dùng Kcal duy trì, thâm hụt và Protein nhập tay.
// Giới hạn giá trị nhập để không bao giờ ra số âm / vô lý
const clamp = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : d;
};
export function sanitize(raw) {
  const s = { ...DEFAULT_SETTINGS, ...raw };
  return {
    ...s,
    startWeight: clamp(s.startWeight, 30, 300, 81),
    goalWeight: clamp(s.goalWeight, 30, 300, 70),
    age: s.age ? clamp(s.age, 12, 100, null) : null,
    heightCm: s.heightCm ? clamp(s.heightCm, 120, 230, null) : null,
    trainingDays: [3, 4, 5, 6, 7].includes(+s.trainingDays) ? +s.trainingDays : 6,
    job: ['desk', 'mixed', 'manual'].includes(s.job) ? s.job : 'desk',
    // hệ số vận động suy ra từ công việc + số buổi tập
    activity: activityFactor(['desk', 'mixed', 'manual'].includes(s.job) ? s.job : 'desk', [3, 4, 5, 6, 7].includes(+s.trainingDays) ? +s.trainingDays : 6),
    lossRate: clamp(s.lossRate, 0.1, 1.5, 0.5),
    proteinPerKg: clamp(s.proteinPerKg, 1, 3.5, 2),
    fatCap: clamp(s.fatCap, 10, 200, 30),
    maintenanceKcal: clamp(s.maintenanceKcal, 1000, 6000, 2400),
    deficitKcal: Number.isFinite(+s.deficitKcal) ? Math.min(1500, Math.max(0, +s.deficitKcal)) : 500,
    proteinMin: clamp(s.proteinMin, 20, 400, 140),
    proteinMax: clamp(Math.max(+s.proteinMax || 0, +s.proteinMin || 0), 20, 400, 160),
  };
}

export function macroTargets(raw, currentWeight) {
  const s = sanitize(raw);
  const W = currentWeight > 0 ? currentWeight : s.startWeight;
  const prof = calcTDEE({ sex: s.sex, age: s.age, heightCm: s.heightCm, weightKg: W, activity: s.activity });
  let tdee, deficit, proteinMin, proteinMax, floorHit = false, atGoal = false;
  if (s.autoTargets) {
    tdee = prof?.tdee ?? s.maintenanceKcal;
    atGoal = W <= s.goalWeight;
    deficit = atGoal ? 0 : Math.round((s.lossRate * KCAL_PER_KG) / 7 / 10) * 10;
    const floor = Math.max(s.sex === 'female' ? 1200 : 1500, prof?.bmr ?? 0);
    if (tdee - deficit < floor) {
      deficit = Math.max(0, tdee - floor);
      floorHit = true;
    }
    proteinMin = Math.round(W * (s.proteinPerKg - 0.2));
    proteinMax = Math.round(W * (s.proteinPerKg + 0.2));
  } else {
    tdee = s.maintenanceKcal;
    deficit = s.deficitKcal;
    proteinMin = s.proteinMin;
    proteinMax = s.proteinMax;
  }
  const kcal = Math.max(0, tdee - deficit);
  const proteinMid = Math.round((proteinMin + proteinMax) / 2);
  const carbs = Math.max(0, Math.round((kcal - proteinMid * 4 - s.fatCap * 9) / 4));
  const weeklyLoss = (deficit * 7) / KCAL_PER_KG;
  const toGo = Math.max(0, W - s.goalWeight);
  const weeks = weeklyLoss > 0 ? toGo / weeklyLoss : null;
  // Fat tối thiểu khuyến nghị dài hạn: nam ≥ 0,5 g/kg; nữ ≥ 0,5 g/kg và ≥ 20% năng lượng
  const fatMin = Math.round(s.sex === 'female' ? Math.max(W * 0.5, (kcal * 0.2) / 9) : W * 0.5);
  return {
    fatMin,
    kcal,
    carbs,
    proteinMin,
    proteinMax,
    proteinMid,
    fatCap: s.fatCap,
    tdee,
    deficit,
    weight: W,
    tdeeFromProfile: !!(s.autoTargets && prof),
    bmr: prof?.bmr ?? null,
    weeklyLoss,
    weeks,
    floorHit,
    atGoal,
  };
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

// Bộ đếm nghỉ — lưu sessionStorage để tải lại trang (cập nhật app) vẫn còn
export const useRest = create(persist((set) => ({
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
}), { name: 'rest-timer', storage: createJSONStorage(() => sessionStorage) }));
