import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../lib/db';
import { DELOAD_AFTER, deloadStatus, exerciseHistory, records, warmupSets } from '../lib/strength';
import { useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, fmtShort, fmtW } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card, Sheet, haptic } from './ui';
import { IconCheck } from './Icons';

const KIND = {
  up: { color: 'var(--go)', label: 'Tăng tạ' },
  hold: { color: 'var(--accent)', label: 'Giữ tạ, thêm rep' },
  down: { color: 'var(--warn)', label: 'Giảm tạ' },
  deload: { color: 'var(--warn)', label: 'Giảm tải' },
};

/* ---------- Gợi ý cho bài hôm nay (trong thẻ bài tập) ---------- */
export function SuggestionBox({ name, suggestion, canFill, onFill, workWeight }) {
  const [warm, setWarm] = useState(false);
  const k = KIND[suggestion?.kind];
  const warmups = warmupSets(name, workWeight);
  if (!suggestion && !warmups.length) return null;
  return (
    <div className="mb-3 rounded-[14px] px-3 py-2.5" style={{ background: k ? `color-mix(in srgb, ${k.color} 11%, var(--surface-2))` : 'var(--surface-2)' }}>
      {suggestion && (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: k.color }}>
              {k.label} · hôm nay
            </div>
            <div className="text-[17px] font-semibold font-rounded tnum leading-snug">
              {suggestion.weight ? `${fmtNum(suggestion.weight)} kg` : 'BW'} × {suggestion.kind === 'hold' && suggestion.reps < suggestion.hi ? `${suggestion.reps}+` : suggestion.reps}
              <span className="text-[13px] text-muted font-normal"> · mục tiêu {suggestion.lo}–{suggestion.hi} rep</span>
            </div>
            <div className="text-[13px] text-muted leading-snug mt-0.5">{suggestion.text}</div>
          </div>
          {canFill && suggestion.weight != null && (
            <button
              className="press shrink-0 h-9 px-3 rounded-full text-[14px] font-semibold text-white"
              style={{ background: k.color }}
              onClick={() => {
                haptic();
                onFill(suggestion.weight);
              }}
            >
              Điền
            </button>
          )}
        </div>
      )}
      {warmups.length > 0 && (
        <button className="mt-1 text-[14px] font-medium text-accent min-h-9" onClick={() => setWarm(true)}>
          Set khởi động cho {fmtNum(workWeight)} kg →
        </button>
      )}
      <WarmupSheet open={warm} onClose={() => setWarm(false)} name={name} workWeight={workWeight} sets={warmups} />
    </div>
  );
}

