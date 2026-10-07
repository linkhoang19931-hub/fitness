# Baki Goal

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

## Giao diện

Thiết kế theo phong cách iOS: tiêu đề lớn, thẻ nhóm bo góc, thanh tab mờ, màu hệ thống iOS, chế độ Tự động/Tối/Sáng. Icon app và bộ icon trong app được vẽ riêng cho Baki Goal.

## Giấc ngủ

Tab **Giấc ngủ**: bấm **Đi ngủ** khi lên giường, sáng bấm **Đã dậy** (dưới 3 phút coi là bấm nhầm; quá 16 giờ chưa bấm dậy thì app nhắc sửa giờ). Quên bấm thì ghi thủ công; sửa/xoá từng đêm trong lịch sử.

- **Chấm điểm 0–100 mỗi đêm**: thời lượng so với khuyến nghị theo tuổi (60đ), độ đều giờ đi ngủ so với 7 đêm trước (25đ, trừ thêm nếu ngủ sau 1:00), cảm nhận 1–5 sao (15đ). Tốt ≥85 · Khá 70–84 · Chưa đủ 50–69 · Kém <50.
- **Khuyến nghị theo tuổi** (National Sleep Foundation): 14–17t 8–10h; 18–64t 7–9h; ≥65t 7–8h. Mục tiêu riêng cộng thêm 30 phút khi tập ≥5 buổi/tuần hoặc đang ăn thâm hụt.
- **Ảnh hưởng khi ngủ thiếu**: nêu theo mức thiếu; khi đang giảm mỡ dẫn Nedeltcheva 2010 (ngủ 5,5h thay vì 8,5h: giảm mỡ ít hơn 55%, mất khối nạc nhiều hơn 60%); với nam dẫn Leproult 2011 (1 tuần ngủ 5h: testosterone giảm 10–15%).
- **Dashboard** tuần / tháng / năm: biểu đồ cột tô màu theo mức (xanh = trong khuyến nghị, cam = chấp nhận được, đỏ = quá ít/nhiều), vùng khuyến nghị và đường mục tiêu; trung bình/đêm, nợ ngủ, giờ ngủ và giờ dậy trung bình; gợi ý theo từng kỳ (thiếu ngủ, giờ ngủ thất thường, ngủ muộn, nợ ngủ, chất lượng thấp).
- Giờ nên lên giường tính từ giờ dậy thường ngày (mặc định 5:30 vì tập 6:00). Giấc ngắn ban ngày (9:00–19:00, <3 giờ) tính là ngủ trưa.

## Tiến bộ & điều chỉnh (v4)

- **Chỉnh calo theo thực tế**: sau ≥ 10 ngày ghi ăn đủ và ≥ 8 lần cân trải ≥ 14 ngày (cửa sổ 21 ngày), app đo TDEE thật = Kcal ăn TB − tốc độ đổi cân (hồi quy tuyến tính) × 7700. Đề xuất hiện ở tab Dinh dưỡng; mỗi lần chỉnh tối đa ±250 kcal, tối đa 1 lần/tuần. Đổi số buổi tập / công việc / giới tính thì quay về công thức.
- **Gợi ý tăng tạ (double progression)**: khoảng rep lấy từ hướng dẫn bài; đủ đầu trên ở mọi set → tăng 2,5 kg (thân trên), 5 kg (thân dưới), 2 kg (tạ đơn); 2 buổi liền dưới khoảng rep → giảm ~10%. Nút “Điền” ghi mức tạ gợi ý vào các set.
- **Biểu đồ sức mạnh**: 1RM ước tính (Epley) theo buổi, kỷ lục, 5 buổi gần nhất — trong bảng hướng dẫn của mỗi bài.
- **Set khởi động**: thanh không × 10, 40% × 8, 60% × 5, 80% × 3 (bài compound ≥ 20 kg).
- **Tuần giảm tải**: nhắc sau 6 tuần tập liên tục (nghỉ hẳn 1 tuần thì đếm lại); tuần giảm tải tự giảm nửa số set, tạ ~70%, và không dùng làm mốc so sánh.
- **Số đo vòng & % mỡ**: công thức Hải quân Mỹ (nam: bụng ngang rốn + cổ; nữ: eo + mông + cổ; cần chiều cao), khối nạc ước tính, nhận xét mất mỡ/mất nạc.
- **Tổng kết tuần** (tab Cơ thể): cân nặng, dinh dưỡng, tập luyện, sức mạnh, giấc ngủ, nước; calo mỗi ngày; số set theo nhóm cơ (chính 1, phụ 0,5; mục tiêu 10–20).
- **Ghi món nhanh**: “Ăn giống hôm qua”, mục “Hay ăn” (30 ngày), combo lưu từ một bữa.
- **Nước uống**: 35 ml/kg + 500 ml ngày tập; +250 / +500 / bớt lần cuối.

## Hiệu ứng & cảm giác dùng

Dùng thư viện Motion: chuyển tab trượt nhẹ, bảng kéo lên có lò xo (vuốt thanh trên xuống để đóng), vuốt sang trái để xoá (món ăn, món ngoài thực đơn, số đo cân), số chạy khi thay đổi, tick set có hiệu ứng nảy, thẻ bài/set thêm bớt có chuyển động, đồng hồ nghỉ trượt lên, màn chúc mừng có pháo giấy và kỷ lục mới khi lưu buổi tập. Rung nhẹ khi chạm (iPhone iOS 18+ qua công tắc hệ thống). Tự tắt hiệu ứng khi máy bật "Giảm chuyển động".

