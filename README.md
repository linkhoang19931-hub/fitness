# Linh's Fitness Tracker

PWA local-first: lịch tập 6 ngày luân phiên, nhật ký set/reps có tham chiếu buổi trước, bộ đếm nghỉ, nhật ký PFC với trần Fat, cân nặng + trung bình trượt 7 ngày, ảnh check-in, sao lưu JSON/CSV. Không máy chủ, không cloud — toàn bộ dữ liệu nằm trong IndexedDB của trình duyệt.

## Chạy thử trên máy tính

Cần Node.js 20.19+ (khuyên dùng Node 22).

```bash
npm install
npm run dev        # mở http://localhost:5173
npm run build      # xuất bản tĩnh ra thư mục docs/
npm run preview    # chạy thử bản build (có service worker, offline)
```

## Đang chạy tại GitHub Pages

https://linkhoang19931-hub.github.io/fitness/

Thư mục `docs/` là bản đã build mà GitHub Pages phục vụ (Settings → Pages → *Deploy from a branch* → `main` / `/docs`). Sau khi sửa code, chạy `npm run build` (ghi đè `docs/`) rồi commit cả `docs/` lên là trang tự cập nhật sau 1–2 phút.

## Các cách host khác

PWA chỉ cài được khi chạy trên **HTTPS**, vì vậy cần đưa thư mục `docs/` lên một host tĩnh. Chọn một trong ba cách:

**Cách 1 — Cloudflare Pages / Netlify (nhanh nhất, không cần Git):**
1. Chạy `npm run build` (bản build nằm trong `docs/`).
2. Vào https://app.netlify.com/drop (hoặc Cloudflare Pages → *Upload assets*), kéo thả thư mục `docs/` vào.
3. Nhận link dạng `https://ten-app.netlify.app`.

**Cách 2 — Vercel / Cloudflare Pages nối GitHub (tự deploy mỗi lần sửa code):**
1. Đẩy thư mục dự án lên một repo GitHub.
2. Import repo vào Vercel hoặc Cloudflare Pages. Build command: `npm run build`, Output directory: `docs`.

**Cách 3 — GitHub Pages:**
App đã cấu hình `base: './'` nên chạy được ở đường dẫn con `linkhoang19931-hub.github.io/fitness/`. Build ra `docs/` rồi chọn nguồn `main` / `/docs` trong Settings → Pages.

## Cài vào màn hình chính

- **iPhone (Safari):** mở link → nút Chia sẻ → *Thêm vào MH chính*.
- **Android (Chrome):** mở link → menu ⋮ → *Cài đặt ứng dụng* / *Thêm vào màn hình chính*.

Sau lần mở đầu tiên có mạng, app chạy hoàn toàn offline (kể cả dưới tầng hầm phòng gym).

## Lưu ý quan trọng về dữ liệu

- Dữ liệu gắn với **trình duyệt + tên miền** cụ thể. Mở app bằng Safari thường và bằng icon trên màn hình chính có thể là hai kho dữ liệu khác nhau trên iOS — hãy luôn dùng icon đã cài.
- iOS có thể xoá dữ liệu của website không được dùng trong nhiều ngày; app đã cài vào màn hình chính và đã xin “lưu trữ bền vững” ít bị ảnh hưởng hơn, nhưng **vẫn nên xuất file JSON định kỳ** (Cài đặt → Sao lưu toàn bộ) và cất vào Files/Drive.
- Đổi tên miền host = kho dữ liệu mới. Khi chuyển host, sao lưu JSON ở bản cũ rồi khôi phục ở bản mới.
- iPhone không cho web app rung máy (Vibration API); khi hết giờ nghỉ app phát âm báo. Hãy tắt chế độ im lặng nếu muốn nghe.

## Dinh dưỡng trong app

- **Kho món** (tab PFC → Thêm món): ~80 thực phẩm và món Việt có P/F/C theo khẩu phần, tìm không cần gõ dấu, chọn ×0.5–×2. Món nhiều Fat (≥10g/phần) có nhãn cảnh báo. Nguồn: USDA FoodData Central, Bảng thành phần thực phẩm Việt Nam, NutriHome; món nhà nấu là ước tính.
- **Thực đơn mẫu A–D**: ~1.900 kcal, Protein ~150g, Fat 22–26g, chia theo lịch tập 6:00 sáng. Thêm từng bữa hoặc cả ngày bằng 1 chạm.
- **Tính TDEE** (Cài đặt): công thức Mifflin–St Jeor theo tuổi, chiều cao, cân nặng gần nhất và mức vận động.
- **Hướng dẫn dinh dưỡng**: tóm tắt khuyến nghị protein, fat, tốc độ giảm cân kèm nguồn.

Dữ liệu món ăn nằm trong `src/lib/foods.js`, thực đơn trong `src/lib/mealplans.js`.

## Cấu trúc mã

```
src/
  lib/db.js          Schema Dexie (IndexedDB) + món mẫu mặc định
  lib/program.js     Chương trình 6 ngày, quy tắc xoay vòng
  lib/workout.js     Bắt đầu/kết thúc buổi, tick set, điền sẵn set kế tiếp
  lib/store.js       Cấu hình (Zustand persist → LocalStorage), mục tiêu macro, rest timer
  lib/backup.js      Sao lưu/khôi phục JSON, xuất CSV, xoá trắng
  lib/image.js       Nén ảnh check-in (WebP, fallback JPEG) tại trình duyệt
  lib/useWakeLock.js Giữ màn hình sáng khi đang tập
  screens/           Workout · Nutrition · Body · Settings
  components/        UI dùng chung, RestTimer, icon
```

Sửa bài tập trong từng ngày: chỉnh mảng `PROGRAM` trong `src/lib/program.js`. Lịch sử cũ vẫn giữ nguyên vì set được lưu theo tên bài.

## Khác biệt so với URD

- **UI:** dùng Tailwind CSS với bộ component tự viết gọn nhẹ thay cho shadcn/ui (shadcn cần CLI sinh mã và kéo theo Radix — không cần thiết cho 4 màn hình này).
- **Schema:** thêm bảng `foodPresets` (món mẫu), trường `exerciseOrder`/`notes`/`startedAt`, và ảnh thu nhỏ `thumbBlob`; `checkinPhotos` chỉ đánh chỉ mục `date` vì Blob không làm khoá chỉ mục được.
- **Calo/Carbs:** Kcal mục tiêu = Kcal duy trì (TDEE, tự nhập trong Cài đặt, mặc định 2.400) − mức thâm hụt (mặc định 500). Carbs = phần Kcal còn lại sau Protein (mức trên) và trần Fat, chia 4.
- **Thêm:** xuất CSV dinh dưỡng, tốc độ giảm cân 2 tuần và dự kiến số tuần tới đích.
