// Kho bài tập: tên (giữ tên tiếng Anh phổ biến ở phòng gym), nhóm cơ, dụng cụ, mẹo kỹ thuật ngắn.
// Nhóm cơ của một buổi = hợp các nhóm cơ của những bài có sẵn trong buổi đó,
// nên danh sách gợi ý khi "Thêm bài" luôn đúng trọng tâm buổi hôm đó.
import { normalize } from './foods';

export const MUSCLES = [
  { id: 'chest', label: 'Ngực' },
  { id: 'back', label: 'Lưng' },
  { id: 'shoulders', label: 'Vai' },
  { id: 'biceps', label: 'Tay trước' },
  { id: 'triceps', label: 'Tay sau' },
  { id: 'forearms', label: 'Cẳng tay' },
  { id: 'quads', label: 'Đùi trước' },
  { id: 'hamstrings', label: 'Đùi sau' },
  { id: 'glutes', label: 'Mông' },
  { id: 'calves', label: 'Bắp chân' },
  { id: 'abs', label: 'Bụng' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'mobility', label: 'Giãn cơ' },
];
export const MUSCLE_LABEL = Object.fromEntries(MUSCLES.map((m) => [m.id, m.label]));

const EQ = { bb: 'Thanh đòn', db: 'Tạ đơn', cb: 'Cáp', mc: 'Máy', bw: 'Không tạ', sm: 'Smith', kb: 'Tạ ấm', ez: 'Thanh EZ', band: 'Dây kháng lực' };

