# UI Skills Playbook: 47 Golden Rules for Design Engineers

> Được chắt lọc từ các kỹ sư thiết kế hàng đầu (Julien Deramond - ibelick, Emil Kowalski, v.v.), Playbook này cung cấp các nguyên tắc thực chiến giúp giao diện web đạt độ tinh tế (craft), mượt mà (smooth motion), và tránh các lỗi thẩm mỹ vụng về (AI UI slop).

---

## 📐 I. Bố Cục & Tỉ Lệ (Layout & Geometry)

### 1. Khớp Border Radius Khi Lồng Phần Tử (Concentric Border Radius)
- **Quy tắc:** Bán kính bo góc của phần tử con bên trong **bắt buộc** phải bằng bán kính phần tử cha trừ đi khoảng cách đệm (padding).
- **Công thức:** `inner radius = outer radius - padding`
- **Ví dụ:** Nếu card ngoài có `rounded-2xl` (16px) và `p-3` (12px), thì phần tử con bên trong phải có `rounded-[4px]`. Nếu không tính theo công thức này, khoảng cách giữa 2 đường cong sẽ bị méo mó, mất tự nhiên.

### 2. Dùng Aspect-Ratio Để Tránh Giật Layout (Prevent Layout Shifts)
- **Quy tắc:** Đặt `aspect-ratio` cố định cho khung ảnh/video/canvas để trình duyệt giữ chỗ trước khi tài nguyên tải xong.
- **Lợi ích:** Loại bỏ hoàn toàn hiện tượng Cumulative Layout Shift (CLS), nội dung xung quanh không bị nhảy giật khi ảnh hiển thị.

### 3. Gom Nhóm Bằng Khoảng Trắng Thay Vì Kẻ Vạch Phân Cách (Group with Spacing, Not Dividers)
- **Quy tắc:** Ưu tiên dùng khoảng cách (`gap-4`, `gap-6`) và phân tầng màu nền (`bg-muted/50`) để gom nhóm các phần tử liên quan trước khi nghĩ đến việc kẻ thêm đường viền (`border` / `<hr>`).
- **Lợi ích:** Giao diện thoáng đãng, hiện đại, giảm thiểu nhiễu thị giác.

### 4. Để Lộ Một Phần Phần Tử Tiếp Theo Trong Danh Sách Cuộn (Peek Next Item)
- **Quy tắc:** Trong danh sách cuộn ngang (horizontal carousel), luôn để lộ khoảng 16px đến 32px của item tiếp theo ở mép màn hình.
- **Lợi ích:** Tạo tín hiệu thị giác tự nhiên (affordance) cho người dùng biết danh sách có thể vuốt/cuộn tiếp mà không cần đọc hướng dẫn.

### 5. Giữ Nút Full-Width Nằm Trong Lề Trang (Inset Primary Actions)
- **Quy tắc:** Ngay cả trên màn hình di động, các nút bấm chính toàn chiều rộng nên nằm gọn bên trong lề trang (`px-4` hoặc `px-6`), tránh kéo tràn mép viền màn hình trừ trường hợp cố định ở đáy (bottom sticky bar).

### 6. Tạo Khoảng Thở 12px Giữa Các Nút Liền Kề (Give Targets Breathing Room)
- **Quy tắc:** Giữ khoảng cách tối thiểu 12px giữa các nút bấm có viền hoặc nền tương tác nằm cạnh nhau để tránh bấm nhầm.

---

## 🔤 II. Kiểu Chữ & Phân Cấp Nội Dung (Typography & Hierarchy)

### 7. Cân Bằng Dòng Tiêu Đề Với `text-balance`
- **Quy tắc:** Luôn thêm `text-balance` cho tiêu đề (`h1`, `h2`, `h3`) để trình duyệt tự động ngắt dòng cân đối 2 bên, tránh để lại 1 từ cô độc ở dòng cuối (orphan word). Với đoạn văn thân, dùng `text-pretty`.

### 8. Căn Chỉnh Con Số Với `tabular-nums`
- **Quy tắc:** Thêm class `tabular-nums` cho tất cả bảng dữ liệu, bộ đếm giờ, rating, điểm số, giá tiền.
- **Lợi ích:** Các chữ số từ 0-9 có chiều rộng bằng nhau, giúp các cột số thẳng hàng tuyệt đối và không bị giật rung khi con số thay đổi liên tục.

