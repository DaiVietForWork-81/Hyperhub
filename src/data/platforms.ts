export interface PlatformItem {
  id: string;
  name: string;
  badge?: string;
  description: string;
  url: string;
  status: "active" | "coming_soon";
  iconName: "discord" | "facebook" | "messenger" | "github" | "youtube" | "more";
  accentColor?: string;
  memberCount?: string;
}

export const activePlatforms: PlatformItem[] = [
  {
    id: "discord",
    name: "HyperHub Discord Server",
    badge: "Máy Chủ Chính",
    description: "Không gian học tập và kết nối trung tâm của HyperHub với kho tài liệu phong phú, hỗ trợ học Tin và các môn chuyên khác, phòng Pomodoro và cộng đồng học tập sôi nổi.",
    url: "https://discord.gg/D34HX87bGe",
    status: "active",
    iconName: "discord",
    accentColor: "#8B5CF6",
    memberCount: "500+ Thành viên"
  },
  {
    id: "facebook",
    name: "Facebook Group",
    badge: "Cộng Đồng Mở",
    description: "Theo dõi các tin tức công nghệ mới nhất, thông báo sự kiện, bài viết chia sẻ kinh nghiệm học tập và thảo luận cùng các thành viên.",
    url: "YOUR_FACEBOOK_URL",
    status: "active",
    iconName: "facebook",
    accentColor: "#3B82F6",
    memberCount: "Cộng đồng năng động"
  },
  {
    id: "messenger",
    name: "Messenger Group",
    badge: "Tương Tác Nhanh",
    description: "Nhóm chat trao đổi nhanh về bài tập, hỏi đáp kiến thức, chia sẻ tài liệu và trò chuyện thân mật cùng ban quản trị và bạn bè.",
    url: "YOUR_MESSENGER_URL",
    status: "active",
    iconName: "messenger",
    accentColor: "#EC4899",
    memberCount: "Box chat 24/7"
  }
];

export const comingSoonPlatforms: PlatformItem[] = [
  {
    id: "github",
    name: "GitHub Organization",
    description: "Kho mã nguồn mở các bot, thư viện giải thuật và dự án cộng đồng HyperHub.",
    url: "#",
    status: "coming_soon",
    iconName: "github"
  },
  {
    id: "youtube",
    name: "YouTube Channel",
    description: "Video bài giảng phân tích thuật toán, hướng dẫn giải đề chuyên sâu và chia sẻ phương pháp học tập hiệu quả.",
    url: "#",
    status: "coming_soon",
    iconName: "youtube"
  },
  {
    id: "more",
    name: "Nền Tảng Khác",
    description: "Đang mở rộng thêm TikTok, Website Portal chuyên sâu và Discord Bot Store.",
    url: "#",
    status: "coming_soon",
    iconName: "more"
  }
];
