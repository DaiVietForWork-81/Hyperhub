/**
 * src/courses/coursesCatalog.ts
 * Dữ liệu khung (Phần thô / Scaffold) cho Phân hệ Khóa Học Orbit.
 * Tự động đồng bộ thời gian thực (Runtime Sync) từ:
 *   https://raw.githubusercontent.com/DaiVietForWork-81/khoahoc/main/data/courses.json
 *
 * Người phụ trách phát triển Khóa Học chỉ cần làm việc trên repo độc lập:
 *   https://github.com/DaiVietForWork-81/khoahoc
 */

import { CoursesCatalogPayload } from './types';

export const KHOAHOC_REPO_URL = 'https://github.com/DaiVietForWork-81/khoahoc';
export const KHOAHOC_RAW_JSON_URL =
  'https://raw.githubusercontent.com/DaiVietForWork-81/khoahoc/main/data/courses.json';

const STORAGE_CACHE_KEY = 'orbit_khoahoc_catalog_v1';

export const DEFAULT_COURSES_CATALOG: CoursesCatalogPayload = {
  version: '1.0.0-scaffold',
  updatedAt: '2026-11-01',
  repoUrl: KHOAHOC_REPO_URL,
  subjects: [
    {
      id: 'TOAN',
      name: 'Toán học',
      shortName: 'Toán',
      accentColor: '#FF4FCB',
      description: 'Giải tích, Hình học không gian, Xác suất thống kê & Toán Chuyên.',
      gradeRange: 'Lớp 6–12 · THPT 2025',
      totalCourses: 2,
    },
    {
      id: 'VAN',
      name: 'Ngữ văn',
      shortName: 'Ngữ văn',
      accentColor: '#F472B6',
      description: 'Đọc hiểu văn bản ngoài SGK, Nghị luận xã hội & Nghị luận văn học.',
      gradeRange: 'Lớp 6–12 · GDPT 2018',
      totalCourses: 1,
    },
    {
      id: 'ANH',
      name: 'Tiếng Anh',
      shortName: 'Tiếng Anh',
      accentColor: '#38BDF8',
      description: 'Ngữ pháp trọng tâm, Từ vựng học thuật, Đọc hiểu & Luyện thi Chuyên Anh.',
      gradeRange: 'Lớp 6–12 · IELTS / THPT',
      totalCourses: 1,
    },
    {
      id: 'LY',
      name: 'Vật lí',
      shortName: 'Vật lí',
      accentColor: '#60A5FA',
      description: 'Vật lí nhiệt, Khí lí tưởng, Từ trường & Vật lí hạt nhân chuẩn 2025.',
      gradeRange: 'Lớp 10–12 · HSG',
      totalCourses: 1,
    },
    {
      id: 'HOA',
      name: 'Hóa học',
      shortName: 'Hóa học',
      accentColor: '#34D399',
      description: 'Danh pháp IUPAC mới, Ester - Lipid, Hợp chất chứa Nitrogen & Điện phân.',
      gradeRange: 'Lớp 10–12 · HSG',
      totalCourses: 1,
    },
    {
      id: 'TIN',
      name: 'Tin học & Thuật toán',
      shortName: 'Tin học',
      accentColor: '#FBBF24',
      description: 'Cấu trúc dữ liệu, Quy hoạch động, Đồ thị C++ & Tin học ứng dụng.',
      gradeRange: 'THCS – Chuyên Tin',
      totalCourses: 1,
    },
    {
      id: 'SINH',
      name: 'Sinh học',
      shortName: 'Sinh học',
      accentColor: '#A78BFA',
      description: 'Cơ chế di truyền phân tử, Quy luật di truyền, Tiến hóa & Sinh thái.',
      gradeRange: 'Lớp 10–12 · THPT',
      totalCourses: 1,
    },
    {
      id: 'SU_DIA',
      name: 'Lịch sử & Địa lí',
      shortName: 'Sử - Địa',
      accentColor: '#FB923C',
      description: 'Lịch sử Việt Nam hiện đại, Địa lí tự nhiên & Kinh tế - xã hội.',
      gradeRange: 'Lớp 6–12 · THPT',
      totalCourses: 1,
    },
  ],
  courses: [
    {
      id: 'course-toan-12-2025',
      slug: 'toan-12-chinh-phuc-cau-truc-2025',
      title: 'Toán 12 · Chinh Phục Đề Thi Cấu Trúc Mới 3 Phần (GDPT 2018)',
      subjectId: 'TOAN',
      grade: '12',
      level: 'Vận dụng',
      instructor: 'Ban Chuyên Môn Toán Orbit (Khung Thô)',
      durationHours: 36,
      lessonsCount: 24,
      status: 'draft',
      summary:
        'Khung khóa học mẫu môn Toán 12: Khảo sát hàm số, Nguyên hàm - Tích phân ứng dụng thực tế, Hình Oxyz và Xác suất có điều kiện.',
      tags: ['Toán 12', 'Chuẩn 2025', 'Đúng/Sai', 'Trả lời ngắn'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-toan-1',
          title: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số & Bài toán thực tế',
          lessons: [
            {
              id: 'ls-toan-1',
              index: 1,
              title: 'Bài 1: Tính đơn điệu và cực trị của hàm số (Khung bài giảng mẫu)',
              durationMinutes: 45,
              type: 'video',
              isFreePreview: true,
            },
            {
              id: 'ls-toan-2',
              index: 2,
              title: 'Bài 2: Tối ưu hóa thực tiễn với Giá trị lớn nhất - nhỏ nhất',
              durationMinutes: 50,
              type: 'document',
            },
            {
              id: 'ls-toan-3',
              index: 3,
              title: 'Bài 3: Luyện tập cụm câu hỏi Đúng/Sai & Trả lời ngắn Chương 1',
              durationMinutes: 30,
              type: 'quiz',
            },
          ],
        },
        {
          id: 'ch-toan-2',
          title: 'Chương 2: Vectơ và Hệ trục tọa độ trong không gian Oxyz',
          lessons: [
            {
              id: 'ls-toan-4',
              index: 4,
              title: 'Bài 4: Phương trình mặt phẳng, đường thẳng và mặt cầu',
              durationMinutes: 45,
              type: 'video',
            },
          ],
        },
      ],
    },
    {
      id: 'course-van-12-doc-hieu',
      slug: 'ngu-van-12-doc-hieu-nghi-luan',
      title: 'Ngữ Văn 12 · Tư Duy Đọc Hiểu Ngữ Liệu Ngoài SGK & Viết Nghị Luận',
      subjectId: 'VAN',
      grade: '12',
      level: 'Vận dụng',
      instructor: 'Ban Chuyên Môn Ngữ Văn Orbit (Khung Thô)',
      durationHours: 24,
      lessonsCount: 16,
      status: 'draft',
      summary:
        'Khung khóa học mẫu môn Ngữ Văn: Phương pháp giải nhanh 5 câu Đọc hiểu theo thể loại và kỹ thuật viết đoạn văn 200 chữ / bài văn 600 chữ.',
      tags: ['Ngữ văn 12', 'Ngữ liệu mới', 'Nghị luận văn học'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-van-1',
          title: 'Chuyên đề 1: Ma trận Đọc hiểu theo đặc trưng thể loại (Thơ, Truyện, Ký, Kịch)',
          lessons: [
            {
              id: 'ls-van-1',
              index: 1,
              title: 'Bài 1: Nhận diện thi pháp và biện pháp tu từ trong ngữ liệu mới',
              durationMinutes: 40,
              type: 'video',
              isFreePreview: true,
            },
            {
              id: 'ls-van-2',
              index: 2,
              title: 'Bài 2: Cấu trúc đoạn văn Nghị luận xã hội 200 chữ đạt điểm tối đa',
              durationMinutes: 35,
              type: 'document',
            },
          ],
        },
      ],
    },
    {
      id: 'course-anh-12-chuyen',
      slug: 'tieng-anh-12-luyen-thi-thpt-chuyen',
      title: 'Tiếng Anh 12 & Chuyên Anh · Reading Comprehension, Collocations & Word Form',
      subjectId: 'ANH',
      grade: '12',
      level: 'Vận dụng cao & HSG',
      instructor: 'Ban Chuyên Môn Ngoại Ngữ Orbit (Khung Thô)',
      durationHours: 30,
      lessonsCount: 20,
      status: 'draft',
      summary:
        'Khung khóa học mẫu môn Tiếng Anh: Đọc điền khuyết thông báo/tờ rơi, sắp xếp hội thoại, đọc hiểu học thuật 8–10 câu và Word Formation.',
      tags: ['Tiếng Anh 12', 'Chuyên Anh', 'Word Form', 'Reading'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-anh-1',
          title: 'Module 1: Cloze Test & Sắp xếp đoạn hội thoại / thư tín chuẩn đề minh họa 2025',
          lessons: [
            {
              id: 'ls-anh-1',
              index: 1,
              title: 'Bài 1: Chiến thuật xử lý bài đọc thông báo & quảng cáo (Announcement/Leaflet)',
              durationMinutes: 40,
              type: 'video',
              isFreePreview: true,
            },
            {
              id: 'ls-anh-2',
              index: 2,
              title: 'Bài 2: 200 cụm Collocations & Phrasal Verbs trọng tâm Lớp 12',
              durationMinutes: 45,
              type: 'document',
            },
          ],
        },
      ],
    },
    {
      id: 'course-ly-12-2025',
      slug: 'vat-li-12-nhiet-khi-hat-nhan',
      title: 'Vật Lí 12 · Vật Lí Nhiệt, Khí Lí Tưởng, Từ Trường & Hạt Nhân',
      subjectId: 'LY',
      grade: '12',
      level: 'Vận dụng',
      instructor: 'Ban Chuyên Môn KHTN Orbit (Khung Thô)',
      durationHours: 28,
      lessonsCount: 18,
      status: 'draft',
      summary:
        'Khung khóa học mẫu môn Vật Lí 12 theo chương trình mới: Nhiệt học, Phương trình trạng thái khí lí tưởng và cảm ứng điện từ.',
      tags: ['Vật lí 12', 'Vật lí nhiệt', 'Khí lí tưởng'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-ly-1',
          title: 'Chương 1: Vật lí nhiệt & Nội năng',
          lessons: [
            {
              id: 'ls-ly-1',
              index: 1,
              title: 'Bài 1: Định luật I Nhiệt động lực học và nhiệt dung riêng',
              durationMinutes: 45,
              type: 'video',
              isFreePreview: true,
            },
          ],
        },
      ],
    },
    {
      id: 'course-hoa-12-iupac',
      slug: 'hoa-hoc-12-danh-phap-iupac-huu-co',
      title: 'Hóa Học 12 · Ester - Lipid, Amine - Amino Acid & Phức Chất (IUPAC)',
      subjectId: 'HOA',
      grade: '12',
      level: 'Vận dụng',
      instructor: 'Ban Chuyên Môn Hóa Học Orbit (Khung Thô)',
      durationHours: 28,
      lessonsCount: 18,
      status: 'draft',
      summary:
        'Khung khóa học mẫu môn Hóa Học 12: Chuẩn hóa danh pháp tiếng Anh IUPAC, bài toán thực nghiệm xà phòng hóa, pin điện và phức chất.',
      tags: ['Hóa học 12', 'IUPAC', 'Hữu cơ & Phức chất'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-hoa-1',
          title: 'Chương 1: Ester – Lipid và Chất giặt rửa',
          lessons: [
            {
              id: 'ls-hoa-1',
              index: 1,
              title: 'Bài 1: Danh pháp IUPAC và phản ứng thủy phân Ester',
              durationMinutes: 45,
              type: 'video',
              isFreePreview: true,
            },
          ],
        },
      ],
    },
    {
      id: 'course-tin-hsg-cpp',
      slug: 'tin-hoc-thuat-toan-quy-hoach-dong-do-thi',
      title: 'Chuyên Tin & HSG · Quy Hoạch Động, Đồ Thị C++ & Cấu Trúc Dữ Liệu',
      subjectId: 'TIN',
      grade: 'CHUYEN',
      level: 'Vận dụng cao & HSG',
      instructor: 'Ban Thuật Toán Orbit (Khung Thô)',
      durationHours: 40,
      lessonsCount: 25,
      status: 'draft',
      summary:
        'Khung khóa học mẫu môn Tin Học: Độ phức tạp thuật toán, Quy hoạch động trạng thái, Segment Tree, Dijkstra và ôn thi Chuyên Tin / HSG Tỉnh.',
      tags: ['Chuyên Tin', 'C++', 'Quy hoạch động', 'Đồ thị'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-tin-1',
          title: 'Chuyên đề 1: Quy hoạch động cơ bản đến nâng cao (Dynamic Programming)',
          lessons: [
            {
              id: 'ls-tin-1',
              index: 1,
              title: 'Bài 1: Tư duy công thức truy hồi & Tối ưu bộ nhớ O(N)',
              durationMinutes: 55,
              type: 'video',
              isFreePreview: true,
            },
          ],
        },
      ],
    },
    {
      id: 'course-toan-9-vao-10',
      slug: 'toan-9-luyen-thi-vao-10-va-chuyen',
      title: 'Toán 9 Ôn Thi Vào 10 · Hệ Phương Trình, Định Lí Viète & Hình Học Đường Tròn',
      subjectId: 'TOAN',
      grade: 'THCS',
      level: 'Vận dụng',
      instructor: 'Ban Chuyên Môn THCS Orbit (Khung Thô)',
      durationHours: 32,
      lessonsCount: 20,
      status: 'coming_soon',
      summary:
        'Khung khóa học mẫu ôn thi vào 10 công lập và chuyên: Rút gọn căn thức, bài toán thực tế, định lí Viète và tứ giác nội tiếp.',
      tags: ['Toán 9', 'Ôn thi vào 10', 'Hình học đường tròn'],
      updatedAt: '2026-11-01',
      chapters: [
        {
          id: 'ch-toan9-1',
          title: 'Chuyên đề 1: Phương trình bậc hai & Hệ thức Viète',
          lessons: [
            {
              id: 'ls-toan9-1',
              index: 1,
              title: 'Bài 1: Biến đổi biểu thức đối xứng giữa hai nghiệm x1, x2',
              durationMinutes: 45,
              type: 'video',
            },
          ],
        },
      ],
    },
    {
      id: 'course-sinh-12-di-truyen',
      slug: 'sinh-hoc-12-co-che-di-truyen-bien-di',
      title: 'Sinh Học 12 · Di Truyền Phân Tử, Phả Hệ & Quần Thể',
      subjectId: 'SINH',
      grade: '12',
      level: 'Vận dụng',
      instructor: 'Ban Chuyên Môn Sinh Học Orbit (Khung Thô)',
      durationHours: 24,
      lessonsCount: 16,
      status: 'coming_soon',
      summary:
        'Khung khóa học mẫu môn Sinh học 12: Tái bản DNA, phiên mã - dịch mã, điều hòa biểu hiện gene Operon Lac và bài toán di truyền quần thể.',
      tags: ['Sinh học 12', 'Di truyền phân tử', 'Operon Lac'],
      updatedAt: '2026-11-01',
      chapters: [],
    },
    {
      id: 'course-su-dia-12-2025',
      slug: 'lich-su-dia-li-12-trong-tam-2025',
      title: 'Lịch Sử & Địa Lí 12 · Trọng Tâm Tổ Hợp KHXH Kỳ Thi Tốt Nghiệp THPT',
      subjectId: 'SU_DIA',
      grade: '12',
      level: 'Cơ bản',
      instructor: 'Ban Chuyên Môn KHXH Orbit (Khung Thô)',
      durationHours: 22,
      lessonsCount: 15,
      status: 'coming_soon',
      summary:
        'Khung khóa học mẫu tổ hợp KHXH: Thế giới trong và sau Chiến tranh lạnh, ASEAN, Lịch sử đối ngoại Việt Nam và Địa lí các vùng kinh tế.',
      tags: ['Lịch sử 12', 'Địa lí 12', 'Tổ hợp KHXH'],
      updatedAt: '2026-11-01',
      chapters: [],
    },
  ],
};

