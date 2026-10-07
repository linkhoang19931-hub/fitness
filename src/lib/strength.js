// Sức mạnh: 1RM ước tính, kỷ lục, gợi ý tăng tạ (double progression), set khởi động, tuần giảm tải.
import { db } from './db';
import { EXERCISE_BY_NAME } from './exercises';
import { guideFor } from './guides';
import { unitOf } from './program';
import { addDays, weekStart } from './utils';

// 1RM ước tính theo Epley; rep > 12 kém chính xác nên chặn ở 12
export function e1rm(weight, reps) {
  if (!weight || !reps || reps < 1) return null;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
}

const LOWER = ['quads', 'hamstrings', 'glutes', 'calves'];

// Khoảng rep mục tiêu: lấy từ hướng dẫn bài (rx) nếu có, không thì theo loại bài
export function repRange(name) {
  const rx = guideFor(name)?.rx || '';
  const m = rx.match(/×\s*(?:tối đa\s*\()?(\d+)\s*[–-]\s*(\d+)/);
  if (m) return [+m[1], +m[2]];
  const ex = EXERCISE_BY_NAME[name];
  if (!ex) return [8, 12];
  const compound = ['bb', 'sm'].includes(ex.eq) || (ex.groups.length >= 3 && ex.eq !== 'cb');
  return compound ? [6, 10] : [10, 15];
}

export function isCompound(name) {
  const [lo] = repRange(name);
  return lo <= 8;
}

// Bước tăng tạ nhỏ nhất thường có ở phòng tập
export function increment(name) {
  const ex = EXERCISE_BY_NAME[name];
  const lower = ex ? LOWER.includes(ex.groups[0]) : false;
  switch (ex?.eq) {
    case 'bb':
    case 'sm':
    case 'mc':
      return lower ? 5 : 2.5;
    case 'db':
    case 'kb':
      return 2;
    case 'cb':
    case 'ez':
      return 2.5;
    default:
      return 2.5;
  }
}

export const roundTo = (v, step) => Math.round(v / step) * step;
const fmt = (n) => String(Math.round(n * 100) / 100);

// Gợi ý cho buổi hôm nay dựa trên 1–2 buổi gần nhất của bài.
//  sessions: [[set...] buổi gần nhất, [set...] buổi trước đó?]
//  Nguyên tắc "double progression": giữ tạ, tăng rep tới đầu trên của khoảng; đủ rep ở mọi set thì tăng tạ và quay về đầu dưới.
export function suggestNext(name, sessions, { deload = false } = {}) {
  if (unitOf(name)) return null;
  const last = (sessions?.[0] || []).filter((s) => s.reps > 0);
  if (!last.length) return null;
  const [lo, hi] = repRange(name);
  const inc = increment(name);
  const top = Math.max(...last.map((s) => +s.weightKg || 0));
  const atTop = last.filter((s) => (+s.weightKg || 0) === top);
  const minReps = Math.min(...atTop.map((s) => s.reps));
  const n = last.length;

  if (deload) {
    if (!top) return { kind: 'deload', weight: null, reps: lo, sets: Math.max(1, Math.ceil(n / 2)), lo, hi, text: `Tuần giảm tải: ${Math.max(1, Math.ceil(n / 2))} set, dừng khi còn dư 3–4 rep.` };
    const w = Math.max(inc, roundTo(top * 0.7, inc));
    return { kind: 'deload', weight: w, reps: lo, sets: Math.max(1, Math.ceil(n / 2)), lo, hi, text: `Tuần giảm tải: ~70% tạ, ${Math.max(1, Math.ceil(n / 2))} set, dừng khi còn dư 3–4 rep.` };
  }

  // Bài không tạ (hít xà, chống đẩy...)
  if (!top) {
    if (minReps >= hi) return { kind: 'up', weight: null, reps: hi, lo, hi, text: `Đủ ${hi} rep mọi set: đeo thêm 2,5–5 kg hoặc chọn biến thể khó hơn.` };
    return { kind: 'hold', weight: null, reps: minReps + 1, lo, hi, text: `Cố thêm 1 rep mỗi set (mục tiêu ${hi}).` };
  }

  if (atTop.length === n && minReps >= hi) {
    return { kind: 'up', weight: top + inc, reps: lo, lo, hi, text: `Lần trước đủ ${hi} rep ở cả ${n} set → tăng ${fmt(inc)} kg, làm lại từ ${lo} rep.` };
  }
  // Hai buổi liền ở cùng mức tạ mà vẫn dưới khoảng rep → giảm ~10%
  const prev = (sessions?.[1] || []).filter((s) => s.reps > 0);
  const prevTop = prev.length ? Math.max(...prev.map((s) => +s.weightKg || 0)) : null;
  const prevMin = prev.length ? Math.min(...prev.filter((s) => (+s.weightKg || 0) === prevTop).map((s) => s.reps)) : null;
  if (minReps < lo && prevTop === top && prevMin != null && prevMin < lo) {
    const w = Math.max(inc, roundTo(top * 0.9, inc));
    return { kind: 'down', weight: w, reps: lo, lo, hi, text: `2 buổi liền dưới ${lo} rep ở ${fmt(top)} kg → giảm về ${fmt(w)} kg để tập đúng khoảng rep.` };
  }
  if (minReps < lo) {
    return { kind: 'hold', weight: top, reps: lo, lo, hi, text: `Lần trước có set dưới ${lo} rep: giữ ${fmt(top)} kg, cố đạt ${lo} rep mọi set.` };
  }
  return { kind: 'hold', weight: top, reps: Math.min(hi, minReps + 1), lo, hi, text: `Giữ ${fmt(top)} kg, cố thêm 1 rep mỗi set (đủ ${hi} rep mọi set thì tăng tạ).` };
}

// Set khởi động trước bài nặng (không ghi vào nhật ký)
export function warmupSets(name, workWeight) {
  const ex = EXERCISE_BY_NAME[name];
  if (!workWeight || workWeight < 20 || unitOf(name)) return [];
  const bar = ['bb', 'sm'].includes(ex?.eq) ? 20 : ex?.eq === 'ez' ? 10 : 0;
  const step = ['db', 'kb'].includes(ex?.eq) ? 2 : 2.5;
  const out = [];
  if (bar && workWeight > bar + 10) out.push({ weight: bar, reps: 10, label: 'Thanh không' });
  const plan = workWeight >= 40 ? [[0.4, 8], [0.6, 5], [0.8, 3]] : [[0.5, 8], [0.75, 4]];
  for (const [pct, reps] of plan) {
    const w = Math.max(bar || step, roundTo(workWeight * pct, step));
    if (w >= workWeight || out.some((o) => o.weight === w)) continue;
    out.push({ weight: w, reps, label: `${Math.round(pct * 100)}%` });
  }
  return out;
}

// Lịch sử một bài: mỗi buổi 1 dòng
export async function exerciseHistory(name) {
  const logs = await db.exerciseLogs.where('exerciseName').equals(name).filter((l) => !!l.isCompleted).toArray();
  if (!logs.length) return [];
  const ids = [...new Set(logs.map((l) => l.workoutId))];
  const ws = (await db.workouts.bulkGet(ids)).filter((w) => w?.completedAt);
  return ws
    .map((w) => {
      const sets = logs.filter((l) => l.workoutId === w.id).sort((a, b) => a.setIndex - b.setIndex);
      const best = sets.reduce((m, s) => Math.max(m, e1rm(+s.weightKg || 0, s.reps) || 0), 0);
      return {
        workoutId: w.id,
        date: w.date,
        deload: !!w.deload,
        at: w.completedAt,
        sets,
        e1rm: best ? Math.round(best * 10) / 10 : null,
        top: Math.max(0, ...sets.map((s) => +s.weightKg || 0)),
        maxReps: Math.max(0, ...sets.map((s) => s.reps || 0)),
        volume: sets.reduce((a, s) => a + (+s.weightKg || 0) * (s.reps || 0), 0),
      };
    })
    .sort((a, b) => a.at - b.at);
}

// Kỷ lục: 1RM ước tính, tạ nặng nhất, rep nhiều nhất (bài không tạ), volume buổi
export function records(all) {
  const history = all.filter((h) => !h.deload);
  const pick = (key) => history.reduce((b, h) => (h[key] && (!b || h[key] > b[key]) ? h : b), null);
  return { e1rm: pick('e1rm'), top: pick('top'), maxReps: pick('maxReps'), volume: pick('volume') };
}

// ---------- Tuần giảm tải ----------
export const DELOAD_AFTER = 6; // số tuần tập liên tục trước khi gợi ý giảm tải
export const isDeloadActive = (deloadStart, today) => !!deloadStart && today >= deloadStart && today <= addDays(deloadStart, 6);

export function deloadStatus(completed, { deloadStart, deloadSnooze }, today) {
  const active = isDeloadActive(deloadStart, today);
  const anchor = deloadStart ? addDays(deloadStart, 7) : null;
  const weeks = new Set(completed.filter((w) => !anchor || w.date >= anchor).map((w) => weekStart(w.date)));
  // Đếm số tuần tập LIÊN TỤC tính tới tuần này (hoặc tuần trước nếu tuần này chưa tập).
  // Nghỉ hẳn một tuần coi như đã giảm tải tự nhiên.
  const thisWeek = weekStart(today);
  let cur = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let count = 0;
  while (weeks.has(cur)) {
    count++;
    cur = addDays(cur, -7);
  }
  const snoozed = !!deloadSnooze && today < deloadSnooze;
  return { active, endsOn: active ? addDays(deloadStart, 6) : null, weeks: count, due: !active && count >= DELOAD_AFTER, snoozed };
}
