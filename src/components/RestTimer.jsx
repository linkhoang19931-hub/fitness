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
    const id = setInterval(tick, 200);
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
  const pct = total ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const R = 22;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-40 px-3 pb-2.5">
      <div className="mx-auto max-w-lg rounded-[22px] material shadow-[0_10px_40px_rgba(0,0,0,0.35)] border border-line/60">
        <div className="flex items-center gap-3 p-2.5 pl-3">
          <div className="relative h-[54px] w-[54px] shrink-0">
            <svg viewBox="0 0 54 54" className="-rotate-90 h-full w-full">
              <circle cx="27" cy="27" r={R} fill="none" stroke="var(--go)" strokeOpacity="0.2" strokeWidth="5" />
              <circle
                cx="27"
                cy="27"
                r={R}
                fill="none"
                stroke="var(--go)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${C * (done ? 1 : pct)} ${C}`}
                style={{ transition: 'stroke-dasharray 200ms linear' }}
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-muted whitespace-nowrap">{done ? 'Hết giờ nghỉ' : 'Nghỉ'}</div>
            <div className="text-[32px] leading-none font-semibold font-rounded tnum tracking-[-0.02em]" aria-live="polite" style={{ color: done ? 'var(--go)' : undefined }}>
              {done ? 'Vào set!' : fmtClock(remaining)}
            </div>
          </div>
          {!done && (
            <>
              <button onClick={() => adjust(-15)} className="press h-11 w-11 rounded-full bg-surface-2 text-[14px] font-semibold font-rounded tnum">
                −15
              </button>
              <button onClick={() => adjust(30)} className="press h-11 w-11 rounded-full bg-surface-2 text-[14px] font-semibold font-rounded tnum">
                +30
              </button>
            </>
          )}
          <button
            onClick={() => {
              setDone(false);
              stop();
            }}
            className="press h-11 px-4 rounded-full text-[15px] font-semibold text-white"
            style={{ background: 'var(--go)' }}
          >
            {done ? 'OK' : 'Bỏ qua'}
          </button>
        </div>
      </div>
    </div>
  );
}
