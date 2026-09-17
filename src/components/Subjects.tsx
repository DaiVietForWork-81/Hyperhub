import React from 'react';
import { 
  Calculator, 
  BookOpen, 
  Languages, 
  Atom, 
  FlaskConical, 
  Dna, 
  History, 
  Compass, 
  Globe, 
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { ScrollReveal } from './ScrollReveal';

export const Subjects: React.FC = () => {
  const subjectsList = [
    {
      id: 'math',
      name: 'Toán Học',
      badge: 'Đại Số & Hình Học',
      description: 'Ôn thi THPTQG, Đánh giá năng lực, Toán chuyên và Olympic. Trao đổi phương pháp giải toán hình không gian, giải tích và xác suất.',
      icon: Calculator,
      color: 'text-purple-400',
      spotlight: 'rgba(168, 85, 247, 0.20)',
      border: 'rgba(168, 85, 247, 0.5)'
    },
    {
      id: 'literature',
      name: 'Ngữ Văn',
      badge: 'Nghị Luận & Cảm Thụ',
      description: 'Tổng hợp dàn ý chi tiết các tác phẩm trọng tâm, bài văn mẫu đạt điểm cao, phương pháp viết nghị luận xã hội và mở bài - kết bài ấn tượng.',
      icon: BookOpen,
      color: 'text-rose-400',
      spotlight: 'rgba(244, 63, 94, 0.20)',
      border: 'rgba(244, 63, 94, 0.5)'
    },
    {
      id: 'english',
      name: 'Tiếng Anh',
      badge: 'IELTS • THPTQG',
      description: 'Luyện đề thi THPTQG, chiến lược học từ vựng theo chủ đề, mẹo làm bài đọc hiểu, phát âm chuẩn và tài liệu ôn luyện chứng chỉ quốc tế.',
      icon: Languages,
      color: 'text-blue-400',
      spotlight: 'rgba(59, 130, 246, 0.20)',
      border: 'rgba(59, 130, 246, 0.5)'
    },
    {
      id: 'physics',
      name: 'Vật Lý',
      badge: 'Cơ • Nhiệt • Điện • Quang',
      description: 'Hệ thống công thức trực quan, giải thích bản chất hiện tượng vật lý, bài tập đồ thị dao động, sóng ánh sáng và phương pháp loại trừ.',
      icon: Atom,
      color: 'text-amber-400',
      spotlight: 'rgba(245, 158, 11, 0.20)',
      border: 'rgba(245, 158, 11, 0.5)'
    },
    {
      id: 'chemistry',
      name: 'Hóa Học',
      badge: 'Vô Cơ & Hữu Cơ',
      description: 'Quy luật phản ứng este, kim loại, axit - bazo, chuỗi chuyển hóa hóa học và các phương pháp giải nhanh như bảo toàn e, bảo toàn khối lượng.',
      icon: FlaskConical,
      color: 'text-emerald-400',
      spotlight: 'rgba(16, 185, 129, 0.20)',
      border: 'rgba(16, 185, 129, 0.5)'
    },
    {
      id: 'biology',
      name: 'Sinh Học',
      badge: 'Di Truyền & Sinh Thái',
      description: 'Sơ đồ tư duy sinh học tế bào, cơ chế di truyền phân tử, quy luật Men-đen, phả hệ và các dạng bài tập sinh thái học thường gặp trong đề thi.',
      icon: Dna,
      color: 'text-lime-400',
      spotlight: 'rgba(132, 204, 22, 0.20)',
      border: 'rgba(132, 204, 22, 0.5)'
    },
    {
      id: 'history',
      name: 'Lịch Sử',
      badge: 'Việt Nam & Thế Giới',
      description: 'Hệ thống dòng thời gian sự kiện khoa học, nguyên nhân - ý nghĩa lịch sử, bảng so sánh giai đoạn và mẹo nhớ mốc thời gian không bị nhầm lẫn.',
      icon: History,
      color: 'text-orange-400',
      spotlight: 'rgba(249, 115, 22, 0.20)',
      border: 'rgba(249, 115, 22, 0.5)'
    },
    {
      id: 'geography',
      name: 'Địa Lý',
      badge: 'Tự Nhiên & Atlat',
      description: 'Kỹ năng khai thác triệt để Atlat Địa lý Việt Nam, nhận diện bảng số liệu, đọc biểu đồ và phân tích kinh tế các vùng trọng điểm.',
      icon: Compass,
      color: 'text-cyan-400',
      spotlight: 'rgba(6, 182, 212, 0.20)',
      border: 'rgba(6, 182, 212, 0.5)'
    },
    {
      id: 'foreign_languages',
      name: 'Ngoại Ngữ Quốc Tế',
      badge: 'Nhật • Trung • Hàn • Pháp',
      description: 'Kênh học tập và giao lưu ngoại ngữ thứ 2: Tiếng Nhật (JLPT), Tiếng Trung (HSK), Tiếng Hàn (TOPIK), Tiếng Pháp, Tiếng Đức cùng tài liệu sơ cấp đến trung cấp.',
      icon: Globe,
      color: 'text-pink-400',
      spotlight: 'rgba(236, 72, 153, 0.20)',
      border: 'rgba(236, 72, 153, 0.5)'
    },
    {
      id: 'general',
      name: 'Học Tập Chung & Kỹ Năng',
      badge: 'Định Hướng 24/7',
      description: 'Góc tâm sự mùa thi, định hướng chọn trường đại học, phương pháp tự học Pomodoro, kỹ năng mềm và chia sẻ tài liệu học tập tổng hợp.',
      icon: Sparkles,
      color: 'text-purple-300',
      spotlight: 'rgba(147, 51, 234, 0.22)',
      border: 'rgba(168, 85, 247, 0.55)'
    }
  ];

  return (
    <section id="subjects" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/20 bg-purple-950/20 text-xs font-mono tracking-widest text-purple-300 uppercase mb-3 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <GraduationCap className="w-3.5 h-3.5 text-pink-400" />
            <span>Học Tập Đa Môn • Toàn Diện & Tận Tâm</span>
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mt-3 mb-4 text-balance">
            Không Gian Hỗ Trợ Đa Môn & Ngôn Ngữ
          </h2>
          <p className="text-base text-white/60 leading-relaxed max-w-2xl mx-auto text-pretty font-sans">
            Không chỉ giới hạn ở Lập trình Tin học — HyperHub đồng hành cùng bạn trong tất cả các môn học từ Tự nhiên, Xã hội cho đến Ngoại ngữ quốc tế và kỹ năng sống.
          </p>
        </div>
      </ScrollReveal>

      {/* Grid 10 Subjects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {subjectsList.map((item, idx) => {
          const Icon = item.icon;
          return (
            <ScrollReveal key={item.id} delay={(idx % 5) * 100}>
              <SpotlightCard
                enableTilt={true}
                spotlightColor={item.spotlight}
                borderColor={item.border}
                className="liquid-glass p-5 rounded-2xl flex flex-col justify-between h-full hover:shadow-xl hover:shadow-purple-950/20 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className={`p-2.5 rounded-xl bg-white/[0.03] border border-white/10 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-white/50 border border-white/[0.08]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover/spotlight:text-purple-300 transition-colors">
                    {item.name}
                  </h3>

                  <p className="text-xs text-white/55 leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-white/[0.06] mt-4 flex items-center justify-between text-[11px] text-white/40">
                  <span>Tài liệu & Hỏi đáp</span>
                  <span className="text-green-400 font-mono">Sẵn sàng</span>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};
