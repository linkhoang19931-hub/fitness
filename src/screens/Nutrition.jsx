import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, kcalOf } from '../lib/db';
import { useSettings } from '../lib/store';
import { useTargets } from '../lib/targets';
import { addDays, fmtDate, fmtNum } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card, GroupLabel, MacroBar, NumField, Rings, Segmented, Sheet, TextField, useToast } from '../components/ui';
import { FOOD_GROUPS, FOODS, SRC_LABEL, normalize, searchFoods } from '../lib/foods';
import { MEAL_PLANS, itemEntry, kcalOfTotals, planTotals, scalePlan, totals } from '../lib/mealplans';
import { activeWorkout } from '../lib/workout';
import { IconBook, IconChevron, IconFlame, IconPlus, IconSearch, IconTrash } from '../components/Icons';

const COLORS = { protein: 'var(--protein)', fat: 'var(--fat)', carbs: 'var(--carbs)' };

export default function Nutrition() {
  const t = useTargets();
  // Mặc định luôn là "hôm nay" (tự chuyển khi qua nửa đêm); chọn ngày khác thì giữ ngày đó
  const today = useToday();
  const [picked, setPicked] = useState(null);
  const date = picked ?? today;
  const setDate = (d) => setPicked(d >= today ? null : d);
  const [toast, showToast] = useToast();
  const [guide, setGuide] = useState(false);
  const logs = useLiveQuery(() => db.nutritionLogs.where('date').equals(date).sortBy('createdAt'), [date]) || [];
  const presets = useLiveQuery(() => db.foodPresets.orderBy('name').toArray(), []) || [];

  const sum = logs.reduce(
    (a, l) => ({ p: a.p + (+l.protein || 0), f: a.f + (+l.fat || 0), c: a.c + (+l.carbs || 0), k: a.k + (+l.calories || 0) }),
    { p: 0, f: 0, c: 0, k: 0 }
  );
  const isToday = date === today;

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
    showToast(`Đã thêm ${name}`);
  };

  const addMany = async (entries, label) => {
    const now = Date.now();
    await db.nutritionLogs.bulkAdd(
      entries.map((e, i) => ({
        date,
        mealName: e.name,
        protein: +e.protein || 0,
        fat: +e.fat || 0,
        carbs: +e.carbs || 0,
        calories: kcalOf(e.protein, e.fat, e.carbs),
        createdAt: now + i,
      }))
    );
    showToast(`Đã thêm ${label}`);
  };

  return (
    <div>
      {/* Chọn ngày */}
      <div className="flex items-center gap-2 mb-3">
        <button className="press h-10 w-10 rounded-full bg-surface grid place-items-center text-accent" onClick={() => setDate(addDays(date, -1))} aria-label="Ngày trước">
          <IconChevron dir="left" size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-[17px]">{isToday ? 'Hôm nay' : fmtDate(date)}</div>
        </div>
        <button
          className="press h-10 w-10 rounded-full bg-surface grid place-items-center text-accent disabled:text-faint"
          disabled={isToday}
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Ngày sau"
        >
          <IconChevron size={18} />
        </button>
      </div>

      <Summary sum={sum} t={t} />

      {isToday && <TodayPlan date={date} sum={sum} t={t} onPickMany={addMany} />}

      <GroupLabel>Thêm món</GroupLabel>
      <AddFood presets={presets} onPick={addEntry} onPickMany={addMany} targets={t} />

      <GroupLabel>Nhập tay</GroupLabel>
      <QuickEntry onAdd={addEntry} presets={presets} />

      <GroupLabel>Đã ăn · {logs.length} món</GroupLabel>
      <Card className="!py-1">
        {logs.length === 0 ? (
          <p className="text-[15px] text-muted py-3">Chưa ghi món nào cho ngày này.</p>
        ) : (
          <ul>
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 hairline-b last:shadow-none">
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] truncate">{l.mealName}</div>
                  <MacroLine p={l.protein} f={l.fat} c={l.carbs} />
                </div>
                <span className="text-[15px] font-semibold font-rounded tnum">{l.calories}</span>
                <button className="press h-10 w-10 grid place-items-center text-faint" onClick={() => db.nutritionLogs.delete(l.id)} aria-label="Xoá">
                  <IconTrash size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <button className="press mt-4 w-full flex items-center gap-3 rounded-[18px] bg-surface p-4 text-left" onClick={() => setGuide(true)}>
        <span className="h-9 w-9 rounded-[10px] grid place-items-center text-white" style={{ background: 'var(--accent)' }}>
          <IconBook size={20} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Hướng dẫn dinh dưỡng</span>
          <span className="block text-[13px] text-muted">Protein, fat, tốc độ giảm cân, ăn quanh buổi tập</span>
        </span>
        <IconChevron size={16} className="text-faint" />
      </button>
      <Sheet open={guide} onClose={() => setGuide(false)} title="Dinh dưỡng khi giảm mỡ">
        <NutritionGuide targets={t} />
      </Sheet>
      {toast}
    </div>
  );
}

