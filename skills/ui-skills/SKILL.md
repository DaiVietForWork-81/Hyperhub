---
name: ui-skills
description: Comprehensive design engineering skills, anti-slop guidelines, accessible primitives, motion performance, and visual polish rules from ibelick/ui-skills. Activate when designing, auditing, building, or refactoring web interfaces, Tailwind layouts, dialogs, forms, or animations.
---

# UI Skills: Design Engineering & Anti-Slop Guide

> Bộ kỹ năng kỹ thuật thiết kế (Design Engineering) cho AI Coding Agents, khởi xướng bởi **Julien Deramond (ibelick)**.
> Giúp tạo ra các giao diện Web chất lượng cao, chuẩn mực, loại bỏ hoàn toàn các lỗi thẩm mỹ "AI Slop", bảo đảm khả năng tiếp cận (Accessibility) và hiệu suất chuyển động 60/120 FPS.

---

## 🎯 1. Khi Nào Kích Hoạt Kỹ Năng Này?
Kích hoạt `ui-skills` khi bạn thực hiện bất kỳ công việc nào sau đây trên dự án Web:
- Thiết kế hoặc viết mã giao diện người dùng mới (HTML/CSS, Tailwind CSS, React, Svelte, Vue).
- Tinh chỉnh, làm đẹp hoặc khử "slop" giao diện (loại bỏ màu gradient tím sến súa, viền phát sáng bừa bãi, icon lệch tâm, chữ mờ).
- Kiểm tra & sửa lỗi khả năng tiếp cận (WCAG, ARIA labels, Keyboard navigation, Focus traps).
- Tối ưu hiệu suất animation (chống lag, giật khung hình, loại bỏ layout thrashing).
- Lập tài liệu ngôn ngữ thiết kế `DESIGN.md` hoặc kiểm toán giao diện hiện có (`improve-ui`).

---

## 🧭 2. Bộ Định Tuyến Kỹ Năng (Skill Router Protocol)

Khi người dùng yêu cầu làm việc với UI:
1. **Xác định mục tiêu UI:** Nếu không liên quan đến UI, bỏ qua.
2. **Chọn kỹ năng hẹp nhất:**
   - Cần dọn dẹp, chuẩn hóa và đánh bóng nhanh giao diện $\rightarrow$ Sử dụng **`baseline-ui`**.
   - Cần kiểm tra WCAG, ARIA, bàn phím, form $\rightarrow$ Sử dụng **`fixing-accessibility`**.
   - Cần tối ưu animation, chống lag chuyển động $\rightarrow$ Sử dụng **`fixing-motion-performance`**.
   - Cần thêm/sửa SEO, Open Graph, thẻ meta $\rightarrow$ Sử dụng **`fixing-metadata`**.
   - Cần trích xuất tokens và tạo file `DESIGN.md` $\rightarrow$ Sử dụng **`create-design-md`**.
   - Cần review/audit toàn diện giao diện mà không phá vỡ bản sắc $\rightarrow$ Sử dụng **`improve-ui`**.
3. **Quy tắc số lượng:** Ưu tiên 1 kỹ năng; tối đa 2 kỹ năng cho 1 tác vụ; không dùng quá 3 kỹ năng cùng lúc để tránh làm loãng ngữ cảnh.

---

## 🛑 3. Các Nguyên Tắc Chống "AI Slop" Cốt Lõi (Baseline UI Rules)

### Stack & Primitives:
- **Tailwind CSS Defaults:** Luôn ưu tiên dùng bảng màu và scale mặc định của Tailwind (tránh các mã màu hex ngẫu hứng hoặc tùy tiện tạo arbitrary classes như `w-[327px]`).
- **Primitives Chuẩn:** Bắt buộc dùng primitives có sẵn hỗ trợ bàn phím và focus (`Base UI`, `React Aria`, `Radix UI`). **Tuyệt đối không tự code lại behavior của modal/dropdown bằng `div` và `onClick` thủ công.**
- **Tiện ích class:** Luôn dùng helper `cn(...)` (`clsx` + `tailwind-merge`).

