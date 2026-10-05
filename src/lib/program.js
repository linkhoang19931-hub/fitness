// Chương trình tập theo giới tính × số buổi/tuần.
// Nguyên tắc chung (tham khảo các phân tích gộp về tần suất & khối lượng tập):
//  - Mỗi nhóm cơ nên được tập ≥ 2 lần/tuần khi lịch cho phép (3–5 buổi dùng full body / upper–lower / kết hợp).
//  - Khoảng 10+ set hiệu quả mỗi nhóm cơ mỗi tuần; bài compound 6–10 rep, bài cô lập 10–15 rep.
//  - Nam và nữ tăng cơ tương đối gần như nhau; chương trình nữ khác ở trọng tâm (mông, chân, cơ lõi)
//    theo mục tiêu phổ biến, không phải vì cơ thể nữ cần cách tập khác.
//  - 7 buổi = 6 buổi tạ + 1 buổi hồi phục chủ động (cardio nhẹ vùng 2, giãn cơ).
//  - Chương trình nam 6 buổi giữ nguyên lịch chia nhóm cơ trong yêu cầu ban đầu.

// Bài tính theo thời gian (không có kg/rep)
export const TIMED = {
  'Incline Treadmill Walk (Zone 2)': 'phút',
  'Mobility & Stretching': 'phút',
  Plank: 'giây',
};
export const unitOf = (name) => TIMED[name] || null;

const E = (name, sets = 3) => ({ name, sets });
const D = (muscle, focus, exercises) => ({ muscle, focus, exercises });

const RECOVERY = D('Hồi phục', 'Cardio nhẹ vùng 2 & giãn cơ', [
  E('Incline Treadmill Walk (Zone 2)', 1),
  E('Mobility & Stretching', 1),
  E('Plank', 3),
]);

// ---------------- NAM ----------------
const M6 = [
  D('Ngực', 'Upper Chest Focus', [E('Incline Barbell/Smith Bench Press', 4), E('Incline Dumbbell Press'), E('Pec Deck Fly (hoặc Cable Crossover)'), E('Dips (Chống xà kép)')]),
  D('Lưng', 'Back Width & Thickness', [E('Pull-ups (ROM tối đa, nhả hết vai)', 4), E('Lat Pulldown'), E('Bent-over Barbell Row', 4), E('One-arm Dumbbell Row')]),
  D('Chân & Mông', 'Glutes & Hamstrings Focus', [E('Wide-stance Barbell Squat', 4), E('Bulgarian Split Squat (với tạ đơn)'), E('Lying / Seated Leg Curl'), E('Romanian Deadlift (RDL)')]),
  D('Tay', 'Biceps & Triceps', [E('EZ-bar Bicep Curl'), E('Incline Dumbbell Curl'), E('Cable Tricep Pushdown'), E('Overhead Cable Extension'), E('Reverse Grip Barbell Curl (phát triển cẳng tay)')]),
  D('Vai', 'Lateral & Rear Delts Focus', [E('Dumbbell Side Lateral Raise', 4), E('Cable Lateral Raise'), E('Face Pull (hoặc Reverse Pec Deck Fly)'), E('Dumbbell Shoulder Press')]),
  D('Bụng', 'Dedicated Blocky Abs Day', [E('Decline Weighted Crunch'), E('Hanging Leg Raise'), E('Ab Roller (Con lăn tập bụng)'), E('Dumbbell Side Bend')]),
];

const M3 = [
  D('Toàn thân A', 'Squat · Đẩy ngực · Kéo', [E('Barbell Back Squat', 4), E('Barbell Bench Press', 4), E('Bent-over Barbell Row'), E('Dumbbell Shoulder Press'), E('EZ-bar Bicep Curl', 2), E('Cable Tricep Pushdown', 2)]),
  D('Toàn thân B', 'Hông · Ngực trên · Xà đơn', [E('Romanian Deadlift (RDL)'), E('Incline Dumbbell Press'), E('Pull-ups (ROM tối đa, nhả hết vai)', 4), E('Walking Lunge'), E('Dumbbell Side Lateral Raise'), E('Hanging Leg Raise')]),
  D('Toàn thân C', 'Đùi · Vai · Lưng xô', [E('Leg Press'), E('Overhead Barbell Press'), E('Lat Pulldown'), E('Dips (Chống xà kép)'), E('Lying / Seated Leg Curl'), E('Face Pull (hoặc Reverse Pec Deck Fly)')]),
];

