# 🌌 Orbit | Vietnam — Web Platform

Nền tảng web của cộng đồng **Orbit | Vietnam**: kho đề thi chuẩn hóa, đọc PDF và làm đề ngay trên trình duyệt, chuỗi ngày học 🔥, bảng vàng học thuật và bảng quản trị đồng bộ với Discord Bot.

- **Web live:** https://orbit-psi-black.vercel.app
- **Frontend:** React 19 + Vite 6 + Tailwind 4 + TypeScript
- **Backend trên cloud:** Vercel Serverless (`api/index.js`) + Turso (libSQL) Cloud
- **Backend local (tùy chọn):** Flask (`app.py`) + Discord Bot (`Bot/bot.py`)

---

## 🏗️ 1. Kiến trúc: Vercel gánh phần nặng, Bot chạy khi cần

Web chạy 24/7 trên Vercel, không phụ thuộc máy cá nhân đang bật hay tắt. Bot Discord (cần WebSocket Gateway liên tục) vẫn chạy ở máy riêng và chỉ được gọi khi thật sự cần.

```text
 Trình duyệt ──► Vercel Edge CDN ──► Vercel Serverless (api/index.js)
                                         │
                      ┌──────────────────┼───────────────────┐
                      ▼                  ▼                   ▼
               Turso Cloud DB     Discord CDN / REST     Bot (máy cá nhân)
        documents_archive,        tải PDF, lấy link     chỉ nhận RPC nhẹ
        study_profiles,           file qua DISCORD_TOKEN qua bot_rpc_queue
        bot_kv_store
```

| Tác vụ | Ai xử lý |
| :--- | :--- |
| Đọc / tải PDF (`/view`, `/pdf`, `/download`) | **Vercel** tải từ Discord CDN và cache ở Edge (`s-maxage=86400`) |
| Tách câu hỏi & đáp án (`/content`) | **Vercel** đọc `raw_text` từ Turso và tự phân tích |
| Chuỗi ngày học, XP, Bảng Vàng (`/api/study/*`) | **Vercel + Turso** (múi giờ UTC+7) |
| Tìm kiếm kho đề, bốc đề ngẫu nhiên | **Vercel + Turso** |
| Trích xuất `raw_text` lần đầu, link CDN mới | **Bot**, sau đó ghi ngược lên Turso (write-through cache) |
| Quản trị, thông báo, trạng thái bot | **Bot** qua `bot_rpc_queue` / `bot_kv_store` |

---

## ⚡ 2. Khởi chạy nhanh

### Chạy Frontend (Dev Mode)
```powershell
cd Web
npm install
npm run dev
```
Mở **http://localhost:3000**.

### Build Production
```powershell
cd Web
npm run build      # tsc -b && vite build → Web/dist/
```

### Chạy Web Server Flask cục bộ (tùy chọn)
Phục vụ bản build trong `dist/` cùng các endpoint Discord / Bot Bridge:
```powershell
python Web/app.py
```
Mở **http://localhost:5000** (không dùng `0.0.0.0` trên trình duyệt).

### Chạy Discord Bot (độc lập với Web)
```powershell
python Bot/bot.py
```

### Deploy
Push lên nhánh `main` của repo Web, Vercel tự build và deploy.

---

## 🔌 3. API trên Vercel (`api/index.js`)

Mọi đường dẫn `/api/*` được `vercel.json` chuyển về `api/index.js`.

| Endpoint | Chức năng |
| :--- | :--- |
| `GET /api/status`, `/api/health` | Trạng thái Web / Bot |
| `GET /api/documents`, `/api/documents/archive` | Danh sách và tìm kiếm kho đề |
| `GET /api/documents/stats` | Thống kê kho đề |
| `GET /api/documents/check_hash` | Kiểm tra trùng file theo hash |
| `GET /api/documents/random` | Bốc đề ngẫu nhiên |
| `GET /api/documents/:id/content` | Câu hỏi và đáp án đã tách |
| `GET /api/documents/:id/file_url` | Link CDN trực tiếp |
| `GET /api/documents/:id/view` · `/pdf` · `/download` | Xem inline hoặc tải PDF |
| `GET /api/study/profile` | Hồ sơ học vị, chuỗi ngày, XP |
| `POST /api/study/checkin` | Điểm danh (+50 XP), Pomodoro, làm đề |
| `GET /api/study/leaderboard` | Bảng Vàng Học Thuật |
| `POST /api/account/link` | Liên kết tài khoản Discord |
| `GET /api/admin/*` | Bảng quản trị (cần quyền Admin) |

