/**
 * utils/bookmarkStorage.ts
 * Quản lý tính năng Bookmark / Lưu đề thi yêu thích vào Tủ sách cá nhân của học sinh.
 * Lưu trữ bền vững trên LocalStorage, tự động phát event đồng bộ giữa các component.
 */

const BOOKMARK_STORAGE_KEY = 'hyperhub_bookmarked_exams';

export const getBookmarkedExamIds = (): number[] => {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isExamBookmarked = (docId: number): boolean => {
  return getBookmarkedExamIds().includes(docId);
};

export const toggleBookmarkExam = (docId: number): boolean => {
  try {
    const ids = getBookmarkedExamIds();
    const idx = ids.indexOf(docId);
    let newState = false;
    if (idx >= 0) {
      ids.splice(idx, 1);
      newState = false;
    } else {
      ids.unshift(docId);
      newState = true;
    }
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(
      new CustomEvent('hyperhub_bookmark_changed', {
        detail: { docId, isBookmarked: newState, allIds: ids },
      })
    );
    return newState;
  } catch {
    return false;
  }
};
