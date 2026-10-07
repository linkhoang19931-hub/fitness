import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../lib/db';
import { FIELDS, bfCategory, navyBodyFat, weightOn } from '../lib/measure';
import { useSettings } from '../lib/store';
import { fmtDate, fmtNum, fmtShort } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card, GroupLabel, NumField, Segmented, Sheet, SwipeRow } from './ui';

const r1 = (v) => Math.round(v * 10) / 10;

export default function Measurements({ showToast }) {
  const { sex, heightCm } = useSettings();
  const today = useToday();
  const rows = useLiveQuery(() => db.measurements.orderBy('date').toArray(), []) || [];
  const weights = useLiveQuery(() => db.bodyMetrics.toArray(), []) || [];
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('waist');
  const [del, setDel] = useState(null);

  const data = useMemo(
    () =>
      rows.map((m) => {
        const bf = navyBodyFat({ sex, heightCm, ...m });
        const w = weightOn(m.date, weights);
        return { ...m, bf, weight: w, lean: bf != null && w ? r1(w * (1 - bf / 100)) : null, fatKg: bf != null && w ? r1((w * bf) / 100) : null };
      }),
    [rows, weights, sex, heightCm]
  );
  const latest = data[data.length - 1];
  const first = data[0];
  const daysSince = latest ? Math.round((new Date(today) - new Date(latest.date)) / 86400000) : null;
  const due = !latest || daysSince >= 7;
  const cat = bfCategory(latest?.bf, sex);
  const waistLabel = FIELDS[0].short(sex);

  const chartKey = { waist: 'waist', bf: 'bf', lean: 'lean' }[view];
  const chart = data.filter((d) => d[chartKey] != null);

  return (
    <>
      <GroupLabel
        right={
          <button className="text-[15px] text-accent font-medium" onClick={() => setOpen(true)}>
            {latest?.date === today ? 'Sửa số đo' : '+ Đo hôm nay'}
          </button>
        }
      >
        Số đo vòng & % mỡ
      </GroupLabel>
      <Card>
        {!latest ? (
          <>
            <p className="text-[15px]">
              Cân có thể đứng yên khi bạn vừa giảm mỡ vừa lên cơ. Vòng {sex === 'female' ? 'eo' : 'bụng'} và % mỡ cho thấy điều cân nặng không thấy.
            </p>
            <Button variant="primary" className="w-full mt-3" onClick={() => setOpen(true)}>
              Đo lần đầu
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Tile label={`Vòng ${waistLabel.toLowerCase()}`} value={fmtNum(latest.waist)} unit="cm" delta={first !== latest ? latest.waist - first.waist : null} />
              <Tile label="% mỡ ước tính" value={latest.bf != null ? fmtNum(latest.bf) : '–'} unit="%" delta={first !== latest && latest.bf != null && first.bf != null ? latest.bf - first.bf : null} sub={cat?.label} subColor={cat?.color} />
              <Tile label="Khối nạc" value={latest.lean != null ? fmtNum(latest.lean) : '–'} unit="kg" delta={first !== latest && latest.lean != null && first.lean != null ? latest.lean - first.lean : null} goodUp />
            </div>
            {!heightCm && <p className="text-[13px] mt-2" style={{ color: 'var(--warn)' }}>Nhập chiều cao trong Cài đặt để tính % mỡ.</p>}
            {sex === 'female' && heightCm && !latest.hip && <p className="text-[13px] mt-2" style={{ color: 'var(--warn)' }}>Công thức cho nữ cần thêm vòng mông.</p>}
            <Insight first={first} latest={latest} />
            {chart.length >= 2 && (
              <>
                <div className="mt-3">
                  <Segmented
                    value={view}
                    onChange={setView}
                    options={[
                      { value: 'waist', label: `Vòng ${waistLabel.toLowerCase()}` },
                      { value: 'bf', label: '% mỡ' },
                      { value: 'lean', label: 'Khối nạc' },
                    ]}
                  />
                </div>
                <div className="h-44 mt-2 -ml-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={34} orientation="right" allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'var(--elevated)', border: 'none', borderRadius: 12, color: 'var(--ink)' }} labelFormatter={(d) => fmtDate(d)} formatter={(v) => [fmtNum(v) + (view === 'bf' ? ' %' : view === 'lean' ? ' kg' : ' cm'), '']} />
                      <Line type="monotone" dataKey={chartKey} stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            <p className="text-[13px] text-muted mt-2">
              {due ? <b style={{ color: 'var(--accent)' }}>Đã {daysSince ?? 0} ngày từ lần đo trước — đo lại hôm nay. </b> : `Lần đo gần nhất ${fmtDate(latest.date)}. `}
              Đo 1 lần/tuần, buổi sáng trước khi ăn, thước dây sát da không siết.
            </p>
          </>
        )}
      </Card>

      {data.length > 0 && (
        <Card className="!py-0 mt-2">
          {[...data]
            .reverse()
            .slice(0, 8)
            .map((m) => (
              <SwipeRow key={m.id} className="-mx-4 hairline-b last:shadow-none" onDelete={() => setDel(m)}>
                <div className="flex items-center gap-3 min-h-[48px] px-4">
                  <span className="w-20 text-[15px] text-muted">{fmtDate(m.date)}</span>
                  <span className="flex-1 text-[14px] font-rounded tnum truncate">
                    {FIELDS.filter((f) => m[f.k])
                      .map((f) => `${f.short(sex)} ${fmtNum(m[f.k])}`)
                      .join(' · ')}
                  </span>
                  {m.bf != null && <span className="text-[14px] font-semibold font-rounded tnum">{fmtNum(m.bf)}%</span>}
                </div>
              </SwipeRow>
            ))}
        </Card>
      )}

      <MeasureSheet open={open} onClose={() => setOpen(false)} today={today} existing={rows.find((m) => m.date === today)} last={latest} sex={sex} heightCm={heightCm} showToast={showToast} />
      <Sheet open={!!del} onClose={() => setDel(null)} title="Xoá số đo?">
        {del && (
          <Button
            variant="danger"
            className="w-full"
            onClick={async () => {
              await db.measurements.delete(del.id);
              setDel(null);
            }}
          >
            Xoá số đo ngày {fmtDate(del.date)}
          </Button>
        )}
      </Sheet>
    </>
  );
}

function Insight({ first, latest }) {
  if (!first || first === latest || latest.lean == null || first.lean == null) return null;
  const dLean = latest.lean - first.lean;
  const dFat = latest.fatKg - first.fatKg;
  let text, color;
  if (dFat < -0.3 && dLean >= -0.3) {
    text = `Từ ${fmtDate(first.date)}: mất ${fmtNum(r1(-dFat))} kg mỡ, khối nạc ${dLean >= 0 ? 'giữ/tăng' : 'gần như giữ nguyên'}. Đúng hướng.`;
    color = 'var(--go)';
  } else if (dFat < 0 && dLean < -0.5) {
    text = `Từ ${fmtDate(first.date)}: mất ${fmtNum(r1(-dFat))} kg mỡ nhưng khối nạc giảm ${fmtNum(r1(-dLean))} kg. Kiểm tra protein, ngủ đủ và giữ tạ nặng; có thể đang giảm quá nhanh.`;
    color = 'var(--warn)';
  } else if (dFat >= 0) {
    text = `Từ ${fmtDate(first.date)}: lượng mỡ chưa giảm. Xem lại calo thực tế ở tab Tổng kết tuần.`;
    color = 'var(--warn)';
  } else return null;
  return (
    <p className="text-[13px] mt-2 leading-snug" style={{ color }}>
      {text}
    </p>
  );
}

function Tile({ label, value, unit, delta, sub, subColor, goodUp }) {
  const good = delta == null ? null : goodUp ? delta >= 0 : delta <= 0;
  return (
    <div className="rounded-[14px] bg-surface-2 p-2.5">
      <div className="text-[11px] text-muted leading-tight truncate">{label}</div>
      <div className="font-rounded tnum leading-tight mt-0.5">
        <span className="text-[20px] font-bold">{value}</span>
        <span className="text-[11px] text-muted"> {unit}</span>
      </div>
      {delta != null && Math.abs(delta) >= 0.05 ? (
        <div className="text-[12px] font-semibold font-rounded tnum" style={{ color: good ? 'var(--go)' : 'var(--warn)' }}>
          {delta > 0 ? '+' : ''}
          {fmtNum(r1(delta))} từ đầu
        </div>
      ) : sub ? (
        <div className="text-[12px] font-semibold" style={{ color: subColor }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function MeasureSheet({ open, onClose, today, existing, last, sex, heightCm, showToast }) {
  const [v, setV] = useState({});
  const [key, setKey] = useState(0);
  const init = existing || {};
  const val = (k) => (k in v ? v[k] : init[k] ?? null);
  const fields = FIELDS.filter((f) => !f.female || sex === 'female' || f.k === 'hip');
  const bf = navyBodyFat({ sex, heightCm, waist: val('waist'), neck: val('neck'), hip: val('hip') });
  const valid = val('waist') >= 40 && val('waist') <= 200 && val('neck') >= 20 && val('neck') <= 70;
  const close = () => {
    setV({});
    setKey(key + 1);
    onClose();
  };
  const save = async () => {
    const row = { date: today };
    for (const f of FIELDS) {
      const x = val(f.k);
      row[f.k] = x > 0 ? r1(x) : null;
    }
    if (existing) await db.measurements.update(existing.id, row);
    else await db.measurements.add(row);
    showToast?.(bf != null ? `Đã lưu · mỡ ~${fmtNum(bf)}%` : 'Đã lưu số đo');
    close();
  };
  return (
    <Sheet open={open} onClose={close} title={existing ? 'Sửa số đo hôm nay' : 'Số đo hôm nay'}>
      <div key={key} className="rounded-[16px] bg-surface px-4">
        {fields.map((f) => (
          <label key={f.k} className="flex items-center gap-3 min-h-[56px] hairline-b last:shadow-none">
            <span className="flex-1 text-[15px] leading-snug">
              {f.label(sex)}
              {(f.required || (f.k === 'hip' && sex === 'female')) && <span className="text-danger"> *</span>}
              {last?.[f.k] && <span className="block text-[12px] text-muted">lần trước {fmtNum(last[f.k])}</span>}
            </span>
            <div className="w-24">
              <NumField value={val(f.k)} placeholder={last?.[f.k] ? fmtNum(last[f.k]) : 'cm'} onCommit={(x) => setV((s) => ({ ...s, [f.k]: x }))} aria-label={f.label(sex)} />
            </div>
          </label>
        ))}
      </div>
      <p className="text-[13px] text-muted mt-2">
        * Bắt buộc để tính % mỡ{sex === 'female' ? ' (nữ cần thêm vòng mông)' : ''}. Đứng thẳng, thở ra bình thường, không hóp bụng.
      </p>
      {bf != null && (
        <div className="mt-3 rounded-[14px] bg-surface p-3 text-[15px]">
          % mỡ ước tính: <b className="font-rounded tnum">{fmtNum(bf)}%</b> ({bfCategory(bf, sex)?.label.toLowerCase()})
        </div>
      )}
      <Button variant="primary" className="w-full mt-4" disabled={!valid} onClick={save}>
        Lưu số đo
      </Button>
    </Sheet>
  );
}
