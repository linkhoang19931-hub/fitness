import { FOOD_BY_ID } from './foods';
import { kcalOf } from './db';

// Thực đơn mẫu. Khẩu phần gốc thiết kế quanh ~1.900 kcal, Protein ~150g, Fat dưới 30g.
// Khi hiển thị, app tự co giãn khẩu phần (món giàu đạm theo mục tiêu Protein,
// món tinh bột theo mục tiêu Kcal) để khớp với mục tiêu hiện hành của người dùng.
// Mỗi món: [mã thực phẩm, hệ số khẩu phần].
const q = (s) =>
  s.split(' ').map((t) => {
    const [id, n] = t.split('*');
    return [id, n ? Number(n) : 1];
  });

const M = (time, name, items) => ({ time, name, items: q(items) });

export const MEAL_PLANS = [
  {
    id: 'A',
    name: 'Gà & cá — dễ nấu',
    tag: 'Việt',
    note: 'Nấu sẵn ức gà và cá cho cả ngày.',
    meals: [
      M('7:00', 'Sau tập', 'whey30 yenmach40*1.5 chuoi1'),
      M('11:30', 'Trưa', 'com200 ucga150c raumuong200 dau1tcf'),
      M('15:30', 'Bữa phụ', 'greek170 tao1'),
      M('18:30', 'Tối', 'com200 cakho caingot200 canhrau'),
      M('21:00', 'Trước ngủ', 'khoailang200*0.5'),
    ],
  },
  {
    id: 'B',
    name: 'Bò & tôm',
    tag: 'Việt',
    note: 'Bánh mì trứng buổi sáng, bò xào trưa, tôm hấp tối.',
    meals: [
      M('7:00', 'Sau tập', 'trung1trang3 banhmi80 duachuot150 cam1'),
      M('11:30', 'Trưa', 'comlut150*1.5 boxaorau bongcai200 canhrau'),
      M('15:30', 'Bữa phụ', 'whey30 chuoi1 khoailang200*0.5'),
      M('18:30', 'Tối', 'com200 tomhap rauxalach canhchuaca'),
    ],
  },
  {
    id: 'C',
    name: 'Sáng ăn phở ngoài hàng',
    tag: 'Ăn ngoài',
    note: 'Phở bò tái đã có ~12g Fat; các bữa sau phải rất nạc. Xin quán ít nước béo.',
    meals: [
      M('7:00', 'Sau tập', 'phobotai'),
      M('11:30', 'Trưa', 'com200 gaxaosa caingot200'),
      M('15:30', 'Bữa phụ', 'whey30 greek170 dudu200 chuoi1'),
      M('18:30', 'Tối', 'khoailang200*1.25 cangulon trungtrang4 rauxalach canhrau'),
    ],
  },
  {
    id: 'D',
    name: 'Bún gà & mực',
    tag: 'Việt',
    note: 'Hợp ngày tập chân (D3): nhiều tinh bột quanh buổi tập.',
    meals: [
      M('7:00', 'Sau tập', 'whey30 yenmach40 tao1 thanhlong200'),
      M('11:30', 'Trưa', 'bun200 ucga150c rauxalach canhchuaca'),
      M('15:30', 'Bữa phụ', 'suatachbeo chuoi1'),
      M('18:30', 'Tối', 'com200*1.25 muc150 bongcai200 dau1tcf duachuot150'),
    ],
  },
  {
    id: 'E',
    name: 'Kiểu Nhật — cá ngừ & soba',
    tag: 'Nhật',
    note: 'Sashimi cá ngừ gần như không có mỡ; tránh cá hồi, tempura và sốt mayo.',
    meals: [
      M('7:00', 'Sau tập', 'whey30 com150 sup-miso-1-bat chuoi1'),
      M('11:30', 'Trưa', 'sashimi-ca-ngu-5-lat-100g com200 salad-rong-bien-1-dia-nho sup-miso-1-bat'),
      M('15:30', 'Bữa phụ', 'greek170 kiwi-1-qua-75g'),
      M('18:30', 'Tối', 'mi-soba-kho-80g yakitori-ga-3-xien caingot200 trungtrang4'),
    ],
  },
  {
    id: 'F',
    name: 'Kiểu Hàn — bulgogi & kimchi',
    tag: 'Hàn',
    note: 'Bulgogi tự làm với bò nạc; kim chi gần như không calo, ăn thoải mái.',
    meals: [
      M('7:00', 'Sau tập', 'whey30 yenmach40 chuoi1'),
      M('11:30', 'Trưa', 'com200 ucga150c kim-chi-100g canhrau'),
      M('15:30', 'Bữa phụ', 'trung1trang3 tao1'),
      M('18:30', 'Tối', 'com200 bonac100*1.5 kim-chi-100g nam-cac-loai-150g dau1tcf'),
    ],
  },
  {
    id: 'G',
    name: 'Kiểu Âu — gà nướng & khoai',
    tag: 'Âu',
    note: 'Bữa sáng yến mạch, trưa salad gà, tối cá ngừ với khoai tây.',
    meals: [
      M('7:00', 'Sau tập', 'whey30 yenmach40*1.5 dau-tay-150g'),
      M('11:30', 'Trưa', 'uc-ga-nuong-salad-1-dia khoaitay200 sandwich2'),
      M('15:30', 'Bữa phụ', 'pho-mai-cottage-100g chuoi1'),
      M('18:30', 'Tối', 'cangulon khoaitay200 bongcai200 rauxalach'),
    ],
  },
  {
    id: 'H',
    name: 'Ngày bận — ăn ngoài cả ngày',
    tag: 'Ăn ngoài',
    note: 'Chọn món ít mỡ ở quán: bánh mì gà, cơm gà xé, gỏi cuốn. Mang theo whey.',
    meals: [
      M('7:00', 'Sau tập', 'banh-mi-ga-nuong-it-bo-1-o whey30'),
      M('11:30', 'Trưa', 'com-ga-xe-1-dia canhrau'),
      M('15:30', 'Bữa phụ', 'greek170 chuoi1'),
      M('18:30', 'Tối', 'goi-cuon-tom-thit-2-cuon*2 tomhap*0.75 rauxalach'),
    ],
  },
  {
    id: 'I',
    name: 'Ngày nghỉ — ít tinh bột hơn',
    tag: 'Nghỉ tập',
    note: 'Không tập thì dời tinh bột về bữa trưa, tăng rau và đạm nạc cho no lâu.',
    meals: [
      M('8:00', 'Sáng', 'trung1trang3 sandwich2 cam1'),
      M('12:00', 'Trưa', 'comlut150 ucga150c bongcai200 canhrau'),
      M('16:00', 'Bữa phụ', 'whey30 tao1'),
      M('19:00', 'Tối', 'com150 tom150 caingot200 canhchuaca'),
    ],
  },
];

