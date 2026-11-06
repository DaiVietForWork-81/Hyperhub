/**
 * Cấu hình Hệ Thống Các CLB Chuyên Môn Orbit (Shards).
 * Đã setup sẵn toàn bộ thông tin, link mời vĩnh viễn và quyền lợi Quản lý CLB.
 *
 * Khi dự án CLB hoàn tất và sẵn sàng công bố lên Trang Chủ Web,
 * chỉ cần đổi `SHOW_ORBIT_CLUBS_PUBLIC = true`.
 */

export const SHOW_ORBIT_CLUBS_PUBLIC = false;

export interface OrbitClubInfo {
  code: string;
  name: string;
  subject: string;
  guildId: string;
  inviteUrl: string;
  status: 'active' | 'recruiting';
  managerNote: string;
  description: string;
}

export const ORBIT_MANAGER_PERK = {
  title: 'Đặc quyền Quản Lý CLB & Cộng Tác Viên Cốt Cán',
  highlight: 'DeepSeek V4.1 Flash vô thời hạn',
  description:
    'Được cấp quyền sử dụng DeepSeek V4.1 Flash vô thời hạn (có hạn mức/ngày cực kỳ thoải mái, hiệu năng suy luận ngang ngửa Gemini / GPT Pro) phục vụ giải bài, nghiên cứu và biên soạn chuyên đề.',
};

export const ORBIT_CLUBS: OrbitClubInfo[] = [
  {
    code: 'toan',
    name: 'Orbit | Toán',
    subject: 'Toán Học',
    guildId: '1567904557076316250',
    inviteUrl: 'https://discord.gg/vr6GVTEEhe',
    status: 'active',
    managerNote: 'Trực thuộc Quản lý Trung tâm Orbit',
    description: 'Đại số, Giải tích, Hình học, Tổ hợp - Xác suất (THCS • THPT • ĐGNL • HSG & Chuyên Toán).',
  },
  {
    code: 'van',
    name: 'Orbit | Văn',
    subject: 'Ngữ Văn',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang hoàn thiện Ban Quản Lý',
    description: 'Đọc hiểu văn bản mới, Nghị luận xã hội, Nghị luận văn học & Lý luận văn học.',
  },
  {
    code: 'anh',
    name: 'Orbit | Anh',
    subject: 'Tiếng Anh',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Trực thuộc Quản lý Trung tâm & Đồng Quản Lý',
    description: 'Ngữ pháp, Từ vựng, Đọc hiểu THPT 2025, IELTS, SAT & Chuyên Anh.',
  },
  {
    code: 'tin',
    name: 'Orbit | Tin (HyperHub)',
    subject: 'Tin Học',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Ban Quản Lý Chuyên Tin / HyperHub',
    description: 'Lập trình C++ / Python, Cấu trúc dữ liệu & Giải thuật, Đề thi HSG & Chuyên Tin.',
  },
  {
    code: 'ly',
    name: 'Orbit | Lý',
    subject: 'Vật Lý',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang tuyển Quản Lý CLB',
    description: 'Cơ học, Nhiệt học, Điện từ, Quang học & Vật lý hiện đại.',
  },
  {
    code: 'hoa',
    name: 'Orbit | Hóa',
    subject: 'Hóa Học',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang tuyển Quản Lý CLB',
    description: 'Hóa vô cơ, Hóa hữu cơ, Hóa đại cương & Bài toán thực tiễn chuẩn 2025.',
  },
  {
    code: 'sinh',
    name: 'Orbit | Sinh',
    subject: 'Sinh Học',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang tuyển Quản Lý CLB',
    description: 'Sinh học tế bào, Di truyền học, Tiến hóa & Sinh thái học.',
  },
  {
    code: 'lsdl',
    name: 'Orbit | LS ĐL',
    subject: 'Lịch Sử & Địa Lý',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang tuyển Quản Lý CLB',
    description: 'Lịch sử Việt Nam & Thế giới, Địa lý tự nhiên, kinh tế - xã hội & Atlat.',
  },
  {
    code: 'gdcd',
    name: 'Orbit | GDCD',
    subject: 'GDKT & Pháp Luật',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang tuyển Quản Lý CLB',
    description: 'Giáo dục Kinh tế & Pháp luật, Xử lý tình huống thực tiễn & Ôn thi THPT.',
  },
  {
    code: 'trung',
    name: 'Orbit | Trung',
    subject: 'Tiếng Trung',
    guildId: '',
    inviteUrl: '',
    status: 'recruiting',
    managerNote: 'Đang tuyển Quản Lý CLB',
    description: 'Hán ngữ giao tiếp, Ngữ pháp & Từ vựng HSK 1–6, Ôn thi THPT Khối D4.',
  },
];
