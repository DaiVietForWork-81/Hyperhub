import React from 'react';
import { Award, MessageSquare, Check, ArrowUpRight, Globe, Database } from 'lucide-react';
import { Reveal } from './hh/Reveal';
import { SpotSurface, CountUp } from './hh/Controls';
import { useHubPulse } from '../hooks/useHubPulse';
import { hubIntentProps } from '../hubLoader';

/**
 * LEARN · Hệ sinh thái Orbit - 4 trụ cột chức năng thật (100% Free, không Token/AI Generator).
 * Bố cục có thứ bậc: Kho Đề Thi Thực Chiến là khối chính,
 * Đóng Góp & Vinh Danh Credit + Thẩm Định Tự Động xếp cột phải, Diễn Đàn & Tự Học là dải ngang.
 */

const SIDE_PILLARS = [
  {
    icon: Award,
    badge: 'Đóng góp học thuật',
    title: 'Vinh danh Tác giả & Credit',
    desc: 'Chỉ cần liên kết tài khoản Discord để nộp đề thi, hiển thị Tên & Avatar vĩnh viễn trên thẻ đề và tự động nhận Role ✍️ Tác giả.',
    features: ['Ghi nhận Credit vĩnh viễn', 'Tự động cấp Role ✍️ Tác giả', 'Đồng bộ tức thì Web & Discord'],
    tone: 'pink',
    preset: 'slide-r' as const,
  },
  {
    icon: Database,
    badge: 'Kiểm duyệt tài liệu',
    title: 'Kho Học Liệu Chuẩn Hóa',
    desc: 'Đề thi và chuyên đề được sắp xếp khoa học theo môn học, khối lớp, năm học và trường/sở theo chương trình GDPT 2018 & chuẩn 2025.',
    features: ['Chuẩn cấu trúc 2025', 'Đầy đủ khối lớp 6 – 12', 'Theo trường & năm học'],
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
          Mỗi người có một quỹ đạo riêng, nhưng chúng ta gặp nhau tại Orbit để chia sẻ học liệu, rèn luyện kỷ luật và cùng tiến xa hơn.
        </Reveal>
      </div>

      <div className="hh-eco-grid">
        {/* Trụ cột chính: Web Hub & Kho Đề Thi */}
        <Reveal preset="panel" className="hh-eco-main-wrap">
          <SpotSurface className="hh-card hh-card--hero hh-eco-main hh-lift" data-ui="orbit-workspace" spotColor="rgba(255, 60, 166, 0.16)">
            <div className="hh-card-top">
              <span className="hh-icon-tile hh-tone-violet">
                <Globe className="w-6 h-6 hh-nudge" aria-hidden="true" />
              </span>
              <h4 className="hh-card-title hh-card-title--lg">Kho Đề Thi Thực Chiến (Doc Vault)</h4>
            </div>
            <p className="hh-card-text">
              Ngân hàng đề thi THCS, THPT, Chuyên &amp; ĐGNL miễn phí 100%, hỗ trợ tìm kiếm toàn văn siêu tốc, xem trước PDF và bốc đề ngẫu nhiên 24/7.
            </p>
            <ul className="hh-checks">
              <li><Check aria-hidden="true" />Kho đề chọn lọc từ các trường Chuyên &amp; Sở GD&amp;ĐT</li>
              <li><Check aria-hidden="true" />Xem trực tiếp PDF &amp; tải nguyên bản miễn phí</li>
              <li><Check aria-hidden="true" />Bộ lọc sâu theo Khối lớp, Môn học, Trường &amp; Năm học</li>
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

        {/* Dải ngang: Diễn Đàn Học Thuật 2 Chiều & Phòng Tự Học */}
        <Reveal preset="rise" delay={80} className="hh-eco-strip-wrap">
          <SpotSurface className="hh-card hh-eco-strip hh-lift" data-ui="orbit-olympic" spotColor="rgba(255, 179, 150, 0.16)">
            <span className="hh-icon-tile hh-tone-amber">
              <MessageSquare className="w-5 h-5 hh-nudge" aria-hidden="true" />
            </span>
            <div className="hh-eco-strip-body">
              <h4 className="hh-card-title">Diễn Đàn Học Thuật 2 Chiều &amp; Tự Học Pomodoro</h4>
              <p className="hh-card-text">
                Đặt câu hỏi bài tập, thảo luận phương pháp ôn thi đồng bộ tức thì với kênh #diễn-đàn trên Discord, kết hợp phòng tự học Pomodoro và vinh danh Tác giả đóng góp.
              </p>
            </div>
            <ul className="hh-checks hh-checks--inline">
              <li><Check aria-hidden="true" />Đồng bộ 2 chiều Web &amp; Discord</li>
              <li><Check aria-hidden="true" />Phòng tự học Lofi &amp; Pomodoro</li>
              <li><Check aria-hidden="true" />Vinh danh Tác giả đóng góp tài liệu</li>
            </ul>
          </SpotSurface>
        </Reveal>
      </div>

      {/* Sứ mệnh đồng hành + chỉ số thực tế */}
      <div className="hh-metrics-band">
        <Reveal preset="fade" className="hh-metrics" as="dl" data-ui="orbit-metrics">
          <div>
            <dt>Học liệu mở</dt>
            <dd>100%</dd>
            <dd className="hh-metric-sub">Miễn phí vì học sinh Việt Nam</dd>
          </div>
          <div>
            <dt>Môn &amp; Phân ban</dt>
            <dd>10+</dd>
            <dd className="hh-metric-sub">THCS, THPT, HSG &amp; ĐGNL 2025</dd>
          </div>
          <div>
            <dt>Học tập trực tuyến</dt>
            <dd>24/7</dd>
            <dd className="hh-metric-sub">Đồng bộ Web Hub &amp; Discord</dd>
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
