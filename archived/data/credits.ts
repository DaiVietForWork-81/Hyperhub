export interface CreditMember {
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string | null;
  tag?: string;
  discordTag?: string;
}

export const creditsData: CreditMember[] = [
  {
    name: "Dai Viet",
    role: "Đồng Sáng Lập",
    bio: "Khởi xướng và thiết kế toàn bộ kiến trúc HyperHub, xây dựng hệ thống Bot kiểm định đề tự động, cầu nối API và trải nghiệm Web Portal.",
    avatarUrl: null,
    tag: "👑 Co-Founder • System Architect",
    discordTag: "Dai Viet"
  },
  {
    name: "GithuZ",
    role: "Đồng Sáng Lập",
    bio: "Đồng phát triển lõi xử lý C++ Native Engine, tối ưu hóa các thuật toán tìm kiếm FTS5, chống trùng đề SHA-256 và hạ tầng kỹ thuật máy chủ.",
    avatarUrl: null,
    tag: "⚡ Co-Founder • Core Engine",
    discordTag: "GithuZ"
  },
  {
    name: "Nguyễn Duy",
    role: "Đồng Sáng Lập",
    bio: "Quản trị và phát triển cộng đồng học sinh, kết nối các thế hệ sĩ tử, duy trì môi trường trao đổi học tập tích cực và văn minh.",
    avatarUrl: null,
    tag: "🌐 Co-Founder • Community Lead",
    discordTag: "Nguyễn Duy"
  },
  {
    name: "Lê Minh",
    role: "Đồng Sáng Lập",
    bio: "Định hướng học liệu, chọn lọc và kiểm định ngân hàng đề thi bám sát cấu trúc Bộ GD&ĐT, đồng hành xây dựng ngân hàng tri thức cho sĩ tử.",
    avatarUrl: null,
    tag: "📚 Co-Founder • Academic Lead",
    discordTag: "Lê Minh"
  }
];
