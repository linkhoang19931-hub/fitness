import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { DAY_COLORS, PROGRAM, dayOf, nextDayIndex } from '../lib/program';
import { useRest, useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, fmtClock, fmtW, unlockAudio, weekStart } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { useWakeLock } from '../lib/useWakeLock';
import {
  activeWorkout,
  addSet,
  completedSince,
  lastActivityAt,
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
import { IconCheck, IconChevron, IconDumbbell, IconInfo, IconTimer } from '../components/Icons';
import { guideFor, videoUrl } from '../lib/guides';

const SESSION_MIN = 50;

const STALE_HOURS = 4;

export default function Workout() {
  const active = useLiveQuery(() => activeWorkout(), []);
  const today = useToday();
  if (active === undefined) return null;
  if (!active) return <Planner />;
  // Buổi bắt đầu từ hơn 4 giờ trước hoặc từ hôm trước mà chưa bấm kết thúc
  const stale = Date.now() - active.startedAt > STALE_HOURS * 3600000 || active.date !== today;
  return stale ? <StaleSession workout={active} today={today} /> : <ActiveSession workout={active} />;
}

/* ---------- Buổi tập quên bấm kết thúc ---------- */
function StaleSession({ workout, today }) {
  const done = useLiveQuery(() => db.exerciseLogs.where('workoutId').equals(workout.id).filter((l) => !!l.isCompleted).count(), [workout.id]);
  const day = dayOf(workout.dayIndex);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    useRest.getState().stop();
    await finishWorkout(workout.id, await lastActivityAt(workout));
    setBusy(false);
  };
  return (
    <Card>
      <div className="flex items-center gap-3.5">
        <DayBadge dayIndex={workout.dayIndex} size={52} />
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--warn)' }}>
            Buổi tập chưa kết thúc
          </div>
          <div className="text-[20px] font-bold leading-tight">
            {day.muscle} · {fmtDate(workout.date)}
          </div>
        </div>
      </div>
      <p className="text-[15px] text-muted mt-3">
        {done
          ? `Buổi này có ${done} set đã tick nhưng chưa được lưu. Lưu lại để chu kỳ chuyển sang nhóm cơ kế tiếp.`
          : 'Buổi này chưa có set nào được tick nên sẽ không được lưu.'}
      </p>
      <div className="space-y-2 mt-4">
        {done > 0 && (
          <Button variant="primary" className="w-full" style={{ background: 'var(--go)' }} disabled={busy} onClick={save}>
            Lưu buổi {fmtDate(workout.date)}
          </Button>
        )}
        {done > 0 && workout.date === today && (
          <Button variant="ghost" className="w-full" onClick={() => db.workouts.update(workout.id, { startedAt: Date.now() })}>
            Tập tiếp buổi này
          </Button>
        )}
        <Button
          variant="destructive"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            useRest.getState().stop();
            await discardWorkout(workout.id);
          }}
        >
          {done ? 'Bỏ buổi này' : 'Đóng buổi trống'}
        </Button>
      </div>
    </Card>
  );
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
  const cycleStartAt = useSettings((s) => s.cycleStartAt);
  const resetCycle = useSettings((s) => s.resetCycle);
  const today = useToday();
  const monday = weekStart(today);
  const last = useLiveQuery(() => lastCompletedWorkout(cycleStartAt), [cycleStartAt]);
  const lastAny = useLiveQuery(() => lastCompletedWorkout(), []);
  const week = useLiveQuery(() => completedSince(monday), [monday]) || [];
  const [manual, setManual] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [guide, setGuide] = useState(null);
  const suggested = nextDayIndex(last?.dayIndex);
  const dayIndex = manual ?? suggested;
  const day = dayOf(dayIndex);
  const prev = useLiveQuery(() => previousSession(dayIndex), [dayIndex]);
  const [busy, setBusy] = useState(false);
  const color = DAY_COLORS[dayIndex];
  const todayDone = week.filter((w) => w.date === today);

  // Gợi ý bắt đầu lại từ D1 khi sang tuần mới mà chu kỳ trước dở dang
  const mondayTs = new Date(monday + 'T00:00:00').getTime();
  const weekPromptSeen = useSettings((s) => s.weekPromptSeen);
  const newWeekPrompt =
    weekPromptSeen !== monday &&
    suggested !== 1 && week.length === 0 && lastAny && lastAny.completedAt < mondayTs && (!cycleStartAt || cycleStartAt < mondayTs);

  const start = async () => {
    unlockAudio(); // mở khoá âm thanh trên iOS bằng chính thao tác chạm này
    setBusy(true);
    await startWorkout(dayIndex);
    setBusy(false);
  };

  const doReset = () => {
    resetCycle();
    setManual(null);
    setResetOpen(false);
  };

  return (
    <div>
      {todayDone.length > 0 && <TodayDone sessions={todayDone} />}

      {newWeekPrompt && (
        <Card className="mb-3">
          <div className="text-[17px] font-semibold">Tuần mới bắt đầu</div>
          <p className="text-[15px] text-muted mt-1">
            Tuần trước bạn dừng ở D{last?.dayIndex ?? '–'} {last ? dayOf(last.dayIndex).muscle : ''}. Muốn tập lại từ D1 Ngực hay đi tiếp D{suggested} {dayOf(suggested).muscle}?
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="primary" onClick={doReset}>
              Lại từ D1
            </Button>
            <Button variant="ghost" onClick={() => useSettings.getState().update({ weekPromptSeen: monday })}>
              Đi tiếp D{suggested}
            </Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden !p-0">
        <div className="p-4 pb-3" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 16%, transparent), transparent)` }}>
          <div className="flex items-center gap-3.5">
            <DayBadge dayIndex={dayIndex} size={58} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold" style={{ color }}>
                {manual && manual !== suggested ? 'Chọn thủ công' : todayDone.length ? 'Buổi tiếp theo · ngày mai' : 'Buổi tiếp theo'}
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
              <li key={ex} className="hairline-b last:shadow-none">
                <button className="w-full flex gap-3 py-2.5 text-left items-start" onClick={() => setGuide(ex)}>
                <span className="w-5 shrink-0 text-muted font-rounded tnum font-semibold text-[15px] pt-px">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] leading-snug">{ex}</div>
                  {sets?.length > 0 && (
                    <div className="text-[13px] text-muted font-rounded tnum truncate">{sets.map((s) => `${fmtW(s.weightKg)}×${s.reps ?? '–'}`).join('  ·  ')}</div>
                  )}
                </div>
                <IconInfo size={20} className="text-accent shrink-0 mt-0.5" />
                </button>
              </li>
            );
          })}
        </ol>
        <div className="p-4 pt-2">
          {prev?.workout && <p className="text-[13px] text-muted mb-3">Lần gần nhất: {fmtDate(prev.workout.date)}</p>}
          <Button
            variant={todayDone.length ? 'ghost' : 'primary'}
            className="w-full h-[52px] flex items-center justify-center gap-2"
            onClick={start}
            disabled={busy}
            style={todayDone.length ? undefined : { background: color }}
          >
            <IconDumbbell size={22} filled />
            {todayDone.length ? `Tập thêm buổi ${day.muscle} hôm nay` : `Bắt đầu · ${SESSION_MIN} phút`}
          </Button>
        </div>
      </Card>

      <GroupLabel>Tuần này · {week.length} buổi</GroupLabel>
      <WeekStrip monday={monday} today={today} week={week} />

      <GroupLabel
        right={
          suggested !== 1 && (
            <button className="text-[15px] text-accent font-medium" onClick={() => setResetOpen(true)}>
              Bắt đầu lại từ D1
            </button>
          )
        }
      >
        Chu kỳ 6 ngày
      </GroupLabel>
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
                <span className="text-[11px] text-muted -mt-1 h-3.5">{d.dayIndex === suggested ? 'tiếp theo' : ''}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <p className="px-4 pt-2 text-[13px] text-muted">
        Chu kỳ xoay theo buổi đã hoàn thành, không theo thứ trong tuần: nghỉ một hôm thì buổi sau vẫn là nhóm cơ kế tiếp. Chạm một nhóm cơ khác để tập buổi đó hôm nay; buổi sau sẽ nối tiếp từ nhóm cơ bạn vừa tập.
      </p>

      <GuideSheet name={guide} onClose={() => setGuide(null)} />

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Bắt đầu lại từ D1?">
        <p className="text-[15px] text-muted mb-4">
          Buổi tiếp theo sẽ là D1 Ngực. Lịch sử tập, số liệu buổi trước, cân nặng, dinh dưỡng và ảnh đều giữ nguyên; số tạ lần trước của từng bài vẫn hiện như cũ.
        </p>
        <Button variant="primary" className="w-full" onClick={doReset}>
          Bắt đầu lại từ D1
        </Button>
      </Sheet>

      <History />
    </div>
  );
}

// Thẻ xác nhận đã hoàn thành buổi tập hôm nay
function TodayDone({ sessions }) {
  const ids = sessions.map((w) => w.id).join(',');
  const stats = useLiveQuery(async () => {
    const logs = await db.exerciseLogs.where('workoutId').anyOf(sessions.map((w) => w.id)).toArray();
    const done = logs.filter((l) => l.isCompleted);
    return { sets: done.length, volume: done.reduce((a, l) => a + (l.weightKg || 0) * (l.reps || 0), 0) };
  }, [ids]);
  const mins = sessions.reduce((a, w) => a + Math.round((w.completedAt - w.startedAt) / 60000), 0);
  return (
    <Card className="mb-3 !p-0 overflow-hidden">
      <div className="p-4 flex items-center gap-4" style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--go) 22%, transparent), transparent 75%)' }}>
        <span className="h-14 w-14 shrink-0 rounded-full grid place-items-center text-white" style={{ background: 'var(--go)' }}>
          <IconCheck size={30} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--go)' }}>
            Đã xong buổi tập hôm nay
          </div>
          <div className="text-[22px] font-bold leading-tight tracking-[-0.02em] truncate">
            {sessions.map((w) => `D${w.dayIndex} ${w.targetMuscle}`).join(' + ')}
          </div>
          <div className="text-[13px] text-muted font-rounded tnum">
            {stats ? `${stats.sets} set · ${Math.round(stats.volume).toLocaleString('vi-VN')} kg` : '…'} · {mins} phút
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Hướng dẫn động tác ---------- */
function GuideSheet({ name, onClose }) {
  const g = name ? guideFor(name) : null;
  const Sec = ({ title, items, ordered }) =>
    items?.length ? (
      <div className="mt-4">
        <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-muted px-1 mb-1.5">{title}</div>
        <div className="rounded-[16px] bg-surface px-4 py-1">
          {items.map((t, i) => (
            <div key={i} className="flex gap-3 py-2.5 hairline-b last:shadow-none text-[16px] leading-snug">
              <span className="w-5 shrink-0 font-semibold font-rounded tnum text-accent">{ordered ? i + 1 : '•'}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  return (
    <Sheet open={!!name} onClose={onClose} title={name || ''}>
      {g ? (
        <div className="pb-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[14px] bg-surface p-3">
              <div className="text-[12px] text-muted">Nhóm cơ</div>
              <div className="text-[15px] font-semibold leading-snug">{g.muscles}</div>
            </div>
            <div className="rounded-[14px] bg-surface p-3">
              <div className="text-[12px] text-muted">Gợi ý khi giảm mỡ</div>
              <div className="text-[15px] font-semibold font-rounded leading-snug">{g.rx}</div>
            </div>
          </div>
          <Sec title="Chuẩn bị" items={g.setup} />
          <Sec title="Thực hiện" items={g.steps} ordered />
          <Sec title="Ghi nhớ" items={g.cues} />
          <Sec title="Lỗi hay gặp" items={g.mistakes} />
          {g.safety && <p className="mt-4 rounded-[14px] p-3 text-[15px]" style={{ background: 'color-mix(in srgb, var(--warn) 14%, var(--surface))' }}>{g.safety}</p>}
          <a
            href={videoUrl(g)}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-4 flex items-center justify-center gap-2 h-12 rounded-[14px] bg-surface text-accent font-semibold"
          >
            Xem video mẫu trên YouTube
          </a>
        </div>
      ) : (
        <p className="text-muted">Chưa có hướng dẫn cho bài này.</p>
      )}
    </Sheet>
  );
}

const WD_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// 7 ô Thứ hai → Chủ nhật, ô nào có buổi tập thì hiện huy hiệu ngày tập
function WeekStrip({ monday, today, week }) {
  return (
    <Card className="!p-3">
      <div className="grid grid-cols-7 gap-1">
        {WD_SHORT.map((label, i) => {
          const date = addDays(monday, i);
          const sessions = week.filter((w) => w.date === date);
          const isToday = date === today;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <span className={`text-[12px] font-semibold ${isToday ? 'text-accent' : 'text-muted'}`}>{label}</span>
              {sessions.length ? (
                <span className="relative">
                  <DayBadge dayIndex={sessions[sessions.length - 1].dayIndex} size={34} />
                  <span
                    className="absolute -right-1.5 -bottom-1.5 h-[18px] w-[18px] rounded-full grid place-items-center text-white"
                    style={{ background: 'var(--go)', boxShadow: '0 0 0 2px var(--surface)' }}
                  >
                    <IconCheck size={11} />
                  </span>
                </span>
              ) : (
                <span
                  className="h-[34px] w-[34px] rounded-[10px] grid place-items-center text-[13px] font-rounded tnum text-faint"
                  style={{ background: 'var(--surface-2)', outline: isToday ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }}
                >
                  {Number(date.slice(8))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
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
                        <div className="font-rounded tnum">{sets.map((s) => `${fmtW(s.weightKg)}×${s.reps ?? '–'}`).join('  ·  ')}</div>
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
  const [guide, setGuide] = useState(null);

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
          onGuide={() => setGuide(name)}
        />
      ))}
      <GuideSheet name={guide} onClose={() => setGuide(null)} />

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
            <div className="text-[13px] text-muted mt-1">{done ? 'set đã hoàn thành. Set chưa tick sẽ bị bỏ.' : 'Chưa có set nào; buổi này sẽ không tính vào chu kỳ.'}</div>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full h-[52px]"
            style={{ background: done ? 'var(--go)' : undefined }}
            onClick={async () => {
              useRest.getState().stop();
              await finishWorkout(workout.id);
            }}
          >
            {done ? 'Lưu & kết thúc' : 'Thoát (chưa tập set nào, không lưu)'}
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

function ExerciseCard({ workout, name, order, sets, prevSets, prevDate, onGuide }) {
  const restSeconds = useSettings((s) => s.restSeconds);
  const startRest = useRest((s) => s.start);
  const [note, setNote] = useState(workout.notes?.[name] || '');
  const allDone = sets.every((s) => s.isCompleted);
  const doneCount = sets.filter((s) => s.isCompleted).length;

  const saveNote = async (text = note) => {
    const w = await db.workouts.get(workout.id);
    if (w) await db.workouts.update(workout.id, { notes: { ...(w.notes || {}), [name]: text.trim() } });
  };
  // Tự lưu ghi chú 0,6 giây sau khi ngừng gõ (không mất chữ nếu app bị tải lại)
  useEffect(() => {
    if (note === (workout.notes?.[name] || '')) return;
    const t = setTimeout(() => saveNote(note), 600);
    return () => clearTimeout(t);
  }, [note]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <button className="flex-1 text-left flex items-start gap-1.5" onClick={onGuide} aria-label={`Hướng dẫn ${name}`}>
          <h3 className="font-semibold text-[17px] leading-snug tracking-[-0.02em]">{name}</h3>
          <IconInfo size={19} className="text-accent shrink-0 mt-[3px]" />
        </button>
        <span className="text-[13px] text-muted font-rounded tnum pt-0.5">
          {doneCount}/{sets.length}
        </span>
      </div>
      <p className="text-[13px] text-muted font-rounded tnum mb-3 pl-9">
        {prevSets.length ? `Lần trước ${fmtDate(prevDate)}: ${prevSets.map((s) => `${fmtW(s.weightKg)}×${s.reps ?? '–'}`).join('  ')}` : 'Chưa có dữ liệu buổi trước'}
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
                placeholder={ref ? fmtW(ref.weightKg) : 'kg'}
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
        onBlur={() => saveNote()}
        placeholder="Ghi chú (vd: ghế dốc nấc 3, form siết tốt)"
        className="h-11 w-full rounded-[12px] bg-surface-2 px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-accent placeholder:text-faint"
      />
    </Card>
  );
}