### 9. Cắt Chữ Thông Minh Bằng `truncate` / `line-clamp`
- **Quy tắc:** Với các ô nhỏ hẹp (cards, chips, sidebar), dùng `line-clamp-1` hoặc `line-clamp-2` kèm hiệu ứng fade nhẹ thay vì để văn bản dài tràn khung.

### 10. Giới Hạn Độ Dài Dòng Văn Bản Đọc (Cap Line Length)
- **Quy tắc:** Độ dài lý tưởng của đoạn văn bản đọc là từ 60 đến 75 ký tự mỗi dòng (`max-w-prose` hoặc `max-w-2xl`). Dòng quá dài khiến mắt người đọc bị mỏi khi chuyển dòng.

### 11. Thu Hẹp `line-height` Cho Tiêu Đề Lớn (Tighten Heading Line Height)
- **Quy tắc:** Tiêu đề font chữ lớn cần giảm `leading` xuống khoảng 1.1 đến 1.15 (`leading-tight` hoặc `leading-[1.1]`). Giữ `leading-normal` trên font chữ to sẽ khiến các dòng trông rời rạc.

### 12. Dùng Sentence Case Cho Nhãn Nút Bấm (Use Sentence Case Labels)
- **Quy tắc:** Viết hoa chữ cái đầu tiên của câu/nhãn ("Save changes", "Create account", "Bắt đầu thi đấu"), tránh dùng ALL CAPS hoặc Title Case kiểu giật gân nếu không phải thương hiệu.

---

## 🎨 III. Màu Sắc, Viền & Chiều Sâu (Color, Elevation & Aesthetics)

### 13. Giới Hạn 1 Màu Nhấn (Accent Color) Trên Mỗi Màn Hình
- **Quy tắc:** Mỗi view chỉ nên có 1 màu nhấn chủ đạo (`primary action`, liên kết quan trọng, trạng thái tích cực). Các hành động thứ cấp phải dùng tông màu trung tính (`neutral/muted`).

### 14. Viền Trung Tính Cho Hình Ảnh (Neutral Image Outlines)
- **Quy tắc:** Dùng viền trung tính mảnh (`border border-neutral-200 dark:border-neutral-800` hoặc `ring-1 ring-black/5`) quanh thumbnail ảnh thay vì viền màu sặc sỡ.

### 15. Dùng Bóng Đổ Cho Độ Nổi & Viền Cho Cấu Trúc (Shadows for Depth, Borders for Structure)
- **Quy tắc:** Bóng đổ (`shadow-sm`, `shadow-md`) dùng để thể hiện độ cao của lớp (elevation, modals, popovers). Viền (`border`) dùng để định hình cấu trúc và ranh giới. Không lạm dụng cả 2 cùng một lúc một cách thô kệch.

### 16. Tuyệt Đối Tránh Hiệu Ứng Phát Sáng (Glow Effects) Làm Nút Chính
- **Quy tắc:** Không dùng hiệu ứng phát sáng neon / glow mờ mịt làm affordance cho nút bấm chính. Độ tương phản rõ ràng và khoảng trắng tạo ra sự cao cấp hơn glow giả tạo.

### 17. Giữ Độ Tương Phản Cho Chữ Phụ (Readable Secondary Text)
- **Quy tắc:** Chữ màu xám / muted (`text-neutral-500`) phải đạt tỷ lệ tương phản tối thiểu 4.5:1 so với nền để người dùng đọc dễ dàng.

---

## ⚡ IV. Hiệu Ứng Chuyển Động & Tương Tác (Motion & Interaction)

### 18. Phản Hồi Nhấn Nút Co Giãn Nhẹ (Scale on Press)
- **Quy tắc:** Thêm hiệu ứng co nhẹ khi nhấn: `active:scale-[0.97]` kết hợp `transition-transform duration-100 ease-out`.
- **Lợi ích:** Đem lại cảm giác bấm vật lý chân thực như ứng dụng native iOS/macOS.

