// Theo dõi & chấm điểm giấc ngủ.
// Nguồn khuyến nghị:
//  - National Sleep Foundation (Hirshkowitz 2015, cập nhật 2026): 14–17t: 8–10h; 18–64t: 7–9h; ≥65t: 7–8h.
//    Ngưỡng "có thể chấp nhận": 18–25t: 6–11h; 26–64t: 6–10h; ≥65t: 5–9h.
//  - Nedeltcheva 2010: ăn thâm hụt mà chỉ ngủ 5,5h thay vì 8,5h → giảm mỡ ít hơn 55%, mất khối nạc nhiều hơn 60%.
//  - Leproult & Van Cauter 2011: 1 tuần ngủ 5h/đêm → testosterone ban ngày giảm 10–15% ở nam trẻ.
//  - Windred 2023: độ đều đặn giờ ngủ dự báo nguy cơ tử vong mạnh hơn tổng thời lượng.
import { db } from './db';
import { addDays, toDateStr } from './utils';

const H = 3600000;
const MIN = 60000;

// ---------- Khuyến nghị theo tuổi ----------
export function sleepNeed(age) {
  const a = +age || 30;
  if (a < 18) return { min: 8, max: 10, okMin: 7, okMax: 11, label: '14–17 tuổi' };
  if (a < 26) return { min: 7, max: 9, okMin: 6, okMax: 11, label: '18–25 tuổi' };
  if (a < 65) return { min: 7, max: 9, okMin: 6, okMax: 10, label: '26–64 tuổi' };
  return { min: 7, max: 8, okMin: 5, okMax: 9, label: 'từ 65 tuổi' };
}

// Mục tiêu cá nhân: người tập nặng hoặc đang ăn thâm hụt nên nhắm nửa trên của khoảng khuyến nghị
export function sleepTarget(settings) {
  const need = sleepNeed(settings.age);
  const heavy = (+settings.trainingDays || 0) >= 5;
  const cutting = settings.autoTargets !== false && (+settings.startWeight || 0) > (+settings.goalWeight || 0);
  let target = (need.min + need.max) / 2; // 8h với người lớn
  if (heavy || cutting) target = Math.min(need.max, target + 0.5);
  const reasons = [];
  if (heavy) reasons.push(`tập ${settings.trainingDays} buổi/tuần`);
  if (cutting) reasons.push('đang ăn thâm hụt để giảm mỡ');
  return { ...need, target, reasons };
}

// ---------- Ghi giấc ngủ ----------
// sleeps: { id, start, end|null, quality 1–5|null, note, wakeDate 'YYYY-MM-DD' }
export async function activeSleep() {
  const all = await db.sleeps.filter((s) => !s.end).toArray();
  return all.sort((a, b) => b.start - a.start)[0] || null;
}

export async function startSleep(at = Date.now()) {
  const cur = await activeSleep();
  if (cur) return cur.id; // đã đang ngủ thì không tạo thêm
  return db.sleeps.add({ start: at, end: null, quality: null, note: '', wakeDate: null });
}

// Kết thúc: dưới 3 phút coi là bấm nhầm → xoá
export async function endSleep(id, at = Date.now()) {
  const s = await db.sleeps.get(id);
  if (!s) return null;
  if (at - s.start < 3 * MIN) {
    await db.sleeps.delete(id);
    return null;
  }
  await db.sleeps.update(id, { end: at, wakeDate: toDateStr(new Date(at)) });
  return id;
}

export async function saveSleep({ id, start, end, quality = null, note = '' }) {
  if (!(end > start)) throw new Error('Giờ dậy phải sau giờ đi ngủ.');
  if (end - start > 20 * H) throw new Error('Một giấc không quá 20 giờ. Kiểm tra lại ngày giờ.');
  if (end > Date.now() + 5 * MIN) throw new Error('Giờ dậy đang ở tương lai.');
  const row = { start, end, quality, note, wakeDate: toDateStr(new Date(end)) };
  if (id) await db.sleeps.update(id, row);
  else await db.sleeps.add(row);
}

// Giấc ngắn ban ngày (bắt đầu 9:00–19:00, dưới 3 giờ) tính là ngủ trưa, không gộp vào giấc đêm
export function isNap(s) {
  const h = new Date(s.start).getHours();
  return s.end - s.start < 3 * H && h >= 9 && h < 19;
}

