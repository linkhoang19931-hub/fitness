import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react';
import { parseNum } from '../lib/utils';

// Thẻ nhóm kiểu "inset grouped" của iOS: nền phẳng, bo 16px, không viền
export function Card({ className = '', children, ...rest }) {
  return (
    <section className={`rounded-[18px] bg-surface border border-transparent p-4 ${className}`} {...rest}>
      {children}
    </section>
  );
}

// Tiêu đề trong thẻ: cỡ chữ "headline" của iOS
export function SectionTitle({ children, right, icon }) {
  return (
    <div className="flex items-center justify-between mb-3 min-h-7">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
        {icon}
        {children}
      </h2>
      {right}
    </div>
  );
}

// Nhãn nhóm phía trên thẻ (footnote viết hoa, màu xám)
export function GroupLabel({ children, right }) {
  return (
    <div className="flex items-end justify-between px-4 pt-3 pb-1.5">
      <span className="text-[13px] uppercase tracking-[0.02em] text-muted">{children}</span>
      {right}
    </div>
  );
}

const BTN = {
  primary: 'bg-accent text-accent-ink font-semibold',
  ghost: 'bg-surface-2 text-accent font-medium',
  outline: 'bg-surface-2 text-ink font-medium',
  destructive: 'bg-surface-2 text-danger font-medium',
  danger: 'bg-danger text-white font-semibold',
  plain: 'bg-transparent text-accent font-medium',
};
export function Button({ variant = 'ghost', className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`press min-h-12 min-w-12 px-4 rounded-[14px] text-[17px] tracking-[-0.02em] disabled:bg-surface-2 disabled:text-faint disabled:active:scale-100 ${BTN[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Ô nhập số: tự bật bàn phím số, chấp nhận dấu phẩy, giữ con trỏ khi dữ liệu cập nhật từ IndexedDB
export function NumField({ value, onCommit, decimal = true, placeholder, className = '', ...rest }) {
  const [draft, setDraft] = useState(value ?? '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value ?? '');
  }, [value]);
  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      pattern={decimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
      enterKeyHint="done"
      autoComplete="off"
      value={draft}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        const n = parseNum(draft);
        setDraft(n ?? '');
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9.,]/g, '');
        setDraft(v);
        onCommit(parseNum(v));
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={`h-12 w-full rounded-[12px] bg-surface-2 outline-none text-center text-[19px] font-semibold font-rounded tnum placeholder:text-faint placeholder:font-normal focus:ring-2 focus:ring-accent ${className}`}
      {...rest}
    />
  );
}

export const TextField = forwardRef(function TextField({ className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      className={`h-12 w-full rounded-[12px] bg-surface-2 outline-none px-3.5 placeholder:text-faint focus:ring-2 focus:ring-accent ${className}`}
      {...rest}
    />
  );
});

// Thanh tiến trình mảnh kiểu iOS
export function MacroBar({ label, value, target, min, unit = 'g', over = false, hint, color = 'var(--accent)' }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const minPct = min && target ? (min / target) * 100 : null;
  const c = over ? 'var(--danger)' : color;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: over ? c : undefined }}>
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          {label}
        </span>
        <span className="tnum font-rounded text-[15px]" style={{ color: over ? c : undefined }}>
          <b className="font-semibold">{Math.round(value * 10) / 10}</b>
          <span className={over ? '' : 'text-muted'}>
            {' / '}
            {min ? `${min}–${target}` : target}
            {unit}
          </span>
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: `color-mix(in srgb, ${c} 18%, transparent)` }}>
        <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${over ? 100 : pct}%`, background: c }} />
        {minPct !== null && <div className="absolute top-0 h-full w-[2px] bg-surface" style={{ left: `${minPct}%` }} />}
      </div>
      {hint && <p className={`mt-1 text-[13px] ${over ? 'font-semibold' : 'text-muted'}`} style={{ color: over ? c : undefined }}>{hint}</p>}
    </div>
  );
}

