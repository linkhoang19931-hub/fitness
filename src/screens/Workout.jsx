import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { DAY_COLORS, PROGRAM, dayOf, nextDayIndex } from '../lib/program';
import { useRest, useSettings } from '../lib/store';
import { fmtDate, fmtNum, fmtClock, unlockAudio } from '../lib/utils';
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
import { Button, Card, GroupLabel, NumField, Sheet } from '../components/ui';
import { IconCheck, IconChevron, IconDumbbell, IconTimer } from '../components/Icons';

const SESSION_MIN = 50;

export default function Workout() {
  const active = useLiveQuery(() => activeWorkout(), []);
  if (active === undefined) return null;
  return active ? <ActiveSession workout={active} /> : <Planner />;
}

// Ô vuông màu nhận diện ngày tập
function DayBadge({ dayIndex, size = 44 }) {
  return (
    <span
      className="grid place-items-center shrink-0 text-white font-rounded font-bold tnum"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        fontSize: size * 0.38,
        background: `linear-gradient(160deg, ${DAY_COLORS[dayIndex]}, color-mix(in srgb, ${DAY_COLORS[dayIndex]} 70%, #000))`,
      }}
    >
      D{dayIndex}
    </span>
  );
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
  const color = DAY_COLORS[dayIndex];

  const start = async () => {
    unlockAudio(); // mở khoá âm thanh trên iOS bằng chính thao tác chạm này
    setBusy(true);
    await startWorkout(dayIndex);
    setBusy(false);
  };

  return (
    <div>
      <Card className="overflow-hidden !p-0">
        <div className="p-4 pb-3" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 16%, transparent), transparent)` }}>
          <div className="flex items-center gap-3.5">
            <DayBadge dayIndex={dayIndex} size={58} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold" style={{ color }}>
                {manual && manual !== suggested ? 'Chọn thủ công' : 'Buổi tiếp theo'}
              </div>
              <div className="text-[28px] leading-tight font-bold tracking-[-0.03em]">{day.muscle}</div>
              <div className="text-[15px] text-muted">{day.focus}</div>
            </div>
          </div>
        </div>
        <ol className="px-4">
          {day.exercises.map((ex, i) => {
            const sets = prev?.byExercise?.[ex];
            return (
              <li key={ex} className="flex gap-3 py-2.5 hairline-b last:shadow-none">
                <span className="w-5 shrink-0 text-muted font-rounded tnum font-semibold text-[15px] pt-px">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[16px] leading-snug">{ex}</div>
                  {sets?.length > 0 && (
                    <div className="text-[13px] text-muted font-rounded tnum truncate">{sets.map((s) => `${fmtNum(s.weightKg)}×${s.reps ?? '–'}`).join('  ·  ')}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="p-4 pt-2">
          {prev?.workout && <p className="text-[13px] text-muted mb-3">Lần gần nhất: {fmtDate(prev.workout.date)}</p>}
          <Button variant="primary" className="w-full h-[52px] flex items-center justify-center gap-2" onClick={start} disabled={busy} style={{ background: color }}>
            <IconDumbbell size={22} filled />
            Bắt đầu · {SESSION_MIN} phút
          </Button>
        </div>
      </Card>

      <GroupLabel>Chu kỳ 6 ngày</GroupLabel>
      <Card className="!p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {PROGRAM.map((d) => {
            const on = d.dayIndex === dayIndex;
            return (
              <button
                key={d.dayIndex}
                onClick={() => setManual(d.dayIndex === suggested ? null : d.dayIndex)}
                className={`press flex flex-col items-center gap-1.5 rounded-[14px] py-3 ${on ? 'bg-surface-2' : ''}`}
              >
                <DayBadge dayIndex={d.dayIndex} size={38} />
                <span className="text-[13px] font-semibold leading-tight">{d.muscle}</span>
                <span className="text-[11px] text-muted -mt-1 h-3.5">{d.dayIndex === suggested ? 'gợi ý' : ''}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <p className="px-4 pt-2 text-[13px] text-muted">Chu kỳ xoay theo buổi đã hoàn thành, không theo thứ trong tuần. Nghỉ một hôm thì buổi sau vẫn là nhóm cơ kế tiếp.</p>

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
  const [confirmDel, setConfirmDel] = useState(null);
  if (!data?.length) return null;
  return (
    <>
      <GroupLabel>Lịch sử</GroupLabel>
      <Card className="!py-1">
        <ul>
          {data.map((w) => {
            const mins = Math.round((w.completedAt - w.startedAt) / 60000);
            const isOpen = open === w.id;
            const grouped = {};
            w.sets
              .sort((a, b) => (a.exerciseOrder ?? 0) - (b.exerciseOrder ?? 0) || a.setIndex - b.setIndex)
              .forEach((s) => (grouped[s.exerciseName] ||= []).push(s));
            return (
              <li key={w.id} className="hairline-b last:shadow-none">
                <button className="w-full flex items-center gap-3 min-h-[60px] text-left" onClick={() => setOpen(isOpen ? null : w.id)}>
                  <DayBadge dayIndex={w.dayIndex} size={36} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[16px]">{w.targetMuscle}</span>
                    <span className="block text-[13px] text-muted font-rounded tnum">
                      {fmtDate(w.date)} · {w.sets.length} set · {Math.round(w.volume).toLocaleString('vi-VN')} kg · {mins} phút
                    </span>
                  </span>
                  <IconChevron dir={isOpen ? 'up' : 'down'} className="text-faint" size={16} />
                </button>
                {isOpen && (
                  <div className="pb-3 pl-12 space-y-2 text-[15px]">
                    {Object.entries(grouped).map(([name, sets]) => (
                      <div key={name}>
                        <div className="text-muted text-[13px]">{name}</div>
                        <div className="font-rounded tnum">{sets.map((s) => `${fmtNum(s.weightKg)}×${s.reps ?? '–'}`).join('  ·  ')}</div>
                        {w.notes?.[name] && <div className="text-[13px] text-muted italic">{w.notes[name]}</div>}
                      </div>
                    ))}
                    <button className="text-[15px] text-danger min-h-10" onClick={() => setConfirmDel(w)}>
                      Xoá buổi này
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <Sheet open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Xoá buổi tập?">
        {confirmDel && (
          <>
            <p className="text-muted mb-4">
              Buổi {confirmDel.targetMuscle} ngày {fmtDate(confirmDel.date)} sẽ bị xoá khỏi lịch sử. Các buổi sau sẽ không còn dùng buổi này làm tham chiếu.
            </p>
            <Button
              variant="danger"
              className="w-full"
              onClick={async () => {
                await discardWorkout(confirmDel.id);
                setConfirmDel(null);
                setOpen(null);
              }}
            >
              Xoá buổi tập
            </Button>
          </>
        )}
      </Sheet>
    </>
  );
}

/* ---------------- Màn hình đang tập (In-Workout Logger) ---------------- */
function ActiveSession({ workout }) {
  const logs = useLiveQuery(() => db.exerciseLogs.where('workoutId').equals(workout.id).toArray(), [workout.id]);
  const prev = useLiveQuery(() => previousSession(workout.dayIndex, workout.id), [workout.dayIndex, workout.id]);
  const wake = useWakeLock(true);
  const day = dayOf(workout.dayIndex);
  const [sheet, setSheet] = useState(null); // 'finish' | 'switch' | 'discard'

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

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="ghost" onClick={() => setSheet('switch')}>
          Đổi nhóm cơ
        </Button>
        <Button variant="primary" onClick={() => setSheet('finish')} style={{ background: 'var(--go)' }}>
          Kết thúc buổi
        </Button>
      </div>

      <Sheet open={sheet === 'finish'} onClose={() => setSheet(null)} title="Kết thúc buổi tập?">
        <div className="flex items-center gap-4 rounded-[18px] bg-surface p-4 mb-4">
          <DayBadge dayIndex={workout.dayIndex} size={48} />
          <div>
            <div className="text-[28px] font-bold font-rounded tnum leading-none">
              {done}
              <span className="text-muted text-[20px]">/{total}</span>
            </div>
            <div className="text-[13px] text-muted mt-1">set đã hoàn thành. Set chưa tick sẽ không vào lịch sử.</div>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full h-[52px]"
            style={{ background: 'var(--go)' }}
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
          <Button variant="destructive" className="w-full" onClick={() => setSheet('discard')}>
            Huỷ buổi, không lưu
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'discard'} onClose={() => setSheet(null)} title="Huỷ buổi tập?">
        <p className="text-muted mb-4">Mọi set đã ghi trong buổi này sẽ bị xoá.</p>
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            useRest.getState().stop();
            await discardWorkout(workout.id);
          }}
        >
          Huỷ buổi
        </Button>
      </Sheet>

      <Sheet open={sheet === 'switch'} onClose={() => setSheet(null)} title="Đổi nhóm cơ">
        {done > 0 ? (
          <p className="text-muted">Bạn đã tick {done} set. Hãy huỷ buổi hiện tại trước nếu muốn đổi sang nhóm cơ khác.</p>
        ) : (
          <div className="rounded-[18px] bg-surface">
            {PROGRAM.map((d) => (
              <button
                key={d.dayIndex}
                className="w-full flex items-center gap-3 px-4 min-h-[60px] hairline-b last:shadow-none text-left"
                onClick={async () => {
                  setSheet(null);
                  if (d.dayIndex !== workout.dayIndex) await changeWorkoutDay(workout.id, d.dayIndex);
                }}
              >
                <DayBadge dayIndex={d.dayIndex} size={34} />
                <span className="flex-1">
                  <span className="block font-semibold">{d.muscle}</span>
                  <span className="block text-[13px] text-muted">{d.focus}</span>
                </span>
                {d.dayIndex === workout.dayIndex && <IconCheck size={20} className="text-accent" />}
              </button>
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
  const color = over ? 'var(--warn)' : 'var(--go)';
  return (
    <div className="sticky top-[env(safe-area-inset-top)] z-30 -mx-4 px-4 py-2.5 material hairline-b">
      <div className="flex items-center gap-3">
        <DayBadge dayIndex={workout.dayIndex} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[17px] leading-tight truncate">{day.muscle}</div>
          <div className="text-[13px] text-muted font-rounded tnum">
            {done}/{total} set · {wake === 'on' ? 'Giữ sáng' : wake === 'unsupported' ? 'Không giữ sáng' : '…'}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[22px] font-semibold font-rounded tnum leading-none" style={{ color }}>
            <IconTimer size={18} />
            {fmtClock(elapsed)}
          </div>
          <div className="text-[11px] text-muted mt-0.5">/ {SESSION_MIN}:00</div>
        </div>
        <button onClick={onFinish} className="press h-11 w-11 rounded-full grid place-items-center text-white" style={{ background: 'var(--go)' }} aria-label="Kết thúc buổi">
          <IconCheck size={22} />
        </button>
      </div>
      <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ExerciseCard({ workout, name, order, sets, prevSets, prevDate }) {
  const restSeconds = useSettings((s) => s.restSeconds);
  const startRest = useRest((s) => s.start);
  const [note, setNote] = useState(workout.notes?.[name] || '');
  const allDone = sets.every((s) => s.isCompleted);
  const doneCount = sets.filter((s) => s.isCompleted).length;

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
    <Card>
      <div className="flex items-start gap-3 mb-0.5">
        <span
          className="mt-0.5 h-6 min-w-6 px-1.5 rounded-full grid place-items-center text-[13px] font-bold font-rounded tnum"
          style={allDone ? { background: 'var(--go)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}
        >
          {allDone ? <IconCheck size={14} /> : order + 1}
        </span>
        <h3 className="flex-1 font-semibold text-[17px] leading-snug tracking-[-0.02em]">{name}</h3>
        <span className="text-[13px] text-muted font-rounded tnum pt-0.5">
          {doneCount}/{sets.length}
        </span>
      </div>
      <p className="text-[13px] text-muted font-rounded tnum mb-3 pl-9">
        {prevSets.length ? `Lần trước ${fmtDate(prevDate)}: ${prevSets.map((s) => `${fmtNum(s.weightKg)}×${s.reps ?? '–'}`).join('  ')}` : 'Chưa có dữ liệu buổi trước'}
      </p>

      <div className="grid grid-cols-[2rem_1fr_1fr_3.25rem] gap-2 items-center text-[12px] font-medium text-muted mb-1 px-0.5">
        <span className="text-center">Set</span>
        <span className="text-center">kg</span>
        <span className="text-center">reps</span>
        <span />
      </div>
      <div className="space-y-2">
        {sets.map((s, i) => {
          const ref = prevSets[i];
          const done = !!s.isCompleted;
          return (
            <div key={s.id} className={`grid grid-cols-[2rem_1fr_1fr_3.25rem] gap-2 items-center ${done ? '[&_input]:bg-transparent [&_input]:text-muted' : ''}`}>
              <span className="text-center font-semibold font-rounded tnum text-[17px]" style={{ color: done ? 'var(--go)' : 'var(--muted)' }}>
                {s.setIndex}
              </span>
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
                aria-pressed={done}
                aria-label={`Hoàn thành set ${s.setIndex}`}
                className="press h-12 w-[3.25rem] rounded-[12px] grid place-items-center transition-colors"
                style={done ? { background: 'var(--go)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--faint)' }}
              >
                <IconCheck size={24} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 mt-2.5 -mx-1">
        <Button variant="plain" className="text-[15px] px-3" onClick={() => addSet(workout.id, name, order)}>
          + Thêm set
        </Button>
        <Button variant="plain" className="text-[15px] px-3 disabled:bg-transparent" disabled={sets.length <= 1} onClick={() => removeLastSet(workout.id, name)}>
          Bớt set
        </Button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveNote}
        placeholder="Ghi chú (vd: ghế dốc nấc 3, form siết tốt)"
        className="h-11 w-full rounded-[12px] bg-surface-2 px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-accent placeholder:text-faint"
      />
    </Card>
  );
}
