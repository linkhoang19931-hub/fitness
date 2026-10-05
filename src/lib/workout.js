import { db } from './db';
import { dayOf, programById, programOfWorkout } from './program';
import { todayStr } from './utils';

// Buổi đã hoàn thành gần nhất (để suy ra nhóm cơ kế tiếp)
// sinceTs: chỉ tính các buổi hoàn thành sau mốc "bắt đầu lại chu kỳ"
// programId: chỉ tính buổi thuộc chương trình đó (đổi chương trình thì chu kỳ bắt đầu lại từ D1)
export async function lastCompletedWorkout(sinceTs = null, programId = null) {
  const all = await db.workouts.toArray();
  return (
    all
      .filter((w) => w.completedAt && (!sinceTs || w.completedAt > sinceTs) && (!programId || programOfWorkout(w).id === programId))
      .sort((a, b) => b.completedAt - a.completedAt)[0] || null
  );
}

// Các buổi đã hoàn thành từ ngày `fromDate` (YYYY-MM-DD) trở đi
export async function completedSince(fromDate) {
  const all = await db.workouts.where('date').aboveOrEqual(fromDate).toArray();
  return all.filter((w) => w.completedAt).sort((a, b) => a.completedAt - b.completedAt);
}

export async function activeWorkout() {
  const all = await db.workouts.toArray();
  return all.filter((w) => !w.completedAt).sort((a, b) => b.startedAt - a.startedAt)[0] || null;
}

// Lần tập gần nhất của từng bài (theo tên bài, bất kể chương trình hay ngày nào),
// dùng làm tham chiếu "lần trước" và để điền sẵn số tạ.
export async function previousByExercise(names, excludeId = null) {
  const done = (await db.workouts.toArray())
    .filter((w) => w.completedAt && w.id !== excludeId)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 120);
  const byExercise = {};
  const dates = {};
  if (!done.length) return { byExercise, dates };
  const want = new Set(names);
  const logs = await db.exerciseLogs.where('workoutId').anyOf(done.map((w) => w.id)).filter((l) => !!l.isCompleted && want.has(l.exerciseName)).toArray();
  for (const w of done) {
    const mine = logs.filter((l) => l.workoutId === w.id);
    for (const name of want) {
      if (byExercise[name]) continue;
      const sets = mine.filter((l) => l.exerciseName === name).sort((a, b) => a.setIndex - b.setIndex);
      if (sets.length) {
        byExercise[name] = sets;
        dates[name] = w.date;
      }
    }
    if (Object.keys(byExercise).length === want.size) break;
  }
  return { byExercise, dates };
}

export async function startWorkout(programId, dayIndex) {
  const program = programById(programId);
  const day = dayOf(program, dayIndex);
  const { byExercise } = await previousByExercise(day.exercises.map((e) => e.name));
  return db.transaction('rw', db.workouts, db.exerciseLogs, async () => {
    const workoutId = await db.workouts.add({
      date: todayStr(),
      dayIndex: day.dayIndex,
      programId: program.id,
      targetMuscle: day.muscle,
      startedAt: Date.now(),
      completedAt: null,
      notes: {},
    });
    const rows = [];
    day.exercises.forEach(({ name, sets }, order) => {
      const n = Math.max(sets, byExercise[name]?.length || 0);
      for (let i = 1; i <= n; i++) {
        rows.push({ workoutId, exerciseName: name, exerciseOrder: order, setIndex: i, weightKg: null, reps: null, isCompleted: 0 });
      }
    });
    await db.exerciseLogs.bulkAdd(rows);
    return workoutId;
  });
}

export async function addSet(workoutId, exerciseName, exerciseOrder) {
  const sets = await db.exerciseLogs.where('workoutId').equals(workoutId).filter((l) => l.exerciseName === exerciseName).toArray();
  const last = sets.sort((a, b) => b.setIndex - a.setIndex)[0];
  await db.exerciseLogs.add({
    workoutId,
    exerciseName,
    exerciseOrder,
    setIndex: (last?.setIndex || 0) + 1,
    weightKg: last?.weightKg ?? null,
    reps: last?.reps ?? null,
    isCompleted: 0,
  });
}

export async function removeLastSet(workoutId, exerciseName) {
  const sets = await db.exerciseLogs.where('workoutId').equals(workoutId).filter((l) => l.exerciseName === exerciseName).toArray();
  if (sets.length <= 1) return;
  const last = sets.sort((a, b) => b.setIndex - a.setIndex)[0];
  await db.exerciseLogs.delete(last.id);
}

// Tick hoàn thành set: nếu ô trống thì lấy số của buổi trước; sau đó điền sẵn sang set kế tiếp
export async function completeSet(log, fallback, allSetsOfExercise) {
  const weightKg = log.weightKg ?? fallback?.weightKg ?? null;
  const reps = log.reps ?? fallback?.reps ?? null;
  await db.transaction('rw', db.exerciseLogs, async () => {
    await db.exerciseLogs.update(log.id, { isCompleted: 1, weightKg, reps, completedAt: Date.now() });
    const next = allSetsOfExercise.find((s) => s.setIndex === log.setIndex + 1);
    if (next && !next.isCompleted) {
      const patch = {};
      if (next.weightKg === null || next.weightKg === undefined) patch.weightKg = weightKg;
      if (next.reps === null || next.reps === undefined) patch.reps = reps;
      if (Object.keys(patch).length) await db.exerciseLogs.update(next.id, patch);
    }
  });
}

// Kết thúc buổi. Buổi không có set nào được tick thì xoá luôn (không tính vào chu kỳ).
// at: thời điểm kết thúc (dùng khi chốt hộ một buổi quên bấm kết thúc).
export async function finishWorkout(id, at = Date.now()) {
  const done = await db.exerciseLogs.where('workoutId').equals(id).filter((l) => !!l.isCompleted).count();
  if (done === 0) {
    await discardWorkout(id);
    return false;
  }
  await db.transaction('rw', db.workouts, db.exerciseLogs, async () => {
    await db.workouts.update(id, { completedAt: at });
    // set chưa tick thì bỏ, lịch sử chỉ giữ set thật sự đã tập
    await db.exerciseLogs.where('workoutId').equals(id).filter((l) => !l.isCompleted).delete();
  });
  return true;
}

// Thời điểm của set cuối cùng được ghi (để chốt buổi quên kết thúc cho đúng thời lượng)
export async function lastActivityAt(workout) {
  const logs = await db.exerciseLogs.where('workoutId').equals(workout.id).toArray();
  const ts = logs.map((l) => l.completedAt || 0).filter(Boolean);
  return ts.length ? Math.max(...ts) : workout.startedAt + 50 * 60000;
}

export async function discardWorkout(id) {
  await db.transaction('rw', db.workouts, db.exerciseLogs, async () => {
    await db.exerciseLogs.where('workoutId').equals(id).delete();
    await db.workouts.delete(id);
  });
}

export async function changeWorkoutDay(id, programId, dayIndex) {
  // Đổi buổi thủ công cho buổi đang tập (chỉ khi chưa tick set nào)
  await discardWorkout(id);
  return startWorkout(programId, dayIndex);
}