// [tên, nhóm cơ (chính trước), dụng cụ, mẹo, đơn vị thời gian nếu có, từ khoá tìm thêm]
const RAW = [
  // ---- Ngực
  ['Barbell Bench Press', 'chest triceps shoulders', 'bb', 'Bả vai khoá, hạ chạm ngực dưới, khuỷu 45–70°.', '', 'đẩy ngực nằm'],
  ['Incline Barbell/Smith Bench Press', 'chest shoulders triceps', 'bb', 'Ghế 30–45°, thanh chạm ngực trên.', '', 'đẩy ngực dốc lên'],
  ['Decline Barbell Bench Press', 'chest triceps', 'bb', 'Ghế dốc xuống 15–30°, thanh chạm ngực dưới.', '', 'đẩy ngực dốc xuống'],
  ['Flat Dumbbell Press', 'chest triceps shoulders', 'db', 'Hạ sâu đến khi ngực căng, khuỷu ~45°.', '', 'đẩy ngực tạ đơn'],
  ['Incline Dumbbell Press', 'chest shoulders triceps', 'db', 'Ghế 30°, đẩy theo đường cong vào giữa.', '', 'đẩy ngực trên tạ đơn'],
  ['Decline Dumbbell Press', 'chest triceps', 'db', 'Ghế dốc xuống nhẹ, tập trung ngực dưới.', ''],
  ['Smith Machine Bench Press', 'chest triceps', 'sm', 'Thanh rơi ngang ngực giữa, cài chốt an toàn.', ''],
  ['Machine Chest Press', 'chest triceps', 'mc', 'Tay cầm ngang ngực giữa, không khoá cứng khuỷu.', '', 'máy đẩy ngực'],
  ['Incline Machine Press', 'chest shoulders', 'mc', 'Chỉnh ghế để tay cầm ngang ngực trên.', ''],
  ['Pec Deck Fly (hoặc Cable Crossover)', 'chest', 'mc', 'Khuỷu cong cố định, ôm vào và siết 1 giây.', '', 'ép ngực máy'],
  ['Cable Crossover (High to Low)', 'chest', 'cb', 'Ròng rọc cao, kéo chéo xuống trước bụng.', '', 'ép ngực cáp'],
  ['Low to High Cable Fly', 'chest shoulders', 'cb', 'Ròng rọc thấp, kéo chéo lên ngang ngực trên.', '', 'ép ngực trên cáp'],
  ['Dumbbell Fly', 'chest', 'db', 'Tạ nhẹ, mở tay vừa đủ căng ngực, không quá vai.', '', 'bay ngực'],
  ['Incline Dumbbell Fly', 'chest', 'db', 'Ghế 30°, cung tay như ôm thân cây.', ''],
  ['Dips (Chống xà kép)', 'chest triceps shoulders', 'bw', 'Nghiêng thân ra trước để dồn vào ngực.', '', 'xà kép'],
  ['Push-up', 'chest triceps abs', 'bw', 'Thân thẳng, ngực gần chạm sàn.', '', 'hít đất chống đẩy'],
  ['Incline Push-up', 'chest triceps', 'bw', 'Chống tay lên ghế cho dễ hơn push-up thường.', '', 'hít đất'],
  ['Decline Push-up', 'chest shoulders triceps', 'bw', 'Chân trên ghế, tập trung ngực trên.', '', 'hít đất'],
  ['Svend Press', 'chest', 'db', 'Ép hai mặt đĩa tạ vào nhau, đẩy thẳng ra trước.', ''],

  // ---- Lưng
  ['Pull-ups (ROM tối đa, nhả hết vai)', 'back biceps', 'bw', 'Treo thẳng tay, kéo khuỷu xuống, cằm qua xà.', '', 'kéo xà đơn hít xà'],
  ['Chin-up', 'back biceps', 'bw', 'Nắm ngửa tay, rộng bằng vai, tay trước làm nhiều hơn.', '', 'hít xà ngửa tay'],
  ['Assisted Pull-up', 'back biceps', 'mc', 'Chọn mức đỡ để làm 8–10 rep sạch.', '', 'máy hỗ trợ kéo xà'],
  ['Lat Pulldown', 'back biceps', 'cb', 'Kéo thanh về ngực trên, ngả thân 10–15°.', '', 'kéo xô'],
  ['Close-grip Lat Pulldown', 'back biceps', 'cb', 'Tay cầm chữ V, kéo về ngực, khuỷu sát thân.', '', 'kéo xô hẹp'],
  ['Single-arm Lat Pulldown', 'back', 'cb', 'Kéo một tay, khuỷu xuống về hông.', ''],
  ['Straight-arm Pulldown', 'back', 'cb', 'Tay thẳng, kéo thanh từ trên xuống đùi bằng xô.', '', 'kéo tay thẳng'],
  ['Bent-over Barbell Row', 'back biceps', 'bb', 'Thân nghiêng 30–45°, kéo về rốn, lưng phẳng.', '', 'chèo thanh đòn'],
  ['Pendlay Row', 'back', 'bb', 'Thân song song sàn, mỗi rep đặt thanh xuống sàn.', ''],
  ['T-Bar Row', 'back biceps', 'bb', 'Kéo về ngực dưới, ép bả vai.', '', 'chèo chữ t'],
  ['Chest-supported Dumbbell Row', 'back', 'db', 'Nằm sấp ghế dốc, kéo tạ về hông, không dùng đà.', '', 'chèo tì ngực'],
  ['One-arm Dumbbell Row', 'back biceps', 'db', 'Kéo tạ theo đường cong về hông.', '', 'chèo một tay'],
  ['Seated Cable Row', 'back biceps', 'cb', 'Thân đứng yên, kéo về bụng, ép bả vai.', '', 'chèo cáp ngồi'],
  ['Machine Row', 'back', 'mc', 'Ngực tì đệm, kéo khuỷu ra sau.', '', 'máy chèo'],
  ['Inverted Row', 'back biceps', 'bw', 'Nằm dưới thanh thấp, kéo ngực lên thanh.', '', 'chèo ngược'],
  ['Conventional Deadlift', 'back hamstrings glutes', 'bb', 'Lưng thẳng, thanh sát chân, đẩy sàn.', '', 'deadlift kéo đất'],
  ['Rack Pull', 'back glutes', 'bb', 'Deadlift từ ngang gối, tập trung lưng trên.', ''],
  ['Back Extension (Glute focus)', 'glutes hamstrings back', 'mc', 'Lưng trên hơi tròn, siết mông đưa thân lên.', '', 'ghế lưng 45'],
  ['Superman Hold', 'back glutes', 'bw', 'Nằm sấp, nâng tay chân, giữ 2–3 giây.', ''],
  ['Barbell Shrug', 'back shoulders', 'bb', 'Nhún vai thẳng lên tai, giữ 1 giây, không xoay.', '', 'nhún vai cơ thang'],
  ['Dumbbell Shrug', 'back shoulders', 'db', 'Nhún vai thẳng lên, hạ chậm.', '', 'nhún vai'],

  // ---- Vai
  ['Overhead Barbell Press', 'shoulders triceps', 'bb', 'Đứng, siết bụng mông, thanh đi thẳng đứng.', '', 'đẩy vai thanh đòn'],
  ['Dumbbell Shoulder Press', 'shoulders triceps', 'db', 'Ghế 75–90°, tạ ngang tai, đẩy lên.', '', 'đẩy vai tạ đơn'],
  ['Arnold Press', 'shoulders triceps', 'db', 'Xoay lòng bàn tay từ trong ra ngoài khi đẩy.', ''],
  ['Machine Shoulder Press', 'shoulders triceps', 'mc', 'Tay cầm ngang tai, không khoá khuỷu.', '', 'máy đẩy vai'],
  ['Landmine Press', 'shoulders chest', 'bb', 'Một đầu thanh tì góc, đẩy chéo lên trước.', ''],
  ['Dumbbell Side Lateral Raise', 'shoulders', 'db', 'Dẫn bằng khuỷu, nâng ngang vai, không nhún vai.', '', 'dang vai bên'],
  ['Cable Lateral Raise', 'shoulders', 'cb', 'Ròng rọc thấp, nâng một tay sang ngang.', '', 'dang vai cáp'],
  ['Machine Lateral Raise', 'shoulders', 'mc', 'Khuỷu tì đệm, nâng lên ngang vai.', ''],
  ['Lean-away Lateral Raise', 'shoulders', 'db', 'Vịn cột nghiêng người ra, biên độ dài hơn.', ''],
  ['Dumbbell Front Raise', 'shoulders', 'db', 'Nâng tạ ra trước đến ngang mắt.', '', 'nâng vai trước'],
  ['Face Pull (hoặc Reverse Pec Deck Fly)', 'shoulders back', 'cb', 'Kéo dây về trán, xoay ngoài ở cuối.', '', 'vai sau'],
  ['Reverse Pec Deck Fly', 'shoulders back', 'mc', 'Ngồi úp mặt vào máy, mở tay ra sau.', '', 'vai sau máy'],
  ['Bent-over Rear Delt Raise', 'shoulders back', 'db', 'Gập người, dang tay sang ngang bằng vai sau.', '', 'vai sau tạ đơn'],
  ['Upright Row', 'shoulders back', 'ez', 'Kéo lên ngang ngực dưới, khuỷu dẫn, nắm rộng.', ''],

  // ---- Tay trước
  ['EZ-bar Bicep Curl', 'biceps', 'ez', 'Khuỷu sát thân, không đung đưa.', '', 'cuốn tay trước'],
  ['Barbell Curl', 'biceps', 'bb', 'Nắm rộng bằng vai, cuộn lên ngang ngực.', '', 'cuốn tay'],
  ['Dumbbell Bicep Curl', 'biceps', 'db', 'Xoay ngửa cổ tay khi cuộn lên.', '', 'cuốn tay tạ đơn'],
  ['Incline Dumbbell Curl', 'biceps', 'db', 'Ngả ghế 45–60°, tay buông sau thân.', ''],
  ['Hammer Curl', 'biceps forearms', 'db', 'Lòng bàn tay hướng vào nhau suốt bài.', '', 'cuốn búa'],
  ['Preacher Curl', 'biceps', 'ez', 'Cánh tay tì ghế, hạ gần thẳng tay.', '', 'ghế cuốn tay'],
  ['Concentration Curl', 'biceps', 'db', 'Khuỷu tì mặt trong đùi, cuộn chậm.', ''],
  ['Cable Bicep Curl', 'biceps', 'cb', 'Ròng rọc thấp, giữ căng suốt biên độ.', ''],
  ['Bayesian Cable Curl', 'biceps', 'cb', 'Quay lưng vào máy, tay ra sau, cuộn lên.', ''],
  ['Spider Curl', 'biceps', 'db', 'Nằm sấp ghế dốc, tay buông thẳng xuống, cuộn lên.', ''],
  ['Reverse Grip Barbell Curl (phát triển cẳng tay)', 'forearms biceps', 'bb', 'Nắm sấp tay, cổ tay thẳng.', '', 'cuốn ngược'],
  ['Wrist Curl', 'forearms', 'db', 'Cẳng tay tì đùi, cuộn cổ tay lên.', '', 'cổ tay'],
  ['Reverse Wrist Curl', 'forearms', 'db', 'Lòng bàn tay úp, nâng mu bàn tay lên.', '', 'cổ tay'],
  ["Farmer's Walk", 'forearms back abs', 'db', 'Cầm tạ nặng hai tay, đi thẳng người 30–40 m.', 'giây', 'đi bộ cầm tạ'],
  ['Dead Hang', 'forearms back', 'bw', 'Treo xà thẳng tay, giữ lâu nhất có thể.', 'giây', 'treo xà'],

  // ---- Tay sau
  ['Cable Tricep Pushdown', 'triceps', 'cb', 'Khuỷu cố định sát sườn, duỗi thẳng tay.', '', 'đẩy cáp tay sau'],
  ['Rope Pushdown', 'triceps', 'cb', 'Tách hai đầu dây ra ở điểm cuối.', '', 'đẩy dây tay sau'],
  ['Overhead Cable Extension', 'triceps', 'cb', 'Quay lưng vào máy, duỗi tay qua đầu.', '', 'duỗi tay sau qua đầu'],
  ['Overhead Dumbbell Extension', 'triceps', 'db', 'Hai tay ôm một tạ sau đầu, duỗi lên.', ''],
  ['Skull Crusher (EZ-bar)', 'triceps', 'ez', 'Nằm ghế, hạ thanh về trán/sau đầu, khuỷu cố định.', '', 'nằm duỗi tay sau'],
  ['Close-grip Bench Press', 'triceps chest', 'bb', 'Nắm rộng bằng vai, khuỷu sát thân.', '', 'đẩy ngực hẹp'],
  ['Bench Dips', 'triceps', 'bw', 'Tay chống ghế sau lưng, hạ đến 90°.', '', 'chống ghế'],
  ['Dumbbell Kickback', 'triceps', 'db', 'Gập người, cánh tay song song sàn, duỗi ra sau.', ''],
  ['Diamond Push-up', 'triceps chest', 'bw', 'Hai tay chụm hình kim cương dưới ngực.', '', 'hít đất kim cương'],

  // ---- Đùi trước / Mông / Đùi sau
  ['Barbell Back Squat', 'quads glutes hamstrings', 'bb', 'Gối theo mũi chân, đùi song song sàn hoặc sâu hơn.', '', 'gánh tạ squat'],
  ['Wide-stance Barbell Squat', 'glutes quads', 'bb', 'Chân rộng 1,5 lần vai, mũi chân xoay ra.', '', 'squat chân rộng sumo'],
  ['Front Squat', 'quads glutes abs', 'bb', 'Thanh trên vai trước, khuỷu cao, thân thẳng.', ''],
  ['Goblet Squat', 'quads glutes', 'db', 'Ôm tạ trước ngực, ngồi giữa hai gót.', ''],
  ['Smith Machine Squat', 'quads glutes', 'sm', 'Chân hơi đặt trước thanh, cài chốt an toàn.', ''],
  ['Hack Squat', 'quads glutes', 'mc', 'Lưng tì đệm, hạ sâu, đạp cả bàn chân.', ''],
  ['Leg Press', 'quads glutes', 'mc', 'Hông áp đệm, không khoá gối ở trên.', '', 'đạp đùi'],
  ['Leg Extension', 'quads', 'mc', 'Duỗi gối hết, siết đùi 1 giây.', '', 'đá đùi'],
  ['Bulgarian Split Squat (với tạ đơn)', 'glutes quads', 'db', 'Chân sau trên ghế, hạ gối sau gần sàn.', '', 'chùng chân'],
  ['Walking Lunge', 'glutes quads', 'db', 'Bước dài, gối sau gần chạm sàn.', '', 'lunge bước'],
  ['Reverse Lunge', 'glutes quads', 'db', 'Bước lùi ra sau, nhẹ cho gối hơn lunge trước.', '', 'lunge lùi'],
  ['Step-up', 'glutes quads', 'db', 'Đạp gót chân trên bục, không bật chân dưới.', '', 'bước bục'],
  ['Sissy Squat', 'quads', 'bw', 'Ngả người ra sau, gối đẩy ra trước, có tay vịn.', ''],
  ['Wall Sit', 'quads', 'bw', 'Lưng áp tường, đùi song song sàn.', 'giây', 'ngồi tường'],
  ['Romanian Deadlift (RDL)', 'hamstrings glutes', 'bb', 'Đẩy hông ra sau, thanh sát đùi, lưng thẳng.', '', 'rdl'],
  ['Dumbbell Romanian Deadlift', 'hamstrings glutes', 'db', 'Như RDL thanh đòn, tạ trượt sát chân.', '', 'rdl tạ đơn'],
  ['Single-leg Romanian Deadlift', 'hamstrings glutes', 'db', 'Một chân, thân và chân sau thành đường thẳng.', ''],
  ['Stiff-leg Deadlift', 'hamstrings', 'bb', 'Gối gần thẳng, hạ đến khi đùi sau căng.', ''],
  ['Good Morning', 'hamstrings back', 'bb', 'Thanh trên vai, gập hông, lưng thẳng.', ''],
  ['Lying / Seated Leg Curl', 'hamstrings', 'mc', 'Hông không nhấc, duỗi chậm.', '', 'móc đùi sau'],
  ['Nordic Hamstring Curl', 'hamstrings', 'bw', 'Quỳ, cố định gót, ngả xuống chậm nhất có thể.', ''],
  ['Glute Ham Raise', 'hamstrings glutes', 'mc', 'Trên máy GHR, gập gối kéo thân lên.', ''],
  ['Hip Thrust (Barbell)', 'glutes hamstrings', 'bb', 'Lưng trên tựa ghế, đẩy hông lên, cuộn xương chậu.', '', 'đẩy hông'],
  ['Hip Thrust Machine', 'glutes', 'mc', 'Như hip thrust thanh đòn, ổn định hơn.', '', 'đẩy hông máy'],
  ['Single-leg Hip Thrust', 'glutes', 'bw', 'Một chân trên sàn, chân kia co lên.', ''],
  ['Glute Bridge', 'glutes', 'bw', 'Nằm ngửa, đẩy hông, siết mông 2 giây.', '', 'cầu mông'],
  ['Cable Glute Kickback', 'glutes', 'cb', 'Đá chân ra sau–lên, không ưỡn lưng.', '', 'đá mông cáp'],
  ['Hip Abduction Machine', 'glutes', 'mc', 'Mở đùi ra ngoài, nghiêng thân ra trước nhẹ.', '', 'mở đùi máy'],
  ['Cable Hip Abduction', 'glutes', 'cb', 'Đứng nghiêng, đá chân sang ngang.', ''],
  ['Banded Lateral Walk', 'glutes', 'band', 'Dây quanh gối, bước ngang giữ gối mở.', '', 'đi ngang dây'],
  ['Frog Pump', 'glutes', 'bw', 'Lòng bàn chân áp nhau, đẩy hông lên nhanh.', ''],
  ['Kettlebell Swing', 'glutes hamstrings cardio', 'kb', 'Bật hông đưa tạ lên ngang ngực, không nâng bằng tay.', '', 'vung tạ ấm'],
  ['Sumo Deadlift', 'glutes quads hamstrings', 'bb', 'Chân rất rộng, tay nắm trong gối, thân thẳng hơn.', ''],

  // ---- Bắp chân
  ['Standing Calf Raise', 'calves', 'mc', 'Hạ gót hết, kiễng cao nhất, giữ 1 giây.', '', 'nhón bắp chân'],
  ['Seated Calf Raise', 'calves', 'mc', 'Ngồi, đệm trên gối, tập cơ dép.', ''],
  ['Leg Press Calf Raise', 'calves', 'mc', 'Trên máy đạp đùi, đẩy bằng mũi chân.', ''],
  ['Single-leg Calf Raise', 'calves', 'db', 'Một chân trên bục, cầm tạ một tay.', ''],

  // ---- Bụng
  ['Plank', 'abs', 'bw', 'Thân thẳng, siết bụng và mông.', 'giây'],
  ['Side Plank', 'abs', 'bw', 'Chống một khuỷu, hông không chảy xuống.', 'giây', 'plank nghiêng'],
  ['Hanging Leg Raise', 'abs', 'bw', 'Cuộn xương chậu lên, không đung đưa.', '', 'treo nâng chân'],
  ['Hanging Knee Raise', 'abs', 'bw', 'Co gối lên ngực, dễ hơn nâng chân thẳng.', '', 'treo co gối'],
  ['Captain\'s Chair Leg Raise', 'abs', 'mc', 'Tì khuỷu trên ghế, nâng gối lên.', ''],
  ['Decline Weighted Crunch', 'abs', 'bw', 'Cuộn thân từng đốt, không kéo cổ.', '', 'gập bụng ghế dốc'],
  ['Crunch', 'abs', 'bw', 'Nâng vai khỏi sàn, lưng dưới áp sàn.', '', 'gập bụng'],
  ['Cable Crunch', 'abs', 'cb', 'Quỳ, cuộn khuỷu về đùi.', '', 'gập bụng cáp'],
  ['Machine Crunch', 'abs', 'mc', 'Cuộn thân xuống, siết bụng.', ''],
  ['Reverse Crunch', 'abs', 'bw', 'Nằm ngửa, cuộn hông lên khỏi sàn.', ''],
  ['Ab Roller (Con lăn tập bụng)', 'abs', 'bw', 'Lưng hơi tròn, biên độ vừa sức.', '', 'con lăn'],
  ['Dead Bug', 'abs', 'bw', 'Lưng dưới áp sàn, duỗi tay chân đối bên.', ''],
  ['Bicycle Crunch', 'abs', 'bw', 'Khuỷu chạm gối đối bên, chậm và có kiểm soát.', '', 'đạp xe'],
  ['Russian Twist', 'abs', 'db', 'Ngả người 45°, xoay thân sang hai bên.', '', 'xoay người'],
  ['Pallof Press', 'abs', 'cb', 'Đứng nghiêng với cáp, đẩy thẳng ra, chống xoay.', ''],
  ['Cable Woodchopper', 'abs', 'cb', 'Kéo cáp chéo từ cao xuống thấp, xoay thân.', '', 'chặt củi'],
  ['Dumbbell Side Bend', 'abs', 'db', 'Nghiêng sang ngang, dùng sườn kéo về.', '', 'nghiêng sườn'],
  ['Mountain Climber', 'abs cardio', 'bw', 'Tư thế chống đẩy, kéo gối luân phiên lên ngực.', 'giây', 'leo núi'],
  ['Hollow Body Hold', 'abs', 'bw', 'Lưng dưới áp sàn, tay chân duỗi thẳng nâng lên.', 'giây'],
  ['V-up', 'abs', 'bw', 'Nâng thân và chân cùng lúc chạm nhau.', ''],

  // ---- Cardio
  ['Incline Treadmill Walk (Zone 2)', 'cardio', 'mc', 'Dốc 6–12%, 4,5–5,5 km/h, không vịn tay.', 'phút', 'đi bộ máy chạy dốc'],
  ['Treadmill Run', 'cardio', 'mc', 'Chạy đều, nói chuyện được ngắt quãng.', 'phút', 'chạy bộ'],
  ['Stationary Bike', 'cardio', 'mc', 'Đạp đều, kháng lực vừa.', 'phút', 'xe đạp'],
  ['Elliptical', 'cardio', 'mc', 'Máy tập toàn thân, ít tác động gối.', 'phút', 'máy elip'],
  ['Rowing Machine', 'cardio back', 'mc', 'Đạp chân trước, kéo tay sau.', 'phút', 'chèo thuyền'],
  ['Stair Climber', 'cardio glutes', 'mc', 'Đứng thẳng, không bám tay vịn.', 'phút', 'leo cầu thang'],
  ['Jump Rope', 'cardio calves', 'bw', 'Nhảy nhẹ bằng mũi chân.', 'phút', 'nhảy dây'],
  ['HIIT Intervals (Bike/Run)', 'cardio', 'mc', '20–30 giây hết sức / 60–90 giây nghỉ, 6–10 hiệp.', 'phút', 'hiit'],
  ['Burpee', 'cardio abs', 'bw', 'Ngồi xuống, bật chân ra sau, chống đẩy, bật lên.', 'giây'],

  // ---- Giãn cơ
  ['Mobility & Stretching', 'mobility', 'bw', 'Giãn hông, ngực, cột sống ngực, đùi sau.', 'phút', 'giãn cơ'],
  ['Foam Rolling', 'mobility', 'bw', 'Lăn chậm các nhóm cơ căng, 30–60 giây mỗi chỗ.', 'phút', 'con lăn xốp'],
  ['Hip Flexor Stretch', 'mobility', 'bw', 'Quỳ một gối, đẩy hông ra trước, siết mông.', 'giây', 'giãn gập hông'],
  ['Thoracic Rotation', 'mobility', 'bw', 'Nằm nghiêng, mở tay trên xoay ngực ra sau.', 'giây', 'xoay ngực'],
  ['Pigeon Stretch', 'mobility', 'bw', 'Một chân gập trước, chân kia duỗi sau, giãn mông.', 'giây', 'giãn mông'],
];

