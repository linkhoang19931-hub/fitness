import Dexie from 'dexie';

export const db = new Dexie('ShuruTrackerDB');

// Schema theo mục 5 của URD, bổ sung:
//  - foodPresets: danh mục món ăn mẫu (Presets 1-chạm)
//  - checkinPhotos: chỉ đánh chỉ mục theo date (Blob không thể làm khoá chỉ mục)
// Các trường không cần truy vấn (startedAt, notes, exerciseOrder, thumbBlob...) vẫn được lưu nhưng không đánh chỉ mục.
db.version(1).stores({
  // workouts: { id, date, dayIndex, targetMuscle, startedAt, completedAt, notes: { [exerciseName]: string } }
  workouts: '++id, date, dayIndex, targetMuscle, completedAt',
  // exerciseLogs: { id, workoutId, exerciseName, exerciseOrder, setIndex, weightKg, reps, isCompleted (0|1) }
  exerciseLogs: '++id, workoutId, exerciseName, setIndex, weightKg, reps, isCompleted',
  // nutritionLogs: { id, date, mealName, protein, fat, carbs, calories, createdAt }
  nutritionLogs: '++id, date, mealName, protein, fat, carbs, calories',
  // bodyMetrics: { id, date, weightKg, note }  — mỗi ngày 1 bản ghi
  bodyMetrics: '++id, date, weightKg, note',
  // checkinPhotos: { id, date, imageBlob, thumbBlob, mime }  — mỗi ngày 1 ảnh
  checkinPhotos: '++id, date',
  // foodPresets: { id, name, protein, fat, carbs }
  foodPresets: '++id, name',
});

// v2: thực đơn sửa được theo từng ngày.
// dayPlans: { date, planId, mode, meals: [{ key, time, name, eaten, items: [{ uid, foodId, name, n, protein, fat, carbs }] }] }
//   protein/fat/carbs của item là giá trị cho n = 1; nutritionLogs của bữa đã ăn mang planKey = `${date}:${meal.key}`.
db.version(2).stores({
  dayPlans: 'date',
});

export const TABLES = ['workouts', 'exerciseLogs', 'nutritionLogs', 'bodyMetrics', 'checkinPhotos', 'foodPresets', 'dayPlans'];

export const DEFAULT_PRESETS = [
  { name: 'Cơm trắng (200g)', protein: 5.4, fat: 0.6, carbs: 56 },
  { name: 'Ức gà áp chảo không dầu (150g)', protein: 46.5, fat: 5.4, carbs: 0 },
  { name: '1 muỗng Whey Isolate (30g)', protein: 27, fat: 0.5, carbs: 1 },
  { name: 'Lòng trắng trứng luộc (4 quả)', protein: 14.4, fat: 0.2, carbs: 0.8 },
  { name: 'Khoai lang luộc (200g)', protein: 3.2, fat: 0.2, carbs: 40 },
  { name: 'Yến mạch (50g)', protein: 6.7, fat: 3.4, carbs: 33 },
];

// Lần đầu mở app: nạp sẵn danh mục món mẫu
db.on('populate', (tx) => {
  tx.table('foodPresets').bulkAdd(DEFAULT_PRESETS);
});

export const kcalOf = (p, f, c) => Math.round((+p || 0) * 4 + (+f || 0) * 9 + (+c || 0) * 4);
