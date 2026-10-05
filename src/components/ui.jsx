import { useEffect, useRef, useState } from 'react';
import { parseNum } from '../lib/utils';

export function Card({ className = '', children, ...rest }) {
  return (
    <section className={`rounded-2xl bg-surface border border-line p-4 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {right}
    </div>
  );
}

const BTN = {
  primary: 'bg-accent text-accent-ink font-semibold active:brightness-90',
  ghost: 'bg-surface-2 text-ink active:bg-line',
  outline: 'border border-line text-ink active:bg-surface-2',
  danger: 'bg-danger text-white font-semibold active:brightness-90',
};
export function Button({ variant = 'ghost', className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`min-h-12 min-w-12 px-4 rounded-xl text-[15px] transition-[filter,background-color] disabled:bg-surface-2 disabled:text-faint disabled:border-transparent ${BTN[variant]} ${className}`}
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
      className={`h-12 w-full rounded-xl bg-surface-2 border border-transparent focus:border-accent outline-none text-center text-lg font-semibold tnum placeholder:text-faint placeholder:font-normal ${className}`}
      {...rest}
    />
  );
}

export function TextField({ className = '', ...rest }) {
  return (
    <input
      type="text"
      className={`h-12 w-full rounded-xl bg-surface-2 border border-transparent focus:border-accent outline-none px-3 placeholder:text-faint ${className}`}
      {...rest}
    />
  );
}

// Thanh tiến trình macro: đổi màu đỏ khi vượt trần (Fat)
export function MacroBar({ label, value, target, min, unit = 'g', over = false, hint }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const minPct = min && target ? (min / target) * 100 : null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={`text-sm font-semibold ${over ? 'text-danger' : ''}`}>{label}</span>
        <span className={`tnum text-sm ${over ? 'text-danger font-bold' : 'text-muted'}`}>
          <span className={over ? '' : 'text-ink font-semibold'}>{Math.round(value * 10) / 10}</span>
          {' / '}
          {min ? `${min}–${target}` : target}
          {unit}
        </span>
      </div>
      <div className={`relative h-3 rounded-full overflow-hidden ${over ? 'bg-danger/25' : 'bg-surface-2'}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${over ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: `${over ? 100 : pct}%` }}
        />
        {minPct !== null && <div className="absolute top-0 h-full w-0.5 bg-ink/40" style={{ left: `${minPct}%` }} />}
      </div>
      {hint && <p className={`mt-1 text-xs ${over ? 'text-danger font-semibold' : 'text-faint'}`}>{hint}</p>}
    </div>
  );
}

// Hộp thoại kéo lên từ đáy màn hình (dễ bấm bằng 1 ngón cái)
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-surface border-t border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        {title && <h3 className="text-lg font-bold mb-3">{title}</h3>}
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
    <div className="fixed left-1/2 -translate-x-1/2 bottom-28 z-50 rounded-full bg-ink text-bg px-4 py-2 text-sm font-semibold shadow-lg pointer-events-none">
      {msg}
    </div>
  ) : null;
  return [node, show];
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 min-h-10 rounded-lg text-sm font-semibold ${value === o.value ? 'bg-surface text-ink shadow' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
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
