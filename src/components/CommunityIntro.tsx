import React from 'react';
import { Bot, Trophy, Check, ArrowUpRight, Globe, Database } from 'lucide-react';
import { Reveal } from './hh/Reveal';
import { SpotSurface, CountUp } from './hh/Controls';
import { useHubPulse } from '../hooks/useHubPulse';
import { hubIntentProps } from '../hubLoader';

/**
 * LEARN · Hệ sinh thái Orbit - 4 trụ cột chức năng thật.
 * Bố cục có thứ bậc: Web Hub là khối chính (có CTA thật vào kho đề),
 * AI + Thư viện xếp cột phải, Chuyên đề Thuật toán là dải ngang.
 */

const SIDE_PILLARS = [
  {
    icon: Bot,
    badge: 'Tạo đề tự động',
    title: 'Bộ sinh đề nhiều mô hình',
    desc: 'Ba mô hình phối hợp: Qwen 3.5:4B tạo đề, Gemma 3:4B phản biện logic hai vòng, Qwen 2.5:0.5B soát lỗi, xuất sẵn hai file đề và đáp án chuẩn in.',
    features: ['3 mô hình phối hợp', 'Tách đề & đáp án', 'Hoàn 100% token nếu lỗi'],
    tone: 'pink',
    preset: 'slide-r' as const,
  },
  {
    icon: Database,
    badge: 'Kiểm duyệt tài liệu',
    title: 'Thư viện đề tự động',
    desc: 'Quét mã băm SHA-256 chống trùng lặp, tự bóc tách năm học, trường và sở ra đề bằng bộ xử lý C++ hiệu năng cao.',
    features: ['Xử lý C++ tốc độ cao', 'Chống trùng SHA-256', 'Nhận dạng OCR & năm học'],
    tone: 'cyan',
    preset: 'slide-r' as const,
  },
];