### Bố cục & Kích thước:
- **Không dùng `h-screen`:** Bắt buộc dùng `h-dvh` (Dynamic Viewport Height) để không bị che khuất bởi thanh địa chỉ trên trình duyệt di động.
- **Safe Area Inset:** Các thanh điều hướng hoặc nút cố định phải tôn trọng `safe-area-inset-bottom`.
- **Kích thước hình vuông:** Dùng `size-*` (ví dụ `size-8`, `size-10`) thay vì viết cả `w-8 h-8`.
- **Z-Index có kiểm soát:** Tuân thủ thang đo z-index cố định (z-10, z-20, z-50), không dùng số tùy hứng (`z-[9999]`).

### Typography:
- **Tiêu đề:** Bắt buộc dùng `text-balance` cho mọi tiêu đề để ngắt dòng cân xứng.
- **Nội dung:** Bắt buộc dùng `text-pretty` cho văn bản đoạn thân.
- **Con số:** Bắt buộc dùng `tabular-nums` cho số liệu, rating, thời gian, bảng xếp hạng.
- **Độ dài dòng:** Giới hạn đoạn văn bản đọc từ 60 đến 75 ký tự (`max-w-prose`).

### Thẩm mỹ (Taste & Polish):
- **Không dùng gradient bừa bãi:** Không tự ý chèn gradient tím/hồng neon hoặc đa sắc rực rỡ trừ khi người dùng yêu cầu rõ ràng.
- **Không dùng hiệu ứng phát sáng (Glow effects)** làm tín hiệu thị giác chính cho nút bấm.
- **Chỉ dùng 1 màu nhấn (Accent color) trên mỗi màn hình.**
- **Bán kính bo góc lồng nhau (Concentric Radius):** `inner_radius = outer_radius - padding`.

---

## 🎬 4. Hiệu Suất Chuyển Động (Motion Performance Rules)

- **Chỉ Animate Compositor Properties:** Chỉ cho phép animate `transform` và `opacity`.
- **Tuyệt đối không animate Layout Properties:** Không animate `width`, `height`, `top`, `left`, `margin`, `padding` vì sẽ gây Layout Thrashing làm tụt FPS nghiêm trọng.
- **Thời gian phản hồi:** Không vượt quá `200ms` cho phản hồi bấm (click/tap) và hover.
- **Đường cong chuyển động:** Dùng `ease-out` khi phần tử xuất hiện.
- **Giảm tải GPU:** Tránh dùng `backdrop-filter: blur(...)` trên toàn màn hình di động; dùng `bg-black/60` đồng nhất.
- **Tôn trọng người dùng:** Luôn hỗ trợ `prefers-reduced-motion`.

---

## ♿ 5. Khả Năng Tiếp Cận (Accessibility Rules)

1. **Nút chỉ có icon:** Bắt buộc phải có `aria-label` hoặc `aria-labelledby`.
2. **Phím Tab & Enter/Space:** Mọi phần tử tương tác phải truy cập được bằng phím Tab và kích hoạt được bằng Enter/Space.
3. **Focus Trap:** Modal / Dialog bắt buộc phải giữ focus bên trong khi mở, và khôi phục focus về nút kích hoạt ban đầu khi đóng bằng phím `Escape`.
4. **Form & Lỗi:** Lỗi validation phải gắn với input qua `aria-describedby`, input lỗi phải có `aria-invalid="true"`.
5. **Vùng chạm di động:** Tối thiểu $44 \times 44\text{px}$.

---

## 📂 6. Cấu Trúc Tài Liệu Chi Tiết Đi Kèm
Toàn bộ tài liệu chi tiết nằm trong thư mục:
- **Hướng dẫn chi tiết từng sub-skill:** `Web/skills/ui-skills/skills/`
  - `baseline-ui/SKILL.md`
  - `create-design-md/SKILL.md`
  - `fixing-accessibility/SKILL.md`
  - `fixing-metadata/SKILL.md`
  - `fixing-motion-performance/SKILL.md`
  - `improve-ui/SKILL.md`
  - `ui-skills-root/SKILL.md`
- **47 Quy Tắc Vàng:** `Web/skills/ui-skills/playbook/PLAYBOOK.md`
- **Danh mục 300+ Kỹ năng:** `Web/skills/ui-skills/registry/REGISTRY.md`