/**
 * Đọc bản cache gần nhất từ localStorage (nếu đã từng đồng bộ từ repo `khoahoc`),
 * nếu chưa có thì trả về DEFAULT_COURSES_CATALOG.
 */
export function getInitialCoursesCatalog(): CoursesCatalogPayload {
  if (typeof window === 'undefined') return DEFAULT_COURSES_CATALOG;
  try {
    const raw = window.localStorage.getItem(STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CoursesCatalogPayload;
      if (parsed && Array.isArray(parsed.courses) && Array.isArray(parsed.subjects)) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_COURSES_CATALOG;
}

/**
 * Đồng bộ trực tiếp danh mục khóa học từ repo độc lập:
 *   https://github.com/DaiVietForWork-81/khoahoc (nhánh main -> data/courses.json)
 */
export async function fetchRemoteCoursesCatalog(): Promise<{
  catalog: CoursesCatalogPayload;
  syncedFromRemote: boolean;
}> {
  try {
    const res = await fetch(`${KHOAHOC_RAW_JSON_URL}?t=${Date.now()}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as CoursesCatalogPayload;
      if (data && Array.isArray(data.courses) && Array.isArray(data.subjects)) {
        try {
          window.localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
        } catch {
          /* ignore */
        }
        return { catalog: data, syncedFromRemote: true };
      }
    }
  } catch {
    /* fallback to local scaffold */
  }
  return { catalog: getInitialCoursesCatalog(), syncedFromRemote: false };
}
