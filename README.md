# 🌐 HyperHub Web Platform & Multi-Channel Bridge

Tài liệu hướng dẫn khởi chạy nhanh, kiến trúc và cách vận hành nền tảng Web độc lập của hệ sinh thái **HyperHub Competitive Programming**.

---

## ⚡ HƯỚNG DẪN KHỞI CHẠY WEB NHANH (QUICK START)

Bạn có thể chạy trang Web theo 2 chế độ tùy theo nhu cầu:

### 🚀 Cách 1: Khởi chạy Trọn gói Production (Khuyên dùng)
Phục vụ toàn bộ giao diện Landing Page React đã biên dịch tối ưu hóa, đồng thời kích hoạt 11 API endpoints kết nối Discord & Bot Bridge:
```powershell
# Chạy từ thư mục gốc dự án D:\Project
python Web/app.py
```
> 🌐 Mở trình duyệt truy cập: **`http://localhost:5000`** hoặc **`http://127.0.0.1:5000`**  
> ⚠️ *(Lưu ý: Không gõ `http://0.0.0.0:5000` trên trình duyệt vì Windows sẽ báo lỗi `ERR_ADDRESS_INVALID`)*

---

### 💻 Cách 2: Khởi chạy Chế độ Phát triển Frontend (Dev Mode - Hot Reload)
Dành cho việc chỉnh sửa giao diện trực tiếp, thay đổi style hoặc cập nhật component theo thời gian thực:
```powershell
# Di chuyển vào thư mục Web
cd Web

# Khởi động Vite dev server
npm run dev
```
> 🌐 Mở trình duyệt truy cập: **`http://localhost:3000`**

---

### 📦 Cách Build lại Production sau khi chỉnh sửa dữ liệu:
Mỗi khi bạn thay đổi file cấu hình nền tảng (`src/data/platforms.ts`), danh sách đội ngũ (`src/data/credits.ts`) hoặc chỉnh sửa component:
```powershell
cd Web
npm run build
```
*(Bản build mới sẽ được tự động xuất vào `Web/dist/` và `Web/app.py` sẽ phục vụ ngay lập tức)*

---

### 🤖 Khởi chạy Discord Bot (Hoàn toàn độc lập với Web):
```powershell
# Chạy từ thư mục gốc
python Bot/bot.py
```
*(Discord Bot hoạt động độc lập, Web và Bot có thể chạy cùng lúc hoặc riêng biệt)*

---

## 🏗️ 1. Nguyên Tắc Thiết Kế & Vận Hành Độc Lập

