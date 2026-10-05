import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../lib/db';
import { compressPhoto } from '../lib/image';
import { useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, fmtShort, movingAverage7 } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card, GroupLabel, NumField, Rings, Segmented, Sheet, useObjectURL, useToast } from '../components/ui';
import { IconCamera, IconTrash } from '../components/Icons';

export default function Body() {
  const [toast, showToast] = useToast();
  return (
    <div>
      <WeightCard showToast={showToast} />
      <PhotoSection showToast={showToast} />
      {toast}
    </div>
  );
}

/* ---------------- Cân nặng ---------------- */
function WeightCard({ showToast }) {
  const { startWeight, goalWeight } = useSettings();
  const all = useLiveQuery(() => db.bodyMetrics.orderBy('date').toArray(), []) || [];
  const today = useToday();
  const todayEntry = all.find((e) => e.date === today);
  const [input, setInput] = useState(null);
  const [range, setRange] = useState('30');
  const [del, setDel] = useState(null);

  const withMA = useMemo(() => movingAverage7(all), [all]);
  const latest = withMA[withMA.length - 1];
  const trend = latest?.ma7 ?? null;
  const lost = trend !== null ? startWeight - trend : 0;
  const toGo = trend !== null ? trend - goalWeight : startWeight - goalWeight;
  const progress = Math.max(0, Math.min(100, (lost / Math.max(startWeight - goalWeight, 0.1)) * 100));

  // Tốc độ giảm 14 ngày gần nhất (theo đường trung bình trượt)
  const rate = useMemo(() => {
    if (withMA.length < 2) return null;
    const last = withMA[withMA.length - 1];
    const from = addDays(last.date, -14);
    const base = withMA.find((e) => e.date >= from);
    if (!base || base.date === last.date) return null;
    const days = (new Date(last.date) - new Date(base.date)) / 86400000;
    return ((last.ma7 - base.ma7) / days) * 7; // kg/tuần
  }, [withMA]);

  const chartData = useMemo(() => {
    if (range === 'all') return withMA;
    const from = addDays(today, -Number(range));
    return withMA.filter((e) => e.date >= from);
  }, [withMA, range, today]);

  const save = async () => {
    if (!input || input < 30 || input > 250) return showToast('Cân nặng không hợp lệ');
    const w = Math.round(input * 10) / 10;
    if (todayEntry) await db.bodyMetrics.update(todayEntry.id, { weightKg: w });
    else await db.bodyMetrics.add({ date: today, weightKg: w, note: '' });
    setInput(null);
    showToast(`Đã lưu ${fmtNum(w)} kg`);
  };

  const values = chartData.map((d) => d.weightKg);
  const yMin = Math.floor(Math.min(goalWeight, ...values) - 1);
  const yMax = Math.ceil(Math.max(startWeight, ...values) + 0.5);

  return (
    <>
      {/* Tiến độ tới cân mục tiêu */}
      <Card>
        <div className="flex items-center gap-5">
          <Rings size={128} stroke={14} rings={[{ value: progress / 100, color: 'var(--go)' }]}>
            <div>
              <div className="text-[28px] font-bold font-rounded tnum leading-none">{Math.round(progress)}%</div>
              <div className="text-[11px] text-muted mt-1">tới mục tiêu</div>
            </div>
          </Rings>
          <div className="flex-1 space-y-2.5">
            <Stat label="Xu hướng 7 ngày" value={trend !== null ? fmtNum(trend) : '–'} />
            <Stat label="Đã giảm" value={trend !== null ? fmtNum(lost) : '–'} color="var(--go)" />
            <Stat label={`Còn lại tới ${fmtNum(goalWeight)}`} value={fmtNum(Math.max(0, toGo))} />
          </div>
        </div>
        {rate !== null && (
          <p className="text-[13px] text-muted mt-3 font-rounded tnum">
            2 tuần gần nhất: <b style={{ color: rate <= 0 ? 'var(--go)' : 'var(--warn)' }}>{rate > 0 ? '+' : ''}{fmtNum(rate)} kg/tuần</b>
            {rate < -0.1 && toGo > 0 && ` · dự kiến tới đích sau ~${Math.ceil(toGo / -rate)} tuần`}
          </p>
        )}
      </Card>

      <GroupLabel>Cân sáng nay · bụng rỗng</GroupLabel>
      <Card>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <NumField
              value={input}
              onCommit={setInput}
              placeholder={todayEntry ? fmtNum(todayEntry.weightKg) : latest ? fmtNum(latest.weightKg) : '80.4'}
              className="!text-[28px] !h-14 pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-[15px]">kg</span>
          </div>
          <Button variant="primary" className="!h-14 px-6" onClick={save} disabled={!input}>
            {todayEntry ? 'Sửa' : 'Lưu'}
          </Button>
        </div>
        {todayEntry && <p className="text-[13px] text-muted mt-2">Hôm nay đã ghi {fmtNum(todayEntry.weightKg)} kg. Nhập lại để sửa.</p>}
      </Card>

      <GroupLabel>Xu hướng</GroupLabel>
      <Card>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '30', label: '30 ngày' },
            { value: '90', label: '90 ngày' },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
        {chartData.length === 0 ? (
          <p className="text-[15px] text-muted mt-6 mb-4 text-center">Chưa có số đo trong khoảng này.</p>
        ) : (
          <div className="h-60 mt-3 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={[yMin, yMax]} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={34} allowDecimals={false} orientation="right" />
                <Tooltip
                  contentStyle={{ background: 'var(--elevated)', border: 'none', borderRadius: 12, color: 'var(--ink)', boxShadow: '0 8px 30px rgba(0,0,0,.25)' }}
                  labelFormatter={(d) => fmtDate(d)}
                  formatter={(v, n) => [`${fmtNum(v)} kg`, n === 'ma7' ? 'TB 7 ngày' : 'Thực tế']}
                />
                <ReferenceLine y={startWeight} stroke="var(--faint)" strokeDasharray="3 4" label={{ value: `Bắt đầu ${fmtNum(startWeight)}`, fill: 'var(--muted)', fontSize: 11, position: 'insideTopLeft' }} />
                <ReferenceLine y={goalWeight} stroke="var(--go)" strokeDasharray="5 4" label={{ value: `Đích ${fmtNum(goalWeight)}`, fill: 'var(--go)', fontSize: 11, position: 'insideBottomLeft' }} />
                <Line type="monotone" dataKey="weightKg" name="weightKg" stroke="var(--faint)" strokeWidth={0} dot={{ r: 2.5, fill: 'var(--faint)', strokeWidth: 0 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="ma7" name="ma7" stroke="var(--go)" strokeWidth={3} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex gap-4 text-[13px] text-muted mt-1">
          <span className="flex items-center gap-1.5">
            <i className="inline-block w-4 h-[3px] rounded" style={{ background: 'var(--go)' }} /> Trung bình 7 ngày
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block w-2 h-2 rounded-full bg-faint" /> Cân thực tế
          </span>
        </div>
      </Card>

      {all.length > 0 && (
        <>
          <GroupLabel>Số đo gần đây</GroupLabel>
          <Card className="!py-0">
            {[...withMA]
              .reverse()
              .slice(0, 14)
              .map((e, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? e.weightKg - prev.weightKg : null;
                return (
                  <div key={e.id} className="flex items-center gap-3 min-h-[48px] hairline-b last:shadow-none">
                    <span className="w-20 text-[15px] text-muted">{fmtDate(e.date)}</span>
                    <span className="flex-1 text-[17px] font-semibold font-rounded tnum">{fmtNum(e.weightKg)} kg</span>
                    {diff !== null && (
                      <span className="text-[13px] font-rounded tnum" style={{ color: diff <= 0 ? 'var(--go)' : 'var(--warn)' }}>
                        {diff > 0 ? '+' : ''}
                        {fmtNum(diff)}
                      </span>
                    )}
                    <button className="press h-10 w-10 grid place-items-center text-faint" onClick={() => setDel(e)} aria-label="Xoá">
                      <IconTrash size={18} />
                    </button>
                  </div>
                );
              })}
          </Card>
        </>
      )}
      <Sheet open={!!del} onClose={() => setDel(null)} title="Xoá số đo?">
        {del && (
          <Button
            variant="danger"
            className="w-full"
            onClick={async () => {
              await db.bodyMetrics.delete(del.id);
              setDel(null);
            }}
          >
            Xoá {fmtNum(del.weightKg)} kg ngày {fmtDate(del.date)}
          </Button>
        )}
      </Sheet>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-[13px] text-muted">{label}</div>
      <div className="font-rounded tnum leading-tight" style={{ color }}>
        <span className="text-[22px] font-bold tracking-[-0.02em]">{value}</span>
        <span className="text-[13px] text-muted"> kg</span>
      </div>
    </div>
  );
}

/* ---------------- Ảnh check-in ---------------- */
function PhotoSection({ showToast }) {
  const photos = useLiveQuery(() => db.checkinPhotos.orderBy('date').reverse().toArray(), []) || [];
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [compare, setCompare] = useState(false);
  const today = useToday();
  const hasToday = photos.some((p) => p.date === today);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { imageBlob, thumbBlob, mime } = await compressPhoto(file);
      const existing = await db.checkinPhotos.where('date').equals(today).first();
      if (existing) await db.checkinPhotos.update(existing.id, { imageBlob, thumbBlob, mime });
      else await db.checkinPhotos.add({ date: today, imageBlob, thumbBlob, mime });
      showToast(`Đã lưu ảnh · ${Math.round(imageBlob.size / 1024)} KB`);
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý ảnh');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GroupLabel
        right={
          photos.length >= 2 && (
            <button className="text-[15px] text-accent font-medium" onClick={() => setCompare(true)}>
              So sánh
            </button>
          )
        }
      >
        Ảnh check-in buổi sáng
      </GroupLabel>
      <Card>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Button variant={hasToday ? 'ghost' : 'primary'} className="w-full flex items-center justify-center gap-2" onClick={() => fileRef.current.click()} disabled={busy}>
          <IconCamera size={22} />
          {busy ? 'Đang nén ảnh…' : hasToday ? 'Chụp lại ảnh hôm nay' : 'Chụp / chọn ảnh hôm nay'}
        </Button>
        <p className="text-[13px] text-muted mt-2">Mỗi ngày 1 ảnh, nén ngay trên máy. Ảnh không rời khỏi điện thoại.</p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {photos.map((p) => (
              <Thumb key={p.id} photo={p} onClick={() => setView(p)} />
            ))}
          </div>
        )}
      </Card>

      <Sheet open={!!view} onClose={() => setView(null)} title={view ? fmtDate(view.date, false) : ''}>
        {view && <FullPhoto blob={view.imageBlob} />}
        <Button
          variant="destructive"
          className="w-full mt-3"
          onClick={async () => {
            await db.checkinPhotos.delete(view.id);
            setView(null);
          }}
        >
          Xoá ảnh này
        </Button>
      </Sheet>

      <Sheet open={compare} onClose={() => setCompare(false)} title="Trước & sau">
        {compare && <Compare photos={photos} />}
      </Sheet>
    </>
  );
}