function MacroLine({ p, f, c }) {
  return (
    <span className="flex gap-2.5 text-[13px] text-muted font-rounded tnum">
      <span>
        <b style={{ color: COLORS.protein }}>P</b> {fmtNum(p)}
      </span>
      <span style={f >= 10 ? { color: 'var(--warn)', fontWeight: 600 } : undefined}>
        <b style={{ color: COLORS.fat }}>F</b> {fmtNum(f)}
      </span>
      <span>
        <b style={{ color: COLORS.carbs }}>C</b> {fmtNum(c)}
      </span>
    </span>
  );
}

/* ---------- Tổng quan: vòng P/F/C + Kcal còn lại ---------- */
function Summary({ sum, t }) {
  const fatOver = sum.f > t.fatCap;
  const left = t.kcal - Math.round(sum.k);
  const fatColor = fatOver ? 'var(--danger)' : COLORS.fat;
  return (
    <Card>
      <div className="flex items-center gap-5">
        <Rings
          size={148}
          stroke={16}
          rings={[
            { value: sum.p / t.proteinMax, color: COLORS.protein },
            { value: fatOver ? 1 : sum.f / t.fatCap, color: fatColor },
            { value: sum.c / Math.max(t.carbs, 1), color: COLORS.carbs },
          ]}
        >
          <div>
            <div className="text-[26px] font-bold font-rounded tnum leading-none tracking-[-0.03em]" style={{ color: left < 0 ? 'var(--warn)' : undefined }}>
              {Math.abs(left).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-muted mt-1">{left >= 0 ? 'kcal còn lại' : 'kcal vượt'}</div>
          </div>
        </Rings>
        <div className="flex-1 min-w-0 space-y-2.5">
          <Legend label="Protein" color={COLORS.protein} value={sum.p} target={`${t.proteinMin}–${t.proteinMax}`} />
          <Legend label={fatOver ? 'Fat · VƯỢT' : 'Fat'} color={fatColor} value={sum.f} target={`≤${t.fatCap}`} alert={fatOver} />
          <Legend label="Carbs" color={COLORS.carbs} value={sum.c} target={t.carbs} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-surface-2 px-3 py-2.5 text-[13px]">
        <IconFlame size={16} className="shrink-0" style={{ color: 'var(--warn)' }} />
        <span className="font-rounded tnum">
          <b>{Math.round(sum.k).toLocaleString('vi-VN')}</b>
          <span className="text-muted"> / {t.kcal.toLocaleString('vi-VN')} kcal</span>
        </span>
        <span className="ml-auto text-muted">
          {sum.p < t.proteinMin ? `Thiếu ${Math.round(t.proteinMin - sum.p)}g protein` : 'Đủ protein'}
        </span>
      </div>
      {fatOver && (
        <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>
          Đã vượt trần Fat {fmtNum(sum.f - t.fatCap)}g. Các bữa còn lại chọn đạm nạc, luộc hoặc hấp.
        </p>
      )}
    </Card>
  );
}

function Legend({ label, color, value, target, alert }) {
  return (
    <div>
      <div className="text-[13px] font-semibold" style={{ color }}>
        {label}
      </div>
      <div className="font-rounded tnum leading-tight" style={{ color: alert ? color : undefined }}>
        <span className="text-[22px] font-bold tracking-[-0.02em]">{Math.round(value)}</span>
        <span className="text-[13px] text-muted"> / {target} g</span>
      </div>
    </div>
  );
}

/* ---------- Gợi ý thực đơn hôm nay, tính theo mục tiêu và lượng đã ăn ---------- */
const TRAIN_PLANS = MEAL_PLANS.filter((p) => p.id !== 'I').map((p) => p.id);
const REST_PLANS = ['I'];
const ls = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function TodayPlan({ date, sum, t, onPickMany }) {
  const trainedToday = useLiveQuery(async () => {
    const done = await db.workouts.where('date').equals(date).filter((w) => !!w.completedAt).count();
    return done > 0 || !!(await activeWorkout());
  }, [date]);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Ngày tập: đã/đang tập hôm nay hoặc còn sớm (trước 9h). Ngày nghỉ: quá 9h mà chưa tập.
  const autoMode = trainedToday || nowMin < 9 * 60 ? 'train' : 'rest';
  const [mode, setMode] = useState(() => ls.get(`plan-mode-${date}`, null));
  const dayMode = mode || autoMode;
  const pool = dayMode === 'rest' ? REST_PLANS : TRAIN_PLANS;
  const seed = Math.floor(new Date(date + 'T00:00:00').getTime() / 86400000);
  const [planId, setPlanId] = useState(() => ls.get(`plan-id-${date}`, null));
  const id = planId && pool.includes(planId) ? planId : pool[seed % pool.length];
  const plan = MEAL_PLANS.find((p) => p.id === id);
  const [added, setAdded] = useState(() => ls.get(`plan-added-${date}`, []));

  const remaining = plan.meals.filter((m) => !added.includes(`${id}:${m.name}`));
  const remKcal = Math.round(t.kcal - sum.k);
  const remP = Math.max(0, t.proteinMid - sum.p);
  const fitted = remaining.length && remKcal > 150 ? scalePlan({ ...plan, meals: remaining }, { kcal: remKcal, proteinMid: remP }) : null;
  const next = fitted ? fitted.meals.find((m) => toMin(m.time) >= nowMin - 60) || fitted.meals[0] : null;
  const later = fitted ? fitted.meals.filter((m) => m !== next) : [];

  const cycle = () => {
    const i = pool.indexOf(id);
    const nid = pool[(i + 1) % pool.length];
    setPlanId(nid);
    ls.set(`plan-id-${date}`, nid);
  };
  const switchMode = (m) => {
    setMode(m);
    ls.set(`plan-mode-${date}`, m);
  };
  const addMeal = async (m) => {
    await onPickMany(m.items.map(itemEntry), `bữa ${m.name.toLowerCase()}`);
    const n = [...added, `${id}:${m.name}`];
    setAdded(n);
    ls.set(`plan-added-${date}`, n);
  };

  return (
    <>
      <GroupLabel
        right={
          <button className="text-[15px] text-accent font-medium" onClick={cycle} disabled={pool.length < 2}>
            {pool.length > 1 ? 'Đổi thực đơn' : ''}
          </button>
        }
      >
        Gợi ý hôm nay
      </GroupLabel>
      <Card>
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-[11px] grid place-items-center text-[17px] font-bold font-rounded text-white" style={{ background: 'var(--accent)' }}>
            {plan.id}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight">{plan.name}</div>
            <div className="text-[13px] text-muted">Theo mục tiêu {t.kcal.toLocaleString('vi-VN')} kcal · P ~{t.proteinMid}g · F ≤{t.fatCap}g</div>
          </div>
        </div>
        <div className="mt-3">
          <Segmented
            value={dayMode}
            onChange={switchMode}
            options={[
              { value: 'train', label: 'Ngày tập' },
              { value: 'rest', label: 'Ngày nghỉ' },
            ]}
          />
        </div>

        {!fitted ? (
          <p className="text-[15px] mt-3" style={{ color: 'var(--go)' }}>
            {remKcal <= 150 ? 'Bạn đã ăn đủ năng lượng cho hôm nay.' : 'Đã thêm hết các bữa của thực đơn này.'}
            {sum.p < t.proteinMin && ` Còn thiếu ${Math.round(t.proteinMin - sum.p)}g protein: thêm 1 muỗng whey hoặc lòng trắng trứng.`}
          </p>
        ) : (
          <>
            <MealBlock meal={next} highlight onAdd={() => addMeal(next)} />
            {later.length > 0 && (
              <div className="mt-2 space-y-2">
                {later.map((m) => (
                  <MealBlock key={m.name} meal={m} onAdd={() => addMeal(m)} />
                ))}
              </div>
            )}
            <p className="text-[13px] text-muted mt-3">
              Khẩu phần các bữa còn lại đã chia theo phần còn thiếu: {remKcal.toLocaleString('vi-VN')} kcal, {Math.round(remP)}g protein
              {sum.f > t.fatCap ? '. Đã vượt trần Fat: chọn món luộc, hấp, bỏ dầu.' : `, còn ${fmtNum(Math.max(0, t.fatCap - sum.f))}g fat.`}
            </p>
          </>
        )}
      </Card>
    </>
  );
}

function MealBlock({ meal, highlight, onAdd }) {
  const mt = totals(meal.items);
  return (
    <div className={`rounded-[14px] p-3 ${highlight ? 'mt-3' : ''}`} style={{ background: highlight ? 'color-mix(in srgb, var(--accent) 12%, var(--surface-2))' : 'var(--surface-2)' }}>
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-semibold font-rounded tnum text-muted w-11">{meal.time}</span>
        <span className="flex-1 font-semibold">
          {highlight && <span className="text-accent">Bữa tiếp theo · </span>}
          {meal.name}
        </span>
        <span className="text-[13px] font-semibold font-rounded tnum">{kcalOfTotals(mt)} kcal</span>
      </div>
      <ul className="mt-1 pl-[3.25rem] text-[15px] space-y-0.5">
        {meal.items.map((it) => (
          <li key={it[0]} className="leading-snug">
            {itemEntry(it).name}
          </li>
        ))}
      </ul>
      <div className="pl-[3.25rem] mt-1">
        <MacroLine p={mt.protein} f={mt.fat} c={mt.carbs} />
      </div>
      <button
        className={`press mt-2 w-full min-h-10 rounded-[10px] text-[15px] font-semibold flex items-center justify-center gap-1.5 ${highlight ? 'bg-accent text-white' : 'bg-surface text-accent'}`}
        onClick={onAdd}
      >
        <IconPlus size={16} /> Đã ăn bữa này
      </button>
    </div>
  );
}

/* ---------- Thêm món ---------- */
function AddFood({ presets, onPick, onPickMany, targets }) {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem('fitness-addfood-tab') || 'library';
    } catch {
      return 'library';
    }
  });
  const choose = (v) => {
    setTab(v);
    try {
      localStorage.setItem('fitness-addfood-tab', v);
    } catch {}
  };
  return (
    <Card>
      <Segmented
        value={tab}
        onChange={choose}
        options={[
          { value: 'library', label: 'Kho món' },
          { value: 'plans', label: 'Thực đơn' },
          { value: 'mine', label: 'Của tôi' },
        ]}
      />
      <div className="mt-3">
        {tab === 'library' && <FoodLibrary onPick={onPick} />}
        {tab === 'plans' && <MealPlans onPickMany={onPickMany} targets={targets} />}
        {tab === 'mine' && <PresetGrid presets={presets} onPick={onPick} />}
      </div>
    </Card>
  );
}

