// Nước uống: mục tiêu ~35 ml/kg (EFSA khuyến nghị nam ~2,5 L/ngày từ đồ uống + thức ăn),
// cộng thêm ~500 ml vào ngày tập để bù mồ hôi. Làm tròn 50 ml.
import { db } from './db';

export function waterGoal(weightKg, trained) {
  const w = weightKg > 0 ? weightKg : 70;
  return Math.round((w * 35 + (trained ? 500 : 0)) / 50) * 50;
}

export const addWater = (date, ml) => db.water.add({ date, ml, at: Date.now() });

export async function undoWater(date) {
  const last = (await db.water.where('date').equals(date).toArray()).sort((a, b) => b.at - a.at)[0];
  if (last) await db.water.delete(last.id);
}

export const fmtL = (ml) => (ml >= 1000 ? `${String(Math.round(ml / 100) / 10)} L` : `${ml} ml`);
