# 🌐 HYPERHUB: CỘNG ĐỒNG HỌC TẬP, THUẬT TOÁN LẬP TRÌNH & ỨNG DỤNG AI
> **Tài liệu thông tin toàn diện (General Information & Blueprint): Giới thiệu bản sắc máy chủ học tập HyperHub, hệ sinh thái công nghệ thuật toán coding, tích hợp trí tuệ nhân tạo (AI) và phương pháp xây dựng website thông tin chuẩn mực nhất.**

---

## 📖 I. Giới Thiệu Tổng Quan Về Server HyperHub

### 1. HyperHub Là Gì?
**HyperHub** là một máy chủ Discord công nghệ và học thuật hàng đầu, được xây dựng với mục tiêu trở thành ngôi nhà chung cho các bạn trẻ đam mê **Khoa học máy tính, Lập trình thi đấu (Competitive Programming), và Trí tuệ nhân tạo (AI)** tại Việt Nam.

Với tôn chỉ **`✦ LEARN • CHILL • CONNECT 💜`**, HyperHub không đơn thuần là một nơi trò chuyện giải trí, mà là một **môi trường học tập thông minh** — nơi các lập trình viên rèn luyện tư duy thuật toán mỗi ngày, cọ xát trong các trận đấu kịch tính, tiếp cận công nghệ AI tiên tiến, và cùng nhau thư giãn trong một cộng đồng văn minh, thân thiện.

### 2. Tầm Nhìn & Giá Trị Cốt Lõi
- **Môi trường học tập chất lượng cao:** Khuyến khích tinh thần tự học, nghiên cứu cấu trúc dữ liệu & giải thuật, chia sẻ kiến thức công nghệ mới.
- **Văn hóa thi đấu lành mạnh (Fair-Play):** Chống gian lận tuyệt đối, hệ thống tính điểm Elo minh bạch, vinh danh thực lực.
- **Tiên phong ứng dụng AI:** Đưa AI vào hỗ trợ học tập, sinh bài tập thực chiến, phân tích lời giải và cá nhân hóa lộ trình rèn luyện.
- **Không gian Chill & Kết nối:** Sau những giờ học tập căng thẳng là những phút giây nghe nhạc lofi, đàm đạo công nghệ và kết nối bạn bè cùng chí hướng.

---

## ⚡ II. Trụ Cột Công Nghệ 1: Hệ Thống Thuật Toán Coding (Competitive Programming Arena)

Điểm nhấn công nghệ cốt lõi giúp HyperHub khác biệt hoàn toàn với các server thông thường là hệ sinh thái **Lập trình thi đấu tự động hóa 100%**:

### 1. Đấu Trường Đối Kháng 1:1 Ranked Kịch Tính
- **Cơ chế thi đấu thời gian thực:** Hai thí sinh thi đấu trực tiếp trong một phòng riêng biệt (Private Duel Channel) do bot tự động khởi tạo.
- **Hệ thống mạng sống sinh tồn (Life System):** Mỗi thí sinh có 2 mạng (`❤️❤️`). Thua mỗi chặng mất 1 mạng (`💔`). Đấu cho đến khi tìm ra người chiến thắng chung cuộc.
- **Độ khó leo thang theo chặng (Escalation Difficulty):**
  - Đề bài tăng dần độ khó qua từng chặng thi đấu, đòi hỏi thí sinh phải nâng cao tốc độ tư duy và kỹ năng tối ưu mã nguồn.
  - Phân chia Division khoa học: **Div. 2** (nhập môn → trung cấp) và **Div. 1** (nâng cao, đòi hỏi tư duy giải thuật sâu sắc, hoàn thành trong 15-20 phút).
- **Hệ thống xếp hạng Tier chuẩn quốc tế:**
  - `T8 (Newbie)` → `T7` → `T6` → `T5` → `T4` → `T3`
  - `LT2 (Candidate Master)` → `MT2` → `HT2`
  - `LT1 (Grandmaster)` → `MT1` → `HT1 (Legendary Grandmaster)`
