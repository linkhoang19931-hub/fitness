// Kho thực phẩm & món ăn. Giá trị P/F/C (gam) tính cho đúng khẩu phần ghi trong tên.
// Nguồn:
//  usda  — USDA FoodData Central (thực phẩm nguyên liệu, quy đổi theo khẩu phần)
//  vn    — Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng), giá trị /100g quy đổi
//  nutri — Bảng lượng calo món ăn Việt Nam của NutriHome (món ăn ngoài hàng, 1 phần)
//  ước   — ước tính từ công thức nấu thông thường; dao động theo quán/cách nấu
// Lưu ý: món ăn ngoài hàng dao động ±20–30% tuỳ quán, nhất là lượng mỡ trong nước dùng.

export const FOOD_GROUPS = [
  { id: 'protein', label: 'Đạm nạc' },
  { id: 'carb', label: 'Tinh bột' },
  { id: 'veg', label: 'Rau' },
  { id: 'fruit', label: 'Trái cây' },
  { id: 'dairy', label: 'Sữa & trứng' },
  { id: 'dish', label: 'Món ngoài hàng' },
  { id: 'home', label: 'Món nhà nấu' },
  { id: 'fat', label: 'Dầu & hạt' },
];

const F = (id, group, name, protein, fat, carbs, src) => ({ id, group, name, protein, fat, carbs, src });

