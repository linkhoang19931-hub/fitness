// Thực đơn theo ngày: tạo từ thực đơn mẫu, sửa từng món, đánh dấu bữa đã ăn (ghi vào nhật ký).
import { db, kcalOf } from './db';
import { FOOD_BY_ID } from './foods';
import { MEAL_PLANS, scalePlan } from './mealplans';

export const TRAIN_PLANS = MEAL_PLANS.filter((p) => p.id !== 'I').map((p) => p.id);
export const REST_PLANS = ['I'];

let uidSeq = 0;
const uid = () => `${Date.now().toString(36)}${(uidSeq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const r1 = (v) => Math.round(v * 10) / 10;

// ---- Món trong thực đơn ----
export const itemFromFood = (foodId, n = 1) => {
  const f = FOOD_BY_ID[foodId];
  return { uid: uid(), foodId, name: f.name, n, protein: f.protein, fat: f.fat, carbs: f.carbs };
};
export const itemCustom = ({ name, protein, fat, carbs }, n = 1) => ({ uid: uid(), foodId: null, name, n, protein: +protein || 0, fat: +fat || 0, carbs: +carbs || 0 });

export const itemMacros = (it) => ({ protein: r1(it.protein * it.n), fat: r1(it.fat * it.n), carbs: r1(it.carbs * it.n) });
export const itemKcal = (it) => kcalOf(it.protein * it.n, it.fat * it.n, it.carbs * it.n);
export const itemLabel = (it) => (it.n === 1 ? it.name : `${it.name} ×${fmtN(it.n)}`);
export const fmtN = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ','));

export function mealTotals(meal) {
  return meal.items.reduce(
    (a, it) => {
      const m = itemMacros(it);
      return { protein: a.protein + m.protein, fat: a.fat + m.fat, carbs: a.carbs + m.carbs };
    },
    { protein: 0, fat: 0, carbs: 0 }
  );
}
export const totalsKcal = (t) => kcalOf(t.protein, t.fat, t.carbs);

// ---- Chọn thực đơn mặc định cho ngày ----
export function defaultPlanId(date, mode) {
  const pool = mode === 'rest' ? REST_PLANS : TRAIN_PLANS;
  const seed = Math.floor(new Date(date + 'T00:00:00').getTime() / 86400000);
  return pool[((seed % pool.length) + pool.length) % pool.length];
}

const mealsFromPlan = (plan, prefix) =>
  plan.meals.map((m, i) => ({
    key: `${prefix}${i}`,
    time: m.time,
    name: m.name,
    eaten: false,
    items: m.items.map(([id, n]) => itemFromFood(id, n)),
  }));

// Co giãn khẩu phần các bữa CHƯA ĂN cho khớp phần mục tiêu còn lại (sau các món đã ghi nhật ký).
// Món tự nhập (không có trong kho) giữ nguyên.
export function fitRemaining(meals, targets, loggedTotals) {
  const open = meals.filter((m) => !m.eaten);
  if (!open.length) return meals;
  const fixed = open.flatMap((m) => m.items.filter((it) => !it.foodId || !FOOD_BY_ID[it.foodId]));
  const fixedT = fixed.reduce((a, it) => {
    const x = itemMacros(it);
    return { protein: a.protein + x.protein, fat: a.fat + x.fat, carbs: a.carbs + x.carbs };
  }, { protein: 0, fat: 0, carbs: 0 });
  const remK = targets.kcal - totalsKcal(loggedTotals) - totalsKcal(fixedT);
  const remP = targets.proteinMid - loggedTotals.protein - fixedT.protein;
  if (remK < 200) return meals;
  const pseudo = {
    meals: open.map((m) => ({ ...m, items: m.items.filter((it) => it.foodId && FOOD_BY_ID[it.foodId]).map((it) => [it.foodId, it.n]) })),
  };
  const scaled = scalePlan(pseudo, { kcal: remK, proteinMid: Math.max(0, remP) });
  return meals.map((m) => {
    const idx = open.indexOf(m);
    if (idx < 0) return m;
    const ns = scaled.meals[idx].items.map(([, n]) => n);
    let k = 0;
    return { ...m, items: m.items.map((it) => (it.foodId && FOOD_BY_ID[it.foodId] ? { ...it, n: ns[k++] } : it)) };
  });
}

// Tổng các món đã ghi nhật ký trong ngày
async function loggedTotals(date) {
  const logs = await db.nutritionLogs.where('date').equals(date).toArray();
  return logs.reduce((a, l) => ({ protein: a.protein + (+l.protein || 0), fat: a.fat + (+l.fat || 0), carbs: a.carbs + (+l.carbs || 0) }), {
    protein: 0,
    fat: 0,
    carbs: 0,
  });
}

export async function createDayPlan(date, mode, targets, planId = null) {
  const id = planId || defaultPlanId(date, mode);
  const plan = MEAL_PLANS.find((p) => p.id === id);
  let meals = mealsFromPlan(scalePlan(plan, targets), `${id}-`);
  meals = fitRemaining(meals, targets, await loggedTotals(date));
  const dp = { date, planId: id, mode, meals };
  await db.dayPlans.put(dp);
  return dp;
}

// Đổi thực đơn: giữ nguyên các bữa đã ăn, thay các bữa chưa ăn bằng thực đơn mới rồi khớp lại khẩu phần
export async function switchDayPlan(dp, planId, mode, targets) {
  const plan = MEAL_PLANS.find((p) => p.id === planId);
  const eaten = dp.meals.filter((m) => m.eaten);
  const fresh = mealsFromPlan(plan, `${planId}-${Date.now().toString(36)}-`).filter((m) => !eaten.some((e) => e.name === m.name));
  let meals = [...eaten, ...fresh].sort((a, b) => toMin(a.time) - toMin(b.time));
  meals = fitRemaining(meals, targets, await loggedTotals(dp.date));
  const next = { ...dp, planId, mode, meals };
  await db.dayPlans.put(next);
  return next;
}

export async function refitDayPlan(dp, targets) {
  const meals = fitRemaining(dp.meals, targets, await loggedTotals(dp.date));
  await db.dayPlans.put({ ...dp, meals });
}

export const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// ---- Ghi / bỏ ghi nhật ký theo bữa ----
const planKey = (date, meal) => `${date}:${meal.key}`;

async function syncMeal(date, meal) {
  const key = planKey(date, meal);
  await db.nutritionLogs.where('date').equals(date).filter((l) => l.planKey === key).delete();
  if (!meal.eaten) return;
  const now = Date.now();
  await db.nutritionLogs.bulkAdd(
    meal.items.map((it, i) => {
      const m = itemMacros(it);
      return { date, mealName: itemLabel(it), protein: m.protein, fat: m.fat, carbs: m.carbs, calories: itemKcal(it), createdAt: now + i, planKey: key, meal: meal.name };
    })
  );
}

async function saveMeal(dp, mealKey, mutate) {
  return db.transaction('rw', db.dayPlans, db.nutritionLogs, async () => {
    const cur = (await db.dayPlans.get(dp.date)) || dp;
    const meals = cur.meals.map((m) => (m.key === mealKey ? mutate(m) : m));
    await db.dayPlans.put({ ...cur, meals });
    const meal = meals.find((m) => m.key === mealKey);
    if (meal) await syncMeal(cur.date, meal);
  });
}

export const setMealEaten = (dp, mealKey, eaten) => saveMeal(dp, mealKey, (m) => ({ ...m, eaten }));
export const updateItem = (dp, mealKey, itemUid, patch) =>
  saveMeal(dp, mealKey, (m) => ({ ...m, items: m.items.map((it) => (it.uid === itemUid ? { ...it, ...patch } : it)) }));
export const replaceItem = (dp, mealKey, itemUid, newItem) =>
  saveMeal(dp, mealKey, (m) => ({ ...m, items: m.items.map((it) => (it.uid === itemUid ? { ...newItem, uid: it.uid } : it)) }));
export const removeItem = (dp, mealKey, itemUid) => saveMeal(dp, mealKey, (m) => ({ ...m, items: m.items.filter((it) => it.uid !== itemUid) }));
export const addItem = (dp, mealKey, item) => saveMeal(dp, mealKey, (m) => ({ ...m, items: [...m.items, item] }));

export async function addMeal(dp, name, time) {
  const cur = (await db.dayPlans.get(dp.date)) || dp;
  const meals = [...cur.meals, { key: `x${Date.now().toString(36)}`, time, name, eaten: false, items: [] }].sort((a, b) => toMin(a.time) - toMin(b.time));
  await db.dayPlans.put({ ...cur, meals });
}
export async function removeMeal(dp, mealKey) {
  await db.transaction('rw', db.dayPlans, db.nutritionLogs, async () => {
    const cur = (await db.dayPlans.get(dp.date)) || dp;
    const meal = cur.meals.find((m) => m.key === mealKey);
    if (meal) await syncMeal(cur.date, { ...meal, eaten: false });
    await db.dayPlans.put({ ...cur, meals: cur.meals.filter((m) => m.key !== mealKey) });
  });
}

// Món thay thế: cùng nhóm thực phẩm, năng lượng gần nhất với món hiện tại
export function alternatives(item, list) {
  const f = item.foodId && FOOD_BY_ID[item.foodId];
  if (!f) return [];
  const k = itemKcal(item);
  return list
    .filter((x) => x.group === f.group && x.id !== f.id)
    .map((x) => {
      const base = kcalOf(x.protein, x.fat, x.carbs) || 1;
      const n = Math.max(0.25, Math.min(4, Math.round((k / base) * 4) / 4));
      return { food: x, n, kcal: kcalOf(x.protein * n, x.fat * n, x.carbs * n), protein: r1(x.protein * n), fat: r1(x.fat * n) };
    })
    // ưu tiên món giàu đạm, ít béo trên mỗi kcal; sau đó gần năng lượng món cũ
    .map((x) => ({ ...x, score: (x.protein * 4 - x.fat * 9 * 0.5) / Math.max(x.kcal, 1) - Math.abs(x.kcal - k) / Math.max(k, 1) * 0.3 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