// ---------- Gộp theo đêm ----------
// Mỗi "đêm" gắn với ngày thức dậy. Nhiều đoạn trong cùng đêm (thức giữa đêm rồi ngủ lại) được cộng dồn.
export function nightsFrom(sleeps) {
  const map = new Map();
  for (const s of sleeps) {
    if (!s.end) continue;
    const nap = isNap(s);
    const key = s.wakeDate || toDateStr(new Date(s.end));
    const n = map.get(key) || { date: key, segments: [], naps: [], hours: 0, napHours: 0 };
    if (nap) {
      n.naps.push(s);
      n.napHours += (s.end - s.start) / H;
    } else {
      n.segments.push(s);
      n.hours += (s.end - s.start) / H;
    }
    map.set(key, n);
  }
  return [...map.values()]
    .map((n) => {
      const seg = n.segments.sort((a, b) => a.start - b.start);
      const q = seg.filter((s) => s.quality).map((s) => s.quality);
      return {
        ...n,
        bed: seg[0]?.start ?? null,
        wake: seg.length ? seg[seg.length - 1].end : null,
        quality: q.length ? q.reduce((a, b) => a + b, 0) / q.length : null,
        hours: Math.round(n.hours * 100) / 100,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Phút trong ngày theo trục "đêm": giờ đi ngủ 18:00–05:59 quy về liên tục (18:00 = -360 … 05:59 = 359)
export const bedMinute = (ts) => {
  const d = new Date(ts);
  let m = d.getHours() * 60 + d.getMinutes();
  if (m >= 18 * 60) m -= 24 * 60;
  return m;
};
export const wakeMinute = (ts) => {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
};
export const fmtClockMin = (m) => {
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};
export const fmtHours = (h) => {
  if (h == null) return '–';
  const t = Math.round(h * 60);
  return `${Math.floor(t / 60)}h${String(t % 60).padStart(2, '0')}`;
};
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---------- Chấm điểm một đêm (0–100) ----------
// Thời lượng 60đ · Đều đặn giờ ngủ 25đ · Cảm nhận chất lượng 15đ (chưa chấm thì tính theo thời lượng)
export function scoreNight(night, history, target) {
  if (!night || night.hours <= 0) return null;
  const d = night.hours;
  let dur;
  if (d >= target.min && d <= target.max) dur = 60;
  else if (d < target.min) dur = Math.max(0, 60 * (1 - (target.min - d) / 3));
  else dur = Math.max(20, 60 * (1 - (d - target.max) / 3));
  // độ lệch giờ đi ngủ so với trung vị 7 đêm trước
  const prev = history.filter((n) => n.date < night.date && n.bed).slice(-7);
  const medBed = median(prev.map((n) => bedMinute(n.bed)));
  let reg = 20;
  let bedDev = null;
  if (medBed != null && night.bed) {
    bedDev = Math.abs(bedMinute(night.bed) - medBed);
    reg = bedDev <= 30 ? 25 : bedDev >= 150 ? 0 : 25 * (1 - (bedDev - 30) / 120);
  }
  const late = night.bed && bedMinute(night.bed) > 60; // ngủ sau 1:00
  if (late) reg = Math.max(0, reg - 5);
  const qual = night.quality ? (night.quality / 5) * 15 : (dur / 60) * 12;
  const score = Math.round(dur + reg + qual);
  const grade = score >= 85 ? 'good' : score >= 70 ? 'fair' : score >= 50 ? 'low' : 'poor';
  return { score, grade, durScore: dur, bedDev, late, medBed };
}

export const GRADE = {
  good: { label: 'Tốt', color: 'var(--go)' },
  fair: { label: 'Khá', color: '#64d2ff' },
  low: { label: 'Chưa đủ', color: 'var(--warn)' },
  poor: { label: 'Kém', color: 'var(--danger)' },
};

// ---------- Nhận xét & hậu quả cho một đêm ----------
export function assessNight(night, ev, target, ctx) {
  const d = night.hours;
  const out = { headline: '', points: [], effects: [] };
  if (d < target.okMin) {
    out.headline = `Ngủ ${fmtHours(d)}, thiếu nhiều so với mức tối thiểu ${target.min} giờ.`;
    out.effects.push('Giảm tập trung, phản xạ chậm, dễ cáu gắt trong ngày; lái xe nguy hiểm hơn.');
    out.effects.push('Hormone đói tăng: thèm đồ ngọt, đồ béo, khó giữ mức calo.');
    if (ctx.cutting) out.effects.push('Khi ăn thâm hụt, ngủ ~5,5 giờ làm giảm mỡ ít hơn khoảng một nửa và mất cơ nhiều hơn ~60% so với ngủ 8,5 giờ.');
    if (ctx.male) out.effects.push('Kéo dài cả tuần, ngủ ~5 giờ/đêm làm testosterone giảm khoảng 10–15%, ảnh hưởng sức mạnh và hồi phục.');
    out.effects.push('Sức mạnh và sức bền buổi tập sáng giảm; nguy cơ chấn thương tăng.');
  } else if (d < target.min) {
    out.headline = `Ngủ ${fmtHours(d)}, hơi thiếu so với khuyến nghị ${target.min}–${target.max} giờ.`;
    out.effects.push('Một đêm thì cơ thể bù được, nhưng lặp lại nhiều đêm sẽ tích luỹ “nợ ngủ”: mệt, thèm ăn, tập kém hơn.');
    if (ctx.cutting) out.effects.push('Đang giảm mỡ nên ngủ thiếu dễ làm mất cơ và khó bám thực đơn.');
  } else if (d > target.okMax) {
    out.headline = `Ngủ ${fmtHours(d)}, dài hơn nhiều so với khuyến nghị.`;
    out.effects.push('Thỉnh thoảng ngủ bù sau tuần thiếu ngủ là bình thường.');
    out.effects.push('Nếu thường xuyên ngủ quá 10 giờ mà vẫn mệt, nên hỏi bác sĩ (ngưng thở khi ngủ, tuyến giáp, trầm cảm…).');
  } else if (d > target.max) {
    out.headline = `Ngủ ${fmtHours(d)}, hơi dài hơn khoảng khuyến nghị — vẫn chấp nhận được.`;
  } else {
    out.headline = `Ngủ ${fmtHours(d)}, nằm trong khoảng khuyến nghị ${target.min}–${target.max} giờ.`;
    if (d < target.target) out.points.push(`Mục tiêu riêng của bạn là ${fmtHours(target.target)} vì ${target.reasons.join(' và ') || 'độ tuổi'}.`);
  }
  if (ev?.bedDev != null && ev.bedDev > 60) out.points.push(`Giờ đi ngủ lệch ${Math.round(ev.bedDev)} phút so với thói quen tuần qua. Giờ ngủ thất thường ảnh hưởng sức khoẻ không kém ngủ thiếu.`);
  if (ev?.late) out.points.push('Đi ngủ sau 1 giờ sáng làm lệch nhịp sinh học, giấc sâu đầu đêm ít hơn.');
  if (night.quality && night.quality <= 2) out.points.push('Bạn đánh giá ngủ không ngon: tránh cà phê sau 14:00, màn hình 1 giờ trước khi ngủ, phòng tối và mát (~24–26°C).');
  if (night.napHours > 0) out.points.push(`Có ngủ trưa ${fmtHours(night.napHours)} (không tính vào giấc đêm).`);
  return out;
}

// ---------- Thống kê một khoảng & khuyến nghị ----------
export function periodStats(nights, target) {
  const valid = nights.filter((n) => n.hours > 0);
  if (!valid.length) return null;
  const hrs = valid.map((n) => n.hours);
  const avg = hrs.reduce((a, b) => a + b, 0) / hrs.length;
  const beds = valid.filter((n) => n.bed).map((n) => bedMinute(n.bed));
  const wakes = valid.filter((n) => n.wake).map((n) => wakeMinute(n.wake));
  const avgBed = beds.length ? beds.reduce((a, b) => a + b, 0) / beds.length : null;
  const avgWake = wakes.length ? wakes.reduce((a, b) => a + b, 0) / wakes.length : null;
  const sd = (arr, m) => (arr.length > 1 ? Math.sqrt(arr.reduce((a, x) => a + (x - m) ** 2, 0) / (arr.length - 1)) : 0);
  const bedSd = avgBed != null ? sd(beds, avgBed) : 0;
  const debt = valid.reduce((a, n) => a + Math.max(0, target.target - n.hours), 0);
  const short = valid.filter((n) => n.hours < target.min).length;
  const okPct = Math.round((valid.filter((n) => n.hours >= target.min && n.hours <= target.max).length / valid.length) * 100);
  const q = valid.filter((n) => n.quality).map((n) => n.quality);
  return {
    count: valid.length,
    avg,
    avgBed,
    avgWake,
    bedSd,
    debt,
    short,
    okPct,
    quality: q.length ? q.reduce((a, b) => a + b, 0) / q.length : null,
  };
}

export function recommend(stats, target, period) {
  if (!stats) return [];
  const tips = [];
  const scope = period === 'week' ? 'tuần này' : period === 'month' ? 'tháng này' : 'năm nay';
  const level = stats.avg >= target.min && stats.avg <= target.max ? 'good' : stats.avg >= target.okMin && stats.avg <= target.okMax ? 'fair' : 'poor';
  if (stats.avg < target.min) {
    const need = Math.round((target.target - stats.avg) * 60);
    tips.push({
      level,
      title: `Trung bình ${scope} ${fmtHours(stats.avg)}/đêm — thiếu khoảng ${need} phút so với mục tiêu ${fmtHours(target.target)}.`,
      body: `Đi ngủ sớm hơn 15 phút mỗi vài ngày cho tới khi đủ, thay vì dồn ngủ bù cuối tuần. ${stats.short}/${stats.count} đêm dưới ${target.min} giờ.`,
    });
  } else if (stats.avg > target.okMax) {
    tips.push({ level, title: `Trung bình ${fmtHours(stats.avg)}/đêm — dài hơn khuyến nghị.`, body: 'Nếu ngủ nhiều mà vẫn mệt kéo dài, nên đi khám để loại trừ nguyên nhân bệnh lý.' });
  } else {
    tips.push({ level: 'good', title: `Trung bình ${fmtHours(stats.avg)}/đêm — đạt khuyến nghị ${target.min}–${target.max} giờ.`, body: `${stats.okPct}% số đêm nằm trong khoảng khuyến nghị. Giữ nhịp này.` });
  }
  if (stats.count >= 3 && stats.bedSd > 60) {
    tips.push({
      level: stats.bedSd > 90 ? 'poor' : 'fair',
      title: `Giờ đi ngủ dao động ±${Math.round(stats.bedSd)} phút.`,
      body: 'Độ đều đặn của giờ ngủ gắn với sức khoẻ lâu dài còn mạnh hơn tổng số giờ. Cố định giờ lên giường trong khoảng ±30 phút, kể cả cuối tuần.',
    });
  } else if (stats.count >= 3) {
    tips.push({ level: 'good', title: `Giờ đi ngủ khá đều (±${Math.round(stats.bedSd)} phút).`, body: 'Nhịp sinh học ổn định giúp dễ ngủ và dậy tỉnh táo hơn.' });
  }
  if (stats.avgBed != null && stats.avgBed > 60) {
    tips.push({ level: 'fair', title: `Thường đi ngủ lúc ${fmtClockMin(stats.avgBed)} — muộn.`, body: 'Ngủ trước nửa đêm giúp có nhiều giấc sâu hơn ở đầu đêm và dễ dậy sớm đi tập.' });
  }
  if (stats.debt >= 3 && period === 'week') {
    tips.push({ level: 'poor', title: `Nợ ngủ ${fmtHours(stats.debt)} trong tuần.`, body: 'Nợ ngủ cộng dồn làm giảm hiệu suất tập và tăng thèm ăn. Ưu tiên ngủ đủ 2–3 đêm tới; có thể ngủ trưa 20–30 phút.' });
  }
  if (stats.quality != null && stats.quality < 3) {
    tips.push({ level: 'fair', title: `Điểm cảm nhận trung bình ${stats.quality.toFixed(1)}/5.`, body: 'Tránh cà phê sau 14:00, rượu bia buổi tối, ăn no sát giờ ngủ; phòng tối, yên, mát.' });
  }
  return tips;
}

// Giờ nên lên giường để đủ mục tiêu, dựa trên giờ dậy thường ngày (trừ 15 phút để ngủ thiếp đi)
export function suggestedBedtime(wakeMin, target) {
  if (wakeMin == null) return null;
  return wakeMin - target.target * 60 - 15;
}

// Khoảng ngày theo kỳ xem
export function rangeOf(period, today) {
  if (period === 'week') {
    const [y, m, d] = today.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const mon = toDateStr(new Date(y, m - 1, d - ((dt.getDay() + 6) % 7)));
    return { from: mon, to: addDays(mon, 6) };
  }
  if (period === 'month') {
    const [y, m] = today.split('-').map(Number);
    return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: toDateStr(new Date(y, m, 0)) };
  }
  const y = today.slice(0, 4);
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}