const MULTS = [0.5, 1, 1.5, 2];

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <TextField type="search" className="!pl-9 !h-11" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FoodRow({ f, open, onToggle, onPick }) {
  const [mult, setMult] = useState(1);
  const k = kcalOf(f.protein, f.fat, f.carbs);
  return (
    <li className="hairline-b last:shadow-none">
      <button
        className="w-full text-left py-2.5 min-h-12 flex items-center gap-3"
        onClick={() => {
          setMult(1);
          onToggle();
        }}
      >
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] leading-snug">{f.name}</span>
          <MacroLine p={f.protein} f={f.fat} c={f.carbs} />
        </span>
        <span className="text-right shrink-0">
          <span className="block text-[17px] font-semibold font-rounded tnum">{k}</span>
          <span className="block text-[11px] text-muted -mt-0.5">kcal</span>
        </span>
      </button>
      {open && (
        <div className="pb-3">
          <div className="flex gap-1.5">
            {MULTS.map((m) => (
              <button
                key={m}
                onClick={() => setMult(m)}
                className={`press flex-1 min-h-10 rounded-[10px] text-[15px] font-semibold font-rounded tnum ${mult === m ? 'bg-accent text-white' : 'bg-surface-2 text-muted'}`}
              >
                ×{m}
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            className="w-full mt-2 !min-h-11"
            onClick={() => {
              onPick(itemEntry([f.id, mult]));
              onToggle();
            }}
          >
            Thêm · {kcalOf(f.protein * mult, f.fat * mult, f.carbs * mult)} kcal
          </Button>
          <p className="text-[11px] text-muted mt-1.5">Nguồn: {SRC_LABEL[f.src]}</p>
        </div>
      )}
    </li>
  );
}

function FoodLibrary({ onPick }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(10);
  const pool = group === 'all' ? FOODS : FOODS.filter((f) => f.group === group);
  const list = useMemo(() => searchFoods(query, pool, 400), [query, group]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <SearchBox value={query} onChange={(v) => { setQuery(v); setLimit(v ? 30 : 10); }} placeholder={`Tìm trong ${FOODS.length} món: pho, sushi, burger…`} />
      <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-1 -mx-4 px-4 [scrollbar-width:none]">
        {[{ id: 'all', label: 'Tất cả' }, ...FOOD_GROUPS].map((g) => (
          <button
            key={g.id}
            onClick={() => { setGroup(g.id); setLimit(30); }}
            className={`press shrink-0 h-8 px-3 rounded-full text-[14px] font-medium ${group === g.id ? 'bg-ink text-bg' : 'bg-surface-2 text-ink'}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <ul className="mt-1">
        {list.slice(0, limit).map((f) => (
          <FoodRow key={f.id} f={f} open={open === f.id} onToggle={() => setOpen(open === f.id ? null : f.id)} onPick={onPick} />
        ))}
      </ul>
      {list.length > limit && (
        <Button variant="plain" className="w-full" onClick={() => setLimit(limit + 40)}>
          Xem thêm {list.length - limit} món
        </Button>
      )}
      {list.length === 0 && <p className="text-[15px] text-muted py-4">Không tìm thấy. Nhập tay ở mục bên dưới.</p>}
    </div>
  );
}

function MealPlans({ onPickMany, targets }) {
  const [open, setOpen] = useState(null);
  const plans = useMemo(() => MEAL_PLANS.map((p) => scalePlan(p, targets)), [targets.kcal, targets.proteinMid]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-muted">
        Khẩu phần đã tự điều chỉnh theo mục tiêu của bạn: {targets.kcal.toLocaleString('vi-VN')} kcal, Protein ~{targets.proteinMid}g, Fat ≤{targets.fatCap}g.
      </p>
      {plans.map((p) => {
        const tot = planTotals(p);
        const k = kcalOfTotals(tot);
        const isOpen = open === p.id;
        const over = tot.fat > targets.fatCap;
        return (
          <div key={p.id} className="rounded-[14px] bg-surface-2 overflow-hidden">
            <button className="w-full text-left p-3 min-h-14 flex items-center gap-3" onClick={() => setOpen(isOpen ? null : p.id)}>
              <span className="h-10 w-10 rounded-[11px] grid place-items-center bg-surface text-[17px] font-bold font-rounded text-accent">{p.id}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-start gap-2">
                  <span className="font-semibold leading-tight">{p.name}</span>
                  <span className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-surface text-muted">{p.tag}</span>
                </span>
                <span className="block text-[13px] text-muted font-rounded tnum">
                  {k} kcal · P {Math.round(tot.protein)} · <span style={over ? { color: 'var(--warn)' } : undefined}>F {Math.round(tot.fat)}</span> · C {Math.round(tot.carbs)}
                </span>
              </span>
              <IconChevron dir={isOpen ? 'up' : 'down'} size={16} className="text-faint" />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-[13px] text-muted">{p.note}</p>
                {p.meals.map((m) => {
                  const mt = totals(m.items);
                  return (
                    <div key={m.name} className="rounded-[12px] bg-surface p-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-semibold font-rounded tnum text-muted w-11">{m.time}</span>
                        <span className="flex-1 font-semibold">{m.name}</span>
                        <span className="text-[13px] text-muted font-rounded tnum">{kcalOfTotals(mt)} kcal</span>
                      </div>
                      <ul className="mt-1 pl-[3.25rem] text-[15px] space-y-0.5">
                        {m.items.map((it) => (
                          <li key={it[0]} className="leading-snug">
                            {itemEntry(it).name}
                          </li>
                        ))}
                      </ul>
                      <button
                        className="press mt-2 w-full min-h-10 rounded-[10px] bg-surface-2 text-accent text-[15px] font-semibold flex items-center justify-center gap-1.5"
                        onClick={() => onPickMany(m.items.map(itemEntry), `bữa ${m.name.toLowerCase()}`)}
                      >
                        <IconPlus size={16} /> Thêm bữa này
                      </button>
                    </div>
                  );
                })}
                <Button variant="primary" className="w-full" onClick={() => onPickMany(p.meals.flatMap((m) => m.items).map(itemEntry), `thực đơn ${p.id}`)}>
                  Thêm cả ngày
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PresetGrid({ presets, onPick }) {
  const [edit, setEdit] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-muted">Món bạn đã lưu · chạm để thêm</span>
        <button className="text-[15px] font-semibold text-accent min-h-9 px-1" onClick={() => setEdit(!edit)}>
          {edit ? 'Xong' : 'Sửa'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => (edit ? null : onPick({ name: p.name, protein: p.protein, fat: p.fat, carbs: p.carbs }))}
              className={`press w-full min-h-16 rounded-[12px] bg-surface-2 p-2.5 text-left ${edit ? 'opacity-60' : ''}`}
            >
              <div className="text-[15px] font-medium leading-tight line-clamp-2">{p.name}</div>
              <div className="text-[12px] text-muted font-rounded tnum mt-1">{kcalOf(p.protein, p.fat, p.carbs)} kcal</div>
            </button>
            {edit && (
              <button
                onClick={() => db.foodPresets.delete(p.id)}
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full text-white grid place-items-center shadow"
                style={{ background: 'var(--danger)' }}
                aria-label="Xoá món"
              >
                <IconTrash size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
      {presets.length === 0 && <p className="text-[15px] text-muted">Chưa có món. Tick “Lưu vào Của tôi” khi nhập tay.</p>}
    </div>
  );
}

/* ---------- Nhập tay, có gợi ý khi gõ tên ---------- */
function QuickEntry({ onAdd, presets }) {
  const empty = { name: '', protein: null, fat: null, carbs: null };
  const [f, setF] = useState(empty);
  const [savePreset, setSavePreset] = useState(false);
  const [key, setKey] = useState(0);
  const [focus, setFocus] = useState(false);
  const kcal = kcalOf(f.protein, f.fat, f.carbs);
  const valid = f.name.trim() && (f.protein || f.fat || f.carbs);

  const suggestions = useMemo(() => {
    const qn = normalize(f.name.trim());
    if (qn.length < 2) return [];
    const mine = presets
      .filter((p) => normalize(p.name).includes(qn))
      .map((p) => ({ id: `p${p.id}`, name: p.name, protein: p.protein, fat: p.fat, carbs: p.carbs, mine: true }));
    return [...mine, ...searchFoods(f.name, FOODS, 8)].slice(0, 7);
  }, [f.name, presets]);

  const pickSuggestion = (s) => {
    setF({ name: s.name, protein: s.protein, fat: s.fat, carbs: s.carbs });
    setKey((k) => k + 1);
    setFocus(false);
  };

  const submit = async () => {
    if (!valid) return;
    const entry = { name: f.name.trim(), protein: f.protein || 0, fat: f.fat || 0, carbs: f.carbs || 0 };
    await onAdd(entry);
    if (savePreset) await db.foodPresets.add(entry);
    setF(empty);
    setSavePreset(false);
    setKey((k) => k + 1);
  };

  return (
    <Card>
      <div className="relative">
        <TextField
          placeholder="Tên món — gõ để xem gợi ý"
          value={f.name}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          autoComplete="off"
        />
        {focus && suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1.5 rounded-[14px] bg-elevated shadow-[0_12px_40px_rgba(0,0,0,0.3)] border border-line/60 overflow-hidden">
            {suggestions.map((s) => (
              <li key={s.id} className="hairline-b last:shadow-none">
                <button className="w-full text-left px-3.5 py-2.5 flex items-center gap-3" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(s)}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] leading-snug truncate">
                      {s.mine && <span className="text-accent font-semibold">★ </span>}
                      {s.name}
                    </span>
                    <MacroLine p={s.protein} f={s.fat} c={s.carbs} />
                  </span>
                  <span className="text-[15px] font-semibold font-rounded tnum shrink-0">{kcalOf(s.protein, s.fat, s.carbs)} kcal</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2.5" key={key}>
        {[
          ['protein', 'Protein'],
          ['fat', 'Fat'],
          ['carbs', 'Carbs'],
        ].map(([k, label]) => (
          <label key={k} className="block">
            <span className="block text-[12px] font-semibold mb-1 text-center" style={{ color: COLORS[k] }}>
              {label} (g)
            </span>
            <NumField value={f[k]} placeholder="0" onCommit={(v) => setF((s) => ({ ...s, [k]: v }))} />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 mt-3 min-h-11">
        <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={savePreset} onChange={(e) => setSavePreset(e.target.checked)} />
        <span className="text-[15px]">Lưu vào “Của tôi”</span>
      </label>
      <Button variant="primary" className="w-full mt-1" disabled={!valid} onClick={submit}>
        Thêm món · {kcal} kcal
      </Button>
    </Card>
  );
}

/* ---------- Hướng dẫn ---------- */
function NutritionGuide({ targets: t }) {
  const s = useSettings();
  const w = t.weight;
  const pLo = Math.round(w * 1.8);
  const pHi = Math.round(w * 2.2);
  const fatMin = Math.round(w * 0.5);
  const fatPct = Math.round(((s.fatCap * 9) / Math.max(t.kcal, 1)) * 100);
  const H = ({ children }) => <h4 className="text-[17px] font-semibold mt-5 mb-1">{children}</h4>;
  return (
    <div className="text-[16px] leading-relaxed rounded-[18px] bg-surface p-4">
      <H>Protein giữ cơ khi ăn thâm hụt</H>
      <p>
        Tổng quan cho người tập thể hình khuyến nghị 1,8–2,7 g/kg/ngày khi giảm mỡ. Với {fmtNum(w)} kg, mức hợp lý là{' '}
        <b>
          {pLo}–{pHi} g
        </b>
        . Mục tiêu hiện tại là {t.proteinMin}–{t.proteinMax} g. Chia đều 4–5 bữa, mỗi bữa 30–40 g.
      </p>
      <H>Fat {s.fatCap} g/ngày</H>
      <p>
        Ở mức {t.kcal.toLocaleString('vi-VN')} kcal, {s.fatCap} g Fat bằng khoảng <b>{fatPct}% năng lượng</b>. Khuyến nghị cho giai đoạn giảm mỡ là 10–25% trong thời gian ngắn
        và không nên ăn rất ít béo kéo dài. Một phân tích gộp ở nam giới thấy chế độ ít béo (~20% năng lượng) làm testosterone giảm khoảng 10–15%. Mức an toàn hơn để duy
        trì lâu dài là khoảng <b>0,5 g/kg ≈ {fatMin} g/ngày</b>. Bạn đổi trần Fat trong Cài đặt.
      </p>
      <H>Tốc độ giảm cân</H>
      <p>
        Giảm 0,5–1% cân nặng mỗi tuần giữ cơ tốt hơn giảm nhanh. Mục tiêu hiện tại thâm hụt {t.deficit} kcal/ngày, tương ứng khoảng {fmtNum(t.weeklyLoss)} kg/tuần
        {t.weeks ? `, đến ${fmtNum(s.goalWeight)} kg sau khoảng ${Math.ceil(t.weeks)} tuần` : ''}. Nếu đường trung bình 7 ngày ở tab Cơ thể đứng yên 2 tuần liền, hạ Kcal
        duy trì trong Cài đặt thêm 100–150.
      </p>
      <H>Ăn quanh buổi tập 6:00 sáng</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Tập bụng đói thấy đuối: 5:30 uống 1 muỗng whey hoặc ăn 1 quả chuối.</li>
        <li>Bữa sau tập (7:00) nên có 30–40 g protein và phần lớn tinh bột trong ngày.</li>
        <li>Bữa cuối ngày 1–2 giờ trước khi ngủ vẫn nên có protein.</li>
      </ul>
      <H>Giữ Fat dưới trần khi ăn món Việt, Nhật, Hàn, Âu</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Một tô phở/bún ngoài hàng đã có 12–18 g Fat. Xin ít nước béo, không hành mỡ.</li>
        <li>Món Nhật: chọn sashimi cá ngừ, soba, onigiri; tránh tempura, katsu, ramen tonkotsu.</li>
        <li>Món Hàn: bulgogi, canh đậu phụ, kimbap ổn; ba chỉ nướng và gà rán rất nhiều mỡ.</li>
        <li>Món Âu: steak thăn, gà nướng, salad sốt riêng; tránh carbonara, burger lớn, khoai chiên.</li>
        <li>1 thìa canh dầu = 14 g Fat. Luộc, hấp, áp chảo chống dính thay cho chiên xào.</li>
      </ul>
      <H>Nguồn</H>
      <ul className="text-[13px] text-muted space-y-1.5 break-words">
        <li>Nutritional Recommendations for Physique Athletes, J Hum Kinet — pmc.ncbi.nlm.nih.gov/articles/PMC7052702</li>
        <li>Aragon et al. (2017), ISSN position stand: diets and body composition — pmc.ncbi.nlm.nih.gov/articles/PMC5470183</li>
        <li>Whittaker & Wu (2021), Low-fat diets and testosterone in men, J Steroid Biochem Mol Biol</li>
        <li>USDA FoodData Central; Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng); NutriHome — bảng calo món ăn Việt Nam</li>
      </ul>
      <p className="text-[13px] text-muted mt-3">Thông tin tham khảo, không thay cho tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng.</p>
    </div>
  );
}

export { MacroBar };
