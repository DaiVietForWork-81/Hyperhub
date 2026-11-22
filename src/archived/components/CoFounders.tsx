import React from 'react';
import { Crown } from 'lucide-react';
import { Reveal } from './hh/Reveal';
import { SpotSurface } from './hh/Controls';

/**
 * CONNECT · Đội ngũ sáng lập. Thẻ sáng lập chính là phần tử DUY NHẤT trên trang có tilt 3D
 * (≤3°, chỉ chuột thật). Đồng sáng lập nối với nhau bằng một đường sáng vẽ dần - motif "kết nối".
 */

const MAIN_FOUNDER = {
  name: 'Dai Viet',
  role: 'Sáng lập viên',
  quote: 'Công nghệ sinh ra là để phụng sự việc học, mở ra cơ hội bình đẳng cho mọi sĩ tử.',
  initials: 'DV',
};

const ASSOCIATE_FOUNDERS = [
  {
    name: 'GithuZ',
    quote: 'Tối ưu từng dòng mã để mang lại cho học sinh trải nghiệm học tập mượt mà nhất.',
    initials: 'GZ',
    tone: 'cyan',
  },
  {
    name: 'Nguyễn Duy',
    quote: 'Cùng nhau, chúng ta đi xa hơn. Một cộng đồng gắn kết là nguồn động lực lớn nhất.',
    initials: 'ND',
    tone: 'pink',
  },
  {
    name: 'Lê Minh',
    quote: 'Chất lượng kiến thức là nền móng vững chắc nhất để hiện thực hóa mọi ước mơ.',
    initials: 'LM',
    tone: 'mint',
  },
];

export const CoFounders: React.FC = () => (
  <section id="co-founders" className="hh-section" aria-labelledby="founders-title">
    <div className="hh-section-head">
      <Reveal as="h3" id="founders-title" preset="fade" className="hh-section-title">
        Đội ngũ sáng lập Orbit
      </Reveal>
      <Reveal as="p" preset="fade" delay={80} className="hh-section-sub">
        Cùng chung khát vọng kiến tạo không gian học tập, thi thử và trao đổi công nghệ phi lợi nhuận cho thế hệ sĩ tử Việt Nam.
      </Reveal>
    </div>

    <Reveal preset="panel">
      <SpotSurface as="article" className="hh-card hh-card--hero hh-founder-main" data-ui="founder-spotlight" spotColor="rgba(255,79,203,0.16)">
        <div className="hh-founder-avatar hh-founder-avatar--lg" aria-hidden="true">
          <span>{MAIN_FOUNDER.initials}</span>
          <span className="hh-founder-crown">
            <Crown className="w-4 h-4" />
          </span>
        </div>
        <div className="hh-founder-body">
          <h4 className="hh-founder-name">{MAIN_FOUNDER.name}</h4>
          <p className="hh-founder-role">{MAIN_FOUNDER.role}</p>
          <blockquote className="hh-founder-quote">“{MAIN_FOUNDER.quote}”</blockquote>
        </div>
      </SpotSurface>
    </Reveal>

    <div className="hh-founder-row" data-ui="founder-grid">
      <ul className="hh-founder-list" aria-label="Đồng sáng lập">
        {ASSOCIATE_FOUNDERS.map((f, i) => (
          <Reveal as="li" key={f.name} preset="rise" delay={200 + i * 110}>
            <div className="hh-founder-mini hh-lift">
              <div className={`hh-founder-avatar hh-tone-${f.tone}`} aria-hidden="true">
                <span>{f.initials}</span>
              </div>
              <h4 className="hh-founder-mini-name">{f.name}</h4>
              <p className="hh-founder-role">Đồng sáng lập</p>
              <blockquote className="hh-founder-mini-quote">“{f.quote}”</blockquote>
            </div>
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);

export default CoFounders;
