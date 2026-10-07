// Mức tiêu hao thực tế (TDEE thích ứng) đo từ cân nặng + lượng ăn đã ghi.
//  TDEE thực = Kcal ăn trung bình − (tốc độ đổi cân kg/ngày × 7700)
//  Tốc độ đổi cân lấy theo hồi quy tuyến tính các lần cân trong cửa sổ, nên ít bị nhiễu bởi một ngày tích nước.
// Chỉ đưa ra gợi ý khi đủ dữ liệu; mỗi lần chỉnh tối đa ±250 kcal để tránh nhảy vọt vì nhiễu.
import { db } from './db';
import { addDays, todayStr } from './utils';
import { macroTargets } from './store';

export const WINDOW_DAYS = 21;
export const NEED_LOGGED = 10; // số ngày có ghi ăn uống đầy đủ
export const NEED_WEIGHTS = 8; // số lần cân
export const NEED_SPAN = 14; // khoảng cách giữa lần cân đầu và cuối (ngày)
export const MAX_STEP = 250;
export const MIN_INTAKE = 800; // ngày ghi dưới mức này coi như ghi thiếu, bỏ qua
const KCAL_PER_KG = 7700;

const dayNum = (d) => Math.round(new Date(d + 'T00:00:00').getTime() / 86400000);

// Hồi quy tuyến tính y = a + b·x, trả về b (kg/ngày)
export function slope(points) {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  const sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  if (!sxx) return null;
  return points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx;
}

// Tính thuần (không đụng DB) để dễ kiểm thử
//  weights: [{date, weightKg}], intake: { [date]: kcal }
export function computeAdaptive(weights, intake, today = todayStr(), windowDays = WINDOW_DAYS) {
  const from = addDays(today, -windowDays);
  const to = addDays(today, -1); // hôm nay chưa ăn xong → không tính
  const ws = weights.filter((w) => w.date >= from && w.date <= today && w.weightKg > 0).sort((a, b) => a.date.localeCompare(b.date));
  const days = Object.entries(intake).filter(([d, k]) => d >= from && d <= to && k >= MIN_INTAKE);
  const logged = days.length;
  const span = ws.length >= 2 ? dayNum(ws[ws.length - 1].date) - dayNum(ws[0].date) : 0;
  const base = { from, to, logged, weighIns: ws.length, span, windowDays };
  if (logged < NEED_LOGGED || ws.length < NEED_WEIGHTS || span < NEED_SPAN) return { ...base, ready: false };
  const b = slope(ws.map((w) => ({ x: dayNum(w.date), y: w.weightKg })));
  const avgIntake = days.reduce((a, [, k]) => a + k, 0) / logged;
  const tdee = Math.round((avgIntake - b * KCAL_PER_KG) / 10) * 10;
  // ghi chưa đều (dưới 80% số ngày) → mức tiêu hao dễ bị tính thấp hơn thật
  const coverage = logged / windowDays;
  return { ...base, ready: true, avgIntake: Math.round(avgIntake), kgPerWeek: b * 7, tdee: Math.max(1200, Math.min(5000, tdee)), coverage, lowCoverage: coverage < 0.8 };
}

export async function loadAdaptive(today = todayStr()) {
  const from = addDays(today, -WINDOW_DAYS);
  const weights = await db.bodyMetrics.where('date').aboveOrEqual(from).toArray();
  const logs = await db.nutritionLogs.where('date').aboveOrEqual(from).toArray();
  const intake = {};
  for (const l of logs) intake[l.date] = (intake[l.date] || 0) + (+l.calories || 0);
  return computeAdaptive(weights, intake, today);
}

// Gợi ý chỉnh: so TDEE đo được với TDEE đang dùng
export function adaptiveSuggestion(result, settings, weight, today = todayStr()) {
  if (!result?.ready || !settings.autoTargets) return null;
  const cur = macroTargets(settings, weight);
  const diff = result.tdee - cur.tdee;
  const recent = settings.tdeeOverride?.at && dayNum(today) - dayNum(settings.tdeeOverride.at) < 7;
  const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, diff));
  const newTdee = Math.round((cur.tdee + step) / 10) * 10;
  const next = macroTargets({ ...settings, tdeeOverride: { kcal: newTdee, at: today } }, weight);
  return {
    current: cur,
    next,
    diff,
    newTdee,
    small: Math.abs(diff) < 100,
    capped: Math.abs(diff) > MAX_STEP,
    recent,
    nextCheck: recent ? addDays(settings.tdeeOverride.at, 7) : null,
  };
}
