import { db } from './db';
import { DEFAULT_SETS, dayOf } from './program';
import { todayStr } from './utils';

// Buổi đã hoàn thành gần nhất (để suy ra nhóm cơ kế tiếp)
export async function lastCompletedWorkout() {
  const all = await db.workouts.toArray();
  return all.filter((w) => w.completedAt).sort((a, b) => b.completedAt - a.completedAt)[0] || null;
}

export async function activeWorkout() {
  const all = await db.workouts.toArray();
  return all.filter((w) => !w.completedAt).sort((a, b) => b.startedAt - a.startedAt)[0] || null;
}

// Buổi trước cùng nhóm cơ, và các set đã hoàn thành của nó, gom theo tên bài
export async function previousSession(dayIndex, excludeId) {
  const list = await db.workouts.where('dayIndex').equals(dayIndex).toArray();
  const prev = list
    .filter((w) => w.completedAt && w.id !== excludeId)
    .sort((a, b) => b.completedAt - a.completedAt)[0];
  if (!prev) return { workout: null, byExercise: {} };
  const logs = await db.exerciseLogs.where('workoutId').equals(prev.id).toArray();
  const byExercise = {};
  for (const l of logs.filter((x) => x.isCompleted).sort((a, b) => a.setIndex - b.setIndex)) {
    (byExercise[l.exerciseName] ||= []).push(l);
  }
  return { workout: prev, byExercise };
}

export async function startWorkout(dayIndex) {
  const day = dayOf(dayIndex);
  const { byExercise } = await previousSession(dayIndex);
  return db.transaction('rw', db.workouts, db.exerciseLogs, async () => {
    const workoutId = await db.workouts.add({
      date: todayStr(),
      dayIndex,
      targetMuscle: day.muscle,
      startedAt: Date.now(),
      completedAt: null,
      notes: {},
    });
    const rows = [];
    day.exercises.forEach((name, order) => {
      const n = Math.max(DEFAULT_SETS, byExercise[name]?.length || 0);
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
    await db.exerciseLogs.update(log.id, { isCompleted: 1, weightKg, reps });
    const next = allSetsOfExercise.find((s) => s.setIndex === log.setIndex + 1);
    if (next && !next.isCompleted) {
      const patch = {};
      if (next.weightKg === null || next.weightKg === undefined) patch.weightKg = weightKg;
      if (next.reps === null || next.reps === undefined) patch.reps = reps;
      if (Object.keys(patch).length) await db.exerciseLogs.update(next.id, patch);
    }
  });
}

export async function finishWorkout(id) {
  await db.workouts.update(id, { completedAt: Date.now() });
}

export async function discardWorkout(id) {
  await db.transaction('rw', db.workouts, db.exerciseLogs, async () => {
    await db.exerciseLogs.where('workoutId').equals(id).delete();
    await db.workouts.delete(id);
  });
}

export async function changeWorkoutDay(id, dayIndex) {
  // Đổi nhóm cơ thủ công cho buổi đang tập (chỉ khi chưa tick set nào)
  await discardWorkout(id);
  return startWorkout(dayIndex);
}
