# UI Skills Registry: 300+ Curated Skills & Topics

Hệ thống danh mục kỹ năng thiết kế UI toàn diện từ `ibelick/ui-skills`, phân loại theo các chủ đề thiết kế cốt lõi và chuyên sâu:

## 🏷️ 1. Các Chủ Đề Thiết Kế Cốt Lõi (Core Design Topics)
- **`accessibility`**: Inclusive UI patterns, WCAG compliance, ARIA accessibility trees, keyboard focus, screen readers.
- **`motion`**: Animation systems, micro-interactions, gesture dynamics, transitions, FLIP, spring curves.
- **`systems`**: Design systems, tokens, primitives, variants, component architectures (Radix, Base UI, React Aria).
- **`visual`**: Visual polish, contrast, hierarchy, layout density, elevation, typography balance.
- **`interaction`**: Feedback loops, states (hover, active, focus, disabled), dialogs, drawer gestures, popover anchors.
- **`performance`**: Compositor properties, 60/120fps rendering, CLS prevention, memory leaks, DOM reduction.
- **`craft` & `taste`**: Nudge alignments, optical centering, subtle elevations, harmonic palettes.

## 🛠️ 2. Tra Cứu Nhanh Qua CLI & MCP
```bash
# Xem định tuyến kỹ năng UI
npx ui-skills start

# Xem các danh mục
npx ui-skills categories

# Liệt kê kỹ năng theo danh mục (motion, accessibility, visual, systems,...)
npx ui-skills list --category motion

# Lấy hướng dẫn chi tiết của một kỹ năng
npx ui-skills get baseline-ui
```

## 🌐 3. MCP Server Integration
Kết nối trực tiếp AI Coding Assistant với máy chủ MCP:
- **MCP URL**: `https://www.ui-skills.com/mcp`
- **Công cụ hỗ trợ**: `list_skills`, `get_skill`

## 📚 4. Một Số Kỹ Năng Tiêu Biểu Trong Registry
| Kỹ năng | Chủ đề | Mô tả |
| :--- | :--- | :--- |
| `baseline-ui` | systems, visual, craft | Bộ quy tắc chống slop UI, chuẩn hóa Tailwind, Typography và Animations. |
| `create-design-md` | systems, tooling, visual | Tự động trích xuất và lập tài liệu `DESIGN.md` chuẩn token từ repo hoặc URL. |
| `fixing-accessibility` | accessibility | Kiểm toán WCAG, ARIA labels, Keyboard navigation, Focus trap, Forms. |
| `fixing-metadata` | systems, frontend | Tối ưu SEO, Open Graph, Twitter cards, Canonical tags, JSON-LD. |
| `fixing-motion-performance` | motion, performance | Khắc phục giật lag animation, layout thrashing, scroll-linked motion. |
| `improve-ui` | systems, visual | Đánh giá giao diện có kiểm chứng và lập kế hoạch nâng cấp chi tiết. |
| `gsap-scrolltrigger-storytelling` | motion, visual | Hiệu ứng cuộn dẫn dắt câu chuyện với GSAP ScrollTrigger. |
| `threejs` / `webgl-landing-steering` | 3d, motion | Tích hợp 3D canvas tương tác và shader mượt mà. |
| `beautiful-shadows` | visual, craft | Tạo hệ thống bóng đổ đa lớp mềm mại và tự nhiên. |
