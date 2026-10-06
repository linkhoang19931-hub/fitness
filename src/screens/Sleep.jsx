import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../lib/db';
import { useSettings } from '../lib/store';
import { useToday } from '../lib/useToday';
import { addDays, fmtDate, toDateStr } from '../lib/utils';
import {
  GRADE,
  activeSleep,
  assessNight,
  endSleep,
  fmtClockMin,
  fmtHours,
  nightsFrom,
  periodStats,
  rangeOf,
  recommend,
  saveSleep,
  scoreNight,
  sleepTarget,
  startSleep,
  suggestedBedtime,
  wakeMinute,
} from '../lib/sleep';
import { AnimatedNumber, Button, Card, GroupLabel, Rings, Segmented, Sheet, SwipeRow, TextField, haptic, useToast } from '../components/ui';
import { IconChevron, IconMoon, IconSunrise } from '../components/Icons';

const H = 3600000;
const pad = (n) => String(n).padStart(2, '0');
const toInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const clock = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const NIGHT = 'linear-gradient(160deg, #2a2560, #141233 70%)';

export default function Sleep() {
  const settings = useSettings();
  const target = sleepTarget(settings);
  const today = useToday();
  const [toast, showToast] = useToast();
  const sleeps = useLiveQuery(() => db.sleeps.toArray(), []) || [];
  const active = useLiveQuery(() => activeSleep(), []);
  const nights = useMemo(() => nightsFrom(sleeps), [sleeps]);
  const ctx = { cutting: settings.startWeight > settings.goalWeight, male: settings.sex !== 'female' };

  const [morning, setMorning] = useState(null); // ngày dậy vừa ghi → hiện bảng đánh giá
  const [edit, setEdit] = useState(null); // {} để thêm mới, hoặc bản ghi để sửa

  // Đêm gần nhất (để hiện thẻ "Đêm qua")
  const last = nights[nights.length - 1];
  const lastEval = last ? scoreNight(last, nights, target) : null;

  // Giờ dậy thường ngày → giờ nên lên giường
  const recentWake = nights.slice(-14).filter((n) => n.wake).map((n) => wakeMinute(n.wake));
  const typicalWake = recentWake.length >= 3 ? [...recentWake].sort((a, b) => a - b)[Math.floor(recentWake.length / 2)] : 5 * 60 + 30;
  const bedBy = suggestedBedtime(typicalWake, target);

  const goSleep = async () => {
    haptic();
    await startSleep();
    showToast('Chúc ngủ ngon');
  };
  const wakeUp = async () => {
    haptic();
    const id = await endSleep(active.id);
    if (!id) {
      showToast('Dưới 3 phút nên coi là bấm nhầm, đã huỷ');
      return;
    }
    const s = await db.sleeps.get(id);
    setMorning({ id, date: s.wakeDate });
  };

  return (
    <div>
      {active === undefined ? null : active ? (
        <SleepingCard active={active} onWake={wakeUp} onEdit={() => setEdit(active)} onCancel={() => db.sleeps.delete(active.id)} />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="p-5 text-white" style={{ background: NIGHT }}>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white/70">
              <IconMoon size={18} /> Tối nay
            </div>
            <div className="mt-1 text-[22px] font-bold leading-tight">Lên giường trước {fmtClockMin(bedBy)}</div>
            <div className="text-[14px] text-white/70 mt-0.5">
              để ngủ đủ {fmtHours(target.target)} nếu dậy lúc {fmtClockMin(typicalWake)}
              {recentWake.length < 3 ? ' (giờ tập 6:00)' : ' (giờ dậy thường ngày)'}. Muộn nhất {fmtClockMin(typicalWake - target.min * 60 - 15)} để đủ tối thiểu {target.min} giờ.
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={goSleep}
              className="mt-4 w-full h-[54px] rounded-[16px] bg-white text-[#141233] text-[17px] font-bold flex items-center justify-center gap-2"
            >
              <IconMoon size={22} filled /> Đi ngủ
            </motion.button>
          </div>
          <button className="w-full py-3 text-[15px] text-accent font-medium" onClick={() => setEdit({})}>
            Quên bấm? Ghi giấc ngủ thủ công
          </button>
        </Card>
      )}

      {last && lastEval && <NightCard night={last} ev={lastEval} target={target} ctx={ctx} today={today} />}

      <Dashboard nights={nights} target={target} today={today} />

      <History nights={nights} sleeps={sleeps} target={target} onEdit={setEdit} />

      <p className="px-4 pt-3 text-[13px] text-muted">
        Khuyến nghị cho {target.label}: {target.min}–{target.max} giờ/đêm. Mục tiêu riêng {fmtHours(target.target)}
        {target.reasons.length ? ` vì ${target.reasons.join(' và ')}` : ''}.{!settings.age && ' Nhập tuổi trong Cài đặt để tính chính xác hơn.'}
      </p>

      <MorningSheet data={morning} nights={nights} target={target} ctx={ctx} onClose={() => setMorning(null)} />
      <EditSheet data={edit} onClose={() => setEdit(null)} onSaved={(m) => showToast(m)} />
      {toast}
    </div>
  );
}

