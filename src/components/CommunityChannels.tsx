import React from 'react';
import { ExternalLink, Bot, Headphones, BellRing, Smartphone, Users } from 'lucide-react';
import { Reveal } from './hh/Reveal';
import { SpotSurface, PixelButton } from './hh/Controls';
import { DiscordGlyph, MessengerGlyph } from './hh/BrandGlyphs';
import { useHubPulse } from '../hooks/useHubPulse';

/**
 * CONNECT · Kênh cộng đồng chính thức: Discord (chính) và Messenger.
 * Trạng thái bot trên thẻ Discord là dữ liệu thật từ /api/status.
 */
export const CommunityChannels: React.FC = () => {
  const pulse = useHubPulse();

  return (
    <section id="community-channels" className="hh-section" aria-labelledby="channels-title">
      <div className="hh-section-head">
        <Reveal as="h3" id="channels-title" preset="fade" className="hh-section-title">
          Gia nhập cộng đồng Orbit
        </Reveal>
        <Reveal as="p" preset="fade" delay={80} className="hh-section-sub">
          Chọn kênh bạn thích để thảo luận bài tập, tra cứu đề, nhận lịch tuyển sinh và đồng hành cùng hàng trăm bạn học trên
          cùng một quỹ đạo.
        </Reveal>
      </div>

      <div className="hh-channels">
        <Reveal preset="slide-l" className="hh-channel-wrap hh-channel-wrap--main">
          <SpotSurface className="hh-card hh-card--hero hh-channel hh-channel--discord" data-ui="discord-channel" spotColor="rgba(88,101,242,0.22)">
            <div className="flex items-center gap-3 mb-2">
              <span className="hh-channel-logo hh-channel-logo--discord">
                <DiscordGlyph className="w-8 h-8" />
              </span>
              <h4 className="hh-card-title hh-card-title--lg" style={{ margin: 0 }}>Máy chủ Discord Orbit</h4>
            </div>
            <p className="hh-card-text">
              Trung tâm học tập sôi động: bot thẩm định đề tự động, phòng học Lo-fi voice 24/7, chuyên mục theo từng môn và các
              buổi thi thử định kỳ.
            </p>
            <div className="mb-3">
              <span className="hh-status hh-status--compact" data-state={pulse.bot}>
                <span className="hh-status-dot" aria-hidden="true" />
                {pulse.bot === 'online' ? 'Bot trực tuyến' : pulse.bot === 'offline' ? 'Kho Cloud trực tuyến' : 'Đang kiểm tra'}
              </span>
            </div>
            <ul className="hh-feature-list">
              <li><Bot aria-hidden="true" />Bot kiểm định đề &amp; bốc đề tự động</li>
              <li><Headphones aria-hidden="true" />Phòng học voice Pomodoro &amp; Lo-fi</li>
              <li><Users aria-hidden="true" />Cộng đồng học sinh, sinh viên văn minh</li>
            </ul>
            <PixelButton
              variant="discord"
              block
              href="https://discord.gg/D34HX87bGe"
              target="_blank"
              rel="noopener noreferrer"
              trailing={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
            >
              Tham gia máy chủ Discord
              <span className="sr-only"> (mở tab mới)</span>
            </PixelButton>
          </SpotSurface>
        </Reveal>

        <Reveal preset="slide-r" delay={120} className="hh-channel-wrap">
          <SpotSurface className="hh-card hh-channel hh-channel--messenger" data-ui="messenger-channel" spotColor="rgba(0,178,255,0.18)">
            <div className="flex items-center gap-3 mb-2">
              <span className="hh-channel-logo hh-channel-logo--messenger">
                <MessengerGlyph className="w-7 h-7" />
              </span>
              <h4 className="hh-card-title" style={{ margin: 0 }}>Nhóm chat Messenger</h4>
            </div>
            <p className="hh-card-text">
              Hỏi nhanh bài tập, nhận thông báo đề thi và tin tuyển sinh lớp 10 &amp; THPT Quốc gia ngay trên điện thoại.
            </p>
            <div className="mb-3">
              <span className="hh-status hh-status--compact" data-state="online">
                <span className="hh-status-dot" aria-hidden="true" />
                Hoạt động 24/7
              </span>
            </div>
            <ul className="hh-feature-list">
              <li><Smartphone aria-hidden="true" />Trao đổi bài tập trên điện thoại</li>
              <li><BellRing aria-hidden="true" />Nhắc lịch thi &amp; đếm ngược</li>
            </ul>
            <PixelButton
              variant="messenger"
              block
              href="https://m.me/j/AbZngp-x0Ny92IWH/"
              target="_blank"
              rel="noopener noreferrer"
              trailing={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
            >
              Tham gia nhóm Messenger
              <span className="sr-only"> (mở tab mới)</span>
            </PixelButton>
          </SpotSurface>
        </Reveal>
      </div>

      <Reveal as="p" preset="fade" className="hh-fine hh-center">
        Hiện Orbit tập trung kết nối qua Discord và Messenger để hỗ trợ sĩ tử nhanh và kịp thời nhất.
      </Reveal>
    </section>
  );
};

export default CommunityChannels;
