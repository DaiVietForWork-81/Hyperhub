/**
 * src/courses/types.ts
 * Định nghĩa cấu trúc dữ liệu chuẩn cho Phân hệ Khóa Học (Orbit Courses).
 * Đồng bộ trực tiếp với kho mã nguồn độc lập: https://github.com/DaiVietForWork-81/khoahoc
 */

export type CourseSubjectId =
  | 'TOAN'
  | 'VAN'
  | 'ANH'
  | 'LY'
  | 'HOA'
  | 'SINH'
  | 'TIN'
  | 'SU_DIA';

export type CourseGradeLevel = '12' | '11' | '10' | 'THCS' | 'CHUYEN';

export type CourseStatus = 'ready' | 'draft' | 'coming_soon';

export interface CourseSubjectMeta {
  id: CourseSubjectId;
  name: string;
  shortName: string;
  accentColor: string;
  description: string;
  gradeRange: string;
  totalCourses: number;
}

export interface CourseLesson {
  id: string;
  index: number;
  title: string;
  durationMinutes: number;
  type: 'video' | 'document' | 'quiz';
  videoUrl?: string;
  documentUrl?: string;
  isFreePreview?: boolean;
}

export interface CourseChapter {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseItem {
  id: string;
  slug: string;
  title: string;
  subjectId: CourseSubjectId;
  grade: CourseGradeLevel;
  level: 'Cơ bản' | 'Vận dụng' | 'Vận dụng cao & HSG';
  instructor: string;
  durationHours: number;
  lessonsCount: number;
  status: CourseStatus;
  summary: string;
  tags: string[];
  chapters: CourseChapter[];
  updatedAt: string;
}

export interface CoursesCatalogPayload {
  version: string;
  updatedAt: string;
  repoUrl: string;
  subjects: CourseSubjectMeta[];
  courses: CourseItem[];
}