/* ---------- Đang ngủ ---------- */
function SleepingCard({ active, onWake, onEdit, onCancel }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const hrs = (now - active.start) / H;
  const forgot = hrs > 16;
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-5 text-white" style={{ background: NIGHT }}>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/70">
          <motion.span animate={{ rotate: [0, -12, 0, 12, 0] }} transition={{ repeat: Infinity, duration: 6 }}>
            <IconMoon size={18} filled />
          </motion.span>
          Đang ngủ từ {clock(active.start)} · {fmtDate(toDateStr(new Date(active.start)))}
        </div>
        <div className="mt-2 text-[44px] font-bold font-rounded tnum leading-none">{fmtHours(hrs)}</div>
        {forgot && <p className="mt-2 text-[14px] text-[#ffd60a]">Đã hơn 16 giờ — có vẻ bạn quên bấm “Đã dậy”. Chạm “Sửa giờ” để nhập giờ dậy thật.</p>}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onWake}
          className="mt-4 w-full h-[54px] rounded-[16px] text-[#3a2600] text-[17px] font-bold flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(90deg, #ffd60a, #ff9f0a)' }}
        >
          <IconSunrise size={22} /> Đã dậy
        </motion.button>
      </div>
      <div className="flex">
        <button className="flex-1 py-3 text-[15px] text-accent font-medium" onClick={onEdit}>
          Sửa giờ
        </button>
        <button className="flex-1 py-3 text-[15px] text-danger font-medium" onClick={onCancel}>
          Huỷ (bấm nhầm)
        </button>
      </div>
    </Card>
  );
}

