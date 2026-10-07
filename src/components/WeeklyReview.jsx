import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { SET_RANGE, loadWeek, reviewWeek } from '../lib/weekly';
import { useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, weekStart } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Card, GroupLabel } from './ui';
import { IconChevron } from './Icons';
import AdaptiveCard from './Adaptive';

const LEVEL = {
  good: { color: 'var(--go)', label: 'Tốt' },
  fair: { color: 'var(--warn)', label: 'Cần chú ý' },
  poor: { color: 'var(--danger)', label: 'Chưa đạt' },
  none: { color: 'var(--faint)', label: 'Chưa có dữ liệu' },
};
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function WeeklyReview({ showToast }) {
  const today = useToday();
  const settings = useSettings();
  const thisMon = weekStart(today);
  const [mon, setMon] = useState(thisMon);
  const w = useLiveQuery(() => loadWeek(mon, today, settings), [mon, today, settings.trainingDays, settings.lossRate, settings.goalWeight, settings.tdeeOverride, settings.age, settings.sex, settings.fatCap, settings.proteinPerKg]);
  const isThis = mon === thisMon;
  const items = w ? reviewWeek(w, settings) : [];
  const counts = items.reduce((a, i) => ({ ...a, [i.level]: (a[i.level] || 0) + 1 }), {});

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button className="press h-10 w-10 rounded-full bg-surface grid place-items-center text-accent" onClick={() => setMon(addDays(mon, -7))} aria-label="Tuần trước">
          <IconChevron dir="left" size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-[17px]">{isThis ? 'Tuần này' : mon === addDays(thisMon, -7) ? 'Tuần trước' : `Tuần ${fmtDate(mon, false)}`}</div>
          <div className="text-[13px] text-muted">
            {fmtDate(mon, false)} – {fmtDate(addDays(mon, 6), false)}
            {isThis && w ? ` · đã qua ${w.elapsed}/7 ngày` : ''}
          </div>
        </div>
        <button className="press h-10 w-10 rounded-full bg-surface grid place-items-center text-accent disabled:text-faint" disabled={isThis} onClick={() => setMon(addDays(mon, 7))} aria-label="Tuần sau">
          <IconChevron size={18} />
        </button>
      </div>

      {!w ? null : (
        <>
          <Card>
            <div className="text-[13px] text-muted">Tổng quan</div>
            <div className="text-[22px] font-bold leading-tight tracking-[-0.02em]">
              {counts.good || 0} tốt · {counts.fair || 0} cần chú ý · {counts.poor || 0} chưa đạt
            </div>
            <div className="grid grid-cols-6 gap-1 mt-3">
              {items.map((i) => (
                <div key={i.key} className="h-1.5 rounded-full" style={{ background: LEVEL[i.level].color }} title={i.title} />
              ))}
            </div>
          </Card>

          <div className="space-y-2 mt-3">
            {items.map((i) => (
              <Card key={i.key} className="!py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: LEVEL[i.level].color }} />
                  <span className="flex-1 font-semibold">{i.title}</span>
                  <span className="font-rounded tnum font-semibold">{i.value}</span>
                </div>
                <p className="text-[14px] text-muted mt-1 pl-[22px] leading-snug">{i.note}</p>
              </Card>
            ))}
          </div>

          <GroupLabel>Calo mỗi ngày</GroupLabel>
          <Card>
            <KcalChart days={w.nutrition.days} target={w.targets.kcal} end={w.end} />
          </Card>

          <GroupLabel>Số set theo nhóm cơ</GroupLabel>
          <Card>
            {w.training.muscles.length === 0 ? (
              <p className="text-[15px] text-muted">Chưa có buổi tập nào trong tuần.</p>
            ) : (
              <MuscleBars muscles={w.training.muscles} partial={!w.done} />
            )}
          </Card>

          {w.strength.length > 0 && (
            <>
              <GroupLabel>Sức mạnh (1RM ước tính)</GroupLabel>
              <Card className="!py-1">
                {w.strength.map((s) => {
                  const d = s.before ? s.now - s.before : null;
                  return (
                    <div key={s.name} className="flex items-center gap-3 py-2 hairline-b last:shadow-none">
                      <span className="flex-1 min-w-0 text-[15px] truncate">{s.name}</span>
                      <span className="font-rounded tnum text-[15px] font-semibold">{fmtNum(s.now)}</span>
                      <span className="w-20 text-right text-[13px] font-rounded tnum font-semibold" style={{ color: s.pr ? 'var(--go)' : d == null ? 'var(--muted)' : d >= 0 ? 'var(--go)' : 'var(--warn)' }}>
                        {s.pr ? 'KỶ LỤC' : d == null ? 'lần đầu' : `${d >= 0 ? '+' : ''}${fmtNum(Math.round(d * 10) / 10)}`}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {isThis && (
            <>
              <GroupLabel>Mức tiêu hao thực tế</GroupLabel>
              <AdaptiveCard onApplied={showToast} />
            </>
          )}
          <p className="px-4 pt-3 text-[12px] text-muted leading-relaxed">
            Số set: set nhóm cơ chính tính 1, nhóm phụ tính 0,5. Khoảng {SET_RANGE[0]}–{SET_RANGE[1]} set/nhóm cơ/tuần là mức nhiều nghiên cứu thấy hiệu quả cho tăng và giữ cơ (Schoenfeld 2017).
            Calo ±10% mục tiêu được tính là đạt.
          </p>
        </>
      )}
    </div>
  );
}

function KcalChart({ days, target, end }) {
  const data = days.map((d, i) => ({ ...d, label: WD[i], v: d.date <= end ? Math.round(d.k) : 0 }));
  return (
    <>
      <div className="h-40 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 6, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, (max) => Math.max(max, target) * 1.1]} />
            <ReferenceLine y={target} stroke="var(--accent)" strokeDasharray="4 4" />
            <Bar dataKey="v" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.date} fill={!d.v ? 'var(--surface-2)' : Math.abs(d.v - target) <= target * 0.1 ? 'var(--go)' : d.v > target ? 'var(--warn)' : 'var(--carbs)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted mt-1">
        <Dot c="var(--go)">Trong ±10%</Dot>
        <Dot c="var(--warn)">Vượt</Dot>
        <Dot c="var(--carbs)">Thấp hơn</Dot>
        <span>— — mục tiêu {target.toLocaleString('vi-VN')} kcal</span>
      </div>
    </>
  );
}

function Dot({ c, children }) {
  return (
    <span className="flex items-center gap-1">
      <i className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
      {children}
    </span>
  );
}

function MuscleBars({ muscles, partial }) {
  const max = Math.max(SET_RANGE[1] + 2, ...muscles.map((m) => m.sets));
  return (
    <div className="space-y-2">
      {muscles.map((m) => {
        const ok = m.sets >= SET_RANGE[0] && m.sets <= SET_RANGE[1] + 2;
        const color = ok ? 'var(--go)' : m.sets > SET_RANGE[1] + 2 ? 'var(--warn)' : partial ? 'var(--accent)' : 'var(--warn)';
        return (
          <div key={m.muscle} className="flex items-center gap-3">
            <span className="w-20 text-[14px] truncate">{m.label}</span>
            <div className="relative flex-1 h-5 rounded-[6px] bg-surface-2 overflow-hidden">
              <div className="absolute inset-y-0" style={{ left: `${(SET_RANGE[0] / max) * 100}%`, width: `${((SET_RANGE[1] - SET_RANGE[0]) / max) * 100}%`, background: 'color-mix(in srgb, var(--go) 14%, transparent)' }} />
              <div className="absolute inset-y-0 left-0 rounded-[6px]" style={{ width: `${(m.sets / max) * 100}%`, background: color }} />
            </div>
            <span className="w-9 text-right text-[14px] font-rounded tnum font-semibold">{fmtNum(m.sets)}</span>
          </div>
        );
      })}
      <p className="text-[12px] text-muted pt-1">Vùng xanh nhạt: {SET_RANGE[0]}–{SET_RANGE[1]} set/tuần.{partial ? ' Tuần chưa hết nên số set còn tăng.' : ''}</p>
    </div>
  );
}
