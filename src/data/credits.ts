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
    role: "Chủ HyperHub & Sáng Lập",
    bio: "Định hướng phát triển cộng đồng HyperHub, dẫn dắt hệ sinh thái và quản trị tổng thể máy chủ.",
    avatarUrl: null,
    tag: "👑 Server Owner",
    discordTag: "Chủ HyperHub"
  },
  {
    name: "Lê Minh",
    role: "Đồng Sáng Lập",
    bio: "Đồng hành xây dựng kiến trúc nền tảng, thiết kế trải nghiệm người dùng và điều hành dự án.",
    avatarUrl: null,
    tag: "⚡ Co-Founder",
    discordTag: "Đồng Sáng Lập"
  },
  {
    name: "GithubZ",
    role: "Đồng Sáng Lập",
    bio: "Phát triển công nghệ cốt lõi, quản lý kho lưu trữ mã nguồn mở và hệ thống bot thi đấu.",
    avatarUrl: null,
    tag: "🚀 Co-Founder",
    discordTag: "Đồng Sáng Lập"
  },
  {
    name: "Nguyễn Duy",
    role: "Đồng Sáng Lập",
    bio: "Điều phối các hoạt động học thuật, phát triển nội dung kiến thức và xây dựng cộng đồng gắn kết.",
    avatarUrl: null,
    tag: "💡 Co-Founder",
    discordTag: "Đồng Sáng Lập"
  },
  {
    name: "Nguyễn Khải",
    role: "Admin Quản Trị",
    bio: "Quản lý điều hành máy chủ, hỗ trợ thành viên giải đáp thắc mắc và duy trì văn hóa tích cực.",
    avatarUrl: null,
    tag: "🛡️ Administrator",
    discordTag: "Admin"
  }
];
