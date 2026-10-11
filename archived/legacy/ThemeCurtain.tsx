import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

export interface ThemeTransitionState {
  isActive: boolean;
  currentTheme: Theme;
  targetTheme: Theme;
  stage: 'idle' | 'morphing' | 'fading-out';
  message: string;
}

interface ThemeCurtainProps {
  transition: ThemeTransitionState;
}

export const ThemeCurtain: React.FC<ThemeCurtainProps> = ({ transition }) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (transition.stage === 'morphing') {
      const raf = requestAnimationFrame(() => {
        setAnimating(true);
      });
      return () => cancelAnimationFrame(raf);
    } else if (transition.stage === 'idle') {
      setAnimating(false);
    }
  }, [transition.stage]);

  // Không render khi không có hiệu ứng chuyển đổi
  if (!transition.isActive && transition.stage === 'idle') {
    return null;
  }

  const isDarkTarget = transition.targetTheme === 'dark';
  const isFadingOut = transition.stage === 'fading-out';

  // Trạng thái nền hiện tại và đích
  const isGoingDark = isDarkTarget; // Chuyển từ Sáng -> Tối
  const isDarkNow = isGoingDark ? animating : !animating; // Nền đang nghiêng về Tối hay Sáng

  return (
    <div
      id="theme-curtain"
      aria-hidden="true"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden select-none w-screen h-screen transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* ======================================================== */}
      {/* LỚP 1 (GPU COMPOSITOR): MÀU NỀN KHỞI ĐIỂM                 */}
      {/* ======================================================== */}
      <div
        className={`absolute inset-0 z-0 transition-colors duration-500 ${
          transition.currentTheme === 'dark' ? 'bg-[#050508]' : 'bg-[#ffffff]'
        }`}
      />

      {/* ======================================================== */}
      {/* LỚP 2 (GPU COMPOSITOR): MÀU NỀN ĐÍCH (CHUYỂN MÀU CHẬM 2S) */}
      {/* ======================================================== */}
      <div
        className={`absolute inset-0 z-0 will-change-[opacity] ${
          isDarkTarget ? 'bg-[#050508]' : 'bg-[#ffffff]'
        } transition-opacity duration-[2000ms] ease-in-out ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Vầng hào quang trung tâm */}
      <div
        className={`pointer-events-none absolute inset-0 z-[1] will-change-[opacity] transition-opacity duration-[2000ms] ease-in-out ${
          animating ? 'opacity-70' : 'opacity-30'
        }`}
        style={{
          background: isDarkTarget
            ? 'radial-gradient(circle 700px at center, rgba(168, 85, 247, 0.28) 0%, rgba(99, 102, 241, 0.12) 45%, transparent 75%)'
            : 'radial-gradient(circle 700px at center, rgba(245, 158, 11, 0.25) 0%, rgba(236, 72, 153, 0.12) 45%, transparent 75%)',
        }}
      />

      {/* Góc trang trí - Tương phản sắc nét tuyệt đối theo nền */}
      <div
        className={`absolute top-6 left-6 font-mono text-[11px] tracking-widest uppercase z-10 transition-colors duration-[1500ms] font-medium ${
          isDarkNow ? 'text-white/60' : 'text-slate-700'
        }`}
      >
        TRANSITION // 2.0S_GPU_COMPOSITE
      </div>
      <div
        className={`absolute top-6 right-6 font-mono text-[11px] tracking-widest uppercase z-10 transition-colors duration-[1500ms] font-medium ${
          isDarkNow ? 'text-white/60' : 'text-slate-700'
        }`}
      >
        {isDarkTarget ? 'TARGET: OBSIDIAN_DARK' : 'TARGET: SOLAR_LIGHT'}
      </div>
      <div
        className={`absolute bottom-6 left-6 font-mono text-[11px] tracking-widest uppercase z-10 transition-colors duration-[1500ms] font-medium ${
          isDarkNow ? 'text-white/60' : 'text-slate-700'
        }`}
      >
        HYPERHUB // ZERO_DROP_FRAMES
      </div>
      <div
        className={`absolute bottom-6 right-6 font-mono text-[11px] tracking-widest uppercase z-10 transition-colors duration-[1500ms] font-medium ${
          isDarkNow ? 'text-white/60' : 'text-slate-700'
        }`}
      >
        FPS // 120HZ_SYNC
      </div>

      {/* Nội dung trung tâm */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto">
        
        {/* ======================================================== */}
        {/* BIỂU TƯỢNG MẶT TRỜI / MẶT TRĂNG XOAY BIẾN HÌNH 2S         */}
        {/* ======================================================== */}
        <div className="relative mb-8">
          {/* Hào quang tỏa sáng */}
          <div
            className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-[2000ms] ease-in-out ${
              isDarkNow
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 opacity-75'
                : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 opacity-60'
            }`}
          />

          {/* Khung chứa đĩa biến hình */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-2 shadow-2xl flex items-center justify-center transition-all duration-[2000ms] ease-in-out ${
              isDarkNow
                ? 'bg-[#0f101d] border-2 border-purple-500/50 shadow-purple-950/60 text-purple-300'
                : 'bg-white border-2 border-amber-400 shadow-amber-500/20 text-amber-500'
            }`}
          >
            {/* Lõi xoay 180 độ mượt mà suốt 2 giây */}
            <div
              className={`relative w-full h-full rounded-full flex items-center justify-center will-change-transform transition-transform duration-[2000ms] ease-in-out ${
                animating ? 'rotate-180' : 'rotate-0'
              }`}
            >
              {/* Icon Mặt Trời */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-[1200ms] ease-in-out ${
                  isGoingDark && animating
                    ? 'opacity-0 scale-75 rotate-45'
                    : 'opacity-100 scale-100 rotate-0 text-amber-500'
                }`}
              >
                <Sun className="w-12 h-12" />
              </div>

              {/* Icon Mặt Trăng */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-[1200ms] ease-in-out ${
                  isGoingDark && animating
                    ? 'opacity-100 scale-100 rotate-0 text-purple-300'
                    : 'opacity-0 scale-75 -rotate-45'
                }`}
              >
                <Moon className="w-12 h-12" />
              </div>
            </div>

            {/* Ánh sao lấp lánh */}
            <Sparkles
              className={`absolute -top-1 -right-1 w-5 h-5 transition-colors duration-[2000ms] ${
                isDarkNow ? 'text-pink-400' : 'text-amber-500'
              }`}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* TIÊU ĐỀ "ĐỢI..." & HUY HIỆU TRẠNG THÁI                    */}
        {/* ======================================================== */}
        <div className="space-y-3 mb-7">
          {/* Badge trạng thái luôn đảm bảo độ tương phản cao */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border transition-all duration-[1500ms] shadow-sm mb-1 ${
              isDarkNow
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-300'
                : 'bg-amber-100 border-amber-400/80 text-amber-900'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full animate-ping ${
                isDarkNow ? 'bg-purple-400' : 'bg-amber-600'
              }`}
            />
            <span>
              {isDarkTarget
                ? 'TRẮNG ➔ ĐEN DẦN ➔ TỐI'
                : 'ĐEN ➔ TRẮNG DẦN ➔ SÁNG'}
            </span>
          </div>

          {/* Dòng chữ lớn "Đợi..." - gradient luôn sáng rực trên nền đen, hoặc đậm nét trên nền trắng */}
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-none drop-shadow-sm">
            <span
              className={`font-black transition-all duration-[1800ms] ${
                isDarkNow
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-800 via-pink-700 to-indigo-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]'
              }`}
            >
              {transition.message || 'Đợi...'}
            </span>
          </h2>

          {/* Dòng mô tả giải thích rõ ràng và có độ tương phản cao */}
          <p
            className={`text-xs sm:text-sm font-sans tracking-wide font-semibold transition-colors duration-[1500ms] ${
              isDarkNow ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            {isDarkTarget
              ? 'Đang chuyển từ nền Trắng sang Đen dần trong 2 giây...'
              : 'Đang chuyển từ nền Đen sang Trắng dần trong 2 giây...'}
          </p>
        </div>

        {/* ======================================================== */}
        {/* THANH TIẾN TRÌNH GPU 2S (TRANSFORM SCALEX - 0 REFLOW)     */}
        {/* ======================================================== */}
        <div className="w-64 h-2.5 rounded-full overflow-hidden relative shadow-inner bg-slate-300 dark:bg-white/20 border border-black/5 dark:border-white/10">
          <div
            className={`h-full w-full rounded-full origin-left will-change-transform transition-transform duration-[2000ms] ease-linear ${
              isDarkTarget
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500'
                : 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600'
            } ${animating ? 'scale-x-100' : 'scale-x-0'}`}
          />
        </div>

        {/* Thông tin thời lượng */}
        <p
          className={`mt-4 text-[11px] font-mono tracking-widest uppercase transition-colors duration-[1500ms] font-semibold ${
            isDarkNow ? 'text-white/50' : 'text-slate-600'
          }`}
        >
          HYPERHUB // 2.0S CINEMATIC SHIFT
        </p>
      </div>
    </div>
  );
};

export default ThemeCurtain;
