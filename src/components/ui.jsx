import { forwardRef, useEffect, useRef, useState } from 'react';
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

// Bảng kéo lên từ đáy (sheet) kiểu iOS
export function Sheet({ open, onClose, title, children }) {
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-[22px] bg-bg px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="sticky top-0 -mx-4 px-4 pt-1 pb-2 bg-bg z-10">
          <div className="mx-auto mb-2 h-[5px] w-9 rounded-full bg-faint/60" />
          <div className="flex items-center justify-between min-h-10">
            <h3 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h3>
            <button onClick={onClose} className="press h-8 px-3 rounded-full bg-surface-2 text-[15px] font-semibold text-accent">
              Xong
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

let toastTimer;
export function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => {
    setMsg(m);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setMsg(null), 1800);
  };
  const node = msg ? (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(12px+env(safe-area-inset-top))] z-[70] material rounded-full px-4 py-2.5 text-[15px] font-semibold shadow-lg pointer-events-none max-w-[90vw] truncate">
      {msg}
    </div>
  ) : null;
  return [node, show];
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
      onClick={() => onChange(!checked)}
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
