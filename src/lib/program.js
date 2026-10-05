// Chu kỳ 6 ngày luân phiên (Rolling 6-Day Split) — Module 1.1 của URD
export const PROGRAM = [
  {
    dayIndex: 1,
    muscle: 'Ngực',
    focus: 'Upper Chest Focus',
    exercises: [
      'Incline Barbell/Smith Bench Press',
      'Incline Dumbbell Press',
      'Pec Deck Fly (hoặc Cable Crossover)',
      'Dips (Chống xà kép)',
    ],
  },
  {
    dayIndex: 2,
    muscle: 'Lưng',
    focus: 'Back Width & Thickness',
    exercises: ['Pull-ups (ROM tối đa, nhả hết vai)', 'Lat Pulldown', 'Bent-over Barbell Row', 'One-arm Dumbbell Row'],
  },
  {
    dayIndex: 3,
    muscle: 'Chân & Mông',
    focus: 'Glutes & Hamstrings Focus',
    exercises: [
      'Wide-stance Barbell Squat',
      'Bulgarian Split Squat (với tạ đơn)',
      'Lying / Seated Leg Curl',
      'Romanian Deadlift (RDL)',
    ],
  },
  {
    dayIndex: 4,
    muscle: 'Tay',
    focus: 'Biceps & Triceps',
    exercises: [
      'EZ-bar Bicep Curl',
      'Incline Dumbbell Curl',
      'Cable Tricep Pushdown',
      'Overhead Cable Extension',
      'Reverse Grip Barbell Curl (phát triển cẳng tay)',
    ],
  },
  {
    dayIndex: 5,
    muscle: 'Vai',
    focus: 'Lateral & Rear Delts Focus',
    exercises: [
      'Dumbbell Side Lateral Raise',
      'Cable Lateral Raise',
      'Face Pull (hoặc Reverse Pec Deck Fly)',
      'Dumbbell Shoulder Press',
    ],
  },
  {
    dayIndex: 6,
    muscle: 'Bụng',
    focus: 'Dedicated Blocky Abs Day',
    exercises: ['Decline Weighted Crunch', 'Hanging Leg Raise', 'Ab Roller (Con lăn tập bụng)', 'Dumbbell Side Bend'],
  },
];

// Màu nhận diện từng ngày (bảng màu hệ thống iOS)
export const DAY_COLORS = { 1: '#ff375f', 2: '#0a84ff', 3: '#30d158', 4: '#ff9f0a', 5: '#bf5af2', 6: '#40c8e0' };

export const dayOf = (dayIndex) => PROGRAM.find((d) => d.dayIndex === dayIndex) || PROGRAM[0];

// Buổi kế tiếp = nhóm cơ ngay sau buổi đã hoàn thành gần nhất (không phụ thuộc thứ trong tuần,
// nghỉ bao nhiêu ngày cũng không nhảy cóc).
export const nextDayIndex = (lastCompletedDayIndex) =>
  lastCompletedDayIndex ? (lastCompletedDayIndex % 6) + 1 : 1;

export const DEFAULT_SETS = 3;
