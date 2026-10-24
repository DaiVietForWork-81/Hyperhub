import React, { useEffect, useId, useState } from 'react';
import { BookmarkCheck, PencilLine, AlertTriangle, Check } from 'lucide-react';
import { Reveal } from './hh/Reveal';
import { PixelButton } from './hh/Controls';

const DREAM_PILLARS = [
  {
    title: 'Xác định mục tiêu sớm',
    desc: 'Biết rõ trường mơ ước và điểm chuẩn để tập trung đúng lộ trình.',
  },
  {
    title: 'Ý chí vượt vũ môn',
    desc: 'Mỗi đề giải xong, mỗi câu sai được sửa là một bước rèn bản lĩnh.',
  },
  {
    title: 'Chạm tay tương lai',
    desc: 'Khoảnh khắc cầm giấy báo trúng tuyển nguyện vọng 1 xứng đáng mọi nỗ lực.',
  },
  {
    title: 'Đồng hành không đơn độc',
    desc: 'Cộng đồng Orbit luôn chia sẻ tài liệu và tiếp lửa trên chặng nước rút.',
  },
];

/**
 * CHILL · Bảng ước mơ - tính năng thật: lưu mục tiêu Nguyện vọng 1 vào localStorage.
 * Chuyển trạng thái form ↔ thẻ đã lưu bằng crossfade ngắn; phản hồi thành công/thất bại thật.
 */

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

const STORAGE_KEY = 'hyperhub_user_dream';
const LEGACY_KEYS = ['orbit_user_dream'];

type Feedback = { kind: 'success' | 'error'; text: string } | null;

