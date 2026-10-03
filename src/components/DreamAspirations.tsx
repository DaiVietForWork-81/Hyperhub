import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GraduationCap,
  Target,
  Heart,
  Flame,
  Star,
  BookmarkCheck,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { SpotlightCard } from './SpotlightCard';

const POPULAR_DREAM_SCHOOLS = [
  'ĐH Bách Khoa Hà Nội',
  'ĐH Ngoại Thương (FTU)',
  'ĐH Y Hà Nội',
  'ĐH Quốc Gia Hà Nội / TP.HCM',
  'ĐH Kinh Tế Quốc Dân (NEU)',
  'THPT Chuyên Hà Nội - Amsterdam',
  'THPT Chuyên Sư Phạm Hà Nội',
  'THPT Chuyên Khoa Học Tự Nhiên',
  'THPT Chuyên Lê Hồng Phong (TP.HCM)',
  'ĐH Bách Khoa TP.HCM',
  'Học Viện Ngoại Giao',
  'Học Viện Công Nghệ Bưu Chính Viễn Thông',
];

const INSPIRATION_PILLARS = [
  {
    icon: Target,
    title: 'Xác Định Mục Tiêu Sớm',
    desc: 'Biết rõ ngôi trường mơ ước và số điểm mục tiêu giúp bạn có lộ trình học tập tập trung, không phân tâm trước biển tài liệu.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    icon: Flame,
    title: 'Ý Chí Vượt Vũ Môn',
    desc: 'Mỗi đêm chong đèn giải đề, mỗi lần sửa lại câu sai là một bước tôi luyện bản lĩnh thép sẵn sàng đối mặt phòng thi.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  {
    icon: GraduationCap,
    title: 'Chạm Tay Tương Lai',
    desc: 'Khoảnh khắc cầm giấy báo trúng tuyển nguyện vọng 1 sẽ là món quà xứng đáng nhất đền đáp mọi mồ hôi và nước mắt bạn đã đổ.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Heart,
    title: 'Đồng Hành Không Đơn Độc',
    desc: 'HyperHub luôn ở đây để chia sẻ tài liệu, lắng nghe và đồng hành cùng bạn trên từng chặng đường nước rút.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
];

export const DreamAspirations: React.FC = () => {
  const [dreamSchool, setDreamSchool] = useState<string>('');
  const [dreamScore, setDreamScore] = useState<string>('');
  const [savedDream, setSavedDream] = useState<{ school: string; score: string } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Nạp ước mơ đã lưu từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hyperhub_user_dream');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.school) {
          setSavedDream(parsed);
          setDreamSchool(parsed.school);
          setDreamScore(parsed.score || '');
        }
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }, []);

  const handleSaveDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreamSchool.trim()) return;

    const dreamObj = {
      school: dreamSchool.trim(),
      score: dreamScore.trim() || 'Thủ Khoa / Nguyện Vọng 1',
    };
    try {
      localStorage.setItem('hyperhub_user_dream', JSON.stringify(dreamObj));
      setSavedDream(dreamObj);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // localStorage error
    }
  };

  return (
    <section
      id="dream-aspirations"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[450px] bg-gradient-to-tr from-pink-600/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Header Section */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(236,72,153,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Nuôi Dưỡng Khát Vọng • Ước Mơ Sĩ Tử</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Nơi Chắp Cánh Cho{' '}
            <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              Nguyện Vọng 1
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Mỗi ngọn đèn bạn thắp sáng trong đêm, mỗi bài toán bạn kiên trì tìm lời giải đều đang vẽ nên cánh cổng ngôi trường mơ ước. 
            Đừng bao giờ từ bỏ ước mơ của mình, bởi HyperHub luôn sẵn sàng tiếp lửa cho bạn!
          </p>
        </div>
      </ScrollReveal>

      {/* Bảng "Ước Mơ Của Bạn" (Interactive Student Dream Board) */}
      <ScrollReveal delay={150}>
        <div className="max-w-4xl mx-auto mb-16">
          <div className="relative rounded-3xl p-6 sm:p-8 border border-pink-500/30 bg-gradient-to-b from-purple-950/30 via-black/50 to-pink-950/20 backdrop-blur-xl shadow-2xl shadow-purple-950/40">
            {savedDream && !isEditing ? (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  <span>Ước mơ của bạn đã được ghi danh trên HyperHub</span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-widest text-pink-400 font-mono font-semibold">
                    MỤC TIÊU NGUYỆN VỌNG 1
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    🌟 {savedDream.school}
                  </h3>
                  {savedDream.score && (
                    <div className="inline-block mt-1 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-sm font-bold">
                      🎯 Mục tiêu điểm số: {savedDream.score}
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 italic max-w-lg mx-auto">
                  "Hãy nhớ lý do bạn bắt đầu. Cánh cổng {savedDream.school} đang rộng mở chào đón bạn vào mùa thu tới!"
                </p>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    ✏️ Đổi Mục Tiêu Khác
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveDream} className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Khắc Ghi Ngôi Trường Mơ Ước</h3>
                    <p className="text-xs text-slate-400">
                      Ghi lại mục tiêu để mỗi lần vào HyperHub, bạn được nhắc nhở về lý do mình nỗ lực!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Nguyện vọng 1 / Trường THPT hoặc Đại học mơ ước:
                    </label>
                    <input
                      type="text"
                      value={dreamSchool}
                      onChange={(e) => setDreamSchool(e.target.value)}
                      placeholder="Ví dụ: ĐH Bách Khoa, Chuyên Amsterdam, ĐH Y Hà Nội..."
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 focus:border-pink-500 focus:bg-black/50 text-white text-sm outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Mục tiêu điểm số / Chuyên ngành:
                    </label>
                    <input
                      type="text"
                      value={dreamScore}
                      onChange={(e) => setDreamScore(e.target.value)}
                      placeholder="Ví dụ: 28+ khối A00, IELTS 7.5+..."
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/15 focus:border-pink-500 focus:bg-black/50 text-white text-sm outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Gợi ý trường hot */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400">
                    💡 Gợi ý nhanh:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {POPULAR_DREAM_SCHOOLS.map((school) => (
                      <button
                        key={school}
                        type="button"
                        onClick={() => setDreamSchool(school)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          dreamSchool === school
                            ? 'bg-pink-600 text-white border-pink-500 font-bold'
                            : 'bg-white/[0.03] text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {school}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400 italic">
                    *Mục tiêu được lưu an toàn trong trình duyệt của bạn và truyền cảm hứng mỗi ngày.
                  </p>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {savedDream && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-lg shadow-pink-900/30 transition-all cursor-pointer active:scale-95"
                    >
                      ✨ Khắc Ghi Ước Mơ Ngay
                    </button>
                  </div>
                </div>
              </form>
            )}

            {saveSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
                🎉 Đã lưu ước mơ thành công! Hãy quyết tâm biến nó thành hiện thực nhé!
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* 4 Trụ Cột Nâng Cánh Ước Mơ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {INSPIRATION_PILLARS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <ScrollReveal key={idx} delay={idx * 80}>
              <SpotlightCard
                className={`p-6 rounded-2xl border ${item.border} bg-white/[0.02] backdrop-blur-xl h-full flex flex-col justify-between hover:border-pink-500/40 transition-all duration-300`}
                spotlightColor="rgba(236, 72, 153, 0.12)"
              >
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} border ${item.border} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center gap-1.5 text-xs font-semibold text-pink-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Quyết tâm đỗ đạt</span>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};

export default DreamAspirations;