- **Đồng bộ hóa Rank Role Discord:** Hệ thống tự động cấp/thu hồi vai trò hiển thị trên Discord ngay khi thí sinh thăng hạng hoặc tụt hạng.

### 2. Trình Chấm Bài Tự Động Siêu Tốc (Automated Judge Sandbox)
- Hỗ trợ đa ngôn ngữ phổ biến: **C++, Python, Java, JavaScript**.
- Chấm điểm đa luồng cách ly an toàn, kiểm soát nghiêm ngặt:
  - Giới hạn thời gian chạy (Time Limit Exceeded - TLE: 1.0s - 2.0s).
  - Giới hạn bộ nhớ RAM (Memory Limit Exceeded - MLE: 256MB).
  - Bắt lỗi biên dịch (CE), lỗi thực thi (RTE), kết quả sai (WA).
- Hệ thống Subtasks phân chia điểm rõ ràng (ví dụ: Subtask 1 duyệt trâu, Subtask 2 tối ưu $O(N)$, Subtask 3 cấu trúc dữ liệu nâng cao $O(N \log N)$).

### 3. Đồng Bộ Hóa Codeforces & Chế Độ Freedom
- Tự động liên kết tài khoản Codeforces của thành viên thông qua API chính thức.
- Tự động quét và phát hiện lượt nộp bài thành công (Accepted) trên Codeforces để cộng điểm cống hiến và xếp hạng trong server.

### 4. Thư Viện Đề Bài & Editorial Chuẩn Mực (`/search {id}`)
- Mỗi bài toán sau khi hoàn thành đều được tự động lưu trữ vĩnh viễn vào kênh kho đề.
- Lệnh `/search {id}` cho phép tra cứu ngay lập tức:
  - Đề bài gốc, ràng buộc dữ liệu mẫu (Input/Output).
  - **Editorial phân tích thuật toán chuyên sâu:** Giải thích cặn kẽ ý tưởng, chứng minh tính đúng đắn và độ phức tạp tính toán.
  - **Mã nguồn chuẩn AC:** Cung cấp code mẫu tối ưu bằng C++ và Python.

---

## 🤖 III. Trụ Cột Công Nghệ 2: Đột Phá Ứng Dụng Trí Tuệ Nhân Tạo (AI Engineering)

HyperHub không chỉ dùng các thuật toán truyền thống mà còn tích hợp sâu rộng các mô hình **AI thế hệ mới** (Large Language Models, Local LLM Daemon, AI Agents):

### 1. AI Sinh Đề Bài Tự Động (AI Problem Generation Engine)
- Sử dụng mô hình AI được tinh chỉnh (fine-tuned) chuyên về Competitive Programming:
  - Tự động sáng tác các bài toán mới lạ, không bị trùng lặp trên mạng.
  - Đa dạng thể loại: Quy hoạch động (DP), Đồ thị (Graph/BFS/DFS), Cấu trúc dữ liệu (Segment Tree/Fenwick), Số học (Number Theory), Tham lam (Greedy).
  - Đề bài có cốt truyện gần gũi, logic chặt chẽ, không bị lỗi ngữ nghĩa.

### 2. AI Thẩm Định Đề Thi & Tạo Bộ Dữ Liệu Test (AI Verification & Testcase Auditor)
- AI không chỉ viết đề mà còn tự động:
  - Sinh bộ testcase chuẩn: Tối thiểu $\ge 4$ testcases bí mật, bao quát các trường hợp biên cực trị ($N=1, N=10^5$, số âm, tràn số 64-bit `long long`).
  - Viết code lời giải chuẩn (AC Solution) và chạy thử nghiệm đối chiếu với code ngây thơ (Brute-force Solution) để đảm bảo 100% không có testcase sai đề.

### 3. AI Trợ Giảng Định Hướng (AI Coding Mentor & Hinting)
- Khi người học gặp bế tắc, AI đóng vai trò như một trợ giảng:
  - Gợi ý hướng suy nghĩ (hint) từng bước mà **không làm lộ đáp án hoàn chỉnh**, giúp người học tự lực tư duy.
  - Phân tích nguyên nhân nộp bài bị lỗi (TLE do thuật toán $O(N^2)$, WA do tràn số nguyên).

