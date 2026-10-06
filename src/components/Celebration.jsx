import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { DAY_COLORS } from '../lib/program';
import { AnimatedNumber, haptic } from './ui';
import { IconCheck } from './Icons';

// Màn chúc mừng sau khi lưu buổi tập: pháo giấy + tổng kết + kỷ lục mới
export const useCelebrate = create((set) => ({
  workoutId: null,
  show: (id) => set({ workoutId: id }),
  hide: () => set({ workoutId: null }),
}));

async function loadSummary(id) {
  const w = await db.workouts.get(id);
  if (!w) return null;
  const logs = (await db.exerciseLogs.where('workoutId').equals(id).toArray()).filter((l) => l.isCompleted);
  const volume = logs.reduce((a, l) => a + (l.weightKg || 0) * (l.reps || 0), 0);
  const names = [...new Set(logs.map((l) => l.exerciseName))];
  // Kỷ lục: mức tạ cao nhất của bài lần này vượt mọi lần trước
  const older = (await db.workouts.toArray()).filter((x) => x.completedAt && x.id !== id && x.completedAt < w.completedAt).map((x) => x.id);
  const oldLogs = older.length ? await db.exerciseLogs.where('workoutId').anyOf(older).filter((l) => !!l.isCompleted).toArray() : [];
  const prs = [];
  for (const n of names) {
    const best = Math.max(0, ...logs.filter((l) => l.exerciseName === n).map((l) => l.weightKg || 0));
    const prevBest = Math.max(0, ...oldLogs.filter((l) => l.exerciseName === n).map((l) => l.weightKg || 0));
    if (best > 0 && prevBest > 0 && best > prevBest) prs.push({ name: n, best, prevBest });
  }
  return { w, sets: logs.length, volume, exercises: names.length, minutes: Math.max(1, Math.round((w.completedAt - w.startedAt) / 60000)), prs };
}

export default function Celebration() {
  const { workoutId, hide } = useCelebrate();
  const data = useLiveQuery(() => (workoutId ? loadSummary(workoutId) : null), [workoutId]);
  useEffect(() => {
    if (workoutId) haptic();
  }, [workoutId]);
  const color = data ? DAY_COLORS[data.w.dayIndex] || 'var(--go)' : 'var(--go)';
  return createPortal(
    <AnimatePresence>
      {workoutId && data && (
        <motion.div
          key="celebrate"
          className="fixed inset-0 z-[90] grid place-items-center px-6"
          style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          onClick={hide}
          role="dialog"
          aria-modal="true"
        >
          <Confetti />
          <motion.div
            className="relative w-full max-w-sm text-center"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto h-24 w-24 rounded-full grid place-items-center text-white shadow-2xl"
              style={{ background: 'var(--go)' }}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 11, stiffness: 260, delay: 0.15 }}
            >
              <IconCheck size={52} />
            </motion.div>
            <h2 className="mt-5 text-[30px] font-bold tracking-[-0.03em]">Xong buổi tập!</h2>
            <p className="text-[17px] font-semibold" style={{ color }}>
              D{data.w.dayIndex} · {data.w.targetMuscle}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-5">
              <Stat label="set" value={data.sets} delay={0.25} />
              <Stat label="kg khối lượng" value={data.volume} delay={0.35} />
              <Stat label="phút" value={data.minutes} delay={0.45} />
            </div>
            {data.prs.length > 0 && (
              <motion.div
                className="mt-4 rounded-[18px] bg-surface p-4 text-left"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="text-[13px] font-semibold" style={{ color: 'var(--warn)' }}>
                  Kỷ lục mới
                </div>
                {data.prs.slice(0, 4).map((p) => (
                  <div key={p.name} className="flex justify-between gap-3 text-[15px] mt-1">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 font-semibold font-rounded tnum">
                      {p.prevBest} → {p.best} kg
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
            <motion.button
              className="mt-6 w-full h-[52px] rounded-[14px] text-white text-[17px] font-semibold"
              style={{ background: 'var(--go)' }}
              whileTap={{ scale: 0.96 }}
              onClick={hide}
            >
              Tuyệt vời
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Stat({ label, value, delay }) {
  return (
    <motion.div
      className="rounded-[16px] bg-surface py-3"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 20, stiffness: 260 }}
    >
      <div className="text-[24px] font-bold font-rounded tnum leading-none">
        <AnimatedNumber value={value} />
      </div>
      <div className="text-[12px] text-muted mt-1">{label}</div>
    </motion.div>
  );
}

// Pháo giấy vẽ bằng canvas (nhẹ, không cần thư viện); tắt khi người dùng bật "Giảm chuyển động"
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const c = ref.current;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = (c.width = window.innerWidth * dpr);
    const H = (c.height = window.innerHeight * dpr);
    const colors = ['#ff375f', '#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#40c8e0', '#ffd60a'];
    const parts = Array.from({ length: 140 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.2,
      y: H * 0.38,
      vx: (Math.random() - 0.5) * 18 * dpr,
      vy: (-Math.random() * 16 - 6) * dpr,
      s: (Math.random() * 6 + 5) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[i % colors.length],
      shape: i % 3,
    }));
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const age = (t - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.42 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 1.8) / 1.2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 3, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-p.s / 6, -p.s / 2, p.s / 3, p.s);
        ctx.restore();
      }
      if (age < 3) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" aria-hidden="true" />;
}