export const CommunityIntro: React.FC<{ onOpenVault?: () => void }> = ({ onOpenVault }) => {
  const { docCount } = useHubPulse();

  return (
    <section id="community-intro" className="hh-section" aria-labelledby="eco-title">
      <div className="hh-section-head">
        <Reveal as="h3" id="eco-title" preset="fade" className="hh-section-title">
          Bốn trụ cột của quỹ đạo Orbit
        </Reveal>
        <Reveal as="p" preset="fade" delay={80} className="hh-section-sub">
          Mỗi người có một quỹ đạo riêng, nhưng chúng ta gặp nhau tại Orbit để học hỏi, bứt phá năng lực và cùng tiến xa hơn.
        </Reveal>
      </div>

      <div className="hh-eco-grid">
        {/* Trụ cột chính: Web Hub */}
        <Reveal preset="panel" className="hh-eco-main-wrap">
          <SpotSurface className="hh-card hh-card--hero hh-eco-main hh-lift" data-ui="orbit-workspace" spotColor="rgba(255, 60, 166, 0.16)">
            <div className="hh-card-top">
              <span className="hh-icon-tile hh-tone-violet">
                <Globe className="w-6 h-6 hh-nudge" aria-hidden="true" />
              </span>
              <h4 className="hh-card-title hh-card-title--lg">Không gian học tập Orbit</h4>
            </div>
            <p className="hh-card-text">
              Ngân hàng đề thi chuẩn hóa, tra cứu toàn văn FTS5 siêu tốc, bảng điều khiển cá nhân hóa và tủ sách đề thi
              trực tuyến 24/7.
            </p>
            <ul className="hh-checks">
              <li><Check aria-hidden="true" />Kho đề đã thẩm định &amp; phân loại tự động</li>
              <li><Check aria-hidden="true" />Tủ sách cá nhân &amp; đồng bộ tài khoản Discord</li>
              <li><Check aria-hidden="true" />Bộ lọc sâu theo Khối lớp, Môn học, Trường &amp; Sở</li>
              <li><Check aria-hidden="true" />Máy phát đề ngẫu nhiên &amp; đồng hồ Pomodoro 25/5</li>
            </ul>
            {/* Minh họa "kho khối": các ô đề xếp tầng, nhô lên thành sóng khi hover thẻ */}
            <div className="hh-vault" aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} style={{ ['--i' as string]: i }} />
              ))}
            </div>
            <div className="hh-eco-main-foot">
              {docCount !== null ? (
                <p className="hh-eco-stat">
                  <CountUp value={docCount} className="hh-eco-stat-num" />
                  <span>đề đang có trong kho</span>
                </p>
              ) : (
                <p className="hh-eco-stat hh-eco-stat--muted">Số đề sẽ hiển thị khi kết nối được tới máy chủ.</p>
              )}
              {onOpenVault && (
                <button type="button" className="hh-inline-cta" onClick={onOpenVault} {...hubIntentProps}>
                  Mở kho đề
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </SpotSurface>
        </Reveal>

        <div className="hh-eco-side">
          {SIDE_PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} preset={p.preset} delay={120 + i * 90}>
                <SpotSurface className="hh-card hh-lift" data-ui="orbit-pillar" spotColor={p.tone === 'pink' ? 'rgba(255,79,203,0.16)' : 'rgba(95,214,240,0.14)'}>
                  <div className="hh-card-top">
                    <span className={`hh-icon-tile hh-tone-${p.tone}`}>
                      <Icon className="w-5 h-5 hh-nudge" aria-hidden="true" />
                    </span>
                    <h4 className="hh-card-title">{p.title}</h4>
                  </div>
                  <p className="hh-card-text">{p.desc}</p>
                  <ul className="hh-checks hh-checks--inline">
                    {p.features.map((f) => (
                      <li key={f}><Check aria-hidden="true" />{f}</li>
                    ))}
                  </ul>
                </SpotSurface>
              </Reveal>
            );
          })}
        </div>

        {/* Dải ngang: Sàn đấu Thuật toán & Olympic */}
        <Reveal preset="rise" delay={80} className="hh-eco-strip-wrap">
          <SpotSurface className="hh-card hh-eco-strip hh-lift" data-ui="orbit-olympic" spotColor="rgba(255, 179, 150, 0.16)">
            <span className="hh-icon-tile hh-tone-amber">
              <Trophy className="w-5 h-5 hh-nudge" aria-hidden="true" />
            </span>
            <div className="hh-eco-strip-body">
              <h4 className="hh-card-title">Sàn đấu Thuật toán &amp; Olympic</h4>
              <p className="hh-card-text">
                Nuôi dưỡng tư duy Tin học, lập trình thi đấu (Competitive Programming), kết nối bảng xếp hạng Codeforces và kho chuyên đề HSG Tỉnh, Olympic C++/Python.
              </p>
            </div>
            <ul className="hh-checks hh-checks--inline">
              <li><Check aria-hidden="true" />Liên kết Codeforces &amp; thi đấu 1v1</li>
              <li><Check aria-hidden="true" />Thuật toán C++ &amp; Python</li>
              <li><Check aria-hidden="true" />Chuyên đề HSG Tin &amp; Toán</li>
            </ul>
          </SpotSurface>
        </Reveal>
      </div>

      {/* Sứ mệnh đồng hành + chỉ số thực tế */}
      <div className="hh-metrics-band">
        <Reveal preset="fade" className="hh-metrics" as="dl" data-ui="orbit-metrics">
          <div>
            <dt>Phi lợi nhuận</dt>
            <dd>100%</dd>
            <dd className="hh-metric-sub">Vì học sinh Việt Nam</dd>
          </div>
          <div>
            <dt>Mô hình AI phối hợp</dt>
            <dd>3</dd>
            <dd className="hh-metric-sub">Qwen 3.5, Gemma 3 &amp; Qwen 2.5</dd>
          </div>
          <div>
            <dt>Học tập trực tuyến</dt>
            <dd>24/7</dd>
            <dd className="hh-metric-sub">Web Hub &amp; Discord Bot</dd>
          </div>
        </Reveal>

        <Reveal preset="fade" delay={120} className="hh-eco-plate">
          <img
            src="/orbit_emblem_core.png"
            alt="Biểu trưng quỹ đạo tri thức Orbit | Vietnam"
            width={140}
            height={140}
            loading="lazy"
            decoding="async"
            className="hh-eco-banner-img"
          />
          <div className="hh-mission-copy" data-ui="orbit-mission">
            <p className="hh-mission-quote">“Không ai phải bước vào phòng thi một mình.”</p>
            <p className="hh-mission-sub">
              Dù bạn ôn thi vào 10 hay Tốt nghiệp THPT, theo đuổi thuật toán hay Toán, Văn, Ngoại ngữ, Orbit luôn đồng hành cùng bạn.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CommunityIntro;
