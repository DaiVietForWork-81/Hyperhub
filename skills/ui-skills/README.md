# UI Skills: Design Engineering Repository for Web

Hệ thống kỹ năng và quy chuẩn thiết kế kỹ thuật (Design Engineering Skills) tích hợp trực tiếp vào phân hệ `Web/`.
Dựa trên kho tri thức mở [ibelick/ui-skills](https://github.com/ibelick/ui-skills) của Julien Deramond.

---

## 📁 Cấu Trúc Thư Mục

```text
Web/skills/ui-skills/
├── SKILL.md               # File kỹ năng chính (Antigravity Agentic Skill)
├── README.md              # Hướng dẫn tổng quan & cách ứng dụng
├── playbook/
│   └── PLAYBOOK.md        # 47 quy tắc vàng thiết kế UI (Concentric radius, layout, typography, motion)
├── registry/
│   └── REGISTRY.md        # Danh mục tra cứu 300+ UI skills theo chủ đề (Accessibility, Motion, Systems,...)
└── skills/                # 7 bộ quy tắc chuyên biệt chi tiết:
    ├── baseline-ui/       # Tiêu chuẩn chống AI slop, layout & typography
    ├── create-design-md/  # Trích xuất và lập tài liệu DESIGN.md cho dự án
    ├── fixing-accessibility/ # Kiểm toán WCAG, ARIA, bàn phím, form
    ├── fixing-metadata/   # Tối ưu SEO, Open Graph, Twitter cards, canonical
    ├── fixing-motion-performance/ # Tối ưu animation 60fps, loại bỏ layout thrashing
    ├── improve-ui/        # Đánh giá giao diện có bằng chứng (Evidence-based UI audit)
    └── ui-skills-root/    # Bộ định tuyến routing layer
```

---

## 💡 Cách Sử Dụng Cho Lập Trình Viên & AI Trong Tương Lai

1. **Khi xây dựng trang Dashboard hoặc tính năng Web mới:**
   - Yêu cầu AI áp dụng `baseline-ui` để đảm bảo code HTML/Tailwind gọn gàng, chuẩn typography (`text-balance`, `tabular-nums`), không có gradient tím hay viền glow lố lăng.
2. **Khi kiểm tra trước khi Release / Deploy:**
   - Kiểm tra `fixing-accessibility` cho các modal, form đăng nhập, dropdown.
   - Kiểm tra `fixing-metadata` để đảm bảo chia sẻ link lên Discord, Facebook hiển thị thẻ Open Graph đẹp mắt.
3. **Khi thêm hiệu ứng Animation:**
   - Tham chiếu `fixing-motion-performance` và các quy tắc từ `playbook/PLAYBOOK.md` (chỉ animate transform/opacity, scale on press `0.97`, thời gian dưới 200ms).

---

## 🚀 Tra Cứu Trực Tuyến & CLI
```bash
# Mở CLI ui-skills
npx ui-skills start

# Tìm kiếm skill theo chuyên mục
npx ui-skills list --category motion
npx ui-skills get baseline-ui
```