// ---------- Tính toán ----------
export function itemEntry([id, n]) {
  const f = FOOD_BY_ID[id];
  if (!f) return { name: `(thiếu món ${id})`, protein: 0, fat: 0, carbs: 0 };
  const r = (v) => Math.round(v * n * 10) / 10;
  return { name: n === 1 ? f.name : `${f.name} ×${n}`, protein: r(f.protein), fat: r(f.fat), carbs: r(f.carbs) };
}

export function totals(items) {
  return items.map(itemEntry).reduce(
    (a, e) => ({ protein: a.protein + e.protein, fat: a.fat + e.fat, carbs: a.carbs + e.carbs }),
    { protein: 0, fat: 0, carbs: 0 }
  );
}
export const kcalOfTotals = (t) => kcalOf(t.protein, t.fat, t.carbs);

const roundQ = (x) => Math.max(0.25, Math.round(x * 4) / 4);
const kind = (id) => {
  const f = FOOD_BY_ID[id];
  if (!f) return 'other';
  const k = kcalOf(f.protein, f.fat, f.carbs) || 1;
  if ((f.protein * 4) / k >= 0.5) return 'protein';
  if ((f.carbs * 4) / k >= 0.6 && f.carbs >= 15) return 'carb';
  return 'other';
};

// Co giãn thực đơn cho khớp mục tiêu: món giàu đạm → Protein, món tinh bột → Kcal
export function scalePlan(plan, targets) {
  const flat = plan.meals.flatMap((m, mi) => m.items.map(([id, n]) => ({ mi, id, n, kind: kind(id) })));
  const sum = (arr) => totals(arr.map((x) => [x.id, x.n]));

  const pItems = flat.filter((x) => x.kind === 'protein');
  const pOther = sum(flat.filter((x) => x.kind !== 'protein')).protein;
  const pBase = sum(pItems).protein;
  if (pBase > 0) {
    const f = Math.min(1.8, Math.max(0.6, (targets.proteinMid - pOther) / pBase));
    pItems.forEach((x) => (x.n = roundQ(x.n * f)));
  }

  const cItems = flat.filter((x) => x.kind === 'carb');
  const kNonC = kcalOfTotals(sum(flat.filter((x) => x.kind !== 'carb')));
  const kC = kcalOfTotals(sum(cItems));
  if (kC > 0) {
    const f = Math.min(2.5, Math.max(0.3, (targets.kcal - kNonC) / kC));
    cItems.forEach((x) => (x.n = roundQ(x.n * f)));
  }

  const meals = plan.meals.map((m, mi) => ({ ...m, items: flat.filter((x) => x.mi === mi).map((x) => [x.id, x.n]) }));
  return { ...plan, meals };
}

export function planTotals(plan) {
  return totals(plan.meals.flatMap((m) => m.items));
}
