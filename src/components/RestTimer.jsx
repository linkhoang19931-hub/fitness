import { useEffect, useRef, useState } from 'react';
import { useRest, useSettings } from '../lib/store';
import { beep, fmtClock, vibrate } from '../lib/utils';

// Bộ đếm nghỉ: tính theo mốc thời gian kết thúc (endAt) nên vẫn đúng khi app bị đưa xuống nền
export default function RestTimer() {
  const { endAt, total, adjust, stop } = useRest();
  const { soundOn, vibrateOn } = useSettings();
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!endAt) return;
    fired.current = false;
    setDone(false);
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endAt]);

  const remaining = endAt ? (endAt - now) / 1000 : 0;

  useEffect(() => {
    if (endAt && remaining <= 0 && !fired.current) {
      fired.current = true;
      setDone(true);
      if (vibrateOn) vibrate([300, 120, 300, 120, 500]);
      if (soundOn) beep();
      const t = setTimeout(() => {
        setDone(false);
        stop();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [remaining, endAt, soundOn, vibrateOn, stop]);

  if (!endAt) return null;
  const pct = total ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 px-3 pb-2">
      <div
        className={`mx-auto max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
          done ? 'bg-accent text-accent-ink border-accent' : 'bg-surface border-line'
        }`}
      >
        <div className="h-1 bg-surface-2">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2 p-2.5">
          <div className="flex-1 pl-2">
            <div className={`text-[11px] font-semibold uppercase tracking-wider ${done ? '' : 'text-muted'}`}>
              {done ? 'Hết giờ nghỉ' : 'Nghỉ giữa hiệp'}
            </div>
            <div className="text-4xl font-bold tnum leading-none mt-0.5" aria-live="polite">
              {done ? 'VÀO SET!' : fmtClock(remaining)}
            </div>
          </div>
          {!done && (
            <>
              <button onClick={() => adjust(-15)} className="h-14 w-14 rounded-xl bg-surface-2 font-bold tnum active:bg-line">
                −15
              </button>
              <button onClick={() => adjust(30)} className="h-14 w-14 rounded-xl bg-surface-2 font-bold tnum active:bg-line">
                +30
              </button>
            </>
          )}
          <button
            onClick={() => {
              setDone(false);
              stop();
            }}
            className={`h-14 px-4 rounded-xl font-bold ${done ? 'bg-accent-ink text-accent' : 'bg-accent text-accent-ink'}`}
          >
            {done ? 'OK' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