const M4 = [
  D('Thân trên A', 'Sức mạnh · tạ nặng', [E('Barbell Bench Press', 4), E('Bent-over Barbell Row', 4), E('Overhead Barbell Press'), E('Lat Pulldown'), E('EZ-bar Bicep Curl', 2), E('Cable Tricep Pushdown', 2)]),
  D('Thân dưới A', 'Squat · Đùi sau', [E('Barbell Back Squat', 4), E('Romanian Deadlift (RDL)'), E('Leg Press'), E('Lying / Seated Leg Curl'), E('Standing Calf Raise'), E('Cable Crunch')]),
  D('Thân trên B', 'Tăng cơ · rep cao hơn', [E('Incline Dumbbell Press'), E('Pull-ups (ROM tối đa, nhả hết vai)', 4), E('Seated Cable Row'), E('Dumbbell Side Lateral Raise'), E('Incline Dumbbell Curl'), E('Overhead Cable Extension')]),
  D('Thân dưới B', 'Deadlift · Mông', [E('Conventional Deadlift'), E('Bulgarian Split Squat (với tạ đơn)'), E('Leg Extension'), E('Lying / Seated Leg Curl'), E('Hanging Leg Raise'), E('Standing Calf Raise')]),
];

const M5 = [
  D('Thân trên', 'Sức mạnh', [E('Barbell Bench Press', 4), E('Bent-over Barbell Row', 4), E('Overhead Barbell Press'), E('Lat Pulldown'), E('EZ-bar Bicep Curl', 2), E('Cable Tricep Pushdown', 2)]),
  D('Thân dưới', 'Squat · Đùi sau', [E('Barbell Back Squat', 4), E('Romanian Deadlift (RDL)'), E('Leg Press'), E('Lying / Seated Leg Curl'), E('Standing Calf Raise')]),
  D('Đẩy', 'Ngực · Vai · Tay sau', [E('Incline Dumbbell Press', 4), E('Dumbbell Shoulder Press'), E('Pec Deck Fly (hoặc Cable Crossover)'), E('Dumbbell Side Lateral Raise', 4), E('Overhead Cable Extension')]),
  D('Kéo', 'Lưng · Vai sau · Tay trước', [E('Pull-ups (ROM tối đa, nhả hết vai)', 4), E('One-arm Dumbbell Row'), E('Seated Cable Row'), E('Face Pull (hoặc Reverse Pec Deck Fly)'), E('Incline Dumbbell Curl'), E('Hammer Curl')]),
  D('Chân & Bụng', 'Mông · Đùi · Cơ bụng', [E('Bulgarian Split Squat (với tạ đơn)'), E('Hip Thrust (Barbell)'), E('Leg Extension'), E('Lying / Seated Leg Curl'), E('Ab Roller (Con lăn tập bụng)'), E('Hanging Leg Raise')]),
];

// ---------------- NỮ ----------------
const F3 = [
  D('Toàn thân A', 'Mông · Lưng xô · Vai', [E('Hip Thrust (Barbell)', 4), E('Goblet Squat'), E('Lat Pulldown'), E('Dumbbell Shoulder Press'), E('Cable Glute Kickback'), E('Plank')]),
  D('Toàn thân B', 'Đùi sau · Ngực · Lưng giữa', [E('Romanian Deadlift (RDL)'), E('Push-up'), E('Seated Cable Row'), E('Walking Lunge'), E('Hip Abduction Machine'), E('Dead Bug')]),
  D('Toàn thân C', 'Chân từng bên · Kéo · Vai', [E('Leg Press'), E('Bulgarian Split Squat (với tạ đơn)'), E('Assisted Pull-up'), E('Dumbbell Side Lateral Raise'), E('Lying / Seated Leg Curl'), E('Cable Crunch')]),
];

