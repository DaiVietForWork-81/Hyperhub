import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Sparkles, MessageCircleQuestion } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'HyperHub có thu bất kỳ khoản phí nào không?',
    answer: 'Hoàn toàn Miễn Phí 100%! Toàn bộ tài liệu, đề thi, phòng học Pomodoro 24/7, đấu trường đối kháng 1:1 và hệ thống cấp Rank Role Discord đều mở tự do cho mọi học sinh, sinh viên Việt Nam giao lưu và cùng tiến bộ.',
    category: 'Chi Phí & Quyền Lợi',
  },
  {
    question: 'Mình không có năng khiếu Tin / chưa biết lập trình thì có tham gia được không?',
    answer: 'Rất hoan nghênh bạn! HyperHub là không gian học tập toàn diện, không chỉ có Tin học mà còn hỗ trợ mạnh mẽ các môn Toán, Ngữ Văn, Tiếng Anh, Vật Lý, Hóa Học, Sinh Học, Lịch Sử, Địa Lý và Ngoại Ngữ. Nếu bạn muốn bắt đầu học Tin học, server có sẵn tài liệu cơ bản từ con số 0 và các anh chị sẵn sàng giải đáp.',
    category: 'Đối Tượng Tham Gia',
  },
  {
    question: 'Đấu Trường Đối Kháng 1:1 Sinh Tồn 2 Mạng (❤️❤️) hoạt động ra sao?',
    answer: 'Khi bạn tham gia thách đấu, bot sẽ tạo phòng thi đấu riêng biệt. Cả hai đấu thủ nhận cùng một bài toán thuật toán. Mỗi bên có 2 mạng sống (❤️❤️), mỗi lần nộp bài bị lỗi hoặc sai test (WA) sẽ bị trừ 1 mạng. Trình chấm Sandbox siêu tốc sẽ trả lời verdict ngay lập tức. Người giải đúng trước hoặc sống sót sau cùng sẽ giành chiến thắng!',
    category: 'Đấu Trường 1:1',
  },
  {
    question: 'Làm thế nào để leo Rank và nhận Rank Role trên Discord?',
    answer: 'Điểm Elo của bạn sẽ được tích lũy tự động sau mỗi chiến thắng trong Đấu Trường 1:1 hoặc hoàn thành các bài tập trên bot để nhận Rank Role tương ứng trên máy chủ Discord. Tính năng này hiện đang trong quá trình phát triển & hoàn thiện, các thông tin và cách thức hoạt động chi tiết sẽ sớm được ban quản trị công bố chính thức khi ra mắt!',
    category: 'Đang Phát Triển',
  },
  {
    question: 'Phòng học Pomodoro và Chill Lounge có quy định gì không?',
    answer: 'Phòng voice hoạt động 24/7, bạn có thể tự do mở cam, chia sẻ màn hình học tập hoặc chỉ nghe bot phát nhạc Lofi thư giãn. Quy định duy nhất là giữ thái độ lịch sự, tôn trọng không gian tập trung của các thành viên khác.',
    category: 'Chill & Pomodoro',
  },
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      id="faq" 
      className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-10 w-full"
    >
      {/* Section Header */}
      <ScrollReveal>
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/20 bg-purple-950/20 text-xs font-mono tracking-widest text-purple-300 uppercase mb-3 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
            <span>Hỏi & Đáp • Frequently Asked Questions</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4 text-balance">
            Câu Hỏi Thường Gặp
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-white/70 max-w-xl text-balance leading-relaxed">
            Những thắc mắc phổ biến nhất khi các bạn mới gia nhập mái nhà chung HyperHub.
          </p>
        </div>
      </ScrollReveal>

      {/* Accordion List */}
      <div className="space-y-4">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;

          return (
            <ScrollReveal key={idx} delay={idx * 80}>
              <div 
                className={`rounded-2xl border transition-all duration-300 backdrop-blur-xl overflow-hidden ${
                  isOpen
                    ? 'border-purple-400/80 dark:border-purple-500/50 bg-purple-50/80 dark:bg-gradient-to-r dark:from-purple-950/30 dark:to-slate-900/60 shadow-md shadow-purple-200/50 dark:shadow-[0_0_25px_rgba(139,92,246,0.18)]'
                    : 'border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] hover:border-purple-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full min-h-[56px] px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 active:scale-[0.99] transition-transform duration-150"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircleQuestion className={`w-5 h-5 shrink-0 transition-colors ${isOpen ? 'text-pink-600 dark:text-pink-400' : 'text-purple-600 dark:text-purple-400'}`} />
                    <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {item.question}
                    </span>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-purple-200 dark:bg-purple-600/30 text-purple-700 dark:text-pink-300' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/60'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm sm:text-base text-slate-600 dark:text-white/75 leading-relaxed font-sans border-t border-slate-200/80 dark:border-white/[0.06] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="inline-block text-[11px] font-mono font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/40 px-2 py-0.5 rounded mb-2 border border-purple-300 dark:border-purple-500/20">
                      {item.category}
                    </div>
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Support Box */}
      <div className="mt-10 p-6 rounded-2xl bg-white/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-center flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 text-left">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Bạn còn câu hỏi khác cần giải đáp?</div>
            <div className="text-xs text-slate-500 dark:text-white/60">Đội ngũ Admin và Moderator luôn trực 24/7 trên kênh Ticket Discord.</div>
          </div>
        </div>
        <a
          href="https://discord.gg/D34HX87bGe"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-shimmer btn-motion px-5 py-3 min-h-[44px] rounded-full text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 hover:-translate-y-0.5 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/30 cursor-pointer"
        >
          Hỏi Trực Tiếp Trên Discord
        </a>
      </div>
    </section>
  );
};
