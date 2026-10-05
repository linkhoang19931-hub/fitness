import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { PROGRAM, dayOf, nextDayIndex } from '../lib/program';
import { useRest, useSettings } from '../lib/store';
import { fmtDate, fmtNum, fmtClock, todayStr, unlockAudio } from '../lib/utils';
import { useWakeLock } from '../lib/useWakeLock';
import {
  activeWorkout,
  addSet,
  changeWorkoutDay,
  completeSet,
  discardWorkout,
  finishWorkout,
  lastCompletedWorkout,
  previousSession,
  removeLastSet,
  startWorkout,
} from '../lib/workout';
import { Button, Card, NumField, SectionTitle, Sheet } from '../components/ui';
import { IconCheck, IconChevron } from '../components/Icons';

const SESSION_MIN = 50;

export default function Workout() {
  const active = useLiveQuery(() => activeWorkout(), []);
  if (active === undefined) return null;
  return active ? <ActiveSession workout={active} /> : <Planner />;
}

/* ---------------- Màn hình chọn buổi (chưa tập) ---------------- */
function Planner() {
  const last = useLiveQuery(() => lastCompletedWorkout(), []);
  const [manual, setManual] = useState(null);
  const suggested = nextDayIndex(last?.dayIndex);
  const dayIndex = manual ?? suggested;
  const day = dayOf(dayIndex);
  const prev = useLiveQuery(() => previousSession(dayIndex), [dayIndex]);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    unlockAudio(); // mở khoá âm thanh trên iOS bằng chính thao tác chạm này
    setBusy(true);
    await startWorkout(dayIndex);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden">
        <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          {manual && manual !== suggested ? 'Chọn thủ công' : 'Buổi tiếp theo trong chu kỳ'}
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-6xl font-black tnum text-accent leading-none">D{dayIndex}</span>
          <div>
            <div className="text-2xl font-bold leading-tight">{day.muscle}</div>
            <div className="text-sm text-muted">{day.focus}</div>
          </div>
        </div>
        <ol className="mt-4 space-y-2">
          {day.exercises.map((ex, i) => {
            const sets = prev?.byExercise?.[ex];
            return (
              <li key={ex} className="flex gap-3">
                <span className="w-5 shrink-0 text-faint tnum font-semibold">{i + 1}</span>
                <div className="min-w-0">
                  <div className="font-medium leading-snug">{ex}</div>
                  {sets?.length > 0 && (
                    <div className="text-xs text-faint tnum truncate">{sets.map((s) => `${fmtNum(s.weightKg)}×${s.reps ?? '–'}`).join(' · ')}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {prev?.workout && <p className="mt-3 text-xs text-muted">Lần tập {day.muscle} gần nhất: {fmtDate(prev.workout.date)}</p>}
        <Button variant="primary" className="w-full mt-5 h-14 text-lg" onClick={start} disabled={busy}>
          Bắt đầu buổi tập · {SESSION_MIN}′
        </Button>
      </Card>

      <Card>
        <SectionTitle>Đổi nhóm cơ thủ công</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {PROGRAM.map((d) => (
            <button
              key={d.dayIndex}
              onClick={() => setManual(d.dayIndex === suggested ? null : d.dayIndex)}
              className={`min-h-14 rounded-xl px-2 text-left border ${
                d.dayIndex === dayIndex ? 'border-accent bg-accent/10' : 'border-line bg-surface-2'
              }`}
            >
              <div className="text-[11px] font-bold text-muted tnum">
                D{d.dayIndex}
                {d.dayIndex === suggested && ' · gợi ý'}
              </div>
              <div className="text-sm font-semibold leading-tight">{d.muscle}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          Chu kỳ xoay vòng theo buổi đã hoàn thành, không theo thứ trong tuần. Nghỉ một hôm thì buổi sau vẫn là nhóm cơ kế tiếp.
        </p>
      </Card>

      <History />
    </div>
  );
}

function History() {
  const data = useLiveQuery(async () => {
    const ws = (await db.workouts.toArray()).filter((w) => w.completedAt).sort((a, b) => b.completedAt - a.completedAt).slice(0, 20);
    const logs = ws.length ? await db.exerciseLogs.where('workoutId').anyOf(ws.map((w) => w.id)).toArray() : [];
    return ws.map((w) => {
      const sets = logs.filter((l) => l.workoutId === w.id && l.isCompleted);
      const volume = sets.reduce((s, l) => s + (l.weightKg || 0) * (l.reps || 0), 0);
      return { ...w, sets, volume };
    });
  }, []);
  const [open, setOpen] = useState(null);
  if (!data?.length) return null;
  return (
    <Card>
      <SectionTitle>Lịch sử buổi tập</SectionTitle>
      <ul className="divide-y divide-line -my-1">
        {data.map((w) => {
          const mins = Math.round((w.completedAt - w.startedAt) / 60000);
          const isOpen = open === w.id;
          const grouped = {};
          w.sets.sort((a, b) => (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0) || a.setIndex - b.setIndex)
            .forEach((s) => (grouped[s.exerciseName] ||= []).push(s));
          return (
            <li key={w.id} className="py-1">
              <button className="w-full flex items-center gap-3 min-h-12 text-left" onClick={() => setOpen(isOpen ? null : w.id)}>
                <span className="w-10 text-accent font-black tnum">D{w.dayIndex}</span>
                <span className="flex-1">
                  <span className="font-semibold">{w.targetMuscle}</span>
                  <span className="block text-xs text-muted tnum">
                    {fmtDate(w.date)} · {w.sets.length} set · {Math.round(w.volume).toLocaleString('vi-VN')} kg · {mins}′
                  </span>
                </span>
                <IconChevron dir={isOpen ? 'up' : 'down'} className="text-faint" width={18} />
              </button>
              {isOpen && (
                <div className="pb-3 pl-13 space-y-1.5 text-sm">
                  {Object.entries(grouped).map(([name, sets]) => (
                    <div key={name}>
                      <div className="text-muted">{name}</div>
                      <div className="tnum">{sets.map((s) => `${fmtNum(s.weightKg)}×${s.reps ?? '–'}`).join(' · ')}</div>
                      {w.notes?.[name] && <div className="text-xs text-faint italic">{w.notes[name]}</div>}
                    </div>
                  ))}
                  <button
                    className="text-xs text-danger mt-2 min-h-10"
                    onClick={() => confirm('Xoá buổi tập này khỏi lịch sử?') && discardWorkout(w.id)}
                  >
                    Xoá buổi này
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ---------------- Màn hình đang tập (In-Workout Logger) ---------------- */
function ActiveSession({ workout }) {
  const logs = useLiveQuery(() => db.exerciseLogs.where('workoutId').equals(workout.id).toArray(), [workout.id]);
  const prev = useLiveQuery(() => previousSession(workout.dayIndex, workout.id), [workout.dayIndex, workout.id]);
  const wake = useWakeLock(true);
  const day = dayOf(workout.dayIndex);
  const [sheet, setSheet] = useState(null); // 'finish' | 'switch'

  const groups = useMemo(() => {
    const g = {};
    (logs || []).forEach((l) => (g[l.exerciseName] ||= { order: l.exerciseOrder ?? 0, sets: [] }).sets.push(l));
    Object.values(g).forEach((x) => x.sets.sort((a, b) => a.setIndex - b.setIndex));
    return Object.entries(g).sort((a, b) => a[1].order - b[1].order);
  }, [logs]);

  const done = (logs || []).filter((l) => l.isCompleted).length;
  const total = logs?.length || 0;

  return (
    <div className="space-y-3 pb-28">
      <SessionHeader workout={workout} day={day} done={done} total={total} wake={wake} onFinish={() => setSheet('finish')} />

      {groups.map(([name, g]) => (
        <ExerciseCard
          key={name}
          workout={workout}
          name={name}
          order={g.order}
          sets={g.sets}
          prevSets={prev?.byExercise?.[name] || []}
          prevDate={prev?.workout?.date}
        />
      ))}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => setSheet('switch')}>
          Đổi nhóm cơ
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => setSheet('finish')}>
          Kết thúc buổi
        </Button>
      </div>

      <Sheet open={sheet === 'finish'} onClose={() => setSheet(null)} title="Kết thúc buổi tập?">
        <p className="text-muted mb-4">
          Đã hoàn thành <b className="text-ink tnum">{done}/{total}</b> set. Các set chưa tick sẽ không được tính vào lịch sử.
        </p>
        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full h-14"
            onClick={async () => {
              useRest.getState().stop();
              await finishWorkout(workout.id);
            }}
          >
            Lưu & kết thúc
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setSheet(null)}>
            Tập tiếp
          </Button>
          <Button
            variant="outline"
            className="w-full text-danger"
            onClick={async () => {
              if (!confirm('Huỷ buổi này và xoá mọi set đã ghi?')) return;
              useRest.getState().stop();
              await discardWorkout(workout.id);
            }}
          >
            Huỷ buổi (không lưu)
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'switch'} onClose={() => setSheet(null)} title="Đổi nhóm cơ cho buổi này">
        {done > 0 ? (
          <p className="text-muted">Bạn đã tick {done} set. Hãy huỷ buổi hiện tại trước nếu muốn đổi sang nhóm cơ khác.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {PROGRAM.map((d) => (
              <Button
                key={d.dayIndex}
                variant={d.dayIndex === workout.dayIndex ? 'primary' : 'ghost'}
                className="h-14"
                onClick={async () => {
                  setSheet(null);
                  if (d.dayIndex !== workout.dayIndex) await changeWorkoutDay(workout.id, d.dayIndex);
                }}
              >
                D{d.dayIndex} · {d.muscle}
              </Button>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function SessionHeader({ workout, day, done, total, wake, onFinish }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = (now - workout.startedAt) / 1000;
  const over = elapsed > SESSION_MIN * 60;
  const pct = Math.min(100, (elapsed / (SESSION_MIN * 60)) * 100);
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-3 bg-bg/95 backdrop-blur border-b border-line safe-top">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-accent tnum">D{workout.dayIndex}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold leading-tight truncate">{day.muscle}</div>
          <div className="text-xs text-muted tnum">
            {done}/{total} set ·{' '}
            {wake === 'on' ? 'Màn hình luôn sáng' : wake === 'unsupported' ? 'Máy không hỗ trợ giữ sáng' : 'Đang xin giữ sáng…'}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tnum leading-none ${over ? 'text-warn' : ''}`}>{fmtClock(elapsed)}</div>
          <div className="text-[11px] text-muted">/ {SESSION_MIN}:00</div>
        </div>
        <button onClick={onFinish} className="h-12 w-12 rounded-xl bg-accent text-accent-ink grid place-items-center" aria-label="Kết thúc buổi">
          <IconCheck width={22} />
        </button>
      </div>
      <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full ${over ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ExerciseCard({ workout, name, order, sets, prevSets, prevDate }) {
  const restSeconds = useSettings((s) => s.restSeconds);
  const startRest = useRest((s) => s.start);
  const [note, setNote] = useState(workout.notes?.[name] || '');
  const allDone = sets.every((s) => s.isCompleted);

  const saveNote = async () => {
    const w = await db.workouts.get(workout.id);
    await db.workouts.update(workout.id, { notes: { ...(w?.notes || {}), [name]: note.trim() } });
  };

  const toggle = async (s, i) => {
    if (s.isCompleted) {
      await db.exerciseLogs.update(s.id, { isCompleted: 0 });
      return;
    }
    unlockAudio();
    await completeSet(s, prevSets[i] || prevSets[prevSets.length - 1], sets);
    startRest(restSeconds);
  };

  return (
    <Card className={allDone ? 'border-accent/50' : ''}>
      <div className="flex items-start gap-3 mb-1">
        <span className="text-faint font-bold tnum pt-0.5">{order + 1}</span>
        <h3 className="flex-1 font-bold text-[17px] leading-snug">{name}</h3>
        {allDone && <IconCheck width={20} className="text-accent shrink-0 mt-0.5" />}
      </div>
      <p className="text-xs text-faint tnum mb-3 pl-6">
        {prevSets.length
          ? `Lần trước (${fmtDate(prevDate)}): ${prevSets.map((s) => `${fmtNum(s.weightKg)}kg×${s.reps ?? '–'}`).join(' | ')}`
          : 'Chưa có dữ liệu buổi trước'}
      </p>

      <div className="grid grid-cols-[2.25rem_1fr_1fr_3.5rem] gap-2 items-center text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5 px-0.5">
        <span className="text-center">Set</span>
        <span className="text-center">Tạ (kg)</span>
        <span className="text-center">Reps</span>
        <span className="text-center">✓</span>
      </div>
      <div className="space-y-2">
        {sets.map((s, i) => {
          const ref = prevSets[i];
          return (
            <div
              key={s.id}
              className={`grid grid-cols-[2.25rem_1fr_1fr_3.5rem] gap-2 items-center rounded-xl ${s.isCompleted ? '[&_input]:text-muted [&_input]:bg-transparent [&_input]:border-line' : ''}`}
            >
              <span className={`text-center font-bold tnum ${s.isCompleted ? 'text-accent' : 'text-muted'}`}>{s.setIndex}</span>
              <NumField
                value={s.weightKg}
                placeholder={ref ? fmtNum(ref.weightKg) : 'kg'}
                onCommit={(v) => db.exerciseLogs.update(s.id, { weightKg: v })}
                aria-label={`Tạ set ${s.setIndex}`}
              />
              <NumField
                value={s.reps}
                decimal={false}
                placeholder={ref?.reps != null ? String(ref.reps) : 'reps'}
                onCommit={(v) => db.exerciseLogs.update(s.id, { reps: v === null ? null : Math.round(v) })}
                aria-label={`Reps set ${s.setIndex}`}
              />
              <button
                onClick={() => toggle(s, i)}
                aria-pressed={!!s.isCompleted}
                aria-label={`Hoàn thành set ${s.setIndex}`}
                className={`h-12 w-14 rounded-xl grid place-items-center border-2 transition-colors ${
                  s.isCompleted ? 'bg-accent border-accent text-accent-ink' : 'border-line text-faint active:bg-surface-2'
                }`}
              >
                <IconCheck width={24} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-3">
        <Button variant="ghost" className="flex-1 text-sm" onClick={() => addSet(workout.id, name, order)}>
          + Thêm set
        </Button>
        <Button variant="ghost" className="text-sm" disabled={sets.length <= 1} onClick={() => removeLastSet(workout.id, name)}>
          − Bớt set
        </Button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveNote}
        placeholder="Ghi chú nhanh (vd: ghế dốc nấc 3, form siết tốt)"
        className="mt-2 h-11 w-full rounded-xl bg-transparent border border-dashed border-line px-3 text-sm outline-none focus:border-accent placeholder:text-faint"
      />
    </Card>
  );
}

export const workoutTodayLabel = () => fmtDate(todayStr());
