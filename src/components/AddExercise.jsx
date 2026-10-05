import { useEffect, useMemo, useRef, useState } from 'react';
import { EXERCISE_BY_NAME, MUSCLES, MUSCLE_LABEL, searchExercises } from '../lib/exercises';
import { normalize } from '../lib/foods';
import { Sheet, Switch, TextField } from './ui';
import { IconPlus, IconSearch } from './Icons';

// Bảng chọn bài để thêm vào buổi: gõ tới đâu gợi ý tới đó, hoặc lướt theo nhóm cơ.
// - groups: nhóm cơ của buổi hôm đó (lọc mặc định)
// - exclude: các bài đã có trong buổi
// - allowPersist: hiện công tắc "giữ cho các lần sau"; persistForced: luôn lưu (khi sửa từ màn lên lịch)
export default function AddExercise({ open, onClose, title, groups, exclude = [], onAdd, allowPersist = true, persistForced = false, persistLabel }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('day');
  const [sets, setSets] = useState(3);
  const [persist, setPersist] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setFilter('day');
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  const activeGroups = filter === 'day' ? groups : filter === 'all' ? null : [filter];
  const list = useMemo(() => searchExercises(q, { groups: activeGroups, exclude }), [q, filter, exclude.join('|'), (groups || []).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const exact = q.trim() && list.some((e) => normalize(e.name) === normalize(q.trim()));

  const pick = (name) => onAdd(name, { sets, persist: persistForced || persist });

  return (
    <Sheet open={open} onClose={onClose} title={title || 'Thêm bài tập'}>
      <div className="relative">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <TextField
          ref={inputRef}
          type="search"
          className="!pl-9"
          placeholder="Gõ tên bài: inc, curl, squat, đẩy vai…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-1 -mx-4 px-4 [scrollbar-width:none]">
        {[
          { id: 'day', label: 'Hợp buổi này' },
          ...MUSCLES.map((m) => ({ id: m.id, label: m.label })),
          { id: 'all', label: 'Tất cả' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`press shrink-0 h-8 px-3 rounded-full text-[14px] font-medium ${filter === c.id ? 'bg-ink text-bg' : 'bg-surface text-ink'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-[16px] bg-surface px-4">
        <div className="flex items-center justify-between py-2.5 hairline-b">
          <span className="text-[15px]">Số set</span>
          <div className="flex items-center gap-2">
            <button className="press h-8 w-8 rounded-full bg-surface-2 text-[18px] font-semibold" onClick={() => setSets(Math.max(1, sets - 1))} aria-label="Bớt set">
              −
            </button>
            <span className="w-6 text-center font-semibold font-rounded tnum">{sets}</span>
            <button className="press h-8 w-8 rounded-full bg-surface-2 text-[18px] font-semibold" onClick={() => setSets(Math.min(8, sets + 1))} aria-label="Thêm set">
              +
            </button>
          </div>
        </div>
        {allowPersist && !persistForced && (
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[15px] leading-snug">{persistLabel || 'Giữ bài này cho các lần sau'}</span>
            <Switch checked={persist} onChange={setPersist} label="Giữ cho các lần sau" />
          </div>
        )}
        {persistForced && <p className="py-2.5 text-[13px] text-muted">{persistLabel || 'Bài sẽ có sẵn trong buổi này ở các lần sau.'}</p>}
      </div>

      <div className="mt-3 rounded-[16px] bg-surface overflow-hidden">
        {q.trim().length >= 3 && !exact && (
          <button className="w-full text-left px-4 py-3 hairline-b flex items-center gap-3 text-accent" onClick={() => pick(q.trim())}>
            <IconPlus size={18} />
            <span className="text-[16px] font-medium">Thêm bài mới “{q.trim()}”</span>
          </button>
        )}
        {list.slice(0, 60).map((e) => (
          <button key={e.id} className="w-full text-left px-4 py-2.5 hairline-b last:shadow-none flex items-start gap-3" onClick={() => pick(e.name)}>
            <span className="flex-1 min-w-0">
              <Highlight text={e.name} q={q} />
              <span className="block text-[12px] text-muted leading-snug mt-0.5">
                {e.groups.map((g) => MUSCLE_LABEL[g]).join(' · ')}
                {e.equipment && ` · ${e.equipment}`}
                {e.unit && ` · tính theo ${e.unit}`}
              </span>
              <span className="block text-[13px] text-muted leading-snug">{e.tip}</span>
            </span>
            <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full grid place-items-center text-white" style={{ background: 'var(--accent)' }}>
              <IconPlus size={16} />
            </span>
          </button>
        ))}
        {list.length === 0 && !q.trim() && <p className="px-4 py-4 text-[15px] text-muted">Không còn bài nào trong nhóm này. Chọn nhóm khác hoặc “Tất cả”.</p>}
      </div>
    </Sheet>
  );
}

// Tô đậm phần chữ khớp với từ đang gõ (bỏ qua dấu)
function Highlight({ text, q }) {
  const nq = normalize(q.trim());
  if (!nq) return <span className="block text-[16px] leading-snug">{text}</span>;
  const nt = normalize(text);
  const i = nt.indexOf(nq.split(/\s+/)[0]);
  if (i < 0) return <span className="block text-[16px] leading-snug">{text}</span>;
  const len = nq.split(/\s+/)[0].length;
  return (
    <span className="block text-[16px] leading-snug">
      {text.slice(0, i)}
      <b className="text-accent">{text.slice(i, i + len)}</b>
      {text.slice(i + len)}
    </span>
  );
}

export const exerciseInfo = (name) => EXERCISE_BY_NAME[name] || null;