## Mục tiêu tự động

Cài đặt chỉnh xong bấm **Lưu cài đặt** mới áp dụng (thanh lưu hiện khi có thay đổi; tab Cài đặt có chấm đỏ nếu còn thay đổi chưa lưu).

Cài đặt → bật "Tự tính mục tiêu": Kcal = TDEE (Mifflin–St Jeor theo tuổi, chiều cao, cân gần nhất, mức vận động) − thâm hụt theo tốc độ giảm (0,25–1 kg/tuần, 7.700 kcal/kg). Protein = g/kg × cân hiện tại. Carbs = phần còn lại sau Protein và trần Fat. Đổi cân mục tiêu để xem ngày dự kiến chạm mốc; đạt mục tiêu thì tự chuyển sang ăn duy trì.

## Chương trình tập

Chọn **giới tính** và **số buổi/tuần** (3–7) trong Cài đặt; app tự đổi chương trình (`src/lib/program.js`):

| Số buổi | Nam | Nữ |
|---|---|---|
| 3 | Toàn thân A/B/C | Toàn thân A/B/C, ưu tiên mông |
| 4 | Thân trên / thân dưới ×2 | Thân trên / thân dưới ×2, ưu tiên mông |
| 5 | Trên / Dưới / Đẩy / Kéo / Chân | Mông · Đẩy · Đùi trước · Kéo · Mông & bụng |
| 6 | Chia nhóm cơ 6 ngày (lịch gốc) | Chia nhóm cơ 6 ngày, ưu tiên thân dưới |
| 7 | 6 ngày + 1 ngày hồi phục | 6 ngày + 1 ngày hồi phục |

Hệ số vận động tính từ công việc hằng ngày × số buổi tập (ảnh hưởng TDEE). Đổi chương trình thì chu kỳ bắt đầu lại từ D1; số tạ lần trước tra theo tên bài nên vẫn còn. Bài tính giờ (Plank, đi bộ dốc, giãn cơ) nhập giây/phút thay cho kg/rep.

## Tập luyện

- **Thêm / bỏ bài**: kho 149 bài (`src/lib/exercises.js`) gắn nhóm cơ, dụng cụ, mẹo. "+ Thêm bài" mở bảng tìm: gõ tới đâu gợi ý tới đó (không cần dấu, gõ tắt như "inc", "cable cr"), mặc định lọc theo nhóm cơ của buổi, có thể chọn nhóm khác hoặc tự đặt tên bài mới. Thêm/bỏ ở màn lên lịch thì áp dụng cho các lần sau; trong buổi đang tập thì tuỳ chọn có giữ cho lần sau hay không. "Về mặc định" khôi phục buổi gốc.

- Xong buổi trong ngày: thẻ "Đã xong buổi tập hôm nay" có dấu tick, dải Tuần này đánh dấu ngày đã tập.
- Chạm tên bài (biểu tượng ⓘ) để xem hướng dẫn: nhóm cơ, set × rep gợi ý, chuẩn bị, các bước, lỗi hay gặp, link video mẫu. Nội dung ở `src/lib/guides.js`.
- "Bắt đầu lại từ D1" đặt lại chu kỳ mà không xoá dữ liệu; sang tuần mới với chu kỳ dở dang, app hỏi lại từ D1 hay đi tiếp.

## Dinh dưỡng trong app

- **Thực đơn hôm nay** (sửa trực tiếp): app tự tạo thực đơn mỗi ngày theo mục tiêu. Chạm món để đổi khẩu phần (×0,25–×3), đổi sang món tương đương / món bất kỳ, hoặc xoá; "+ Thêm món" vào từng bữa với gợi ý khi gõ; nút "Ăn rồi" ghi cả bữa vào nhật ký (sửa món sau đó thì nhật ký tự cập nhật). "Đổi thực đơn" giữ bữa đã ăn; "Chia lại khẩu phần" khớp các bữa chưa ăn theo phần còn thiếu. Lưu trong bảng `dayPlans` (IndexedDB v2), có trong file sao lưu.
- **Ăn ngoài thực đơn**: ghi món bất kỳ, sửa lượng ×0,5–×2 hoặc xoá.

- **Kho món** (tab PFC → Thêm món): hơn 300 thực phẩm và món Việt, Nhật, Hàn, Âu, Trung–Thái, đồ uống có P/F/C theo khẩu phần, tìm không cần gõ dấu, chọn ×0.5–×2. Món nhiều Fat (≥10g/phần) có nhãn cảnh báo. Nguồn: USDA FoodData Central, Bảng thành phần thực phẩm Việt Nam, NutriHome; món nhà nấu là ước tính.
- **Thực đơn mẫu A–I** (Việt, Nhật, Hàn, Âu, ăn ngoài, ngày nghỉ): khẩu phần tự co giãn theo mục tiêu Kcal/Protein hiện hành. Thêm từng bữa hoặc cả ngày bằng 1 chạm.
- **Gợi ý khi nhập tay**: gõ tên món sẽ hiện gợi ý kèm calo, chạm để điền sẵn P/F/C.
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