const F4 = [
  D('Thân dưới A', 'Mông', [E('Hip Thrust (Barbell)', 4), E('Romanian Deadlift (RDL)'), E('Bulgarian Split Squat (với tạ đơn)'), E('Cable Glute Kickback'), E('Hip Abduction Machine')]),
  D('Thân trên A', 'Lưng · Ngực · Vai', [E('Lat Pulldown'), E('Flat Dumbbell Press'), E('Seated Cable Row'), E('Dumbbell Shoulder Press'), E('Dumbbell Side Lateral Raise'), E('Cable Tricep Pushdown', 2)]),
  D('Thân dưới B', 'Đùi trước · Đùi sau', [E('Goblet Squat', 4), E('Leg Press'), E('Lying / Seated Leg Curl'), E('Walking Lunge'), E('Standing Calf Raise')]),
  D('Thân trên B', 'Kéo · Vai sau · Cơ lõi', [E('Assisted Pull-up'), E('Incline Dumbbell Press'), E('One-arm Dumbbell Row'), E('Face Pull (hoặc Reverse Pec Deck Fly)'), E('Hammer Curl', 2), E('Plank'), E('Dead Bug')]),
];

const F5 = [
  D('Mông & đùi sau', 'Hip thrust nặng', [E('Hip Thrust (Barbell)', 4), E('Romanian Deadlift (RDL)'), E('Back Extension (Glute focus)'), E('Lying / Seated Leg Curl'), E('Hip Abduction Machine')]),
  D('Thân trên – Đẩy', 'Ngực · Vai · Tay sau', [E('Flat Dumbbell Press'), E('Dumbbell Shoulder Press'), E('Dumbbell Side Lateral Raise'), E('Push-up', 2), E('Cable Tricep Pushdown')]),
  D('Đùi trước', 'Squat · Lunge', [E('Goblet Squat', 4), E('Leg Press'), E('Walking Lunge'), E('Leg Extension'), E('Standing Calf Raise')]),
  D('Thân trên – Kéo', 'Lưng · Vai sau · Tay trước', [E('Lat Pulldown'), E('Seated Cable Row'), E('One-arm Dumbbell Row'), E('Face Pull (hoặc Reverse Pec Deck Fly)'), E('Hammer Curl')]),
  D('Mông & bụng', 'Từng bên · Cơ lõi', [E('Glute Bridge'), E('Bulgarian Split Squat (với tạ đơn)'), E('Step-up'), E('Cable Glute Kickback'), E('Cable Crunch'), E('Plank')]),
];

const F6 = [
  D('Mông (nặng)', 'Hip thrust · RDL', [E('Hip Thrust (Barbell)', 4), E('Romanian Deadlift (RDL)'), E('Hip Abduction Machine'), E('Cable Glute Kickback')]),
  D('Lưng & tay trước', 'Lưng xô · Lưng giữa', [E('Lat Pulldown'), E('Seated Cable Row'), E('Assisted Pull-up'), E('Face Pull (hoặc Reverse Pec Deck Fly)'), E('Hammer Curl')]),
  D('Đùi trước & bắp chân', 'Squat · Leg press', [E('Barbell Back Squat', 4), E('Leg Press'), E('Leg Extension'), E('Walking Lunge'), E('Standing Calf Raise')]),
  D('Ngực, vai & tay sau', 'Đẩy', [E('Incline Dumbbell Press'), E('Dumbbell Shoulder Press'), E('Dumbbell Side Lateral Raise', 4), E('Pec Deck Fly (hoặc Cable Crossover)'), E('Cable Tricep Pushdown')]),
  D('Mông & đùi sau', 'Từng bên · Glute bridge', [E('Bulgarian Split Squat (với tạ đơn)'), E('Glute Bridge'), E('Back Extension (Glute focus)'), E('Lying / Seated Leg Curl'), E('Step-up')]),
  D('Bụng & cardio', 'Cơ lõi · Đốt mỡ nhẹ', [E('Cable Crunch'), E('Hanging Leg Raise'), E('Dead Bug'), E('Plank'), E('Incline Treadmill Walk (Zone 2)', 1)]),
];