function WarmupSheet({ open, onClose, name, workWeight, sets }) {
  const [done, setDone] = useState({});
  return (
    <Sheet open={open} onClose={onClose} title="Khởi động">
      <p className="text-[15px] text-muted mb-3">
        {name} · set chính {fmtNum(workWeight)} kg. Tăng dần để làm nóng khớp và hệ thần kinh, không tập tới mỏi. Nghỉ 30–60 giây giữa các set; các set này không ghi vào nhật ký.
      </p>
      <div className="rounded-[16px] bg-surface">
        {sets.map((s, i) => {
          const on = !!done[i];
          return (
            <button key={i} className="w-full flex items-center gap-3 px-4 min-h-[56px] hairline-b last:shadow-none text-left" onClick={() => setDone({ ...done, [i]: !on })}>
              <span className="w-12 text-[13px] text-muted">{s.label}</span>
              <span className="flex-1 text-[19px] font-semibold font-rounded tnum" style={{ color: on ? 'var(--muted)' : undefined }}>
                {fmtNum(s.weight)} kg × {s.reps}
              </span>
              <span className="h-9 w-9 rounded-full grid place-items-center" style={on ? { background: 'var(--go)', color: '#fff' } : { boxShadow: 'inset 0 0 0 2px var(--faint)' }}>
                {on && <IconCheck size={18} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted mt-3">Bài nặng đầu buổi nên khởi động kỹ; các bài sau cùng nhóm cơ chỉ cần 1 set nhẹ.</p>
    </Sheet>
  );
}

/* ---------- Tiến bộ sức mạnh của một bài (trong bảng hướng dẫn) ---------- */
export function StrengthPanel({ name }) {
  const hist = useLiveQuery(() => (name ? exerciseHistory(name) : []), [name]);
  if (!hist?.length) return null;
  const bw = hist.every((h) => !h.top);
  const key = bw ? 'maxReps' : 'e1rm';
  const data = hist.filter((h) => h[key] && !h.deload).map((h) => ({ date: h.date, v: h[key] }));
  const rec = records(hist);
  const first = data[0]?.v;
  const last = data[data.length - 1]?.v;
  const change = first && last ? last - first : null;
  const bestSet = rec.top?.sets.find((s) => +s.weightKg === rec.top.top);
  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2">
        <Tile label={bw ? 'Rep cao nhất' : '1RM ước tính'} value={last ? fmtNum(Math.round(last * 10) / 10) : '–'} unit={bw ? 'rep' : 'kg'} />
        <Tile
          label={`So với ${fmtShort(data[0]?.date || hist[0].date)}`}
          value={change == null ? '–' : `${change > 0 ? '+' : ''}${fmtNum(Math.round(change * 10) / 10)}`}
          unit={bw ? 'rep' : 'kg'}
          color={change > 0 ? 'var(--go)' : change < 0 ? 'var(--warn)' : undefined}
        />
        <Tile label="Kỷ lục tạ" value={rec.top?.top ? fmtNum(rec.top.top) : 'BW'} unit={rec.top?.top ? `kg × ${bestSet?.reps ?? '–'}` : ''} />
      </div>
      {data.length >= 2 ? (
        <div className="h-40 mt-2 -ml-3 rounded-[14px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={34} orientation="right" allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--elevated)', border: 'none', borderRadius: 12, color: 'var(--ink)' }}
                labelFormatter={(d) => fmtDate(d)}
                formatter={(v) => [bw ? `${v} rep` : `${fmtNum(v)} kg`, bw ? 'Rep cao nhất' : '1RM ước tính']}
              />
              <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[13px] text-muted mt-2">Tập thêm buổi nữa để thấy biểu đồ tiến bộ.</p>
      )}
      <div className="mt-2 rounded-[14px] bg-surface px-3 py-1">
        {[...hist]
          .reverse()
          .slice(0, 5)
          .map((h) => (
            <div key={h.workoutId} className="flex gap-3 py-1.5 hairline-b last:shadow-none text-[14px]">
              <span className="w-[72px] shrink-0 text-muted">{fmtShort(h.date)}</span>
              <span className="flex-1 font-rounded tnum truncate">{h.sets.map((s) => `${fmtW(s.weightKg)}×${s.reps ?? '–'}`).join('  ')}</span>
              {h.deload && <span className="text-[12px] text-muted">giảm tải</span>}
              {h === rec.e1rm && !bw && <span className="text-[12px] font-semibold" style={{ color: 'var(--go)' }}>KỶ LỤC</span>}
            </div>
          ))}
      </div>
      {!bw && <p className="text-[12px] text-muted mt-1.5 px-1">1RM ước tính theo công thức Epley từ set tốt nhất mỗi buổi; dùng để so tiến bộ, không cần thử tạ tối đa.</p>}
    </div>
  );
}

function Tile({ label, value, unit, color }) {
  return (
    <div className="rounded-[14px] bg-surface p-2.5">
      <div className="text-[11px] text-muted leading-tight truncate">{label}</div>
      <div className="font-rounded tnum leading-tight mt-0.5" style={{ color }}>
        <span className="text-[20px] font-bold">{value}</span>
        <span className="text-[11px] text-muted"> {unit}</span>
      </div>
    </div>
  );
}

/* ---------- Tuần giảm tải ---------- */
export function useDeload() {
  const today = useToday();
  const deloadStart = useSettings((s) => s.deloadStart);
  const deloadSnooze = useSettings((s) => s.deloadSnooze);
  const completed = useLiveQuery(async () => (await db.workouts.where('date').aboveOrEqual(addDays(today, -120)).toArray()).filter((w) => w.completedAt), [today]);
  if (!completed) return null;
  return deloadStatus(completed, { deloadStart, deloadSnooze }, today);
}

export function DeloadCard({ status }) {
  const today = useToday();
  const update = useSettings((s) => s.update);
  const [info, setInfo] = useState(false);
  if (!status) return null;
  if (status.active)
    return (
      <Card className="mb-3" style={{ background: 'color-mix(in srgb, var(--warn) 12%, var(--surface))' }}>
        <div className="text-[13px] font-semibold" style={{ color: 'var(--warn)' }}>
          Tuần giảm tải · đến hết {fmtDate(status.endsOn)}
        </div>
        <p className="text-[15px] mt-1">Mỗi bài một nửa số set, tạ ~70%, dừng khi còn dư 3–4 rep. App đã tự giảm số set và gợi ý mức tạ.</p>
        <button className="mt-1 text-[15px] font-medium text-accent min-h-10" onClick={() => update({ deloadStart: addDays(today, -7) })}>
          Kết thúc sớm
        </button>
      </Card>
    );
  if (!status.due || status.snoozed) return null;
  return (
    <Card className="mb-3">
      <div className="text-[17px] font-semibold">Đã tập {status.weeks} tuần liền</div>
      <p className="text-[15px] text-muted mt-1">
        Nên có 1 tuần giảm tải: tập nhẹ hơn để khớp, gân và hệ thần kinh hồi phục, sau đó thường khoẻ hơn. Khi đang ăn thâm hụt, mệt mỏi tích luỹ nhanh hơn bình thường.
      </p>
      <button className="text-[14px] text-accent font-medium min-h-9" onClick={() => setInfo(!info)}>
        {info ? 'Ẩn' : 'Giảm tải là gì?'}
      </button>
      {info && (
        <ul className="text-[14px] text-muted list-disc pl-5 space-y-1 mb-1">
          <li>Vẫn tập đúng lịch, đúng bài.</li>
          <li>Giảm một nửa số set, tạ khoảng 60–70%, không tập tới thất bại.</li>
          <li>Ăn uống giữ nguyên; không phải tuần nghỉ.</li>
          <li>Thường làm mỗi 4–8 tuần, hoặc sớm hơn khi sức mạnh giảm nhiều bài, đau khớp, ngủ kém.</li>
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button variant="primary" onClick={() => update({ deloadStart: today, deloadSnooze: null })}>
          Bắt đầu giảm tải
        </Button>
        <Button variant="ghost" onClick={() => update({ deloadSnooze: addDays(today, 7) })}>
          Để tuần sau
        </Button>
      </div>
    </Card>
  );
}

// Dòng nhỏ dưới lịch tập: còn bao lâu tới tuần giảm tải, cho phép bắt đầu sớm
export function DeloadLine({ status }) {
  const today = useToday();
  const update = useSettings((s) => s.update);
  if (!status || status.active || status.weeks < 1 || (status.due && !status.snoozed)) return null;
  return (
    <p className="px-4 pt-2 text-[13px] text-muted">
      Đã tập {status.weeks} tuần liền · gợi ý giảm tải sau {DELOAD_AFTER} tuần.{' '}
      <button className="text-accent font-medium" onClick={() => update({ deloadStart: today, deloadSnooze: null })}>
        Giảm tải tuần này
      </button>
    </p>
  );
}
