# Bộ Cẩm Nang Tinh Hoa Thiết Kế Frontend & UI Engineering

Tài liệu này đúc kết toàn bộ nguyên lý cốt lõi từ 5 hệ thống kỹ năng thiết kế chuyên nghiệp hàng đầu thế giới:
1. **`mblode/ui-design`** (mblode)
2. **`anthropics/frontend-design`** (Anthropic Claude Code)
3. **`JuliusBrussee/interface-kit`** (Julius Brussee)
4. **`addyosmani/frontend-ui-engineering`** (Addy Osmani - Google Chrome)
5. **`MiniMax-AI/frontend-dev`** (MiniMax AI)

---

## 1. Triết Lý Cốt Lõi (Core Principles)
- **Bắt nguồn từ bản chất chủ đề (Ground in Subject Matter - Anthropic):**
  - Đừng bao giờ tạo giao diện với bố cục rập khuôn (generic). Mọi chi tiết thiết kế phải lấy cảm hứng trực tiếp từ thế giới của sản phẩm (với HyperHub là lập trình thi đấu, thuật toán, đấu trường đối kháng 1:1, terminal, và AI).
- **Tiết chế tối đa (Restraint Philosophy - mblode):**
  - "Điều nhỏ nhất phục vụ sản phẩm, không phải điều hào nhoáng nhất có thể nhồi nhét."
- **Stack ưu tiên bất biến (The Priority Stack - Julius Brussee):**
  1. Accessibility (WCAG AA, Contrast 4.5:1, keyboard focus rings, touch targets >= 44px)
  2. Performance (GPU compositor properties: transform, opacity, zero layout thrashing)
  3. Typography (Font smoothing, `text-wrap: balance/pretty`, `tabular-nums`, max 65ch)
  4. Spatial & Layout (Quy tắc bo góc đồng tâm `inner = outer - padding`, 4/8px grid)
  5. Color & Theme (Obsidian dark depth, semantic tokens)
  6. Motion & Micro-interactions (150-250ms, tactile scale `active:scale-[0.98]`)

---

## 2. Loại Bỏ Triệt Để Dấu Hiệu AI Slop (Anti-AI Aesthetic)
- **Không đánh số thứ tự giả mạo:** Tuyệt đối không dùng `01 / 02 / 03` nếu nội dung không phải là quy trình tuần tự theo bước (Anthropic).
- **Không dùng all-caps tùy tiện:** Hạn chế viết hoa toàn bộ trên nhãn (labels).
- **Không tím hồng phủ khắp nơi:** Dùng màu tối có chiều sâu (Obsidian Dark `#050508`), chỉ dùng accent có chủ đích và độ bão hòa hợp lý (Addy Osmani).
- **Không có padding vô tội vạ:** Giữ phân cấp không gian chặt chẽ theo nhịp 4px / 8px / 16px / 24px / 32px.
- **Không dùng emoji làm icon:** Luôn sử dụng icon SVG vector sắc nét (Lucide / Radix).

---

## 3. Kỹ Thuật Đồ Họa Đỉnh Cao (High-End Techniques)
- **Liquid Glass (MiniMax AI):**
  `backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`
- **Concentric Radii (Julius Brussee):**
  `Bán kính góc bên trong = Bán kính góc bên ngoài - Padding`
  (Ví dụ: Thẻ `rounded-3xl` [24px] với padding `p-6` [24px] -> Phần tử con bên trong dùng `rounded-xl` [12px]).
- **Zero-Idle Motion (ui-skills):**
  Ngắt vòng lặp animation khi chuột đứng yên hoặc chuyển tab để CPU và GPU ở mức 0% khi nhàn rỗi.