const mk = (id, sex, days, split, list) => ({ id, sex, days, split, list });

export const PROGRAMS = [
  mk('m3', 'male', 3, 'Toàn thân 3 buổi', M3),
  mk('m4', 'male', 4, 'Thân trên / thân dưới', M4),
  mk('m5', 'male', 5, 'Trên / Dưới / Đẩy / Kéo / Chân', M5),
  mk('m6', 'male', 6, 'Chia nhóm cơ 6 ngày', M6),
  mk('m7', 'male', 7, 'Chia nhóm cơ 6 ngày + hồi phục', [...M6, RECOVERY]),
  mk('f3', 'female', 3, 'Toàn thân 3 buổi, ưu tiên mông', F3),
  mk('f4', 'female', 4, 'Thân trên / thân dưới, ưu tiên mông', F4),
  mk('f5', 'female', 5, 'Mông · Đẩy · Đùi · Kéo · Mông & bụng', F5),
  mk('f6', 'female', 6, 'Chia nhóm cơ 6 ngày, ưu tiên thân dưới', F6),
  mk('f7', 'female', 7, 'Chia nhóm cơ 6 ngày + hồi phục', [...F6, RECOVERY]),
].map((p) => ({ ...p, list: p.list.map((d, i) => ({ ...d, dayIndex: i + 1 })) }));

export const TRAINING_DAYS = [3, 4, 5, 6, 7];

export function getProgram(sex, days) {
  const s = sex === 'female' ? 'female' : 'male';
  const d = TRAINING_DAYS.includes(+days) ? +days : 6;
  return PROGRAMS.find((p) => p.sex === s && p.days === d);
}
export const programById = (id) => PROGRAMS.find((p) => p.id === id) || PROGRAMS.find((p) => p.id === 'm6');
// Buổi tập cũ (trước khi có nhiều chương trình) thuộc chương trình nam 6 ngày
export const programOfWorkout = (w) => programById(w?.programId || 'm6');

export function dayOf(program, dayIndex) {
  return program.list.find((d) => d.dayIndex === dayIndex) || program.list[0];
}

// Buổi kế tiếp = buổi ngay sau buổi đã hoàn thành gần nhất (theo vòng của chương trình)
export const nextDayIndex = (lastDayIndex, total) => (lastDayIndex && lastDayIndex < total ? lastDayIndex + 1 : 1);

// Màu nhận diện theo thứ tự buổi trong chương trình (bảng màu hệ thống iOS)
export const DAY_COLORS = { 1: '#ff375f', 2: '#0a84ff', 3: '#30d158', 4: '#ff9f0a', 5: '#bf5af2', 6: '#40c8e0', 7: '#ac8e68' };

// Hệ số vận động (nhân với BMR) theo công việc hằng ngày × số buổi tập/tuần
export const JOBS = [
  { value: 'desk', label: 'Ngồi nhiều', hint: 'Văn phòng, lái xe' },
  { value: 'mixed', label: 'Đi lại nhiều', hint: 'Bán hàng, giáo viên' },
  { value: 'manual', label: 'Lao động chân tay', hint: 'Bốc vác, xây dựng' },
];
const BASE = { 3: 1.375, 4: 1.425, 5: 1.475, 6: 1.525, 7: 1.55 };
const JOB_ADD = { desk: 0, mixed: 0.1, manual: 0.2 };
export const activityFactor = (job, days) => Math.round(((BASE[days] ?? 1.525) + (JOB_ADD[job] ?? 0)) * 1000) / 1000;
