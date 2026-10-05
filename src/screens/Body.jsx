import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../lib/db';
import { compressPhoto } from '../lib/image';
import { useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, fmtShort, movingAverage7, todayStr } from '../lib/utils';
import { Button, Card, NumField, SectionTitle, Segmented, Sheet, useObjectURL, useToast } from '../components/ui';
import { IconCamera, IconTrash } from '../components/Icons';

export default function Body() {
  const [toast, showToast] = useToast();
  return (
    <div className="space-y-4">
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
  const today = todayStr();
  const todayEntry = all.find((e) => e.date === today);
  const [input, setInput] = useState(null);
  const [range, setRange] = useState('30');

  const withMA = useMemo(() => movingAverage7(all), [all]);
  const latest = withMA[withMA.length - 1];
  const trend = latest?.ma7 ?? null;
  const lost = trend !== null ? startWeight - trend : 0;
  const toGo = trend !== null ? trend - goalWeight : startWeight - goalWeight;
  const progress = Math.max(0, Math.min(100, (lost / (startWeight - goalWeight)) * 100));

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
      <Card>
        <SectionTitle>Cân sáng nay · bụng rỗng</SectionTitle>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <NumField
              value={input}
              onCommit={setInput}
              placeholder={todayEntry ? fmtNum(todayEntry.weightKg) : latest ? fmtNum(latest.weightKg) : '80.4'}
              className="text-2xl h-14 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">kg</span>
          </div>
          <Button variant="primary" className="h-14 px-6" onClick={save} disabled={!input}>
            {todayEntry ? 'Sửa' : 'Lưu'}
          </Button>
        </div>
        {todayEntry && <p className="text-xs text-muted mt-2">Hôm nay đã ghi {fmtNum(todayEntry.weightKg)} kg. Nhập lại để sửa.</p>}

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <Stat label="Xu hướng (TB7)" value={trend !== null ? fmtNum(trend) : '–'} unit="kg" />
          <Stat label="Đã giảm" value={trend !== null ? fmtNum(lost) : '–'} unit="kg" accent={lost > 0} />
          <Stat label="Còn lại" value={fmtNum(Math.max(0, toGo))} unit="kg" />
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted tnum mb-1">
            <span>{fmtNum(startWeight)} kg</span>
            <span>{Math.round(progress)}%</span>
            <span>Đích {fmtNum(goalWeight)} kg</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
          </div>
          {rate !== null && (
            <p className="text-xs text-muted mt-2 tnum">
              Tốc độ 2 tuần gần nhất: <b className={rate <= 0 ? 'text-ink' : 'text-warn'}>{rate > 0 ? '+' : ''}{fmtNum(rate)} kg/tuần</b>
              {rate < -0.1 && toGo > 0 && ` · dự kiến đến đích sau ~${Math.ceil(toGo / -rate)} tuần`}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Biểu đồ xu hướng</SectionTitle>
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
          <p className="text-sm text-faint mt-6 mb-4 text-center">Chưa có số đo trong khoảng này.</p>
        ) : (
          <div className="h-64 mt-3 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--line)" minTickGap={24} />
                <YAxis domain={[yMin, yMax]} tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--line)" width={40} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }}
                  labelFormatter={(d) => fmtDate(d)}
                  formatter={(v, n) => [`${fmtNum(v)} kg`, n === 'ma7' ? 'TB 7 ngày' : 'Thực tế']}
                />
                <ReferenceLine y={startWeight} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: `Bắt đầu ${fmtNum(startWeight)}`, fill: 'var(--muted)', fontSize: 11, position: 'insideTopRight' }} />
                <ReferenceLine y={goalWeight} stroke="var(--accent)" strokeDasharray="6 3" label={{ value: `Đích ${fmtNum(goalWeight)}`, fill: 'var(--accent)', fontSize: 11, position: 'insideBottomRight' }} />
                <Line type="monotone" dataKey="weightKg" name="weightKg" stroke="var(--faint)" strokeWidth={1.5} dot={{ r: 2.5, fill: 'var(--faint)' }} isAnimationActive={false} />
                <Line type="monotone" dataKey="ma7" name="ma7" stroke="var(--accent)" strokeWidth={3} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex gap-4 text-xs text-muted mt-1">
          <span className="flex items-center gap-1.5"><i className="inline-block w-4 h-[3px] rounded bg-accent" /> TB trượt 7 ngày</span>
          <span className="flex items-center gap-1.5"><i className="inline-block w-2 h-2 rounded-full bg-faint" /> Cân thực tế</span>
        </div>
      </Card>

      {all.length > 0 && (
        <Card>
          <SectionTitle>Số đo gần đây</SectionTitle>
          <ul className="divide-y divide-line -my-1">
            {[...withMA].reverse().slice(0, 14).map((e, i, arr) => {
              const prev = arr[i + 1];
              const diff = prev ? e.weightKg - prev.weightKg : null;
              return (
                <li key={e.id} className="flex items-center gap-3 py-1.5 min-h-12">
                  <span className="w-20 text-sm text-muted">{fmtDate(e.date)}</span>
                  <span className="flex-1 font-semibold tnum">{fmtNum(e.weightKg)} kg</span>
                  {diff !== null && (
                    <span className={`text-xs tnum ${diff <= 0 ? 'text-accent' : 'text-warn'}`}>
                      {diff > 0 ? '+' : ''}
                      {fmtNum(diff)}
                    </span>
                  )}
                  <span className="text-xs text-faint tnum w-14 text-right">TB {fmtNum(e.ma7)}</span>
                  <button
                    className="h-11 w-11 grid place-items-center text-faint active:text-danger"
                    onClick={() => confirm(`Xoá số đo ngày ${fmtDate(e.date)}?`) && db.bodyMetrics.delete(e.id)}
                    aria-label="Xoá"
                  >
                    <IconTrash width={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

function Stat({ label, value, unit, accent }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`text-xl font-bold tnum ${accent ? 'text-accent' : ''}`}>
        {value}
        <span className="text-xs font-normal text-muted"> {unit}</span>
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
  const today = todayStr();
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
    <Card>
      <SectionTitle
        right={
          photos.length >= 2 && (
            <button className="text-sm font-semibold text-accent min-h-10 px-2" onClick={() => setCompare(true)}>
              So sánh
            </button>
          )
        }
      >
        Ảnh check-in buổi sáng
      </SectionTitle>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <Button variant={hasToday ? 'outline' : 'primary'} className="w-full h-14 flex items-center justify-center gap-2" onClick={() => fileRef.current.click()} disabled={busy}>
        <IconCamera width={22} />
        {busy ? 'Đang nén ảnh…' : hasToday ? 'Chụp lại ảnh hôm nay' : 'Chụp / tải ảnh hôm nay'}
      </Button>
      <p className="text-xs text-faint mt-2">Mỗi ngày 1 ảnh, nén tại máy trước khi lưu. Ảnh không rời khỏi điện thoại.</p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {photos.map((p) => (
            <Thumb key={p.id} photo={p} onClick={() => setView(p)} />
          ))}
        </div>
      )}

      <Sheet open={!!view} onClose={() => setView(null)} title={view ? fmtDate(view.date, false) : ''}>
        {view && <FullPhoto blob={view.imageBlob} />}
        <Button
          variant="outline"
          className="w-full mt-3 text-danger"
          onClick={async () => {
            if (!confirm('Xoá ảnh này?')) return;
            await db.checkinPhotos.delete(view.id);
            setView(null);
          }}
        >
          Xoá ảnh
        </Button>
      </Sheet>

      <Sheet open={compare} onClose={() => setCompare(false)} title="So sánh Before / After">
        {compare && <Compare photos={photos} />}
      </Sheet>
    </Card>
  );
}

function Thumb({ photo, onClick }) {
  const url = useObjectURL(photo.thumbBlob || photo.imageBlob);
  return (
    <button onClick={onClick} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-2">
      {url && <img src={url} alt={photo.date} className="absolute inset-0 w-full h-full object-cover" />}
      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[11px] font-semibold py-1 tnum">{fmtShort(photo.date)}</span>
    </button>
  );
}

function FullPhoto({ blob, className = '' }) {
  const url = useObjectURL(blob);
  return url ? <img src={url} alt="" className={`w-full rounded-xl object-contain bg-black ${className}`} /> : <div className="aspect-[3/4] bg-surface-2 rounded-xl" />;
}

function Compare({ photos }) {
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  const [a, setA] = useState(sorted[0]?.id);
  const [b, setB] = useState(sorted[sorted.length - 1]?.id);
  const pa = sorted.find((p) => p.id === +a);
  const pb = sorted.find((p) => p.id === +b);
  const days = pa && pb ? Math.round((new Date(pb.date) - new Date(pa.date)) / 86400000) : 0;
  const select = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-12 rounded-xl bg-surface-2 px-2 font-semibold">
      {sorted.map((p) => (
        <option key={p.id} value={p.id}>
          {fmtDate(p.date, false)}
        </option>
      ))}
    </select>
  );
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs font-semibold text-muted mb-1">TRƯỚC</div>
          {select(a, setA)}
        </div>
        <div>
          <div className="text-xs font-semibold text-muted mb-1">SAU</div>
          {select(b, setB)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {pa && <FullPhoto blob={pa.imageBlob} className="aspect-[3/4] object-cover" />}
        {pb && <FullPhoto blob={pb.imageBlob} className="aspect-[3/4] object-cover" />}
      </div>
      <p className="text-center text-sm text-muted mt-2 tnum">Cách nhau {Math.abs(days)} ngày</p>
    </div>
  );
}
