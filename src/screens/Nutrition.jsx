import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, kcalOf } from '../lib/db';
import { useSettings } from '../lib/store';
import { useTargets } from '../lib/targets';
import { addDays, fmtDate, fmtNum } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card, GroupLabel, MacroBar, NumField, Rings, Segmented, Sheet, Switch, TextField, useToast } from '../components/ui';
import { FOOD_BY_ID, FOOD_GROUPS, FOODS, SRC_LABEL, normalize, searchFoods } from '../lib/foods';
import { MEAL_PLANS, planTotals, scalePlan } from '../lib/mealplans';
import {
  addItem,
  addMeal,
  alternatives,
  createDayPlan,
  fmtN,
  itemCustom,
  itemFromFood,
  itemKcal,
  itemLabel,
  itemMacros,
  mealTotals,
  refitDayPlan,
  removeItem,
  removeMeal,
  replaceItem,
  setMealEaten,
  switchDayPlan,
  toMin,
  totalsKcal,
  updateItem,
} from '../lib/dayplan';
import { activeWorkout } from '../lib/workout';
import { IconBook, IconCheck, IconChevron, IconFlame, IconPlus, IconSearch, IconTrash } from '../components/Icons';

const COLORS = { protein: 'var(--protein)', fat: 'var(--fat)', carbs: 'var(--carbs)' };
const STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export default function Nutrition() {
  const t = useTargets();
  const today = useToday();
  const [picked, setPicked] = useState(null);
  const date = picked ?? today;
  const setDate = (d) => setPicked(d >= today ? null : d);
  const isToday = date === today;
  const [toast, showToast] = useToast();
  const [guide, setGuide] = useState(false);

  const logs = useLiveQuery(() => db.nutritionLogs.where('date').equals(date).sortBy('createdAt'), [date]) || [];
  const dp = useLiveQuery(() => db.dayPlans.get(date).then((x) => x ?? null), [date]);

  // Hôm nay chưa có thực đơn → tự tạo (ngày tập nếu đã/đang tập hoặc còn trước 9h)
  const creating = useRef(null);
  useEffect(() => {
    if (!isToday || dp !== null || creating.current === date) return;
    creating.current = date;
    (async () => {
      const trained = (await db.workouts.where('date').equals(date).filter((w) => !!w.completedAt).count()) > 0 || !!(await activeWorkout());
      const mode = trained || new Date().getHours() < 9 ? 'train' : 'rest';
      await createDayPlan(date, mode, t);
    })();
  }, [isToday, dp, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const sum = logs.reduce(
    (a, l) => ({ p: a.p + (+l.protein || 0), f: a.f + (+l.fat || 0), c: a.c + (+l.carbs || 0), k: a.k + (+l.calories || 0) }),
    { p: 0, f: 0, c: 0, k: 0 }
  );
  const extras = logs.filter((l) => !l.planKey);

  // Sheet đang mở
  const [itemSheet, setItemSheet] = useState(null); // { mealKey, uid }
  const [addTo, setAddTo] = useState(null); // mealKey | 'extra'
  const [logSheet, setLogSheet] = useState(null); // log id
  const [planSheet, setPlanSheet] = useState(false);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextKey = isToday && dp ? (dp.meals.find((m) => !m.eaten && toMin(m.time) >= nowMin - 90) || dp.meals.find((m) => !m.eaten))?.key : null;
  const planned = dp ? dp.meals.reduce((a, m) => a + totalsKcal(mealTotals(m)), 0) : 0;

  const addFood = async (entry) => {
    if (addTo === 'extra' || !dp) {
      const m = itemMacros(entry);
      await db.nutritionLogs.add({ date, mealName: itemLabel(entry), ...m, calories: itemKcal(entry), createdAt: Date.now() });
    } else {
      await addItem(dp, addTo, entry);
    }
    showToast(`Đã thêm ${entry.name}`);
  };

  const sheetMeal = itemSheet && dp?.meals.find((m) => m.key === itemSheet.mealKey);
  const sheetItem = sheetMeal?.items.find((it) => it.uid === itemSheet.uid);

  return (
    <div>
      {/* Chọn ngày */}
      <div className="flex items-center gap-2 mb-3">
        <button className="press h-10 w-10 rounded-full bg-surface grid place-items-center text-accent" onClick={() => setDate(addDays(date, -1))} aria-label="Ngày trước">
          <IconChevron dir="left" size={18} />
        </button>
        <div className="flex-1 text-center font-semibold text-[17px]">{isToday ? 'Hôm nay' : fmtDate(date)}</div>
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

      {dp ? (
        <>
          <GroupLabel
            right={
              <button className="text-[15px] text-accent font-medium" onClick={() => setPlanSheet(true)}>
                Đổi thực đơn
              </button>
            }
          >
            Thực đơn · {planned.toLocaleString('vi-VN')} kcal
          </GroupLabel>
          <div className="space-y-2.5">
            {dp.meals.map((m) => (
              <MealCard
                key={m.key}
                meal={m}
                next={m.key === nextKey}
                onToggle={async () => {
                  await setMealEaten(dp, m.key, !m.eaten);
                  showToast(m.eaten ? `Bỏ đánh dấu ${m.name.toLowerCase()}` : `Đã ghi ${m.name.toLowerCase()} vào nhật ký`);
                }}
                onItem={(it) => setItemSheet({ mealKey: m.key, uid: it.uid })}
                onAdd={() => setAddTo(m.key)}
                onRemoveMeal={() => removeMeal(dp, m.key)}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-2.5">
            <Button
              variant="ghost"
              className="flex-1 !min-h-11 text-[15px]"
              onClick={() => {
                const d = new Date();
                addMeal(dp, 'Bữa thêm', `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
              }}
            >
              + Thêm bữa
            </Button>
            <Button
              variant="ghost"
              className="flex-1 !min-h-11 text-[15px]"
              onClick={async () => {
                await refitDayPlan(dp, t);
                showToast('Đã chia lại khẩu phần các bữa chưa ăn');
              }}
            >
              Chia lại khẩu phần
            </Button>
          </div>
          <p className="px-4 pt-2 text-[13px] text-muted">
            Chạm vào món để đổi khẩu phần, đổi món khác hoặc xoá. Chạm vòng tròn để đánh dấu bữa đã ăn. “Chia lại khẩu phần” tính lại các bữa chưa ăn theo phần mục tiêu còn
            thiếu.
          </p>
        </>
      ) : (
        !isToday && <p className="px-4 pt-4 text-[13px] text-muted">Ngày này không có thực đơn.</p>
      )}

      <GroupLabel
        right={
          <button className="text-[15px] text-accent font-medium" onClick={() => setAddTo('extra')}>
            + Thêm món
          </button>
        }
      >
        Ăn ngoài thực đơn
      </GroupLabel>
      <Card className="!py-1">
        {extras.length === 0 ? (
          <button className="w-full text-left text-[15px] text-muted py-3" onClick={() => setAddTo('extra')}>
            Ăn gì ngoài thực đơn thì ghi ở đây.
          </button>
        ) : (
          extras.map((l) => (
            <button key={l.id} className="w-full flex items-center gap-3 py-2.5 hairline-b last:shadow-none text-left" onClick={() => setLogSheet(l.id)}>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] truncate">{l.mealName}</div>
                <MacroLine p={l.protein} f={l.fat} c={l.carbs} />
              </div>
              <span className="text-[15px] font-semibold font-rounded tnum">{l.calories}</span>
              <IconChevron size={14} className="text-faint" />
            </button>
          ))
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

      <ItemSheet
        open={!!sheetItem}
        item={sheetItem}
        meal={sheetMeal}
        onClose={() => setItemSheet(null)}
        onPortion={(n) => updateItem(dp, sheetMeal.key, sheetItem.uid, { n })}
        onReplace={(it) => {
          replaceItem(dp, sheetMeal.key, sheetItem.uid, it);
          showToast(`Đã đổi sang ${it.name}`);
        }}
        onRemove={() => {
          removeItem(dp, sheetMeal.key, sheetItem.uid);
          setItemSheet(null);
        }}
      />
      <AddFoodSheet
        open={!!addTo}
        onClose={() => setAddTo(null)}
        title={addTo === 'extra' || !dp ? 'Ghi món ăn' : `Thêm vào ${dp.meals.find((m) => m.key === addTo)?.name.toLowerCase() || 'bữa'}`}
        onAdd={async (entry) => {
          await addFood(entry);
          setAddTo(null);
        }}
      />
      <LogSheet id={logSheet} onClose={() => setLogSheet(null)} />
      <PlanSheet open={planSheet} onClose={() => setPlanSheet(false)} dp={dp} targets={t} onPick={async (id) => {
        await switchDayPlan(dp, id, id === 'I' ? 'rest' : 'train', t);
        setPlanSheet(false);
        showToast(`Đã chuyển sang thực đơn ${id}`);
      }} />
      <Sheet open={guide} onClose={() => setGuide(false)} title="Dinh dưỡng khi giảm mỡ">
        <NutritionGuide targets={t} />
      </Sheet>
      {toast}
    </div>
  );
}

/* ---------- Một bữa trong thực đơn ---------- */
function MealCard({ meal, next, onToggle, onItem, onAdd, onRemoveMeal }) {
  const tot = mealTotals(meal);
  const k = totalsKcal(tot);
  return (
    <Card
      className="!p-0 overflow-hidden"
      style={{
        background: meal.eaten ? 'color-mix(in srgb, var(--go) 9%, var(--surface))' : undefined,
        boxShadow: next ? 'inset 0 0 0 2px var(--accent)' : undefined,
      }}
    >
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-semibold">{meal.name}</span>
            <span className="text-[13px] text-muted font-rounded tnum">{meal.time}</span>
            {next && <span className="text-[12px] font-semibold text-accent">· tiếp theo</span>}
          </div>
          <div className="text-[13px] text-muted font-rounded tnum">
            {k} kcal · P {Math.round(tot.protein)} · F {fmtNum(tot.fat)} · C {Math.round(tot.carbs)}
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={!meal.items.length}
          aria-pressed={meal.eaten}
          aria-label={meal.eaten ? `Bỏ đánh dấu ${meal.name}` : `Đã ăn ${meal.name}`}
          className="press flex items-center gap-1.5 h-10 pl-2.5 pr-3 rounded-full text-[14px] font-semibold disabled:opacity-40"
          style={meal.eaten ? { background: 'var(--go)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
        >
          <span
            className="h-6 w-6 rounded-full grid place-items-center"
            style={meal.eaten ? { background: 'rgba(255,255,255,.25)' } : { boxShadow: 'inset 0 0 0 2px var(--faint)' }}
          >
            {meal.eaten && <IconCheck size={15} />}
          </span>
          {meal.eaten ? 'Đã ăn' : 'Ăn rồi'}
        </button>
      </div>
      <ul className="px-4">
        {meal.items.map((it) => {
          const m = itemMacros(it);
          return (
            <li key={it.uid}>
              <button className="w-full flex items-center gap-3 py-2.5 text-left hairline-t" onClick={() => onItem(it)}>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] leading-snug">
                    {it.name}
                    {it.n !== 1 && <span className="ml-1.5 inline-block rounded-full bg-surface-2 px-1.5 text-[12px] font-semibold font-rounded align-middle">×{fmtN(it.n)}</span>}
                  </span>
                  <MacroLine p={m.protein} f={m.fat} c={m.carbs} />
                </span>
                <span className="text-[15px] font-semibold font-rounded tnum">{itemKcal(it)}</span>
                <IconChevron size={14} className="text-faint" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center px-2 pb-1.5 hairline-t">
        <button className="press flex items-center gap-1 min-h-11 px-2 text-[15px] font-medium text-accent" onClick={onAdd}>
          <IconPlus size={16} /> Thêm món
        </button>
        {!meal.items.length && (
          <button className="ml-auto min-h-11 px-2 text-[15px] text-danger" onClick={onRemoveMeal}>
            Xoá bữa
          </button>
        )}
      </div>
    </Card>
  );
}

/* ---------- Sửa một món: khẩu phần · đổi món · xoá ---------- */
function ItemSheet({ open, item, meal, onClose, onPortion, onReplace, onRemove }) {
  const [q, setQ] = useState('');
  useEffect(() => setQ(''), [item?.uid]);
  const alts = useMemo(() => (item ? alternatives(item, FOODS) : []), [item?.uid, item?.foodId, item?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => (q.trim() ? searchFoods(q, FOODS, 20) : []), [q]);
  if (!item) return <Sheet open={false} onClose={onClose} />;
  const m = itemMacros(item);
  const k = itemKcal(item);
  const step = (dir) => {
    const i = STEPS.findIndex((s) => s >= item.n - 0.001);
    const idx = i < 0 ? STEPS.length - 1 : STEPS[i] > item.n + 0.001 && dir < 0 ? i - 1 : i + dir;
    onPortion(STEPS[Math.max(0, Math.min(STEPS.length - 1, idx))]);
  };
  const food = item.foodId && FOOD_BY_ID[item.foodId];
  return (
    <Sheet open={open} onClose={onClose} title={meal ? `${meal.name} · ${meal.time}` : 'Món ăn'}>
      <Card>
        <div className="text-[19px] font-semibold leading-snug">{item.name}</div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[32px] font-bold font-rounded tnum tracking-[-0.02em]">{k}</span>
          <span className="text-muted">kcal</span>
        </div>
        <MacroLine p={m.protein} f={m.fat} c={m.carbs} />
        <div className="flex items-center justify-between mt-4">
          <span className="text-[15px]">Khẩu phần</span>
          <div className="flex items-center gap-2">
            <button className="press h-10 w-10 rounded-full bg-surface-2 text-[20px] font-semibold" onClick={() => step(-1)} disabled={item.n <= STEPS[0]} aria-label="Giảm khẩu phần">
              −
            </button>
            <span className="w-14 text-center text-[20px] font-bold font-rounded tnum">×{fmtN(item.n)}</span>
            <button className="press h-10 w-10 rounded-full bg-surface-2 text-[20px] font-semibold" onClick={() => step(1)} aria-label="Tăng khẩu phần">
              +
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {[0.5, 1, 1.5, 2, 3].map((v) => (
            <button
              key={v}
              onClick={() => onPortion(v)}
              className={`press h-9 rounded-[10px] text-[14px] font-semibold font-rounded ${Math.abs(item.n - v) < 0.001 ? 'bg-accent text-white' : 'bg-surface-2'}`}
            >
              ×{fmtN(v)}
            </button>
          ))}
        </div>
        {food && <p className="text-[12px] text-muted mt-2">×1 = {food.name} · nguồn {SRC_LABEL[food.src]}</p>}
      </Card>

      {alts.length > 0 && (
        <>
          <GroupLabel>Đổi sang món tương đương</GroupLabel>
          <Card className="!py-0">
            {alts.map((a) => (
              <button key={a.food.id} className="w-full flex items-center gap-3 py-2.5 hairline-b last:shadow-none text-left" onClick={() => onReplace(itemFromFood(a.food.id, a.n))}>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] leading-snug">
                    {a.food.name}
                    {a.n !== 1 && <span className="text-muted"> ×{fmtN(a.n)}</span>}
                  </span>
                  <MacroLine p={a.protein} f={a.fat} c={Math.round(a.food.carbs * a.n * 10) / 10} />
                </span>
                <span className="text-[15px] font-semibold font-rounded tnum">{a.kcal}</span>
              </button>
            ))}
          </Card>
        </>
      )}

      <GroupLabel>Đổi sang món khác</GroupLabel>
      <div className="relative">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <TextField type="search" className="!pl-9 !bg-surface" placeholder="Tìm món: bún, sushi, ức gà…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {results.length > 0 && (
        <Card className="!py-0 mt-2">
          {results.map((f) => (
            <button key={f.id} className="w-full flex items-center gap-3 py-2.5 hairline-b last:shadow-none text-left" onClick={() => onReplace(itemFromFood(f.id, 1))}>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] leading-snug">{f.name}</span>
                <MacroLine p={f.protein} f={f.fat} c={f.carbs} />
              </span>
              <span className="text-[15px] font-semibold font-rounded tnum">{kcalOf(f.protein, f.fat, f.carbs)}</span>
            </button>
          ))}
        </Card>
      )}

      <Button variant="destructive" className="w-full mt-5" onClick={onRemove}>
        Xoá món khỏi bữa
      </Button>
    </Sheet>
  );
}

/* ---------- Bảng thêm món: gõ để gợi ý, lọc nhóm, món của tôi, tự nhập ---------- */
function AddFoodSheet({ open, onClose, title, onAdd }) {
  const presets = useLiveQuery(() => db.foodPresets.orderBy('name').toArray(), []) || [];
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [n, setN] = useState(1);
  const [custom, setCustom] = useState(false);
  const [limit, setLimit] = useState(30);
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQ('');
      setN(1);
      setCustom(false);
      setGroup('all');
      setLimit(30);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  const mine = useMemo(() => {
    const nq = normalize(q.trim());
    return presets.filter((p) => !nq || normalize(p.name).includes(nq));
  }, [q, presets]);
  const pool = group === 'all' || group === 'mine' ? FOODS : FOODS.filter((f) => f.group === group);
  const list = useMemo(() => (group === 'mine' ? [] : searchFoods(q, pool, 400)), [q, group]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFood = (f) => onAdd(itemFromFood(f.id, n));
  const addPreset = (p) => onAdd(itemCustom(p, n));

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="relative">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <TextField
          ref={inputRef}
          type="search"
          className="!pl-9 !bg-surface"
          placeholder={`Gõ tên món (${FOODS.length} món): pho, com tam, sushi…`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(30);
          }}
          autoComplete="off"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-1 -mx-4 px-4 [scrollbar-width:none]">
        {[{ id: 'all', label: 'Tất cả' }, { id: 'mine', label: '★ Của tôi' }, ...FOOD_GROUPS].map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGroup(g.id);
              setLimit(30);
            }}
            className={`press shrink-0 h-8 px-3 rounded-full text-[14px] font-medium ${group === g.id ? 'bg-ink text-bg' : 'bg-surface text-ink'}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="mt-2 rounded-[16px] bg-surface px-4 py-2.5 flex items-center justify-between">
        <span className="text-[15px]">Khẩu phần</span>
        <div className="flex gap-1">
          {[0.5, 1, 1.5, 2].map((v) => (
            <button key={v} onClick={() => setN(v)} className={`press h-8 w-11 rounded-[9px] text-[14px] font-semibold font-rounded ${n === v ? 'bg-accent text-white' : 'bg-surface-2'}`}>
              ×{fmtN(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-[16px] bg-surface overflow-hidden">
        <button className="w-full text-left px-4 py-3 hairline-b flex items-center gap-2 text-accent text-[16px] font-medium" onClick={() => setCustom(!custom)}>
          <IconPlus size={16} /> {custom ? 'Ẩn phần tự nhập' : q.trim() ? `Tự nhập “${q.trim()}”` : 'Tự nhập món (P/F/C)'}
        </button>
        {custom && <CustomForm initialName={q.trim()} onAdd={(entry, save) => {
          if (save) db.foodPresets.add({ name: entry.name, protein: entry.protein, fat: entry.fat, carbs: entry.carbs });
          onAdd(itemCustom(entry, 1));
        }} />}
        {(group === 'mine' || (group === 'all' && q.trim())) &&
          mine.map((p) => (
            <FoodPick key={`p${p.id}`} name={`★ ${p.name}`} p={p.protein * n} f={p.fat * n} c={p.carbs * n} onPick={() => addPreset(p)} onDelete={group === 'mine' ? () => db.foodPresets.delete(p.id) : null} />
          ))}
        {group === 'mine' && mine.length === 0 && <p className="px-4 py-3 text-[15px] text-muted">Chưa có món nào. Khi tự nhập, bật “Lưu vào Của tôi”.</p>}
        {list.slice(0, limit).map((f) => (
          <FoodPick key={f.id} name={f.name} p={f.protein * n} f={f.fat * n} c={f.carbs * n} q={q} onPick={() => addFood(f)} />
        ))}
        {list.length > limit && (
          <button className="w-full py-3 text-accent text-[15px] font-medium" onClick={() => setLimit(limit + 40)}>
            Xem thêm {list.length - limit} món
          </button>
        )}
        {group !== 'mine' && list.length === 0 && mine.length === 0 && <p className="px-4 py-3 text-[15px] text-muted">Không tìm thấy. Chạm “Tự nhập” ở trên.</p>}
      </div>
    </Sheet>
  );
}

function FoodPick({ name, p, f, c, q, onPick, onDelete }) {
  const r = (v) => Math.round(v * 10) / 10;
  return (
    <div className="flex items-center hairline-b last:shadow-none">
      <button className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2.5 text-left" onClick={onPick}>
        <span className="flex-1 min-w-0">
          <Hl text={name} q={q} />
          <MacroLine p={r(p)} f={r(f)} c={r(c)} />
        </span>
        <span className="text-right shrink-0">
          <span className="block text-[16px] font-semibold font-rounded tnum">{kcalOf(p, f, c)}</span>
          <span className="block text-[11px] text-muted -mt-0.5">kcal</span>
        </span>
        <span className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-white" style={{ background: 'var(--accent)' }}>
          <IconPlus size={15} />
        </span>
      </button>
      {onDelete && (
        <button className="h-11 w-11 grid place-items-center text-faint" onClick={onDelete} aria-label="Xoá khỏi Của tôi">
          <IconTrash size={18} />
        </button>
      )}
    </div>
  );
}

function Hl({ text, q }) {
  const w = normalize((q || '').trim()).split(/\s+/)[0];
  const i = w ? normalize(text).indexOf(w) : -1;
  if (i < 0) return <span className="block text-[15px] leading-snug">{text}</span>;
  return (
    <span className="block text-[15px] leading-snug">
      {text.slice(0, i)}
      <b className="text-accent">{text.slice(i, i + w.length)}</b>
      {text.slice(i + w.length)}
    </span>
  );
}

function CustomForm({ initialName, onAdd }) {
  const [f, setF] = useState({ name: initialName || '', protein: null, fat: null, carbs: null });
  const [save, setSave] = useState(false);
  const valid = f.name.trim() && (f.protein || f.fat || f.carbs);
  return (
    <div className="px-4 py-3 hairline-b">
      <TextField placeholder="Tên món" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-3 gap-2 mt-2">
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
      <div className="flex items-center justify-between mt-3">
        <span className="text-[15px]">Lưu vào “Của tôi”</span>
        <Switch checked={save} onChange={setSave} label="Lưu vào Của tôi" />
      </div>
      <Button variant="primary" className="w-full mt-3" disabled={!valid} onClick={() => onAdd({ name: f.name.trim(), protein: f.protein || 0, fat: f.fat || 0, carbs: f.carbs || 0 }, save)}>
        Thêm · {kcalOf(f.protein, f.fat, f.carbs)} kcal
      </Button>
    </div>
  );
}

/* ---------- Sửa món ăn ngoài thực đơn ---------- */
function LogSheet({ id, onClose }) {
  const log = useLiveQuery(() => (id ? db.nutritionLogs.get(id) : null), [id]);
  if (!id || !log) return <Sheet open={false} onClose={onClose} />;
  const scale = async (k) => {
    const r = (v) => Math.round((+v || 0) * k * 10) / 10;
    const p = r(log.protein), f = r(log.fat), c = r(log.carbs);
    await db.nutritionLogs.update(id, { protein: p, fat: f, carbs: c, calories: kcalOf(p, f, c) });
  };
  return (
    <Sheet open={!!id} onClose={onClose} title="Món ăn">
      <Card>
        <div className="text-[19px] font-semibold leading-snug">{log.mealName}</div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[32px] font-bold font-rounded tnum">{log.calories}</span>
          <span className="text-muted">kcal</span>
        </div>
        <MacroLine p={log.protein} f={log.fat} c={log.carbs} />
        <div className="text-[15px] mt-4 mb-2">Điều chỉnh lượng đã ăn</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0.5, 0.75, 1.5, 2].map((k) => (
            <button key={k} onClick={() => scale(k)} className="press h-10 rounded-[10px] bg-surface-2 text-[15px] font-semibold font-rounded">
              ×{fmtN(k)}
            </button>
          ))}
        </div>
      </Card>
      <Button
        variant="destructive"
        className="w-full mt-4"
        onClick={async () => {
          await db.nutritionLogs.delete(id);
          onClose();
        }}
      >
        Xoá khỏi nhật ký
      </Button>
    </Sheet>
  );
}

/* ---------- Chọn thực đơn mẫu cho hôm nay ---------- */
function PlanSheet({ open, onClose, dp, targets, onPick }) {
  const [view, setView] = useState(null);
  const plans = useMemo(() => MEAL_PLANS.map((p) => scalePlan(p, targets)), [targets.kcal, targets.proteinMid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dp) return <Sheet open={false} onClose={onClose} />;
  return (
    <Sheet open={open} onClose={onClose} title="Chọn thực đơn">
      <p className="text-[13px] text-muted mb-3">
        Khẩu phần tự khớp mục tiêu {targets.kcal.toLocaleString('vi-VN')} kcal, P ~{targets.proteinMid}g. Bữa đã ăn giữ nguyên; các bữa chưa ăn đổi theo thực đơn mới.
      </p>
      <div className="space-y-2">
        {plans.map((p) => {
          const tot = planTotals(p);
          const on = p.id === dp.planId;
          const open = view === p.id;
          return (
            <div key={p.id} className="rounded-[16px] bg-surface overflow-hidden" style={on ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}>
              <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setView(open ? null : p.id)}>
                <span className="h-10 w-10 shrink-0 rounded-[11px] grid place-items-center text-[17px] font-bold font-rounded" style={{ background: on ? 'var(--accent)' : 'var(--surface-2)', color: on ? '#fff' : 'var(--accent)' }}>
                  {p.id}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold leading-tight">{p.name}</span>
                    <span className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-surface-2 text-muted">{p.tag}</span>
                  </span>
                  <span className="block text-[13px] text-muted font-rounded tnum">
                    {totalsKcal(tot)} kcal · P {Math.round(tot.protein)} · F {Math.round(tot.fat)} · C {Math.round(tot.carbs)}
                  </span>
                </span>
                <IconChevron dir={open ? 'up' : 'down'} size={16} className="text-faint" />
              </button>
              {open && (
                <div className="px-3 pb-3">
                  <p className="text-[13px] text-muted mb-2">{p.note}</p>
                  {p.meals.map((m) => (
                    <div key={m.name} className="text-[14px] py-1">
                      <b>
                        {m.time} {m.name}:
                      </b>{' '}
                      <span className="text-muted">{m.items.map(([id, n]) => (n === 1 ? FOOD_BY_ID[id].name : `${FOOD_BY_ID[id].name} ×${fmtN(n)}`)).join(' · ')}</span>
                    </div>
                  ))}
                  <Button variant="primary" className="w-full mt-2" disabled={on} onClick={() => onPick(p.id)}>
                    {on ? 'Đang dùng' : `Dùng thực đơn ${p.id}`}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
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


/* ---------- Hướng dẫn ---------- */
function NutritionGuide({ targets: t }) {
  const s = useSettings();
  const w = t.weight;
  const pLo = Math.round(w * 1.8);
  const pHi = Math.round(w * 2.2);
  const fatMin = t.fatMin;
  const female = s.sex === 'female';
  const pLoF = Math.round(w * (female ? 1.6 : 1.8));
  const pHiF = Math.round(w * (female ? 2.0 : 2.2));
  const fatPct = Math.round(((s.fatCap * 9) / Math.max(t.kcal, 1)) * 100);
  const H = ({ children }) => <h4 className="text-[17px] font-semibold mt-5 mb-1">{children}</h4>;
  return (
    <div className="text-[16px] leading-relaxed rounded-[18px] bg-surface p-4">
      <H>Protein giữ cơ khi ăn thâm hụt</H>
      <p>
        Tổng quan cho người tập thể hình khuyến nghị 1,8–2,7 g/kg/ngày khi giảm mỡ{female ? '; với nữ, 1,6–2,0 g/kg thường đã đủ và dễ ăn hơn' : ''}. Với {fmtNum(w)} kg, mức hợp lý là{' '}
        <b>
          {pLoF}–{pHiF} g
        </b>
        . Mục tiêu hiện tại là {t.proteinMin}–{t.proteinMax} g. Chia đều 4–5 bữa, mỗi bữa 30–40 g.
      </p>
      <H>Fat {s.fatCap} g/ngày</H>
      <p>
        Ở mức {t.kcal.toLocaleString('vi-VN')} kcal, {s.fatCap} g Fat bằng khoảng <b>{fatPct}% năng lượng</b>. Khuyến nghị cho giai đoạn giảm mỡ là 10–25% trong thời gian ngắn
        và không nên ăn rất ít béo kéo dài. {female
          ? 'Với nữ, ăn quá ít béo kéo dài có thể ảnh hưởng nội tiết và chu kỳ kinh nguyệt; nên giữ fat ít nhất ~20% năng lượng.'
          : 'Một phân tích gộp ở nam giới thấy chế độ ít béo (~20% năng lượng) làm testosterone giảm khoảng 10–15%.'}{' '}
        Mức an toàn hơn để duy trì lâu dài là khoảng <b>{fatMin} g/ngày</b>. Bạn đổi trần Fat trong Cài đặt.
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

