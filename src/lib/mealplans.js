import { FOOD_BY_ID } from './foods';

// Thực đơn mẫu cho mục tiêu mặc định: ~1.900 kcal, Protein 145–160g, Fat ≤ 30g.
// Lịch tập 6:00–6:50 sáng: bữa sáng là bữa sau tập, dồn tinh bột vào bữa sáng và trưa.
// Mỗi món: [mã thực phẩm, hệ số khẩu phần]. Đã kiểm tra tổng bằng mã trước khi đưa vào app.
const q = (s) =>
  s.split(' ').map((t) => {
    const [id, n] = t.split('*');
    return [id, n ? Number(n) : 1];
  });

export const MEAL_PLANS = [
  {
    id: 'A',
    name: 'Gà & cá — dễ nấu',
    note: 'Ngày thường, nấu sẵn ức gà và cá cho cả ngày.',
    meals: [
      { time: '7:00', name: 'Sau tập', items: q('whey30 yenmach40*1.5 chuoi1') },
      { time: '11:30', name: 'Trưa', items: q('com200 ucga150c raumuong200 dau1tcf') },
      { time: '15:30', name: 'Bữa phụ', items: q('greek170 tao1') },
      { time: '18:30', name: 'Tối', items: q('com200 cakho caingot200 canhrau') },
      { time: '21:00', name: 'Trước ngủ', items: q('khoailang200*0.5') },
    ],
  },
  {
    id: 'B',
    name: 'Bò & tôm — đổi vị',
    note: 'Bánh mì trứng buổi sáng, bò xào trưa, tôm hấp tối.',
    meals: [
      { time: '7:00', name: 'Sau tập', items: q('trung1trang3 banhmi80 duachuot150 cam1') },
      { time: '11:30', name: 'Trưa', items: q('comlut150*1.5 boxaorau bongcai200 canhrau') },
      { time: '15:30', name: 'Bữa phụ', items: q('whey30 chuoi1 khoailang200*0.5') },
      { time: '18:30', name: 'Tối', items: q('com200 tomhap rauxalach canhchuaca') },
    ],
  },
  {
    id: 'C',
    name: 'Sáng ăn phở ngoài hàng',
    note: 'Phở bò tái đã chiếm ~12g Fat, nên các bữa còn lại phải rất nạc. Xin quán ít nước béo.',
    meals: [
      { time: '7:00', name: 'Sau tập', items: q('phobotai') },
      { time: '11:30', name: 'Trưa', items: q('com200 gaxaosa caingot200') },
      { time: '15:30', name: 'Bữa phụ', items: q('whey30 greek170 dudu200 chuoi1') },
      { time: '18:30', name: 'Tối', items: q('khoailang200*1.25 cangulon trungtrang4 rauxalach canhrau') },
    ],
  },
  {
    id: 'D',
    name: 'Bún gà & mực',
    note: 'Hợp ngày tập chân (D3), nhiều tinh bột hơn quanh buổi tập.',
    meals: [
      { time: '7:00', name: 'Sau tập', items: q('whey30 yenmach40 tao1 thanhlong200') },
      { time: '11:30', name: 'Trưa', items: q('bun200 ucga150c rauxalach canhchuaca') },
      { time: '15:30', name: 'Bữa phụ', items: q('suatachbeo chuoi1') },
      { time: '18:30', name: 'Tối', items: q('com200*1.25 muc150 bongcai200 dau1tcf duachuot150') },
    ],
  },
];

// Tên hiển thị khi một món được nhân hệ số (vd. "Yến mạch (40g) ×1.5")
export function itemEntry([id, n]) {
  const f = FOOD_BY_ID[id];
  const r = (v) => Math.round(v * n * 10) / 10;
  return {
    name: n === 1 ? f.name : `${f.name} ×${n}`,
    protein: r(f.protein),
    fat: r(f.fat),
    carbs: r(f.carbs),
  };
}

export function totals(items) {
  return items.map(itemEntry).reduce(
    (a, e) => ({ protein: a.protein + e.protein, fat: a.fat + e.fat, carbs: a.carbs + e.carbs }),
    { protein: 0, fat: 0, carbs: 0 }
  );
}

export function planTotals(plan) {
  return totals(plan.meals.flatMap((m) => m.items));
}