- **Khởi chạy độc lập:** Ứng dụng Web hoàn toàn tách biệt với Discord Bot. Bạn có thể khởi động Web mà không cần khởi động Bot và ngược lại.
- **Vị trí file:**
  - Toàn bộ mã nguồn Discord Bot, Cogs, CSDL, Models nằm trong: `d:\Project\Bot\`.
  - Khởi chạy bot qua: `python Bot/bot.py`.
  - Toàn bộ mã nguồn Web, Giao diện, Bridge, UI Skills nằm trong: `d:\Project\Web\`.
  - Tại thư mục gốc `d:\Project\` chỉ chứa đúng **2 thư mục duy nhất (`Bot`, `Web`)**.

---

## 🔗 2. Cơ Chế Liên Kết Đa Kênh (Multi-Channel Bridge: Web <—> Bot)

Để đảm bảo **"Web và Bot có thể liên kết với nhau dù ở đâu đi chăng nữa"** (kể cả khi Bot và Web chạy trên 2 VPS, 2 máy chủ Cloud khác nhau hoặc Web chạy trên Vercel/Render):

```
┌─────────────────────────────────────────────────────────────┐
│                    HYPERHUB WEB PLATFORM                     │
│                       (Web/app.py)                          │
└──────────────┬──────────────────┬─────────────────┬─────────┘
               │                  │                 │
    (1) DISCORD_TOKEN    (2) BOT_API_BRIDGE    (3) DATABASE_URL
               │                  │                 │
               ▼                  ▼                 ▼
   ┌──────────────────────┐ ┌──────────────┐ ┌────────────────┐
   │  Discord REST API    │ │ Discord Bot  │ │ Shared Database│
   │ (https://discord.com)│ │ (Port 8080)  │ │(bot.db/Postgres│
   └──────────────────────┘ └──────────────┘ └────────────────┘
```

### Kênh 1: Áp dụng trực tiếp `DISCORD_TOKEN` cho Web
- **File xử lý:** [`Web/bridge/discord_client.py`](file:///d:/Project/Web/bridge/discord_client.py)
- **Cơ chế:** Web sử dụng `DISCORD_TOKEN` để gọi trực tiếp tới **Discord REST API v10**:
  - `GET /api/discord/server`: Lấy thông tin máy chủ (Tên server, icon, số lượng thành viên trực tuyến/ngoại tuyến).
  - `GET /api/discord/roles`: Lấy toàn bộ danh sách vai trò (Roles) trên máy chủ.
  - `POST /api/discord/send`: Gửi tin nhắn trực tiếp vào bất kỳ kênh Discord nào thông qua token bot.
- **Ưu điểm vượt trội:** Web có thể lấy dữ liệu server và gửi thông báo Discord bất cứ lúc nào, **ngay cả khi Bot đang tắt hoặc đang restart**!

### Kênh 2: Cầu nối thời gian thực qua HTTP REST API Bridge
- **File xử lý:** [`Web/bridge/bot_client.py`](file:///d:/Project/Web/bridge/bot_client.py)
- **Cấu hình:** `BOT_API_URL` (ví dụ `http://localhost:8080` hoặc `https://bot.yourdomain.com`) và `BOT_API_SECRET`.
- **Cơ chế:** Khi Bot đang chạy, Web gọi API Bridge nội bộ để lấy dữ liệu realtime:
  - `GET /api/status`: Lấy độ trễ ping bot, thời gian uptime, số guild kết nối.
  - `GET /api/duels`: Lấy các trận đấu đối kháng Ranked 1:1 đang diễn ra theo thời gian thực (số mạng ❤️, đề bài, thí sinh).
  - `POST /api/notify`: Yêu cầu Bot gửi Embed/tin nhắn qua kết nối WebSocket nội bộ của Bot.

### Kênh 3: Đồng bộ qua CSDL dùng chung (Data-Layer Fallback)
- **Cấu hình:** `DATABASE_URL` (SQLite khi chạy local hoặc PostgreSQL khi chạy remote).
- **Cơ chế:** Khi Bot offline hoặc mất mạng giữa 2 server, lớp `BotBridgeClient` tự động kích hoạt **Database Fallback Mode** để đọc bảng xếp hạng, điểm Elo, hồ sơ người dùng trực tiếp từ CSDL mà không bị gián đoạn dịch vụ.

---

## 📁 3. Cấu Trúc Thư Mục `Web/`

```text
Web/
├── app.py                     # Entry point khởi chạy Web Server độc lập
├── web_config.py              # Quản lý biến môi trường, DISCORD_TOKEN & kết nối
├── general.md                 # KIM CHỈ NAM thiết kế & kiến trúc web HyperHub chuẩn mực
├── requirements.txt           # Danh sách thư viện Python của Web
├── README.md                  # Tài liệu hướng dẫn này
│
├── bridge/                    # Cầu nối tích hợp
│   ├── __init__.py
│   ├── discord_client.py      # Client gọi Discord REST API qua DISCORD_TOKEN
│   └── bot_client.py          # Client gọi Bot REST Bridge & Fallback CSDL
│
├── templates/
│   └── index.html             # Dashboard Cyberpunk Real-time hiển thị Server & Rank
│
└── skills/                    # Hệ thống Design Engineering & UI/UX Intelligence
    ├── ui-skills/             # Kho tri thức & hướng dẫn thiết kế chuẩn từ ibelick/ui-skills
    │   ├── SKILL.md           # Master Agentic Skill định dạng Antigravity
    │   ├── README.md          # Hướng dẫn ứng dụng thực chiến
    │   ├── playbook/          # 47 quy tắc vàng thiết kế giao diện (concentric radius, CLS,...)
    │   ├── registry/          # Danh mục 300+ UI skills theo chủ đề
    │   └── skills/            # 7 bộ quy chuẩn chi tiết (baseline-ui, accessibility, motion,...)
    └── ui-ux-pro-max/         # Hệ thống Design Intelligence từ nextlevelbuilder/ui-ux-pro-max
        ├── SKILL.md           # Kỹ năng Antigravity tìm kiếm & sinh Design System
        ├── README.md          # Tài liệu chi tiết 100% Tiếng Việt
        ├── scripts/           # Công cụ search.py không phụ thuộc thư viện ngoài
        ├── data/              # 79 UI styles, 192 bảng màu, 74 typography, 119 UX rules, 22 stacks
        └── references/        # Pro rules & Quick reference checklist
```

---

## 🚀 4. Hướng Dẫn Khởi Chạy

### Khởi chạy Discord Bot:
```powershell
python Bot/bot.py
```
*(Chỉ chạy riêng Discord Bot và Bot API Bridge, không khởi chạy Web)*

### Khởi chạy Web Server độc lập:
```powershell
python Web/app.py
```
*(Mở trình duyệt truy cập: `http://localhost:5000`)*

---

## ⚙️ 5. Các Biến Môi Trường (Environment Variables)

Web tự động đọc các biến môi trường từ `Web/.env` hoặc kế thừa từ `Bot/.env`:

| Biến | Giá trị mặc định | Giải thích |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | *Lấy từ Bot/.env* | Token Bot Discord cấp quyền truy cập Discord REST API |
| `GUILD_ID` | `1532265330079174697` | ID Máy chủ Discord chính (HyperHub) |
| `BOT_API_URL` | `http://localhost:8080` | URL máy chủ Bot (có thể đổi thành domain công khai khi deploy riêng) |
| `BOT_API_SECRET` | `hyperhub_bridge_secret_key_2026` | Khóa bảo mật xác thực liên kết Bot <-> Web |
| `DATABASE_URL` | `sqlite+aiosqlite:///../Bot/bot.db` | Đường dẫn CSDL SQLite hoặc PostgreSQL từ xa |
| `WEB_HOST` | `0.0.0.0` | Địa chỉ lắng nghe của Web Server |
| `WEB_PORT` | `5000` | Cổng dịch vụ Web |