/* ---------- Đánh giá một đêm ---------- */
function NightCard({ night, ev, target, ctx, today }) {
  const a = assessNight(night, ev, target, ctx);
  const g = GRADE[ev.grade];
  const label = night.date === today ? 'Đêm qua' : `Đêm trước ${fmtDate(night.date)}`;
  return (
    <>
      <GroupLabel>{label}</GroupLabel>
      <Card>
        <div className="flex items-center gap-4">
          <Rings size={104} stroke={12} rings={[{ value: ev.score / 100, color: g.color }]}>
            <div>
              <div className="text-[28px] font-bold font-rounded tnum leading-none">
                <AnimatedNumber value={ev.score} />
              </div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: g.color }}>
                {g.label}
              </div>
            </div>
          </Rings>
          <div className="flex-1 min-w-0">
            <div className="text-[30px] font-bold font-rounded tnum leading-none">{fmtHours(night.hours)}</div>
            <div className="text-[14px] text-muted mt-1 font-rounded tnum">
              {clock(night.bed)} → {clock(night.wake)}
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-2 overflow-hidden relative">
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(target.min / 11) * 100}%`, width: `${((target.max - target.min) / 11) * 100}%`, background: 'color-mix(in srgb, var(--go) 30%, transparent)' }} />
              <motion.div className="absolute top-0 h-full w-1 rounded-full" style={{ background: g.color }} initial={{ left: 0 }} animate={{ left: `${Math.min(100, (night.hours / 11) * 100)}%` }} transition={{ type: 'spring', damping: 20 }} />
            </div>
            <div className="text-[11px] text-muted mt-1">vùng xanh = khuyến nghị {target.min}–{target.max} giờ</div>
          </div>
        </div>
        <p className="text-[16px] font-semibold mt-4 leading-snug">{a.headline}</p>
        {a.points.map((p, i) => (
          <p key={i} className="text-[15px] text-muted mt-1.5 leading-snug">
            {p}
          </p>
        ))}
        {a.effects.length > 0 && (
          <div className="mt-3 rounded-[14px] p-3" style={{ background: 'color-mix(in srgb, var(--warn) 12%, var(--surface-2))' }}>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--warn)' }}>
              Ảnh hưởng có thể gặp
            </div>
            <ul className="mt-1 space-y-1 text-[15px] leading-snug list-disc pl-5">
              {a.effects.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <Stars value={night.segments[night.segments.length - 1]?.quality} onChange={(q) => db.sleeps.update(night.segments[night.segments.length - 1].id, { quality: q })} />
      </Card>
    </>
  );
}

function Stars({ value, onChange }) {
  const labels = ['Rất tệ', 'Tệ', 'Bình thường', 'Ngon', 'Rất ngon'];
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="text-[14px] text-muted">Cảm nhận</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((q) => (
          <motion.button
            key={q}
            whileTap={{ scale: 0.8 }}
            onClick={() => {
              haptic();
              onChange(q);
            }}
            className="h-9 w-9 grid place-items-center text-[22px] leading-none"
            aria-label={`${q} sao`}
            style={{ color: value >= q ? '#ffd60a' : 'var(--faint)' }}
          >
            ★
          </motion.button>
        ))}
      </div>
      <span className="text-[13px] text-muted">{value ? labels[value - 1] : ''}</span>
    </div>
  );
}

/* ---------- Bảng buổi sáng ngay sau khi bấm "Đã dậy" ---------- */
function MorningSheet({ data, nights, target, ctx, onClose }) {
  const night = data && nights.find((n) => n.date === data.date);
  const ev = night ? scoreNight(night, nights, target) : null;
  return (
    <Sheet open={!!(data && night && ev)} onClose={onClose} title="Chào buổi sáng">
      {night && ev && (
        <>
          <div className="text-center py-2">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }} className="inline-block">
              <Rings size={140} stroke={14} rings={[{ value: ev.score / 100, color: GRADE[ev.grade].color }]}>
                <div>
                  <div className="text-[36px] font-bold font-rounded tnum leading-none">
                    <AnimatedNumber value={ev.score} />
                  </div>
                  <div className="text-[13px] font-semibold" style={{ color: GRADE[ev.grade].color }}>
                    {GRADE[ev.grade].label}
                  </div>
                </div>
              </Rings>
            </motion.div>
            <div className="mt-3 text-[28px] font-bold font-rounded tnum">{fmtHours(night.hours)}</div>
            <div className="text-muted">
              {clock(night.bed)} → {clock(night.wake)}
            </div>
          </div>
          <Card className="mt-3">
            <p className="text-[16px] font-semibold leading-snug">{assessNight(night, ev, target, ctx).headline}</p>
            <Stars value={night.segments[night.segments.length - 1]?.quality} onChange={(q) => db.sleeps.update(night.segments[night.segments.length - 1].id, { quality: q })} />
          </Card>
          <Button variant="primary" className="w-full mt-4" onClick={onClose}>
            Xem chi tiết
          </Button>
        </>
      )}
    </Sheet>
  );
}

/* ---------- Dashboard tuần / tháng / năm ---------- */
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function shift(period, anchor, dir) {
  const [y, m, d] = anchor.split('-').map(Number);
  if (period === 'week') return addDays(anchor, dir * 7);
  if (period === 'month') return toDateStr(new Date(y, m - 1 + dir, 1));
  return toDateStr(new Date(y + dir, 0, 1));
}

function Dashboard({ nights, target, today }) {
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(today);
  useEffect(() => setAnchor(today), [period, today]);
  const { from, to } = rangeOf(period, anchor);
  const inRange = nights.filter((n) => n.date >= from && n.date <= to);
  const stats = periodStats(inRange, target);
  const tips = recommend(stats, target, period);
  const isCurrent = to >= today && from <= today;

  const colorFor = (h) => (h == null ? 'transparent' : h >= target.min && h <= target.max ? 'var(--go)' : h >= target.okMin && h <= target.okMax ? 'var(--warn)' : 'var(--danger)');

  const data = useMemo(() => {
    if (period === 'year') {
      return MONTHS.map((label, i) => {
        const ms = inRange.filter((n) => +n.date.slice(5, 7) === i + 1);
        const avg = ms.length ? ms.reduce((a, n) => a + n.hours, 0) / ms.length : null;
        return { label, hours: avg, count: ms.length };
      });
    }
    const days = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
    return days.map((d, i) => {
      const n = inRange.find((x) => x.date === d);
      return { label: period === 'week' ? WD[i] : String(+d.slice(8)), date: d, hours: n ? n.hours : null };
    });
  }, [period, from, to, nights]); // eslint-disable-line react-hooks/exhaustive-deps

  const title =
    period === 'week'
      ? `${fmtDate(from, false).slice(0, 5)} – ${fmtDate(to, false).slice(0, 5)}`
      : period === 'month'
        ? `Tháng ${+from.slice(5, 7)}/${from.slice(0, 4)}`
        : `Năm ${from.slice(0, 4)}`;

  return (
    <>
      <GroupLabel>Tổng quan</GroupLabel>
      <Card>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week', label: 'Tuần' },
            { value: 'month', label: 'Tháng' },
            { value: 'year', label: 'Năm' },
          ]}
        />
        <div className="flex items-center justify-between mt-3">
          <button className="press h-9 w-9 rounded-full bg-surface-2 grid place-items-center text-accent" onClick={() => setAnchor(shift(period, anchor, -1))} aria-label="Kỳ trước">
            <IconChevron dir="left" size={16} />
          </button>
          <span className="font-semibold">{title}</span>
          <button
            className="press h-9 w-9 rounded-full bg-surface-2 grid place-items-center text-accent disabled:text-faint"
            disabled={isCurrent}
            onClick={() => setAnchor(shift(period, anchor, 1))}
            aria-label="Kỳ sau"
          >
            <IconChevron size={16} />
          </button>
        </div>

        <div className="h-52 mt-2 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <ReferenceArea y1={target.min} y2={target.max} fill="var(--go)" fillOpacity={0.1} ifOverflow="extendDomain" />
              <ReferenceLine y={target.target} stroke="var(--go)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={period === 'month' ? 4 : 0} />
              <YAxis domain={[0, 11]} ticks={[0, 3, 6, 9]} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} orientation="right" />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                contentStyle={{ background: 'var(--elevated)', border: 'none', borderRadius: 12, color: 'var(--ink)' }}
                formatter={(v) => [v == null ? 'Chưa ghi' : fmtHours(v), period === 'year' ? 'TB/đêm' : 'Ngủ']}
                labelFormatter={(l, p) => (p?.[0]?.payload?.date ? fmtDate(p[0].payload.date) : period === 'year' ? `Tháng ${String(l).slice(1)}` : l)}
              />
              <Bar dataKey="hours" radius={[6, 6, 2, 2]} maxBarSize={period === 'month' ? 10 : 30} isAnimationActive animationDuration={500}>
                {data.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.hours)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
          <Legend c="var(--go)" t={`${target.min}–${target.max}h khuyến nghị`} />
          <Legend c="var(--warn)" t="chấp nhận được" />
          <Legend c="var(--danger)" t="quá ít / quá nhiều" />
        </div>

        {stats ? (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Tile label="Trung bình / đêm" value={fmtHours(stats.avg)} />
            <Tile label={period === 'week' ? 'Nợ ngủ trong tuần' : 'Đêm đạt khuyến nghị'} value={period === 'week' ? fmtHours(stats.debt) : `${stats.okPct}%`} />
            <Tile label="Giờ đi ngủ TB" value={stats.avgBed != null ? fmtClockMin(stats.avgBed) : '–'} />
            <Tile label="Giờ dậy TB" value={stats.avgWake != null ? fmtClockMin(stats.avgWake) : '–'} />
          </div>
        ) : (
          <p className="text-[15px] text-muted mt-4">Chưa có dữ liệu trong khoảng này.</p>
        )}
      </Card>

      {tips.length > 0 && (
        <>
          <GroupLabel>Đánh giá & gợi ý</GroupLabel>
          <div className="space-y-2">
            {tips.map((t, i) => (
              <motion.div key={`${period}${from}${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="!py-3">
                  <div className="flex gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: GRADE[t.level]?.color || 'var(--warn)' }} />
                    <div>
                      <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
                      <div className="text-[14px] text-muted leading-snug mt-0.5">{t.body}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const Legend = ({ c, t }) => (
  <span className="flex items-center gap-1.5">
    <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
    {t}
  </span>
);
const Tile = ({ label, value }) => (
  <div className="rounded-[14px] bg-surface-2 px-3 py-2.5">
    <div className="text-[12px] text-muted">{label}</div>
    <div className="text-[20px] font-bold font-rounded tnum leading-tight">{value}</div>
  </div>
);

/* ---------- Lịch sử ---------- */
function History({ nights, sleeps, target, onEdit }) {
  const [n, setN] = useState(10);
  const rows = [...nights].reverse().slice(0, n);
  if (!rows.length) return null;
  return (
    <>
      <GroupLabel>Các đêm gần đây</GroupLabel>
      <Card className="!py-0">
        <AnimatePresence initial={false}>
          {rows.map((night) => {
            const ev = scoreNight(night, nights, target);
            const seg = night.segments[night.segments.length - 1] || night.naps[0];
            return (
              <motion.div key={night.date} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                <SwipeRow className="-mx-4 hairline-b last:shadow-none" onDelete={() => db.sleeps.bulkDelete([...night.segments, ...night.naps].map((s) => s.id))}>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left" onClick={() => onEdit(seg)}>
                    <span
                      className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-[14px] font-bold font-rounded text-white"
                      style={{ background: ev ? GRADE[ev.grade].color : 'var(--faint)' }}
                    >
                      {ev ? ev.score : '–'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold">{fmtDate(night.date)}</span>
                      <span className="block text-[13px] text-muted font-rounded tnum">
                        {night.bed ? `${clock(night.bed)} → ${clock(night.wake)}` : 'Chỉ ngủ trưa'}
                        {night.napHours > 0 && ` · trưa ${fmtHours(night.napHours)}`}
                        {night.quality ? ` · ${'★'.repeat(Math.round(night.quality))}` : ''}
                      </span>
                    </span>
                    <span className="text-[17px] font-semibold font-rounded tnum">{fmtHours(night.hours || night.napHours)}</span>
                    <IconChevron size={14} className="text-faint" />
                  </button>
                </SwipeRow>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Card>
      {nights.length > n && (
        <Button variant="plain" className="w-full" onClick={() => setN(n + 20)}>
          Xem thêm
        </Button>
      )}
    </>
  );
}

/* ---------- Thêm / sửa thủ công ---------- */
function EditSheet({ data, onClose, onSaved }) {
  const isNew = data && !data.id;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [quality, setQuality] = useState(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!data) return;
    setErr('');
    if (data.id) {
      setStart(toInput(data.start));
      setEnd(data.end ? toInput(data.end) : toInput(Math.min(Date.now(), data.start + 8 * H)));
      setQuality(data.quality ?? null);
      setNote(data.note || '');
    } else {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      y.setHours(23, 0, 0, 0);
      const w = new Date();
      w.setHours(5, 30, 0, 0);
      setStart(toInput(y.getTime()));
      setEnd(toInput(Math.min(w.getTime(), Date.now())));
      setQuality(null);
      setNote('');
    }
  }, [data]);
  const s = start ? new Date(start).getTime() : NaN;
  const e = end ? new Date(end).getTime() : NaN;
  const dur = e > s ? (e - s) / H : null;
  const sleeping = data && data.id && !data.end;
  const save = async () => {
    try {
      if (sleeping) {
        if (!(s < Date.now())) throw new Error('Giờ đi ngủ phải trước hiện tại.');
        await db.sleeps.update(data.id, { start: s });
        onSaved('Đã sửa giờ đi ngủ');
        onClose();
        return;
      }
      await saveSleep({ id: data.id, start: s, end: e, quality, note });
      onSaved(isNew ? 'Đã thêm giấc ngủ' : 'Đã cập nhật');
      onClose();
    } catch (x) {
      setErr(x.message);
    }
  };
  const input = 'h-12 w-full rounded-[12px] bg-surface px-3 text-[16px] outline-none focus:ring-2 focus:ring-accent';
  return (
    <Sheet open={!!data} onClose={onClose} title={isNew ? 'Ghi giấc ngủ' : sleeping ? 'Sửa giờ đi ngủ' : 'Sửa giấc ngủ'}>
      <label className="block">
        <span className="block text-[13px] text-muted mb-1 px-1">Đi ngủ lúc</span>
        <input type="datetime-local" className={input} value={start} onChange={(x) => setStart(x.target.value)} />
      </label>
      {!sleeping && (
        <>
      <label className="block mt-3">
        <span className="block text-[13px] text-muted mb-1 px-1">Thức dậy lúc</span>
        <input type="datetime-local" className={input} value={end} onChange={(x) => setEnd(x.target.value)} />
      </label>
      <div className="text-center my-3 text-[24px] font-bold font-rounded tnum">{dur ? fmtHours(dur) : '–'}</div>
      <Card className="!py-1">
        <Stars value={quality} onChange={setQuality} />
        <TextField className="!bg-surface-2 mt-2 mb-3" placeholder="Ghi chú (vd: thức giấc 2 lần, uống cà phê muộn)" value={note} onChange={(x) => setNote(x.target.value)} />
      </Card>
        </>
      )}
      {err && <p className="text-[14px] mt-3" style={{ color: 'var(--danger)' }}>{err}</p>}
      <Button variant="primary" className="w-full mt-4" onClick={save} disabled={sleeping ? !start : !dur}>
        Lưu
      </Button>
      {!isNew && data?.end && (
        <Button
          variant="destructive"
          className="w-full mt-2"
          onClick={async () => {
            await db.sleeps.delete(data.id);
            onSaved('Đã xoá');
            onClose();
          }}
        >
          Xoá giấc ngủ này
        </Button>
      )}
    </Sheet>
  );
}