function Thumb({ photo, onClick }) {
  const url = useObjectURL(photo.thumbBlob || photo.imageBlob);
  return (
    <button onClick={onClick} className="press relative aspect-[3/4] rounded-[12px] overflow-hidden bg-surface-2">
      {url && <img src={url} alt={photo.date} className="absolute inset-0 w-full h-full object-cover" />}
      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 text-white text-[11px] font-semibold px-2 py-0.5 font-rounded tnum">{fmtShort(photo.date)}</span>
    </button>
  );
}

function FullPhoto({ blob, className = '' }) {
  const url = useObjectURL(blob);
  return url ? <img src={url} alt="" className={`w-full rounded-[14px] object-contain bg-black ${className}`} /> : <div className="aspect-[3/4] bg-surface-2 rounded-[14px]" />;
}

function Compare({ photos }) {
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  const [a, setA] = useState(sorted[0]?.id);
  const [b, setB] = useState(sorted[sorted.length - 1]?.id);
  const pa = sorted.find((p) => p.id === +a);
  const pb = sorted.find((p) => p.id === +b);
  const days = pa && pb ? Math.round((new Date(pb.date) - new Date(pa.date)) / 86400000) : 0;
  const select = (value, onChange, label) => (
    <label className="block">
      <span className="block text-[13px] text-muted mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 rounded-[12px] bg-surface px-3 font-semibold">
        {sorted.map((p) => (
          <option key={p.id} value={p.id}>
            {fmtDate(p.date, false)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {select(a, setA, 'Trước')}
        {select(b, setB, 'Sau')}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {pa && <FullPhoto blob={pa.imageBlob} className="aspect-[3/4] object-cover" />}
        {pb && <FullPhoto blob={pb.imageBlob} className="aspect-[3/4] object-cover" />}
      </div>
      <p className="text-center text-[15px] text-muted mt-2 font-rounded tnum">Cách nhau {Math.abs(days)} ngày</p>
    </div>
  );
}