export const FOODS = [
  // ---- Đạm nạc (khối lượng sống trừ khi ghi "chín") ----
  F('ucga100', 'protein', 'Ức gà bỏ da (100g sống)', 22.5, 2.6, 0, 'usda'),
  F('ucga150c', 'protein', 'Ức gà luộc/áp chảo không dầu (150g chín)', 46.5, 5.4, 0, 'usda'),
  F('duiga100', 'protein', 'Đùi gà bỏ da (100g sống)', 19.7, 4.1, 0, 'usda'),
  F('bonac100', 'protein', 'Thịt bò nạc / thăn (100g sống)', 22, 3.5, 0, 'usda'),
  F('lonac100', 'protein', 'Thăn lợn / nạc thăn (100g sống)', 21, 3.5, 0, 'usda'),
  F('rophi150', 'protein', 'Cá rô phi phi lê (150g sống)', 30, 2.6, 0, 'usda'),
  F('cangu150', 'protein', 'Cá ngừ tươi (150g sống)', 36.6, 0.8, 0, 'usda'),
  F('cangulon', 'protein', 'Cá ngừ hộp ngâm nước, để ráo (1 hộp ~120g)', 30.6, 1, 0, 'usda'),
  F('basa150', 'protein', 'Cá basa/tra phi lê (150g sống)', 22.5, 6, 0, 'ước'),
  F('cahoi100', 'protein', 'Cá hồi (100g sống) — nhiều mỡ', 20, 13, 0, 'usda'),
  F('tom150', 'protein', 'Tôm bóc vỏ (150g sống)', 30.2, 0.8, 0, 'usda'),
  F('muc150', 'protein', 'Mực (150g sống)', 23.4, 2.1, 4.7, 'usda'),
  F('giolua50', 'protein', 'Giò lụa (50g)', 10.8, 2.8, 0, 'vn'),
  F('dauphu150', 'protein', 'Đậu phụ (1 bìa ~150g)', 16.4, 8.1, 1.1, 'vn'),
  F('whey30', 'protein', 'Whey Isolate (1 muỗng 30g)', 27, 0.5, 1, 'ước'),
  F('whey2', 'protein', 'Whey Concentrate (1 muỗng 30g)', 24, 1.8, 2.5, 'ước'),

  // ---- Sữa & trứng ----
  F('trung1', 'dairy', 'Trứng gà (1 quả ~50g)', 6.3, 4.8, 0.4, 'usda'),
  F('trungtrang4', 'dairy', 'Lòng trắng trứng (4 quả)', 14.4, 0.2, 1, 'usda'),
  F('trung1trang3', 'dairy', '1 trứng nguyên + 3 lòng trắng', 17.1, 4.9, 1.1, 'usda'),
  F('greek170', 'dairy', 'Sữa chua Hy Lạp không béo (170g)', 17, 0.7, 6, 'usda'),
  F('suachua100', 'dairy', 'Sữa chua không đường thường (1 hũ 100g)', 3.5, 3.3, 4.7, 'usda'),
  F('suatachbeo', 'dairy', 'Sữa tươi tách béo (250ml)', 8.4, 0.5, 12, 'usda'),
  F('suatuoi220', 'dairy', 'Sữa tươi không đường nguyên kem (220ml)', 6.9, 7.2, 10.6, 'usda'),
  F('daunanh250', 'dairy', 'Sữa đậu nành không đường (250ml)', 7.2, 4, 4.4, 'usda'),

  // ---- Tinh bột ----
  F('com150', 'carb', 'Cơm trắng (1 bát vừa ~150g)', 4, 0.4, 42.3, 'usda'),
  F('com200', 'carb', 'Cơm trắng (200g)', 5.4, 0.6, 56.4, 'usda'),
  F('comlut150', 'carb', 'Cơm gạo lứt (1 bát ~150g)', 4.1, 1.5, 38.4, 'usda'),
  F('bun200', 'carb', 'Bún tươi (200g)', 3.4, 0, 51.4, 'vn'),
  F('banhpho200', 'carb', 'Bánh phở (200g)', 6.4, 0, 64.2, 'vn'),
  F('mien50', 'carb', 'Miến khô (50g)', 0.3, 0, 41.5, 'vn'),
  F('khoailang200', 'carb', 'Khoai lang luộc (200g)', 1.6, 0.4, 57, 'vn'),
  F('khoaitay200', 'carb', 'Khoai tây luộc (200g)', 4, 0.2, 42, 'usda'),
  F('yenmach40', 'carb', 'Yến mạch (40g)', 6.8, 2.8, 26.4, 'usda'),
  F('banhmi80', 'carb', 'Bánh mì không nhân (1 ổ ~80g)', 6.3, 0.6, 42.1, 'vn'),
  F('sandwich2', 'carb', 'Bánh mì sandwich nguyên cám (2 lát)', 7.2, 2, 24, 'usda'),
  F('ngo1', 'carb', 'Ngô luộc (1 bắp ~150g hạt)', 5, 2, 31, 'usda'),

  // ---- Rau ----
  F('raumuong200', 'veg', 'Rau muống luộc (200g)', 5.2, 0.4, 6.2, 'usda'),
  F('bongcai200', 'veg', 'Bông cải xanh luộc (200g)', 5.6, 0.8, 13.3, 'usda'),
  F('caingot200', 'veg', 'Cải ngọt/cải xanh luộc (200g)', 3, 0.4, 4.4, 'usda'),
  F('rauxalach', 'veg', 'Salad rau trộn không dầu (1 đĩa ~150g)', 2, 0.3, 6, 'ước'),
  F('duachuot150', 'veg', 'Dưa chuột (150g)', 1, 0.2, 5.4, 'usda'),
  F('canhrau', 'veg', 'Canh rau nấu suông (1 bát)', 2, 0.5, 4, 'ước'),

  // ---- Trái cây ----
  F('chuoi1', 'fruit', 'Chuối (1 quả ~100g)', 1.1, 0.3, 22.8, 'usda'),
  F('tao1', 'fruit', 'Táo (1 quả ~180g)', 0.5, 0.3, 25, 'usda'),
  F('cam1', 'fruit', 'Cam (1 quả ~150g)', 1.4, 0.2, 17.6, 'usda'),
  F('oi1', 'fruit', 'Ổi (1 quả ~150g)', 3.9, 1.4, 21.5, 'usda'),
  F('dudu200', 'fruit', 'Đu đủ (200g)', 0.9, 0.5, 21.6, 'usda'),
  F('thanhlong200', 'fruit', 'Thanh long (200g)', 2.2, 0.8, 26, 'ước'),
  F('duahau300', 'fruit', 'Dưa hấu (300g)', 1.8, 0.5, 22.6, 'usda'),

  // ---- Món ngoài hàng (1 phần) ----
  F('phobotai', 'dish', 'Phở bò tái (1 tô)', 17.9, 11.7, 59.3, 'nutri'),
  F('phobochin', 'dish', 'Phở bò chín (1 tô)', 20.9, 12.2, 59.3, 'nutri'),
  F('phoga', 'dish', 'Phở gà (1 tô)', 21.3, 17.9, 59.3, 'nutri'),
  F('bunbohue', 'dish', 'Bún bò Huế (1 tô)', 18.4, 16, 65.3, 'nutri'),
  F('bunrieucua', 'dish', 'Bún riêu cua (1 tô)', 17.8, 12.2, 58, 'nutri'),
  F('bunthitnuong', 'dish', 'Bún thịt nướng (1 tô)', 14.7, 13.7, 67.3, 'nutri'),
  F('hutieubokho', 'dish', 'Hủ tiếu bò kho (1 tô)', 17, 13.4, 55.4, 'nutri'),
  F('miquang', 'dish', 'Mì Quảng (1 tô)', 22.4, 20.2, 67.4, 'nutri'),
  F('mienga', 'dish', 'Miến gà (1 tô)', 17.8, 18.1, 100.2, 'nutri'),
  F('chaosuon', 'dish', 'Cháo sườn (1 tô 300g)', 12.9, 6.9, 50.7, 'nutri'),
  F('comtamsuon', 'dish', 'Cơm tấm sườn (1 phần)', 20.7, 13.3, 81.6, 'nutri'),
  F('comtambi', 'dish', 'Cơm tấm bì (1 phần)', 26, 19.3, 87.6, 'nutri'),
  F('comchien', 'dish', 'Cơm chiên Dương Châu (1 đĩa)', 14.9, 11.3, 92.7, 'nutri'),
  F('banhmithit', 'dish', 'Bánh mì thịt (1 ổ)', 17.8, 18.7, 55.3, 'nutri'),
  F('banhcuon', 'dish', 'Bánh cuốn (1 đĩa)', 25.7, 25.6, 64.3, 'nutri'),
  F('banhbaothit', 'dish', 'Bánh bao nhân thịt (1 cái)', 16.1, 7.9, 48.1, 'nutri'),
  F('banhxeo', 'dish', 'Bánh xèo (1 cái)', 15, 19.3, 70.9, 'nutri'),
  F('xoiman', 'dish', 'Xôi mặn (1 gói)', 17.9, 18.9, 64.7, 'nutri'),
  F('xoibap', 'dish', 'Xôi bắp (1 gói)', 8.2, 8.3, 51.3, 'nutri'),

  // ---- Món nhà nấu (ước tính, nấu ít dầu) ----
  F('cakho', 'home', 'Cá rô phi kho (150g cá, ít dầu)', 30, 6, 6, 'ước'),
  F('boxaorau', 'home', 'Bò xào rau (100g bò nạc, 1 thìa cà phê dầu)', 23, 8.5, 6, 'ước'),
  F('gaxaosa', 'home', 'Gà xào sả ớt (150g ức gà, 1 thìa cà phê dầu)', 34, 9, 3, 'ước'),
  F('tomhap', 'home', 'Tôm hấp/luộc (200g sống)', 40.2, 1, 0, 'usda'),
  F('canhchuaca', 'home', 'Canh chua cá (1 bát lớn)', 14, 3, 9, 'ước'),
  F('trungchien', 'home', 'Trứng chiên 2 quả (1 thìa cà phê dầu)', 12.6, 14.6, 0.8, 'ước'),
  F('thitkho', 'home', 'Thịt kho trứng (1 phần, ba chỉ) — nhiều mỡ', 22, 32, 8, 'ước'),

  // ---- Dầu & hạt (dễ vượt trần Fat) ----
  F('dau1tcf', 'fat', 'Dầu ăn (1 thìa cà phê 5ml)', 0, 5, 0, 'usda'),
  F('dau1tc', 'fat', 'Dầu ăn (1 thìa canh 15ml)', 0, 14, 0, 'usda'),
  F('lac20', 'fat', 'Lạc rang (20g)', 5.2, 9.8, 3.2, 'usda'),
  F('hatdieu20', 'fat', 'Hạt điều (20g)', 3.6, 8.8, 6, 'usda'),
  F('bo10', 'fat', 'Bơ thực vật / bơ động vật (10g)', 0.1, 8.1, 0, 'usda'),
];

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export const SRC_LABEL = {
  usda: 'USDA FoodData Central',
  vn: 'Bảng thành phần thực phẩm VN',
  nutri: 'NutriHome — calo món ăn VN',
  ước: 'Ước tính theo công thức',
};

// Bỏ dấu để tìm kiếm "pho bo" vẫn ra "Phở bò"
export const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