---

## 🔐 4. Biến môi trường

### Vercel (Settings → Environment Variables)

| Biến | Bắt buộc | Giải thích |
| :--- | :--- | :--- |
| `TURSO_DATABASE_URL` | ✅ | URL Turso Cloud |
| `TURSO_AUTH_TOKEN` | ✅ | Token truy cập Turso |
| `DISCORD_TOKEN` (hoặc `DISCORD_BOT_TOKEN`) | Khuyên dùng | Cho phép Vercel tự lấy link PDF từ Discord khi máy bot tắt |

### Chạy cục bộ (`Web/.env` hoặc kế thừa `Bot/.env`)

| Biến | Mặc định | Giải thích |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | Lấy từ `Bot/.env` | Gọi Discord REST API |
| `GUILD_ID` | `1532265330079174697` | ID máy chủ Discord chính |
| `BOT_API_URL` | `http://localhost:8080` | URL Bot API Bridge |
| `BOT_API_SECRET` | *(đặt riêng, không dùng giá trị mặc định)* | Khóa xác thực Bot ↔ Web |
| `DATABASE_URL` | `sqlite+aiosqlite:///../Bot/bot.db` | CSDL dùng chung khi Bot offline |
| `WEB_HOST` / `WEB_PORT` | `0.0.0.0` / `5000` | Địa chỉ và cổng Flask |

> [!WARNING]
> Không commit token hay secret. Hãy đổi `BOT_API_SECRET` khỏi giá trị mặc định trước khi mở ra Internet.

---

## 🔗 5. Cầu nối Web ↔ Bot

1. **Turso (chính):** `bot_kv_store` và `bot_rpc_queue` là hàng đợi giữa Vercel và Bot. Bot tắt thì Web vẫn đọc được dữ liệu đã cache.
2. **Discord REST (`bridge/discord_client.py`):** gọi trực tiếp bằng `DISCORD_TOKEN` để lấy thông tin server, roles, gửi tin nhắn, kể cả khi Bot đang tắt.
3. **Bot REST Bridge (`bridge/bot_client.py`):** khi chạy cục bộ, gọi `BOT_API_URL` để lấy dữ liệu realtime; mất kết nối thì tự chuyển sang đọc CSDL dùng chung.

---

## 🖼️ 6. Hiển thị PDF và bảo mật header

`vercel.json` cho phép khung đọc PDF nhúng cùng tên miền:

- `X-Frame-Options: SAMEORIGIN`
- CSP `frame-ancestors 'self'`, `frame-src` cho Discord CDN, Google Docs và Office Viewer
- `connect-src` cho Turso và Discord

Nếu thêm nguồn nhúng mới, cập nhật CSP trong `vercel.json`.

---

## 📁 7. Cấu trúc thư mục

```text
Web/
├── api/index.js          # Vercel Serverless Gateway (Turso, PDF, study, admin)
├── vercel.json           # Rewrites, header bảo mật, CSP
├── index.html            # Entry HTML, meta SEO, Open Graph
├── vite.config.ts        # Cấu hình Vite
├── package.json          # Scripts: dev, build, typecheck
├── src/
│   ├── components/       # Dashboard, ExamDossierModal, Hero, AdminPanel, ...
│   ├── context/          # ToastContext
│   ├── hooks/            # useTheme, useSmoothScroll, useHubPulse
│   ├── motion/           # Hiệu ứng chuyển động
│   ├── styles/           # CSS (hyperhub.css)
│   └── utils/            # tursoClient, apiConfig, discordAuth, bookmarkStorage, ...
├── public/               # Logo, ảnh Open Graph, font
├── app.py                # Flask server cục bộ (tùy chọn)
├── web_config.py         # Biến môi trường cho Flask
├── bridge/               # discord_client.py, bot_client.py
├── templates/            # index.html, upload_portal.html cho Flask
├── docs/                 # Tài liệu bàn giao, hệ thống motion
├── skills/               # Bộ UI/UX skills cho agent
├── general.md            # Hướng dẫn thiết kế và kiến trúc
└── README.md             # Tài liệu này
```

---

## 🛠️ 8. Lệnh hữu ích

| Lệnh | Tác dụng |
| :--- | :--- |
| `npm run dev` | Dev server `localhost:3000` |
| `npm run build` | Kiểm tra kiểu và build ra `dist/` |
| `npm run typecheck` | Chỉ kiểm tra TypeScript |
| `python Web/app.py` | Flask cục bộ `localhost:5000` |