### 4. Kiến Trúc AI Chạy Background Bất Đồng Bộ (Async AI Worker)
- Tích hợp daemon Ollama / Gemini API chạy nền trên server với cơ chế giám sát tài nguyên phần cứng (CPU/RAM/GPU VRAM).
- Hệ thống hàng đợi (Task Queue) thông minh, tự động chuẩn bị trước kho đề dự trữ (Prefetching cache) để khi thí sinh bấm tìm trận, đề bài xuất hiện ngay tức khắc không có độ trễ.

---

## 🎧 IV. Trụ Cột Văn Hóa: Không Gian Học Tập & Chill Lành Mạnh

### 1. Phòng Tự Học & Thảo Luận Công Nghệ
- Các kênh text phân chia rõ ràng: Thảo luận thuật toán, Lập trình Web/App, Nghiên cứu AI/Machine Learning, Góc khoe góc setup máy tính.
- Kênh voice "Study With Me" mở camera/chia sẻ màn hình cùng nhau học bài, bấm giờ Pomodoro.

### 2. Âm Nhạc Thư Giãn Đỉnh Cao (HyperHub Music Ecosystem)
- Hệ thống bot âm nhạc tích hợp sâu với YouTube, Spotify:
  - Chơi nhạc chất lượng cao, độ trễ cực thấp.
  - Các playlist Lofi, Synthwave, Ambient chuyên dụng cho lập trình viên tập trung code.

### 3. Vinh Danh Thành Viên & Thẻ Profile 4K UHD
- Mỗi thành viên sở hữu một tấm **Thẻ căn cước tuyển thủ 4K (3840 × 2160 px)** độc nhất:
  - Thiết kế đồ họa Cyberpunk / Neon cao cấp.
  - Hai cột lịch sử đối đầu song song: `[RANKED 1:1]` và `[FREEDOM SUBMISSIONS]`.
  - Hiển thị avatar Discord, rank tier, rating, số trận thắng/thua, tỷ lệ chính xác.

---

## 🏛️ V. Cơ Cấu Tổ Chức & Phân Cấp Máy Chủ (Server Roles & Structure)

Để đảm bảo vận hành trật tự và quy củ, hệ thống phân chia các tầng vai trò (Roles) rõ ràng:

1. **╭─── QUẢN TRỊ VIÊN ───╮:**
   - 👑 Owner & Co-Owner: Sáng lập và định hướng chiến lược.
   - ⚡ Administrator & 🛡️ Moderator: Duy trì an ninh, hỗ trợ thành viên, tổ chức sự kiện.
   - ✍️ Tác giả / Giám khảo: Chịu trách nhiệm ra đề, kiểm tra chất lượng bài toán.
2. **╭─── TIER (BẬC THI ĐẤU) ───╮:**
   - Từ `HT1, MT1, LT1` (Đỉnh cao bảng vàng) xuống đến `T8` (Tân thủ khởi đầu).
3. **╭─── THÀNH VIÊN ───╮:**
   - Các vai trò định danh theo ngôn ngữ lập trình (C++, Python, Rust, Go) và sở thích công nghệ (AI/Web/Cybersecurity).
4. **╭─── KHÁC ───╮:**
   - Hệ thống Bot tích hợp (HyperHub Bot, Sapphire, Music Bot).

---

## 🌐 VI. Phương Pháp Thiết Kế & Thể Hiện Lên Website (Web Blueprint)

Để website phản ánh chân thực nhất tinh thần của HyperHub, website sẽ đóng vai trò là **Cổng Thông Tin & Khám Phá Công Nghệ (Showcase & Community Portal)**:

