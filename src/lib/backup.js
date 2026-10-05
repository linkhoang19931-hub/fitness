import { db, TABLES } from './db';
import { dayOf } from './program';
import { movingAverage7, todayStr } from './utils';

// ---------- Tiện ích file ----------
const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

// Trên điện thoại ưu tiên bảng chia sẻ (lưu vào Tệp/Files, Drive, Zalo...),
// vì PWA chạy độc lập trên iOS thường không tải file trực tiếp được.
export async function saveFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- Sao lưu JSON toàn phần ----------
export async function exportJSON(settings) {
  const tables = {};
  for (const t of TABLES) {
    const rows = await db.table(t).toArray();
    if (t === 'checkinPhotos') {
      tables[t] = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          imageBlob: r.imageBlob ? await blobToDataURL(r.imageBlob) : null,
          thumbBlob: r.thumbBlob ? await blobToDataURL(r.thumbBlob) : null,
        }))
      );
    } else {
      tables[t] = rows;
    }
  }
  const payload = { app: 'linhs-fitness-tracker', schemaVersion: 1, exportedAt: new Date().toISOString(), settings, tables };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  await saveFile(blob, `fitness-backup-${todayStr()}.json`);
}

export async function readBackupFile(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File không phải JSON hợp lệ.');
  }
  if (!['linhs-fitness-tracker', 'shuru-tracker'].includes(data?.app) || !data.tables) throw new Error("Đây không phải file sao lưu của Linh's Fitness Tracker.");
  const counts = Object.fromEntries(TABLES.map((t) => [t, data.tables[t]?.length || 0]));
  return { data, counts };
}

// Khôi phục: thay thế toàn bộ dữ liệu hiện có bằng dữ liệu trong file
export async function restoreJSON(data) {
  const photos = await Promise.all(
    (data.tables.checkinPhotos || []).map(async (r) => ({
      ...r,
      imageBlob: r.imageBlob ? await dataURLToBlob(r.imageBlob) : null,
      thumbBlob: r.thumbBlob ? await dataURLToBlob(r.thumbBlob) : null,
    }))
  );
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = t === 'checkinPhotos' ? photos : data.tables[t] || [];
      if (rows.length) await db.table(t).bulkAdd(rows);
    }
  });
  return data.settings || null;
}

// ---------- Xuất CSV ----------
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCSV = (header, rows) =>
  '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'); // BOM để Excel đọc đúng tiếng Việt

export async function exportWorkoutCSV() {
  const workouts = await db.workouts.toArray();
  const byId = Object.fromEntries(workouts.map((w) => [w.id, w]));
  const logs = (await db.exerciseLogs.toArray()).filter((l) => l.isCompleted && byId[l.workoutId]?.completedAt);
  logs.sort((a, b) => {
    const wa = byId[a.workoutId], wb = byId[b.workoutId];
    return (
      wa.date.localeCompare(wb.date) ||
      a.workoutId - b.workoutId ||
      (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0) ||
      a.setIndex - b.setIndex
    );
  });
  const rows = logs.map((l) => {
    const w = byId[l.workoutId];
    return [
      w.date,
      `Day ${w.dayIndex}`,
      w.targetMuscle,
      l.exerciseName,
      l.setIndex,
      l.weightKg,
      l.reps,
      Math.round((l.weightKg || 0) * (l.reps || 0) * 10) / 10,
      w.notes?.[l.exerciseName] || '',
    ];
  });
  const csv = toCSV(['Ngày', 'Day', 'Nhóm cơ', 'Bài tập', 'Set', 'Tạ (kg)', 'Reps', 'Volume (kg)', 'Ghi chú'], rows);
  await saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `fitness-lich-su-tap-${todayStr()}.csv`);
}

export async function exportWeightCSV() {
  const entries = movingAverage7(await db.bodyMetrics.toArray());
  const rows = entries.map((e) => [e.date, e.weightKg, e.ma7, e.note || '']);
  const csv = toCSV(['Ngày', 'Cân nặng (kg)', 'TB trượt 7 ngày (kg)', 'Ghi chú'], rows);
  await saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `fitness-can-nang-${todayStr()}.csv`);
}

export async function exportNutritionCSV() {
  const logs = await db.nutritionLogs.toArray();
  const byDate = {};
  for (const l of logs) {
    const d = (byDate[l.date] ||= { p: 0, f: 0, c: 0, k: 0, n: 0 });
    d.p += +l.protein || 0;
    d.f += +l.fat || 0;
    d.c += +l.carbs || 0;
    d.k += +l.calories || 0;
    d.n += 1;
  }
  const r1 = (n) => Math.round(n * 10) / 10;
  const rows = Object.keys(byDate)
    .sort()
    .map((d) => [d, r1(byDate[d].p), r1(byDate[d].f), r1(byDate[d].c), Math.round(byDate[d].k), byDate[d].n]);
  const csv = toCSV(['Ngày', 'Protein (g)', 'Fat (g)', 'Carbs (g)', 'Kcal', 'Số món'], rows);
  await saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `fitness-dinh-duong-${todayStr()}.csv`);
}

export async function resetDB() {
  await db.delete();
  await db.open(); // mở lại → sự kiện populate nạp lại món mẫu
}

export const muscleLabel = (dayIndex) => dayOf(dayIndex).muscle;