export const DreamAspirations: React.FC = () => {
  const [dreamSchool, setDreamSchool] = useState('');
  const [dreamScore, setDreamScore] = useState('');
  const [savedDream, setSavedDream] = useState<{ school: string; score: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const schoolId = useId();
  const scoreId = useId();

  // Nạp ước mơ đã lưu (hỗ trợ khóa cũ từ phiên bản trước)
  useEffect(() => {
    try {
      const stored = [STORAGE_KEY, ...LEGACY_KEYS].map((k) => localStorage.getItem(k)).find(Boolean);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.school) {
          setSavedDream(parsed);
          setDreamSchool(parsed.school);
          setDreamScore(parsed.score || '');
        }
      }
    } catch {
      // Bỏ qua dữ liệu hỏng
    }
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const handleSaveDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreamSchool.trim()) return;
    const dreamObj = { school: dreamSchool.trim(), score: dreamScore.trim() || 'Thủ khoa / Nguyện vọng 1' };
    try {
      const serialized = JSON.stringify(dreamObj);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem('orbit_user_dream', serialized);
      setSavedDream(dreamObj);
      setIsEditing(false);
      setFeedback({ kind: 'success', text: 'Đã lưu mục tiêu. Hãy quyết tâm biến nó thành hiện thực nhé!' });
    } catch {
      setFeedback({ kind: 'error', text: 'Không lưu được: trình duyệt đang chặn bộ nhớ cục bộ.' });
    }
  };

  const showSaved = savedDream && !isEditing;

  return (
    <section id="dream-aspirations" className="hh-section" aria-labelledby="dream-title">
      <div className="hh-dream-layout">
        <div className="hh-dream-copy">
          <Reveal as="h3" id="dream-title" preset="fade" className="hh-section-title">
            Khắc ghi ngôi trường mơ ước
          </Reveal>
          <Reveal as="p" preset="fade" delay={80} className="hh-section-sub">
            Mỗi bài toán bạn kiên trì tìm lời giải đều đang vẽ nên cánh cổng ngôi trường mơ ước. Ghi lại mục tiêu để mỗi lần
            quay lại Orbit, bạn nhớ vì sao mình bắt đầu.
          </Reveal>
          <Reveal as="ul" preset="fade" delay={140} className="hh-checks mt-5">
            <li><Check aria-hidden="true" /> Xác định mục tiêu sớm &amp; đồng bộ trực tiếp lên Orbit Hub</li>
            <li><Check aria-hidden="true" /> Ý chí vượt vũ môn cùng bộ đếm Pomodoro 25/5 tập trung</li>
            <li><Check aria-hidden="true" /> Đồng hành không đơn độc, không ai phải bước vào phòng thi một mình</li>
          </Reveal>

          <Reveal as="dl" preset="fade" delay={200} className="hh-dream-pillars" data-ui="dream-pillars">
            {DREAM_PILLARS.map((item) => (
              <div key={item.title} className="hh-dream-pillar-item">
                <dt className="hh-dream-pillar-title">{item.title}</dt>
                <dd className="hh-dream-pillar-desc">{item.desc}</dd>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal preset="panel" delay={60} className="hh-dream-board-wrap">
          <div className="hh-card hh-card--hero hh-dream-board" data-ui="dream-board">
            <div key={showSaved ? 'saved' : 'form'} className="hh-swap">
              {showSaved ? (
                <div className="hh-dream-saved">
                  <span className="hh-pill hh-pill--mint">
                    <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
                    Ước mơ của bạn đã được ghi danh
                  </span>
                  <p className="hh-dream-label">Mục tiêu nguyện vọng 1</p>
                  <p className="hh-dream-school">{savedDream.school}</p>
                  {savedDream.score && <p className="hh-dream-score">Mục tiêu: {savedDream.score}</p>}
                  <blockquote className="hh-dream-quote">
                    Hãy nhớ lý do bạn bắt đầu. Cánh cổng {savedDream.school} đang chờ bạn vào mùa thu tới.
                  </blockquote>
                  <button type="button" onClick={() => setIsEditing(true)} className="hh-quiet-btn hh-press">
                    <PencilLine className="w-4 h-4" aria-hidden="true" />
                    Đổi mục tiêu khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveDream} className="hh-dream-form">
                  <div className="hh-field hh-field--wide">
                    <label htmlFor={schoolId}>Nguyện vọng 1 / trường THPT hoặc đại học mơ ước</label>
                    <input
                      id={schoolId}
                      type="text"
                      value={dreamSchool}
                      onChange={(e) => setDreamSchool(e.target.value)}
                      placeholder="Ví dụ: ĐH Bách Khoa, Chuyên Amsterdam, ĐH Y Hà Nội…"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="hh-field">
                    <label htmlFor={scoreId}>Mục tiêu điểm số / chuyên ngành</label>
                    <input
                      id={scoreId}
                      type="text"
                      value={dreamScore}
                      onChange={(e) => setDreamScore(e.target.value)}
                      placeholder="Ví dụ: 28+ khối A00, IELTS 7.5+…"
                      autoComplete="off"
                    />
                  </div>

                  <fieldset className="hh-suggest">
                    <legend>Gợi ý nhanh</legend>
                    <div className="hh-suggest-list">
                      {POPULAR_DREAM_SCHOOLS.map((school) => (
                        <button
                          key={school}
                          type="button"
                          onClick={() => setDreamSchool(school)}
                          className="hh-toggle-chip"
                          aria-pressed={dreamSchool === school}
                        >
                          {school}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="hh-dream-actions">
                    <p className="hh-fine">Mục tiêu chỉ được lưu trong trình duyệt của bạn.</p>
                    <div className="hh-dream-buttons">
                      {savedDream && (
                        <button type="button" onClick={() => setIsEditing(false)} className="hh-quiet-btn hh-press">
                          Hủy
                        </button>
                      )}
                      <PixelButton type="submit" variant="primary" icon={<BookmarkCheck className="w-4 h-4" aria-hidden="true" />}>
                        Khắc ghi ước mơ
                      </PixelButton>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="hh-feedback-slot" role="status" aria-live="polite">
              {feedback && (
                <p className={`hh-feedback hh-feedback--${feedback.kind}`}>
                  {feedback.kind === 'error' ? (
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
                  )}
                  {feedback.text}
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default DreamAspirations;
