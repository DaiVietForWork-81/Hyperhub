export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  subTagline: string;
  description: string;
  navItems: NavItem[];
  stats: {
    label: string;
    value: string;
    subtext: string;
  }[];
}

export const siteConfig: SiteConfig = {
  name: "HyperHub",
  tagline: "LEARN • CHILL • CONNECT",
  subTagline: "Nơi học hỏi, rèn luyện tư duy, thư giãn và kết nối cộng đồng học thuật.",
  description: "HyperHub là nơi học hỏi có rất nhiều tài liệu phong phú, và cũng là nơi để bạn phát triển học Tin. Nếu bạn không có năng khiếu Tin, đừng lo — vào server chúng mình vẫn hỗ trợ các môn và các chuyên ngành khác cho các bạn!",
  navItems: [
    { label: "Trang Chủ", href: "#hero" },
    { label: "Về HyperHub", href: "#about" },
    { label: "Cách Hoạt Động", href: "#how-it-works" },
    { label: "Trụ Cột", href: "#pillars" },
    { label: "Đấu Trường", href: "#arena" },
    { label: "Đa Môn Học", href: "#subjects" },
    { label: "Hỏi Đáp", href: "#faq" },
    { label: "Cộng Đồng", href: "#platforms" },
    { label: "Đội Ngũ", href: "#credits" }
  ],
  stats: [
    { label: "Thành Viên", value: "500+", subtext: "Cùng đam mê học tập" },
    { label: "Kho Tài Liệu", value: "1,200+", subtext: "Bài tập & Đề thi đa môn" },
    { label: "Trận Đấu 1:1", value: "2,400+", subtext: "Đấu trường sinh tồn 2 ❤️" },
    { label: "Hỗ Trợ Học Tập", value: "24/7", subtext: "Thân thiện & Tận tâm" }
  ]
};