// Vòng tiến trình đồng tâm (Protein ngoài, Fat giữa, Carbs trong)
export function Rings({ rings, size = 150, stroke = 15, gap = 3, children }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {rings.map((r, i) => {
          const radius = size / 2 - stroke / 2 - i * (stroke + gap);
          const circ = 2 * Math.PI * radius;
          const pct = Math.max(0, Math.min(1, r.value));
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={r.color} strokeOpacity="0.2" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${circ * pct} ${circ}`}
                style={{ transition: 'stroke-dasharray 600ms cubic-bezier(.2,.8,.2,1)' }}
                opacity={pct === 0 ? 0 : 1}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// Bảng kéo lên từ đáy kiểu iOS: trượt lên có lò xo, vuốt thanh trên xuống để đóng.
// Render qua portal ra <body> để không bị ảnh hưởng bởi hiệu ứng chuyển tab.
export function Sheet({ open, onClose, title, children }) {
  const controls = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/45"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[22px] bg-bg px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.9 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
            }}
          >
            <div className="sticky top-0 -mx-4 px-4 pt-1 pb-2 bg-bg z-10 touch-none" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto mb-2 h-[5px] w-9 rounded-full bg-faint/60" />
              <div className="flex items-center justify-between min-h-10 gap-3">
                <h3 className="text-[20px] font-bold tracking-[-0.02em] min-w-0 truncate">{title}</h3>
                <button
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="press h-8 px-3 shrink-0 rounded-full bg-surface-2 text-[15px] font-semibold text-accent"
                >
                  Xong
                </button>
              </div>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

let toastTimer;
export function useToast() {
  const [msg, setMsg] = useState(null);
  const [key, setKey] = useState(0);
  const show = (m) => {
    setMsg(m);
    setKey((k) => k + 1);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setMsg(null), 1800);
  };
  const node = createPortal(
    <AnimatePresence>
      {msg && (
        <motion.div
          key={key}
          initial={{ y: -40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 380 }}
          className="fixed left-0 right-0 mx-auto w-fit top-[calc(12px+env(safe-area-inset-top))] z-[70] material rounded-full px-4 py-2.5 text-[15px] font-semibold shadow-lg pointer-events-none max-w-[90vw] truncate"
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
  return [node, show];
}

// Số chạy mượt từ giá trị cũ sang giá trị mới (dùng cho kcal, cân nặng...)
export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('vi-VN'), className = '', style }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { type: 'spring', damping: 30, stiffness: 120 });
    return () => c.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.span className={className} style={style}>
      {text}
    </motion.span>
  );
}

// Dòng vuốt sang trái để hiện nút xoá (như Mail / Ghi chú trên iPhone)
export function SwipeRow({ children, onDelete, label = 'Xoá', className = '', bg = 'var(--surface)' }) {
  const x = useMotionValue(0);
  const [openRow, setOpenRow] = useState(false);
  const W = 84;
  const btnOpacity = useTransform(x, [-W, 0], [1, 0]);
  const settle = (to) => {
    animate(x, to, { type: 'spring', damping: 30, stiffness: 400 });
    setOpenRow(to !== 0);
  };
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="relative z-10"
        style={{ x, touchAction: 'pan-y', background: bg }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -W * 1.6, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -W * 1.3 || info.velocity.x < -900) {
            haptic();
            onDelete();
            settle(0);
          } else settle(info.offset.x < -W / 2 ? -W : 0);
        }}
        onClickCapture={(e) => {
          if (openRow) {
            e.stopPropagation();
            settle(0);
          }
        }}
      >
        {children}
      </motion.div>
      <motion.button
        className="absolute inset-y-0 right-0 z-0 flex items-center justify-center text-white text-[15px] font-semibold"
        style={{ width: W, background: "var(--danger)", opacity: btnOpacity }}
        onClick={() => {
          haptic();
          onDelete();
        }}
        aria-label={label}
        tabIndex={openRow ? 0 : -1}
        aria-hidden={!openRow}
      >
        {label}
      </motion.button>
    </div>
  );
}

// Rung nhẹ khi chạm. iPhone (iOS 18+) không hỗ trợ navigator.vibrate trên web nhưng tạo
// phản hồi rung khi bật một công tắc hệ thống, nên dùng một công tắc ẩn để mượn hiệu ứng đó.
let hapticLabel = null;
export function haptic() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(12);
      return;
    }
    if (!hapticLabel) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.id = '__haptic';
      input.style.display = 'none';
      hapticLabel = document.createElement('label');
      hapticLabel.htmlFor = '__haptic';
      hapticLabel.style.display = 'none';
      document.body.append(input, hapticLabel);
    }
    hapticLabel.click();
  } catch {}
}

// Segmented control kiểu iOS
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-[10px] bg-surface-2 p-[2px]" role="tablist">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 min-h-9 rounded-[8px] text-[14px] font-semibold transition-colors ${on ? 'text-ink shadow-[0_2px_6px_rgba(0,0,0,0.12)]' : 'text-muted'}`}
            style={on ? { background: 'var(--seg)' } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Công tắc kiểu iOS
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic();
        onChange(!checked);
      }}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors"
      style={{ background: checked ? 'var(--go)' : 'var(--surface-2)' }}
    >
      <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-[left] ${checked ? 'left-[22px]' : 'left-[2px]'}`} />
    </button>
  );
}

// URL tạm cho Blob ảnh, tự thu hồi khi không dùng nữa
export function useObjectURL(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