const slug = (s) => normalize(s).replace(/[^a-z0-9]+/g, '-');

export const EXERCISES = RAW.map(([name, groups, eq, tip, unit, kw]) => {
  const g = groups.split(' ');
  return {
    name,
    groups: g,
    equipment: EQ[eq] || '',
    tip,
    unit: unit || null,
    search: normalize(`${name} ${kw || ''} ${g.map((x) => MUSCLE_LABEL[x]).join(' ')} ${EQ[eq] || ''}`),
    id: slug(name),
  };
});
export const EXERCISE_BY_NAME = Object.fromEntries(EXERCISES.map((e) => [e.name, e]));

export const groupsOf = (name) => EXERCISE_BY_NAME[name]?.groups || [];

// Nhóm cơ của một buổi: hợp nhóm cơ của các bài trong buổi (bỏ cardio/giãn cơ nếu buổi chủ yếu là tạ)
export function dayGroups(exerciseNames) {
  const set = new Set();
  for (const n of exerciseNames) for (const g of groupsOf(n).slice(0, 2)) set.add(g);
  return [...set];
}

// Tìm bài: mọi từ gõ đều phải khớp; ưu tiên bài có từ bắt đầu bằng chuỗi gõ, rồi đến bài đúng nhóm cơ
export function searchExercises(query, { groups = null, exclude = [] } = {}) {
  const q = normalize(query.trim());
  const words = q ? q.split(/\s+/) : [];
  const ex = new Set(exclude);
  const inGroup = (e) => !groups || groups.length === 0 || e.groups.some((g) => groups.includes(g));
  return EXERCISES.filter((e) => !ex.has(e.name) && (q ? true : inGroup(e)) && words.every((w) => e.search.includes(w)))
    .map((e) => {
      const nm = normalize(e.name);
      const starts = q && (nm.startsWith(q) || nm.split(/[^a-z0-9]+/).some((t) => t.startsWith(words[0])));
      return { e, score: (starts ? 0 : 2) + (inGroup(e) ? 0 : 1) };
    })
    .sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name))
    .map((x) => x.e);
}