### 19. Popover & Tooltip Phải Xuất Phát Từ Nút Kích Hoạt (Anchor Popovers to Triggers)
- **Quy tắc:** Điểm gốc animation (`transform-origin`) của dropdown, menu, popover phải gắn với vị trí của nút bấm kích hoạt nó.

### 20. Tránh Xuất Hiện Từ Kích Thước 0 (Avoid Scale-Zero Entrances)
- **Quy tắc:** Khi một modal hoặc card xuất hiện, hãy bắt đầu animation từ kích thước 95% (`scale(0.95)` lên `scale(1)` và `opacity: 0` lên `1`). Tuyệt đối không scale từ `0` lên `1` vì sẽ gây giật mắt.

### 21. Luôn Dùng `ease-out` Khi Xuất Hiện (Use Ease-Out on Enter)
- **Quy tắc:** Phần tử mở ra hoặc trượt vào phải dùng `ease-out` để tốc độ ban đầu nhanh và giảm tốc mượt mà khi dừng lại. `ease-in` khiến người dùng cảm thấy giao diện bị trễ.

### 22. Giới Hạn Thời Gian Phản Hồi Tối Đa 200ms
- **Quy tắc:** Các hiệu ứng phản hồi trực tiếp (hover, focus, click, toggle) không được vượt quá 200ms (lý tưởng: 100ms - 150ms).

### 23. Nền Modal Màu Đậm Thay Vì Dùng Blur Toàn Màn Hình (Solid Scrims Over Heavy Blur)
- **Quy tắc:** Tránh dùng `backdrop-blur-xl` phủ kín toàn bộ màn hình di động vì sẽ khiến GPU bị tụt khung hình (drop frame). Dùng nền bán trong suốt `bg-black/60` đơn giản mà mượt mà 60/120 FPS.

### 24. Dùng Skeleton Có Hình Dáng Khớp Nội Dung Thực (Structural Skeletons)
- **Quy tắc:** Khung chờ (skeleton loader) phải mô phỏng chính xác hình dáng của tiêu đề, avatar, nút bấm thật, không dùng thanh chữ nhật generic hoặc vòng xoay spinner đơn điệu.

---

## ♿ V. Khả Năng Tiếp Cận & Form (Accessibility & Forms)

### 25. Kích Thước Vùng Chạm Tối Thiểu 44 × 44px (Touch Targets)
- **Quy tắc:** Mọi nút bấm, checkbox, biểu tượng tương tác trên thiết bị di động phải có diện tích chạm tối thiểu $44 \times 44\text{px}$ (dùng `min-h-11 min-w-11` hoặc padding bù).

### 26. Hiển Thị Lỗi Ngay Bên Dưới Ô Nhập Liệu
- **Quy tắc:** Thông báo lỗi validation phải nằm ngay dưới ô nhập liệu tương ứng kèm `aria-describedby`, không hiển thị lỗi chung chung gom ở đầu trang.

### 27. Luôn Có Nhãn Trực Quan (Visible Labels)
- **Quy tắc:** Không bao giờ dùng placeholder làm nhãn duy nhất của ô input. Khi người dùng nhập ký tự, placeholder sẽ biến mất khiến họ quên mất ô đó yêu cầu gì.

### 28. Không Dùng Màu Sắc Đơn Độc Để Báo Trạng Thái
- **Quy tắc:** Trạng thái thành công, cảnh báo hay thất bại phải luôn đi kèm biểu tượng (icon) hoặc nhãn chữ rõ ràng, không chỉ dùng mỗi chấm tròn xanh/đỏ (giúp người mù màu nhận biết chính xác).

### 29. Giữ Vòng Focus Bàn Phím Luôn Rõ Ràng (`:focus-visible`)
- **Quy tắc:** Không bao giờ viết `outline: none` mà không có kiểu thay thế. Sử dụng `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.

### 30. Empty States Luôn Có 1 Hành Động Tiếp Theo Rõ Ràng
- **Quy tắc:** Khi danh sách hoặc bảng rỗng (không có dữ liệu), không chỉ hiển thị dòng chữ "Chưa có dữ liệu", mà phải có 1 nút bấm hành động cụ thể (ví dụ: `[ Tạo bài tập đầu tiên ]` hoặc `[ Tham gia trận đấu ]`).