### 1. Cấu Trúc Trang Web Giới Thiệu (Information Architecture)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           HEADER & NAVBAR                               │
│  [Logo HyperHub 3D]   Về Chúng Tôi  |  Thuật Toán  |  Công Nghệ AI  |  Bot   │  [Tham Gia Discord]
├─────────────────────────────────────────────────────────────────────────┤
│                             HERO SECTION                                │
│          🌸 HYPERHUB: NƠI HỌC TẬP, THUẬT TOÁN & AI GIAO THOA            │
│         ✦ Slogan: LEARN • CHILL • CONNECT 💜                            │
│         [ 🚀 Khám Phá Ngay ]      [ ⚔️ Vào Đấu Trường ]                  │
├─────────────────────────────────────────────────────────────────────────┤
│                      LIVE METRICS TICKER (Dữ liệu thật)                 │
│   👥 150+ Thành viên  •  ⚔️ 1,240+ Trận đối kháng  •  💻 5,800+ Bài AC  │
├─────────────────────────────────────────────────────────────────────────┤
│                   FEATURE 1: ĐẤU TRƯỜNG THUẬT TOÁN 1:1                  │
│   - Mô tả hệ thống sinh tồn 2 mạng, tính điểm Elo, đề leo thang.        │
│   - Widget mô phỏng giao diện trận đấu thực tế.                         │
├─────────────────────────────────────────────────────────────────────────┤
│                   FEATURE 2: ĐỘT PHÁ CÔNG NGHỆ AI                       │
│   - Giới thiệu AI tự động sinh đề, thẩm định testcase, AI trợ giảng.    │
│   - Terminal tương tác thử nghiệm xem mẫu đề do AI tạo ra.              │
├─────────────────────────────────────────────────────────────────────────┤
│                   FEATURE 3: KHÔNG GIAN HỌC TẬP & CHILL                 │
│   - Giới thiệu các phòng học nhóm, thư viện /search bài tập.            │
│   - Trình nghe nhạc Lofi đồng bộ trực tiếp với bot Discord.             │
├─────────────────────────────────────────────────────────────────────────┤
│                   BẢNG VÀNG & THẺ TUYỂN THỦ 4K                          │
│   - Showcase Top 10 Thí sinh đứng đầu server.                           │
│   - Trình xem ảnh Profile Card 4K UHD chân thực.                        │
├─────────────────────────────────────────────────────────────────────────┤
│                   CÁCH THỨC THAM GIA & ONBOARDING                       │
│   - 3 Bước đơn giản để gia nhập và bắt đầu thi đấu/học tập.             │
│   - Nút lớn: [ 💜 THAM GIA MÁY CHỦ DISCORD HYPERHUB NGAY ]              │
├─────────────────────────────────────────────────────────────────────────┤
│                             FOOTER                                      │
│   Bản quyền © 2026 HyperHub • Made with ❤️ & Code in Vietnam            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Các Yếu Tố Trực Quan & Tương Tác Sống Động
- **Thẻ Terminal Thuật Toán Trực Tiếp (Interactive Code & AI Demo):**
  - Người xem web có thể bấm nút `[ Sinh bài tập AI ]` trên web để thấy AI sinh ra một đề bài thuật toán mẫu hoàn chỉnh kèm testcase và lời giải.
- **Dữ Liệu Thật Kết Nối Trực Tiếp Qua Bridge:**
  - Website gọi `DISCORD_TOKEN` và `BOT_API_BRIDGE` để hiển thị avatar thật của Owner, Admin, Top tuyển thủ và trạng thái bot online.
- **Phong Cách Thẩm Mỹ (Đã chuẩn hóa bằng `ui-skills` & `ui-ux-pro-max`):**
  - Tông màu Dark OLED (`#0B0F17`) kết hợp sắc hoa anh đào tím hồng (`#E879F9` / `#C084FC`) và xanh terminal (`#22C55E`).
  - Font chữ chuyên nghiệp `Inter` + `JetBrains Mono` thẳng hàng con số bằng `tabular-nums`.
  - Cánh hoa anh đào rơi thoang thoảng ở nền, tạo cảm giác vừa học thuật vừa thư thái.

---

> [!NOTE]
> Tài liệu này được lưu trữ chính thức tại **[`Web/general.md`](file:///d:/Project/Web/general.md)**. Đây là nguồn thông tin gốc (Source of Truth) chuẩn xác nhất để định hình toàn bộ nội dung, ngôn từ và giao diện khi xây dựng website giới thiệu HyperHub!
