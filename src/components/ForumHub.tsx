/**
 * src/components/ForumHub.tsx
 * Diễn Đàn Thảo Luận Orbit (Web <-> Discord #💡・diễn-đàn 2-Way Real-Time Sync).
 * Chỉ gồm 4 chuyên mục cố định:
 *   1. Góc thắc mắc
 *   2. Facts
 *   3. Hỏi đáp
 *   4. Ôn thi
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  Search,
  Sparkles,
  MessageCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { DiscordUser, getDiscordAuthHeaders } from '../utils/discordAuth';
import { getApiBaseUrl } from '../utils/apiConfig';

export type ForumCategory = 'Góc thắc mắc' | 'Facts' | 'Hỏi đáp' | 'Ôn thi';

export interface ForumMessageItem {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
  source: 'discord' | 'web';
  attachments?: {
    id: string;
    filename: string;
    url: string;
    size: number;
  }[];
}

export interface ForumThreadSummary {
  id: string;
  title: string;
  category: ForumCategory;
  author_id: string;
  author_name: string;
  author_avatar: string;
  excerpt: string;
  message_count: number;
  reply_count: number;
  created_at: string;
  jump_url: string;
}

interface ForumHubProps {
  user: DiscordUser | null;
  onRequireAuth?: () => void;
}

const FORUM_CATEGORIES: {
  id: ForumCategory;
  label: string;
  desc: string;
  accent: string;
}[] = [
  {
    id: 'Góc thắc mắc',
    label: 'Góc thắc mắc',
    desc: 'Giải đáp thắc mắc về lộ trình học, quy chế thi và cách dùng hệ thống Orbit.',
    accent: '#FF4FCB',
  },
  {
    id: 'Facts',
    label: 'Facts',
    desc: 'Sự thật thú vị về khoa học, toán học, lịch sử, văn học và phương pháp ghi nhớ.',
    accent: '#38BDF8',
  },
  {
    id: 'Hỏi đáp',
    label: 'Hỏi đáp',
    desc: 'Đặt câu hỏi bài tập khó các môn Toán, Lý, Hóa, Sinh, Văn, Anh, Tin học.',
    accent: '#34D399',
  },
  {
    id: 'Ôn thi',
    label: 'Ôn thi',
    desc: 'Chia sẻ kinh nghiệm luyện đề cấu trúc mới, chiến thuật phòng thi & chọn trường.',
    accent: '#FBBF24',
  },
];

const FALLBACK_THREADS: ForumThreadSummary[] = [
  {
    id: '1566808765762899998',
    title: '[Ôn thi] Tổng hợp kinh nghiệm phân bổ thời gian & chiến thuật phòng thi 2025–2026',
    category: 'Ôn thi',
    author_id: '1536298634990325871',
    author_name: 'Ban Chuyên Môn Orbit',
    author_avatar: 'https://orbit-psi-black.vercel.app/server_icon.png',
    excerpt:
      'Chuyên mục Ôn thi dành riêng cho việc chia sẻ kinh nghiệm làm đề cấu trúc mới (Trắc nghiệm 4 lựa chọn, Đúng/Sai, Trả lời ngắn), ôn thi vào 10, thi Chuyên/HSG và Tốt nghiệp THPT.',
    message_count: 1,
    reply_count: 0,
    created_at: '2025-02-15T08:30:00.000Z',
    jump_url: 'https://discord.com/channels/1532265330079174697/1566808765762899998',
  },
  {
    id: '1566808763946639460',
    title: '[Hỏi đáp] Nơi đặt câu hỏi bài tập khó các môn Toán – Lý – Hóa – Văn – Anh – Tin',
    category: 'Hỏi đáp',
    author_id: '1536298634990325871',
    author_name: 'Ban Chuyên Môn Orbit',
    author_avatar: 'https://orbit-psi-black.vercel.app/server_icon.png',
    excerpt:
      'Gặp câu hỏi hóc búa khi đang luyện đề? Hãy đăng bài vào mục Hỏi đáp hoặc bình luận ngay tại đây để cộng đồng học sinh và đội ngũ chuyên môn cùng hỗ trợ giải chi tiết!',
    message_count: 1,
    reply_count: 0,
    created_at: '2025-02-14T14:15:00.000Z',
    jump_url: 'https://discord.com/channels/1532265330079174697/1566808763946639460',
  },
  {
    id: '1566808762117914714',
    title: '[Facts] Sự thật thú vị về trí nhớ dài hạn (Spaced Repetition) khi luyện đề',
    category: 'Facts',
    author_id: '1536298634990325871',
    author_name: 'Ban Chuyên Môn Orbit',
    author_avatar: 'https://orbit-psi-black.vercel.app/server_icon.png',
    excerpt:
      'Não bộ con người quên tới ~70% thông tin mới chỉ sau 24 giờ nếu không ôn lại, nhưng nếu bạn làm lại câu sai vào các mốc 1 ngày – 3 ngày – 7 ngày, tỷ lệ ghi nhớ dài hạn tăng lên trên 90%!',
    message_count: 1,
    reply_count: 0,
    created_at: '2025-02-12T09:00:00.000Z',
    jump_url: 'https://discord.com/channels/1532265330079174697/1566808762117914714',
  },
  {
    id: '1566808760289198251',
    title: '[Góc thắc mắc] Giải đáp mọi thắc mắc về lộ trình học và cách sử dụng Orbit Hub',
    category: 'Góc thắc mắc',
    author_id: '1536298634990325871',
    author_name: 'Orbit System',
    author_avatar: 'https://orbit-psi-black.vercel.app/server_icon.png',
    excerpt:
      'Chào mừng bạn đến với Góc thắc mắc! Nơi giải đáp mọi băn khoăn trong quá trình học tập, cách khai thác kho đề và các tính năng trên Orbit Web & Discord.',
    message_count: 1,
    reply_count: 0,
    created_at: '2025-02-10T10:00:00.000Z',
    jump_url: 'https://discord.com/channels/1532265330079174697/1566808760289198251',
  },
];

const stripEmoji = (s?: string | null): string =>
  (s || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'Hôm nay';
  }
}

export const ForumHub: React.FC<ForumHubProps> = ({ user, onRequireAuth }) => {
  const apiBase = getApiBaseUrl();
  const [threads, setThreads] = useState<ForumThreadSummary[]>(FALLBACK_THREADS);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ForumCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedThreadId, setSelectedThreadId] = useState<string>(FALLBACK_THREADS[0].id);
  const [messages, setMessages] = useState<ForumMessageItem[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(false);

  // Composer tạo chủ đề mới
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ForumCategory>('Góc thắc mắc');
  const [newContent, setNewContent] = useState<string>('');
  const [isCreatingThread, setIsCreatingThread] = useState<boolean>(false);

  // Composer gửi tin nhắn phản hồi
  const [replyContent, setReplyContent] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const base = (apiBase || '').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/forum/threads`, {
        signal: AbortSignal.timeout(9000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.threads) && data.threads.length > 0) {
          setThreads(data.threads);
          setIsLiveSynced(true);
          setSelectedThreadId((prev) =>
            data.threads.some((t: ForumThreadSummary) => t.id === prev)
              ? prev
              : data.threads[0].id
          );
        }
      }
    } catch {
      // Giữ danh sách fallback khi đang kết nối
    } finally {
      setIsLoadingThreads(false);
    }
  }, [apiBase]);

  const fetchThreadMessages = useCallback(
    async (threadId: string) => {
      if (!threadId) return;
      setIsLoadingMessages(true);
      try {
        const base = (apiBase || '').replace(/\/+$/, '');
        const res = await fetch(`${base}/api/forum/threads/${threadId}`, {
          signal: AbortSignal.timeout(9000),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            return;
          }
        }
      } catch {
        // Fallback xuống nội dung mở đầu của chủ đề
      } finally {
        setIsLoadingMessages(false);
      }

      const fallbackThread = threads.find((t) => t.id === threadId);
      if (fallbackThread) {
        setMessages([
          {
            id: fallbackThread.id,
            author_id: fallbackThread.author_id,
            author_name: fallbackThread.author_name,
            author_avatar: fallbackThread.author_avatar,
            content: fallbackThread.excerpt,
            created_at: fallbackThread.created_at,
            source: 'discord',
          },
        ]);
      }
    },
    [apiBase, threads]
  );

  useEffect(() => {
    fetchThreads();
    const timer = window.setInterval(fetchThreads, 18000);
    return () => window.clearInterval(timer);
  }, [fetchThreads]);

  useEffect(() => {
    fetchThreadMessages(selectedThreadId);
  }, [selectedThreadId, fetchThreadMessages]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {
      'Góc thắc mắc': 0,
      Facts: 0,
      'Hỏi đáp': 0,
      'Ôn thi': 0,
    };
    for (const t of threads) {
      map[t.category] = (map[t.category] || 0) + 1;
    }
    return map;
  }, [threads]);

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${t.title} ${t.excerpt} ${t.author_name} ${t.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [threads, selectedCategory, searchQuery]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || filteredThreads[0] || threads[0],
    [threads, selectedThreadId, filteredThreads]
  );

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (newTitle.trim().length < 4 || newContent.trim().length < 4) return;

    setIsCreatingThread(true);
    setStatusBanner(null);
    try {
      const base = (apiBase || '').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/forum/threads`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...getDiscordAuthHeaders(),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          category: newCategory,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.thread) {
        const created: ForumThreadSummary = data.thread;
        setThreads((prev) => [created, ...prev]);
        setSelectedThreadId(created.id);
        if (Array.isArray(data.thread.messages)) {
          setMessages(data.thread.messages);
        }
        setNewTitle('');
        setNewContent('');
        setIsComposerOpen(false);
        setStatusBanner(
          `Đã đăng bài mới và đồng bộ trực tiếp lên kênh Discord #diễn-đàn (${created.category})!`
        );
      } else {
        setStatusBanner(data?.message || data?.error || 'Không thể đăng bài lúc này, vui lòng kiểm tra đăng nhập Discord.');
      }
    } catch {
      setStatusBanner('Lỗi kết nối tới máy chủ Bot khi đăng bài mới.');
    } finally {
      setIsCreatingThread(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!activeThread || !replyContent.trim()) return;

    setIsSendingReply(true);
    setStatusBanner(null);
    try {
      const base = (apiBase || '').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/forum/threads/${activeThread.id}/messages`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...getDiscordAuthHeaders(),
        },
        body: JSON.stringify({
          content: replyContent.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.message) {
        setMessages((prev) => [...prev, data.message]);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThread.id
              ? {
                  ...t,
                  message_count: t.message_count + 1,
                  reply_count: t.reply_count + 1,
                }
              : t
          )
        );
        setReplyContent('');
        setStatusBanner('Đã gửi tin nhắn và đồng bộ trực tiếp vào chủ đề trên Discord!');
      } else {
        setStatusBanner(data?.message || 'Không thể gửi tin nhắn phản hồi.');
      }
    } catch {
      setStatusBanner('Lỗi kết nối khi gửi tin nhắn đồng bộ Discord.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getCategoryMeta = (cat: ForumCategory) =>
    FORUM_CATEGORIES.find((c) => c.id === cat) || FORUM_CATEGORIES[0];

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* COMMAND DECK: DIỄN ĐÀN THẢO LUẬN ORBIT (4 CHUYÊN MỤC ĐỒNG BỘ DISCORD) */}
      {/* ===================================================================== */}
      <div className="hh-command-deck p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#221a35]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold px-2.5 py-1 rounded-lg bg-[#291524] text-[#FFB8E6] border border-[#422039] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#FF4FCB]" />
                <span>Diễn Đàn Orbit · Đồng bộ 2 chiều #diễn-đàn</span>
              </span>
              <span className="text-[13px] font-mono px-2.5 py-1 rounded-lg bg-[#15131f] text-emerald-300 border border-[#221e30] flex items-center gap-1.5 tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  {isLiveSynced
                    ? 'Đang đồng bộ Live với Server Discord'
                    : 'Kết nối kênh #diễn-đàn (ID: 1535557885721841744)'}
                </span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-white tracking-tight leading-[1.18]">
              Diễn đàn cộng đồng &amp; hỏi đáp Orbit
            </h1>
            <p className="text-[13px] sm:text-sm text-white/65 max-w-3xl leading-relaxed">
              Không gian trao đổi gồm 4 chuyên mục trọng tâm:{' '}
              <strong className="text-white">Góc thắc mắc</strong>,{' '}
              <strong className="text-white">Facts</strong>,{' '}
              <strong className="text-white">Hỏi đáp</strong> và{' '}
              <strong className="text-white">Ôn thi</strong>. Khi đăng bài hoặc nhắn tin tại đây,
              Bot Orbit sẽ tự động đăng bài và đồng bộ tin nhắn 2 chiều với kênh{' '}
              <strong className="text-[#FFB8E6]">#diễn-đàn</strong> trên máy chủ Discord.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                fetchThreads();
                if (activeThread) fetchThreadMessages(activeThread.id);
              }}
              disabled={isLoadingThreads}
              className="px-3.5 py-2 rounded-xl bg-[#161420] hover:bg-[#1e1b2c] border border-[#221e30] text-[13px] font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#FF4FCB] ${isLoadingThreads ? 'animate-spin' : ''}`}
              />
              <span>Đồng bộ Discord</span>
            </button>

            <button
              type="button"
              onClick={() => setIsComposerOpen((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] border border-[#e13689] text-[13px] font-extrabold text-white flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isComposerOpen ? 'Đóng khung đăng bài' : 'Đăng bài mới'}</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4 CHUYÊN MỤC DIỄN ĐÀN CỐ ĐỊNH                                       */}
        {/* =================================================================== */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FORUM_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedCategory((prev) => (prev === cat.id ? 'ALL' : cat.id))
                }
                style={{ ['--subject-accent' as string]: cat.accent }}
                className={`hh-subject-cell text-left cursor-pointer ${
                  isSelected ? 'bg-[#1c152e] border-[#FF4FCB]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-extrabold text-white">{cat.label}</span>
                  <span
                    className="text-[13px] font-mono font-bold px-2 py-0.5 rounded bg-[#181424] border border-[#28203d] tabular-nums"
                    style={{ color: cat.accent }}
                  >
                    {count} chủ đề
                  </span>
                </div>
                <p className="text-[13px] text-white/60 mt-1 line-clamp-1">{cat.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Khung soạn bài đăng mới (Đồng bộ tạo Thread trên Discord #diễn-đàn) */}
        {isComposerOpen && (
          <form
            onSubmit={handleCreateThread}
            className="mt-4 pt-4 border-t border-[#221a35] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF4FCB]" />
                <span>Tạo chủ đề mới (Tự động đăng lên kênh #diễn-đàn Discord)</span>
              </span>
              <span className="text-[13px] text-white/55">
                Đăng bởi:{' '}
                <strong className="text-[#FFB8E6]">
                  {user ? user.global_name || user.username : 'Chưa đăng nhập'}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[13px] font-bold text-white/70 mb-1">
                  Chọn 1 trong 4 chuyên mục
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0D0A14] border border-[#221a35] text-[13px] font-bold text-white focus:border-[#FF4FCB] focus:outline-none"
                >
                  {FORUM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[13px] font-bold text-white/70 mb-1">
                  Tiêu đề bài thảo luận
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Hỏi cách giải nhanh câu 45 Toán 12 hoặc chia sẻ Fact học tập..."
                  className="w-full h-10 px-3.5 rounded-xl bg-[#0D0A14] border border-[#221a35] text-[13px] text-white placeholder:text-white/40 focus:border-[#FF4FCB] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-white/70 mb-1">
                Nội dung chi tiết
              </label>
              <textarea
                rows={3}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Nhập câu hỏi, thắc mắc hoặc kiến thức bạn muốn chia sẻ cùng cộng đồng Orbit..."
                className="w-full p-3.5 rounded-xl bg-[#0D0A14] border border-[#221a35] text-[13px] text-white placeholder:text-white/40 focus:border-[#FF4FCB] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#161420] border border-[#221e30] text-[13px] font-bold text-white/75 hover:text-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isCreatingThread}
                className="px-4 py-2 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] text-[13px] font-extrabold text-white flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isCreatingThread
                    ? 'Đang đăng & đồng bộ Discord...'
                    : 'Đăng bài lên Web & Discord'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-[#14201c] border border-emerald-500/35 text-[13px] text-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-bold text-emerald-300 hover:underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* KHUNG DANH SÁCH CHỦ ĐỀ & LUỒNG TIN NHẮN ĐỒNG BỘ 2 CHIỀU               */}
      {/* ===================================================================== */}
      <div className="hh-hub-surface p-5 sm:p-6 space-y-5">
        {/* Thanh lọc 4 chuyên mục + Tìm kiếm */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#221a35]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              data-active={selectedCategory === 'ALL'}
              className="hh-hub-chip"
            >
              <span>Tất cả ({threads.length})</span>
            </button>
            {FORUM_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                data-active={selectedCategory === c.id}
                className="hh-hub-chip"
              >
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A6FF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chủ đề trong Góc thắc mắc, Facts, Hỏi đáp, Ôn thi..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[#0D0A14] border border-[#221a35] focus:border-[#FF4FCB] text-[13px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Bố cục 2 cột: Cột trái = Danh sách bài viết | Cột phải = Luồng tin nhắn & Trả lời */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* CỘT TRÁI (5/12): DANH SÁCH CHỦ ĐỀ */}
          <div className="lg:col-span-5 space-y-3">
            {filteredThreads.map((t) => {
              const catMeta = getCategoryMeta(t.category);
              const isSelected = activeThread?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-[#191229] border-[#FF4FCB]'
                      : 'bg-[#0D0A14] border-[#221a35] hover:border-[#352852]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[13px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#201833] border border-[#32244d]"
                      style={{ color: catMeta.accent }}
                    >
                      {t.category}
                    </span>
                    <span className="text-[13px] font-mono text-white/45 flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(t.created_at)}</span>
                    </span>
                  </div>

                  <h2 className="text-[15px] font-extrabold text-white leading-snug line-clamp-2">
                    {stripEmoji(t.title)}
                  </h2>

                  <p className="text-[13px] text-white/60 line-clamp-2 leading-relaxed">
                    {stripEmoji(t.excerpt)}
                  </p>

                  <div className="pt-2 border-t border-[#221a35] flex items-center justify-between text-[13px] text-white/55">
                    <span className="font-semibold text-white/80 truncate">
                      {stripEmoji(t.author_name)}
                    </span>
                    <span className="font-mono text-[#FFB8E6] flex items-center gap-1 shrink-0 tabular-nums">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{t.message_count} tin nhắn</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CỘT PHẢI (7/12): CHI TIẾT BÀI VIẾT & KHUNG CHAT ĐỒNG BỘ DISCORD */}
          <div className="lg:col-span-7 p-5 rounded-xl bg-[#0D0A14] border border-[#221a35] space-y-4">
            {activeThread ? (
              <>
                <div className="pb-4 border-b border-[#221a35] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="text-[13px] font-extrabold px-2.5 py-1 rounded-lg bg-[#201833] border border-[#32244d]"
                      style={{ color: getCategoryMeta(activeThread.category).accent }}
                    >
                      Chuyên mục: {activeThread.category}
                    </span>

                    <a
                      href={activeThread.jump_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-bold text-[#FFB8E6] hover:underline flex items-center gap-1"
                    >
                      <span>Mở chủ đề trên Discord</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                    {stripEmoji(activeThread.title)}
                  </h2>
                </div>

                {/* Danh sách toàn bộ tin nhắn trong chủ đề (Discord <-> Web) */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {isLoadingMessages && messages.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#130f1e] border border-[#241c38] text-[13px] text-white/65">
                      Đang đồng bộ tin nhắn từ kênh Discord #diễn-đàn...
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          idx === 0
                            ? 'bg-[#151024] border-[#32244d]'
                            : 'bg-[#120e1c] border-[#221a35]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={
                                msg.author_avatar ||
                                'https://orbit-psi-black.vercel.app/server_icon.png'
                              }
                              alt={stripEmoji(msg.author_name)}
                              className="w-6 h-6 rounded-full object-cover border border-[#32244d] shrink-0"
                            />
                            <span className="text-[13px] font-bold text-white truncate">
                              {stripEmoji(msg.author_name)}
                            </span>
                            <span className="text-[13px] px-2 py-0.5 rounded bg-[#1d1730] text-[#C4A6FF] border border-[#2c2247] shrink-0 whitespace-nowrap">
                              {idx === 0
                                ? 'Bài mở đầu'
                                : msg.source === 'web'
                                ? 'Orbit Web'
                                : 'Discord'}
                            </span>
                          </div>
                          <span className="text-[13px] font-mono text-white/45 shrink-0 tabular-nums">
                            {formatRelativeTime(msg.created_at)}
                          </span>
                        </div>

                        <div className="text-[13px] text-white/85 whitespace-pre-wrap leading-relaxed">
                          {stripEmoji(msg.content)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Khung nhập tin nhắn bình luận đồng bộ trực tiếp vào Thread Discord */}
                <form
                  onSubmit={handleSendReply}
                  className="pt-3 border-t border-[#221a35] space-y-2.5"
                >
                  <label className="block text-[13px] font-bold text-white/75">
                    Gửi tin nhắn thảo luận (Đồng bộ trực tiếp vào chủ đề này trên Discord)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={
                        user
                          ? `Nhắn tin với tên ${user.global_name || user.username}...`
                          : 'Đăng nhập Discord để gửi tin nhắn thảo luận...'
                      }
                      className="flex-1 h-10 px-3.5 rounded-xl bg-[#130f1e] border border-[#241c38] focus:border-[#FF4FCB] text-[13px] text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyContent.trim()}
                      className="px-4 h-10 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] disabled:opacity-50 text-[13px] font-extrabold text-white flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingReply ? 'Đang gửi...' : 'Gửi tin nhắn'}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="p-6 text-center text-sm text-white/60">
                Chọn một chủ đề ở cột bên trái để xem nội dung và nhắn tin thảo luận.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
