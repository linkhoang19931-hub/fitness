// Tổng kết một tuần (Thứ hai → Chủ nhật): cân nặng, dinh dưỡng, nước, giấc ngủ, buổi tập, số set theo nhóm cơ, sức mạnh.
import { db } from './db';
import { EXERCISE_BY_NAME, MUSCLE_LABEL } from './exercises';
import { macroTargets } from './store';
import { nightsFrom, periodStats, sleepTarget } from './sleep';
import { e1rm } from './strength';
import { waterGoal } from './water';
import { addDays } from './utils';

export const SET_RANGE = [10, 20]; // set/nhóm cơ/tuần cho tăng & giữ cơ
const SKIP_GROUPS = ['cardio', 'mobility'];

// Mỗi set: nhóm cơ chính +1, các nhóm phụ +0,5 (cách tính "set phân số" phổ biến)
export function setsByMuscle(sets) {
  const out = {};
  for (const s of sets) {
    const g = EXERCISE_BY_NAME[s.exerciseName]?.groups || [];
    g.forEach((m, i) => {
      if (SKIP_GROUPS.includes(m)) return;
      out[m] = (out[m] || 0) + (i === 0 ? 1 : 0.5);
    });
  }
  return Object.entries(out)
    .map(([m, n]) => ({ muscle: m, label: MUSCLE_LABEL[m] || m, sets: Math.round(n * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets);
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export async function loadWeek(monday, today, settings) {
  const from = monday;
  const to = addDays(monday, 6);
  const end = to < today ? to : today; // ngày cuối đã có dữ liệu
  const elapsed = Math.max(1, Math.round((new Date(end) - new Date(from)) / 86400000) + 1);
  const prevFrom = addDays(from, -7);

  // ---- Cân nặng ----
  const weights = await db.bodyMetrics.where('date').between(prevFrom, to, true, true).toArray();
  const wThis = weights.filter((w) => w.date >= from).map((w) => w.weightKg);
  const wPrev = weights.filter((w) => w.date < from).map((w) => w.weightKg);
  const weight = { avg: avg(wThis), prevAvg: avg(wPrev), count: wThis.length };
  weight.delta = weight.avg != null && weight.prevAvg != null ? weight.avg - weight.prevAvg : null;

  const latest = await db.bodyMetrics.orderBy('date').last();
  const t = macroTargets(settings, latest?.weightKg);

  // ---- Dinh dưỡng ----
  const logs = await db.nutritionLogs.where('date').between(from, to, true, true).toArray();
  const byDay = {};
  for (const l of logs) {
    const d = (byDay[l.date] ||= { k: 0, p: 0, f: 0, c: 0 });
    d.k += +l.calories || 0;
    d.p += +l.protein || 0;
    d.f += +l.fat || 0;
    d.c += +l.carbs || 0;
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((date) => ({ date, ...(byDay[date] || { k: 0, p: 0, f: 0, c: 0 }) }));
  const logged = days.filter((d) => d.date <= end && d.k >= 800);
  const nutrition = {
    days,
    logged: logged.length,
    elapsed,
    avgKcal: avg(logged.map((d) => d.k)),
    proteinOk: logged.filter((d) => d.p >= t.proteinMin).length,
    fatOk: logged.filter((d) => d.f <= t.fatCap).length,
    kcalOk: logged.filter((d) => Math.abs(d.k - t.kcal) <= t.kcal * 0.1).length,
    avgProtein: avg(logged.map((d) => d.p)),
  };

  // ---- Tập luyện ----
  const workouts = (await db.workouts.where('date').between(from, to, true, true).toArray()).filter((w) => w.completedAt);
  const ids = workouts.map((w) => w.id);
  const sets = ids.length ? await db.exerciseLogs.where('workoutId').anyOf(ids).filter((l) => !!l.isCompleted).toArray() : [];
  const training = {
    sessions: workouts.length,
    planned: settings.trainingDays,
    sets: sets.length,
    volume: sets.reduce((a, s) => a + (+s.weightKg || 0) * (s.reps || 0), 0),
    minutes: workouts.reduce((a, w) => a + Math.round((w.completedAt - w.startedAt) / 60000), 0),
    muscles: setsByMuscle(sets),
  };

  // ---- Sức mạnh: so 1RM ước tính tuần này với lần gần nhất trước tuần này ----
  const names = [...new Set(sets.map((s) => s.exerciseName))];
  const strength = [];
  const deloadWeek = workouts.some((w) => w.deload);
  if (names.length && !deloadWeek) {
    const olderW = (await db.workouts.where('date').below(from).toArray()).filter((w) => w.completedAt && !w.deload);
    const olderLogs = olderW.length ? await db.exerciseLogs.where('workoutId').anyOf(olderW.map((w) => w.id)).filter((l) => !!l.isCompleted && names.includes(l.exerciseName)).toArray() : [];
    const dateOf = Object.fromEntries(olderW.map((w) => [w.id, w.date]));
    for (const n of names) {
      const best = (arr) => arr.reduce((m, s) => Math.max(m, e1rm(+s.weightKg || 0, s.reps) || 0), 0);
      const now = best(sets.filter((s) => s.exerciseName === n));
      if (!now) continue;
      const prevSets = olderLogs.filter((l) => l.exerciseName === n);
      const lastDate = prevSets.reduce((m, l) => (dateOf[l.workoutId] > m ? dateOf[l.workoutId] : m), '');
      const before = best(prevSets.filter((l) => dateOf[l.workoutId] === lastDate));
      const allTime = best(prevSets);
      strength.push({ name: n, now: Math.round(now * 10) / 10, before: before ? Math.round(before * 10) / 10 : null, pr: allTime > 0 && now > allTime + 0.01, first: !prevSets.length });
    }
  }

  // ---- Giấc ngủ ----
  const sleepsAll = await db.sleeps.where('wakeDate').between(addDays(from, -10), to, true, true).toArray();
  const target = sleepTarget(settings);
  const nights = nightsFrom(sleepsAll.filter((s) => s.end)).filter((n) => n.date >= from && n.date <= to);
  const sleep = { stats: periodStats(nights, target), target };

  // ---- Nước ----
  const water = await db.water.where('date').between(from, to, true, true).toArray();
  const wByDay = {};
  for (const x of water) wByDay[x.date] = (wByDay[x.date] || 0) + x.ml;
  const trainedDays = new Set(workouts.map((w) => w.date));
  // hôm nay chưa hết ngày: chỉ tính vào đánh giá nếu đã đạt mục tiêu
  const wDays = Object.keys(wByDay).filter((d) => d < today || wByDay[d] >= waterGoal(t.weight, trainedDays.has(d)));
  const waterSum = {
    avg: wDays.length ? Math.round(avg(wDays.map((d) => wByDay[d]))) : null,
    todayMl: wByDay[today] || 0,
    days: wDays.length,
    goalMet: wDays.filter((d) => wByDay[d] >= waterGoal(t.weight, trainedDays.has(d))).length,
    goal: waterGoal(t.weight, false),
  };

  return { from, to, end, elapsed, targets: t, weight, nutrition, training, strength, sleep, water: waterSum, done: to < today };
}

// Đánh giá từng mảng → good | fair | poor | none, kèm lời khuyên
export function reviewWeek(w, settings) {
  const items = [];
  const rate = settings.lossRate || 0.5;
  const cutting = !w.targets.atGoal;

  // Cân nặng
  if (w.weight.delta == null) items.push({ key: 'weight', level: 'none', title: 'Cân nặng', value: w.weight.avg ? `${fmt1(w.weight.avg)} kg` : '–', note: 'Cần cân ít nhất 1 lần ở cả tuần này và tuần trước để so sánh. Cân mỗi sáng sau khi đi vệ sinh.' });
  else {
    const d = Math.sign(w.weight.delta) * (Math.round(Math.abs(w.weight.delta) * 10) / 10);
    let level, note;
    if (!cutting) {
      level = Math.abs(d) <= 0.3 ? 'good' : 'fair';
      note = level === 'good' ? 'Giữ cân ổn định ở mức mục tiêu.' : 'Cân lệch hơn 0,3 kg so với tuần trước; xem lại lượng ăn.';
    } else if (d > 0.1) {
      level = 'poor';
      note = 'Cân trung bình tăng so với tuần trước. Kiểm tra món ăn ngoài thực đơn, đồ uống, dầu mỡ; một tuần lên cân do tích nước (muối, tập chân nặng) là bình thường — nhìn xu hướng 2–3 tuần.';
    } else if (d > -rate * 0.5) {
      level = 'fair';
      note = `Giảm ${fmt1(-d)} kg, chậm hơn mục tiêu ${fmt1(rate)} kg/tuần. Nếu 2 tuần liền như vậy, dùng "Chỉnh calo theo thực tế".`;
    } else if (d < -Math.max(rate * 1.6, w.weight.avg * 0.01)) {
      level = 'fair';
      note = `Giảm ${fmt1(-d)} kg — nhanh hơn 1% cân nặng/tuần, dễ mất cơ. Tuần đầu giảm nhanh do mất nước là bình thường; nếu kéo dài, ăn thêm 100–200 kcal.`;
    } else {
      level = 'good';
      note = `Giảm ${fmt1(-d)} kg, đúng nhịp mục tiêu ${fmt1(rate)} kg/tuần.`;
    }
    items.push({ key: 'weight', level, title: 'Cân nặng', value: `${d > 0 ? '+' : ''}${fmt1(d)} kg`, note });
  }

  // Dinh dưỡng
  const n = w.nutrition;
  if (!n.logged) items.push({ key: 'food', level: 'none', title: 'Dinh dưỡng', value: '–', note: 'Chưa có ngày nào ghi ăn uống đủ (≥ 800 kcal). Đánh dấu "Ăn rồi" ở mỗi bữa để app tính được.' });
  else {
    const p = n.proteinOk / n.logged, f = n.fatOk / n.logged;
    const level = n.logged / n.elapsed >= 0.7 && p >= 0.7 && f >= 0.7 ? 'good' : p >= 0.5 ? 'fair' : 'poor';
    const parts = [`Ghi ${n.logged}/${n.elapsed} ngày`, `đủ protein ${n.proteinOk}/${n.logged}`, `fat dưới trần ${n.fatOk}/${n.logged}`, `calo trong ±10% mục tiêu ${n.kcalOk}/${n.logged}`];
    let note = parts.join(' · ') + '.';
    if (p < 0.7) note += ` Protein là ưu tiên số 1 khi giảm mỡ để giữ cơ: thêm 1 muỗng whey hoặc 150 g ức gà vào bữa thiếu.`;
    if (f < 0.7) note += ' Fat hay vượt trần: món chiên, ba chỉ, nước béo là thủ phạm thường gặp.';
    items.push({ key: 'food', level, title: 'Dinh dưỡng', value: `${Math.round(n.avgKcal).toLocaleString('vi-VN')} kcal`, note });
  }

  // Tập luyện
  const tr = w.training;
  const expected = w.done ? tr.planned : Math.min(tr.planned, Math.floor((tr.planned * w.elapsed) / 7));
  const low = tr.muscles.filter((m) => m.sets < SET_RANGE[0] && m.sets > 0).map((m) => m.label);
  items.push({
    key: 'train',
    level: tr.sessions >= expected ? 'good' : tr.sessions >= expected - 1 ? 'fair' : 'poor',
    title: 'Tập luyện',
    value: `${tr.sessions}/${tr.planned} buổi`,
    note:
      `${tr.sets} set · ${Math.round(tr.volume).toLocaleString('vi-VN')} kg · ${tr.minutes} phút.` +
      (w.done && low.length ? ` Nhóm cơ dưới ${SET_RANGE[0]} set/tuần: ${low.join(', ')} — có thể thêm 2–4 set.` : ''),
  });

  // Sức mạnh
  const cmp = w.strength.filter((s) => s.before);
  if (cmp.length) {
    const up = cmp.filter((s) => s.now > s.before * 1.005).length;
    const down = cmp.filter((s) => s.now < s.before * 0.97).length;
    const prs = w.strength.filter((s) => s.pr).length;
    items.push({
      key: 'strength',
      level: down > cmp.length / 2 ? 'poor' : down > 0 ? 'fair' : 'good',
      title: 'Sức mạnh',
      value: `${up}↑ · ${down}↓`,
      note:
        (prs ? `${prs} kỷ lục mới. ` : '') +
        (down > cmp.length / 2
          ? 'Phần lớn bài yếu đi — dấu hiệu ăn thiếu, ngủ thiếu hoặc cần giảm tải. Đừng giảm calo thêm tuần này.'
          : down > 0
            ? 'Một vài bài yếu đi chút ít, theo dõi thêm. Khi giảm mỡ, giữ được sức mạnh là đạt.'
            : 'Sức mạnh giữ hoặc tăng: cơ đang được bảo toàn tốt.'),
    });
  }

  // Giấc ngủ
  const st = w.sleep.stats;
  if (!st) items.push({ key: 'sleep', level: 'none', title: 'Giấc ngủ', value: '–', note: 'Chưa ghi giấc ngủ tuần này.' });
  else {
    const tg = w.sleep.target;
    const level = st.avg >= tg.min ? 'good' : st.avg >= tg.okMin ? 'fair' : 'poor';
    items.push({
      key: 'sleep',
      level,
      title: 'Giấc ngủ',
      value: `${fmt1(st.avg)} giờ`,
      note: `${st.count} đêm · ${st.okPct}% đêm đạt ${tg.min}–${tg.max} giờ.` + (level !== 'good' ? ' Ngủ thiếu khi ăn thâm hụt làm phần cân giảm đến từ cơ nhiều hơn.' : ''),
    });
  }

  // Nước
  if (!w.water.days)
    items.push({ key: 'water', level: 'none', title: 'Nước uống', value: w.water.todayMl ? `${fmt1(w.water.todayMl / 1000)} L` : '–', note: w.water.todayMl ? 'Hôm nay đang uống, chưa đủ ngày để đánh giá.' : 'Chưa ghi nước uống tuần này.' });
  else
    items.push({
      key: 'water',
      level: w.water.goalMet / w.water.days >= 0.7 ? 'good' : w.water.goalMet / w.water.days >= 0.4 ? 'fair' : 'poor',
      title: 'Nước uống',
      value: `${fmt1(w.water.avg / 1000)} L`,
      note: `Đạt mục tiêu ${w.water.goalMet}/${w.water.days} ngày có ghi.`,
    });

  return items;
}

const fmt1 = (n) => String(Math.round(n * 10) / 10);
