// Ngày theo giờ máy, dạng YYYY-MM-DD (không dùng toISOString vì lệch múi giờ)
export function toDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const todayStr = () => toDateStr(new Date());

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
}

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function fmtDate(dateStr, withWeekday = true) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const base = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  return withWeekday ? `${WD[dt.getDay()]} ${base}` : `${base}/${y}`;
}
export function fmtShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export const round1 = (n) => Math.round((+n || 0) * 10) / 10;
export const fmtNum = (n) => {
  const r = round1(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

// Đọc số từ ô nhập (chấp nhận dấu phẩy thập phân kiểu Việt Nam)
export function parseNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Trung bình trượt 7 ngày theo lịch (các ngày trong cửa sổ 7 ngày kết thúc ở ngày đang xét)
export function movingAverage7(entries) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e) => {
    const from = addDays(e.date, -6);
    const win = sorted.filter((x) => x.date >= from && x.date <= e.date);
    const avg = win.reduce((s, x) => s + x.weightKg, 0) / win.length;
    return { ...e, ma7: Math.round(avg * 100) / 100 };
  });
}

export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

let audioCtx;
// Gọi trong một thao tác chạm của người dùng để iOS cho phép phát âm thanh sau đó
export function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}
export function beep() {
  try {
    unlockAudio();
    const t = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach((off, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + off);
      o.stop(t + off + 0.2);
    });
  } catch {}
}

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
