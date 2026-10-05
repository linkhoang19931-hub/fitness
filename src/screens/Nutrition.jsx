import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, kcalOf } from '../lib/db';
import { macroTargets, useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, parseNum, todayStr } from '../lib/utils';
import { Button, Card, MacroBar, NumField, SectionTitle, TextField, useToast } from '../components/ui';
import { IconChevron, IconTrash } from '../components/Icons';

export default function Nutrition() {
  const settings = useSettings();
  const t = macroTargets(settings);
  const [date, setDate] = useState(todayStr());
  const [toast, showToast] = useToast();
  const logs = useLiveQuery(() => db.nutritionLogs.where('date').equals(date).sortBy('createdAt'), [date]) || [];
  const presets = useLiveQuery(() => db.foodPresets.orderBy('name').toArray(), []) || [];

  const sum = logs.reduce(
    (a, l) => ({ p: a.p + (+l.protein || 0), f: a.f + (+l.fat || 0), c: a.c + (+l.carbs || 0), k: a.k + (+l.calories || 0) }),
    { p: 0, f: 0, c: 0, k: 0 }
  );
  const fatOver = sum.f > t.fatCap;
  const fatLeft = Math.round((t.fatCap - sum.f) * 10) / 10;
  const kcalLeft = t.kcal - Math.round(sum.k);
  const isToday = date === todayStr();

  const addEntry = async ({ name, protein, fat, carbs }) => {
    await db.nutritionLogs.add({
      date,
      mealName: name,
      protein: +protein || 0,
      fat: +fat || 0,
      carbs: +carbs || 0,
      calories: kcalOf(protein, fat, carbs),
      createdAt: Date.now(),
    });
    showToast(`Đã thêm: ${name}`);
  };

  return (
    <div className="space-y-4">
      {/* Chọn ngày */}
      <div className="flex items-center gap-2">
        <button className="h-12 w-12 rounded-xl bg-surface-2 grid place-items-center" onClick={() => setDate(addDays(date, -1))} aria-label="Ngày trước">
          <IconChevron dir="left" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-bold">{isToday ? 'Hôm nay' : fmtDate(date)}</div>
          <div className="text-xs text-muted">{fmtDate(date, false)}</div>
        </div>
        <button
          className="h-12 w-12 rounded-xl bg-surface-2 grid place-items-center disabled:opacity-30"
          disabled={isToday}
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Ngày sau"
        >
          <IconChevron />
        </button>
      </div>

      {/* Tổng quan PFC */}
      <Card className={fatOver ? 'border-danger' : ''}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Năng lượng</div>
            <div className="tnum">
              <span className="text-4xl font-black">{Math.round(sum.k).toLocaleString('vi-VN')}</span>
              <span className="text-muted"> / {t.kcal.toLocaleString('vi-VN')} kcal</span>
            </div>
          </div>
          <div className={`text-right text-sm tnum ${kcalLeft < 0 ? 'text-warn font-semibold' : 'text-muted'}`}>
            {kcalLeft >= 0 ? `Còn ${kcalLeft.toLocaleString('vi-VN')}` : `Vượt ${(-kcalLeft).toLocaleString('vi-VN')}`}
            <div className="text-xs text-faint">thâm hụt −{settings.deficitKcal}</div>
          </div>
        </div>
        <div className="space-y-4">
          <MacroBar
            label="Protein"
            value={sum.p}
            min={t.proteinMin}
            target={t.proteinMax}
            hint={sum.p < t.proteinMin ? `Cần thêm ${fmtNum(t.proteinMin - sum.p)}g để đạt mức tối thiểu` : 'Đã đạt mức Protein tối thiểu'}
          />
          <MacroBar
            label="Fat (trần cứng)"
            value={sum.f}
            target={t.fatCap}
            over={fatOver}
            hint={fatOver ? `VƯỢT TRẦN FAT ${fmtNum(-fatLeft)}g` : `Còn ${fmtNum(fatLeft)}g Fat được phép`}
          />
          <MacroBar label="Carbs" value={sum.c} target={t.carbs} over={false} hint={`Mục tiêu tự tính từ Kcal còn lại sau P & F`} />
        </div>
      </Card>

      {/* Presets 1 chạm */}
      <PresetGrid presets={presets} onPick={addEntry} />

      {/* Nhập nhanh */}
      <QuickEntry onAdd={addEntry} />

      {/* Danh sách */}
      <Card>
        <SectionTitle>Đã ăn ({logs.length})</SectionTitle>
        {logs.length === 0 ? (
          <p className="text-sm text-faint">Chưa ghi món nào cho ngày này.</p>
        ) : (
          <ul className="divide-y divide-line -my-1">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.mealName}</div>
                  <div className="text-xs text-muted tnum">
                    P {fmtNum(l.protein)} · <span className={l.fat >= 10 ? 'text-warn font-semibold' : ''}>F {fmtNum(l.fat)}</span> · C{' '}
                    {fmtNum(l.carbs)} · {l.calories} kcal
                  </div>
                </div>
                <button className="h-12 w-12 grid place-items-center text-faint active:text-danger" onClick={() => db.nutritionLogs.delete(l.id)} aria-label="Xoá">
                  <IconTrash width={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {toast}
    </div>
  );
}

function PresetGrid({ presets, onPick }) {
  const [edit, setEdit] = useState(false);
  return (
    <Card>
      <SectionTitle
        right={
          <button className="text-sm font-semibold text-accent min-h-10 px-2" onClick={() => setEdit(!edit)}>
            {edit ? 'Xong' : 'Sửa'}
          </button>
        }
      >
        Món mẫu · chạm để thêm
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => (edit ? null : onPick({ name: p.name, protein: p.protein, fat: p.fat, carbs: p.carbs }))}
              className={`w-full min-h-16 rounded-xl bg-surface-2 p-2.5 text-left active:bg-line ${edit ? 'opacity-60' : ''}`}
            >
              <div className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</div>
              <div className="text-[11px] text-muted tnum mt-1">
                P{fmtNum(p.protein)} F{fmtNum(p.fat)} C{fmtNum(p.carbs)} · {kcalOf(p.protein, p.fat, p.carbs)}
              </div>
            </button>
            {edit && (
              <button
                onClick={() => confirm(`Xoá món mẫu "${p.name}"?`) && db.foodPresets.delete(p.id)}
                className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-danger text-white grid place-items-center shadow"
                aria-label="Xoá món mẫu"
              >
                <IconTrash width={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {presets.length === 0 && <p className="text-sm text-faint">Chưa có món mẫu. Tick “Lưu làm món mẫu” khi nhập món bên dưới.</p>}
    </Card>
  );
}

function QuickEntry({ onAdd }) {
  const empty = { name: '', protein: null, fat: null, carbs: null };
  const [f, setF] = useState(empty);
  const [savePreset, setSavePreset] = useState(false);
  const [key, setKey] = useState(0);
  const kcal = kcalOf(f.protein, f.fat, f.carbs);
  const valid = f.name.trim() && (f.protein || f.fat || f.carbs);

  const submit = async () => {
    if (!valid) return;
    const entry = { name: f.name.trim(), protein: f.protein || 0, fat: f.fat || 0, carbs: f.carbs || 0 };
    await onAdd(entry);
    if (savePreset) await db.foodPresets.add(entry);
    setF(empty);
    setSavePreset(false);
    setKey((k) => k + 1); // làm mới các ô số
  };

  return (
    <Card>
      <SectionTitle>Nhập nhanh</SectionTitle>
      <TextField placeholder="Tên món" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-3 gap-2 mt-2" key={key}>
        {[
          ['protein', 'P (g)'],
          ['fat', 'F (g)'],
          ['carbs', 'C (g)'],
        ].map(([k, label]) => (
          <label key={k} className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1 text-center">{label}</span>
            <NumField value={f[k]} placeholder="0" onCommit={(v) => setF((s) => ({ ...s, [k]: v }))} />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 mt-3 min-h-11">
        <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={savePreset} onChange={(e) => setSavePreset(e.target.checked)} />
        <span className="text-sm">Lưu làm món mẫu</span>
      </label>
      <Button variant="primary" className="w-full mt-2" disabled={!valid} onClick={submit}>
        Thêm món · {kcal} kcal
      </Button>
    </Card>
  );
}

export { parseNum };
