import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  UserX,
  Ban,
  UserMinus,
  VolumeX,
  Volume2,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  FileText,
  X,
  Lock,
  Megaphone,
  Send,
} from 'lucide-react';
import { getApiBaseUrl, API_FETCH_HEADERS } from '../utils/apiConfig';
import { getDiscordAccessToken } from '../utils/discordAuth';

interface BannedUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  reason: string;
}

interface AdminExamDocument {
  id: number;
  title: string;
  subject: string;
  file_name: string;
  file_size_bytes: number;
  estimated_level: string;
  question_count: number;
  page_count: number;
  author_name: string;
  timestamp: string;
  notes?: string;
  jump_url?: string;
}

interface AdminPanelProps {
  onClose?: () => void;
  onRefreshParentDocs?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onRefreshParentDocs }) => {
  const [adminTab, setAdminTab] = useState<'moderation' | 'documents' | 'announce'>('moderation');

  // Headers kèm token xác thực
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getDiscordAccessToken();
    const headers: Record<string, string> = {
      ...API_FETCH_HEADERS,
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  // =========================================================================
  // TAB 1: MODERATION (BANS, KICK, MUTE, UNMUTE)
  // =========================================================================
  const [bansList, setBansList] = useState<BannedUser[]>([]);
  const [isLoadingBans, setIsLoadingBans] = useState<boolean>(false);
  const [bansError, setBansError] = useState<string>('');

  // Form Kỷ luật
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [modAction, setModAction] = useState<'ban' | 'kick' | 'mute' | 'unmute'>('mute');
  const [modDuration, setModDuration] = useState<number>(600); // Mặc định 10 phút
  const [modDeleteDays, setModDeleteDays] = useState<number>(0);
  const [modReason, setModReason] = useState<string>('');
  const [isSubmittingMod, setIsSubmittingMod] = useState<boolean>(false);
  const [modMessage, setModMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Fetch danh sách bans
  const fetchBans = useCallback(async () => {
    setIsLoadingBans(true);
    setBansError('');
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/bans`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Lỗi tải danh sách ban (${res.status})`);
      }
      const data = await res.json();
      setBansList(data.bans || []);
    } catch (e: any) {
      setBansError(e.message || 'Không thể lấy danh sách bị cấm từ Discord.');
    } finally {
      setIsLoadingBans(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (adminTab === 'moderation') {
      fetchBans();
    }
  }, [adminTab, fetchBans]);

  // Thực hiện hành động kỷ luật
  const handleExecuteModAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      setModMessage({ type: 'error', text: 'Vui lòng nhập Discord User ID của thành viên.' });
      return;
    }

    setIsSubmittingMod(true);
    setModMessage(null);

    const apiBase = getApiBaseUrl();
    const headers = getAuthHeaders();

    try {
      let endpoint = '';
      let bodyData: any = { user_id: targetUserId.trim() };

      if (modAction === 'ban') {
        endpoint = `${apiBase}/api/admin/ban`;
        bodyData.reason = modReason.trim() || 'Cấm từ Web Admin Portal';
        bodyData.delete_message_days = modDeleteDays;
      } else if (modAction === 'kick') {
        endpoint = `${apiBase}/api/admin/kick`;
        bodyData.reason = modReason.trim() || 'Kick từ Web Admin Portal';
      } else if (modAction === 'mute') {
        endpoint = `${apiBase}/api/admin/timeout`;
        bodyData.action = 'mute';
        bodyData.duration_seconds = modDuration;
        bodyData.reason = modReason.trim() || 'Mute từ Web Admin Portal';
      } else if (modAction === 'unmute') {
        endpoint = `${apiBase}/api/admin/timeout`;
        bodyData.action = 'unmute';
        bodyData.duration_seconds = 0;
        bodyData.reason = modReason.trim() || 'Gỡ mute từ Web Admin Portal';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Thao tác không thành công.');
      }

      setModMessage({
        type: 'success',
        text: data.message || `Đã thực hiện thao tác ${modAction.toUpperCase()} thành công!`,
      });
      setTargetUserId('');
      setModReason('');

      // Refresh ban list nếu hành động là ban
      if (modAction === 'ban') {
        fetchBans();
      }
    } catch (err: any) {
      setModMessage({
        type: 'error',
        text: err.message || 'Lỗi kết nối máy chủ khi thực hiện kỷ luật.',
      });
    } finally {
      setIsSubmittingMod(false);
    }
  };

  // Gỡ ban một user từ danh sách
  const handleUnbanUser = async (userId: string, username: string) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ cấm (Unban) cho ${username} (ID: ${userId})?`)) {
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/unban`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: userId,
          reason: 'Gỡ cấm từ bảng Quản trị Web',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Gỡ cấm thất bại.');
      }
      setBansList((prev) => prev.filter((b) => b.user_id !== userId));
      setModMessage({ type: 'success', text: `Đã gỡ cấm thành công cho ${username}!` });
    } catch (e: any) {
      alert(`Lỗi gỡ cấm: ${e.message}`);
    }
  };

  // =========================================================================
  // TAB 3: THÔNG BÁO DISCORD (WEB -> DISCORD ANNOUNCEMENT)
  // =========================================================================
  const [announceChannelId, setAnnounceChannelId] = useState<string>('');
  const [announceMessage, setAnnounceMessage] = useState<string>('');
  const [isSendingAnnounce, setIsSendingAnnounce] = useState<boolean>(false);
  const [announceMsg, setAnnounceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Gửi thông báo từ Web tới kênh Discord (xác thực bằng tài khoản Admin Discord)
  const handleSendAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceChannelId.trim()) {
      setAnnounceMsg({ type: 'error', text: 'Vui lòng nhập Channel ID của kênh Discord.' });
      return;
    }
    if (!announceMessage.trim()) {
      setAnnounceMsg({ type: 'error', text: 'Vui lòng nhập nội dung thông báo.' });
      return;
    }
    if (announceMessage.length > 2000) {
      setAnnounceMsg({ type: 'error', text: 'Nội dung tối đa 2000 ký tự (giới hạn Discord).' });
      return;
    }

    setIsSendingAnnounce(true);
    setAnnounceMsg(null);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/notify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          channel_id: Number(announceChannelId.trim()),
          message: announceMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || `Gửi thông báo thất bại (${res.status}).`);
      }
      setAnnounceMsg({
        type: 'success',
        text: `Đã gửi thông báo tới kênh ${announceChannelId.trim()} thành công!`,
      });
      setAnnounceMessage('');
    } catch (err: any) {
      setAnnounceMsg({ type: 'error', text: err.message || 'Lỗi kết nối máy chủ.' });
    } finally {
      setIsSendingAnnounce(false);
    }
  };

  // =========================================================================
  // TAB 2: QUẢN LÝ KHO ĐỀ (DOCUMENTS MANAGEMENT & EDIT/DELETE)
  // =========================================================================
  const [docSearchKeyword, setDocSearchKeyword] = useState<string>('');
  const [docFilterSubject, setDocFilterSubject] = useState<string>('ALL');
  const [adminDocs, setAdminDocs] = useState<AdminExamDocument[]>([]);
  const [isLoadingAdminDocs, setIsLoadingAdminDocs] = useState<boolean>(false);
  const [docActionMsg, setDocActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Modal Chỉnh Sửa Đề
  const [editingDoc, setEditingDoc] = useState<AdminExamDocument | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editLevel, setEditLevel] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Fetch danh sách đề cho Admin
  const fetchAdminDocs = useCallback(async () => {
    setIsLoadingAdminDocs(true);
    setDocActionMsg(null);
    try {
      const apiBase = getApiBaseUrl();
      const q = new URLSearchParams();
      q.set('limit', '100');
      if (docFilterSubject !== 'ALL') q.set('subject', docFilterSubject);
      if (docSearchKeyword.trim()) q.set('search', docSearchKeyword.trim());

      const res = await fetch(`${apiBase}/api/documents?${q.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Không thể tải danh sách tài liệu');
      const data = await res.json();
      setAdminDocs(data.documents || []);
    } catch (e: any) {
      setDocActionMsg({ type: 'error', text: e.message || 'Lỗi khi tải kho đề' });
    } finally {
      setIsLoadingAdminDocs(false);
    }
  }, [docFilterSubject, docSearchKeyword, getAuthHeaders]);

  useEffect(() => {
    if (adminTab === 'documents') {
      fetchAdminDocs();
    }
  }, [adminTab, fetchAdminDocs]);

  // Xóa đề thi (CSDL + Tệp ổ cứng + Discord)
  const handleDeleteDoc = async (doc: AdminExamDocument) => {
    const confirmDelete = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN đề thi:\n"${doc.title}" (ID: #${doc.id})?\n\nHành động này sẽ xóa dữ liệu trên CSDL, xóa tệp trên máy chủ và xóa bài đăng trên Discord!`
    );
    if (!confirmDelete) return;

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/documents/${doc.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Xóa đề thi thất bại.');
      }

      setDocActionMsg({
        type: 'success',
        text: data.message || `Đã xóa đề thi #${doc.id} thành công!`,
      });
      setAdminDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (onRefreshParentDocs) onRefreshParentDocs();
    } catch (err: any) {
      setDocActionMsg({ type: 'error', text: err.message || 'Lỗi khi xóa đề thi.' });
    }
  };

  // Mở modal sửa đề
  const handleOpenEdit = (doc: AdminExamDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || '');
    setEditNotes(doc.notes || '');
    setEditSubject(doc.subject || 'MATHEMATICS');
    setEditLevel(doc.estimated_level || 'THPT');
  };

  // Lưu chỉnh sửa đề
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    setIsSavingEdit(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editTitle.trim(),
          notes: editNotes.trim(),
          subject: editSubject.trim(),
          estimated_level: editLevel.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Cập nhật đề thi thất bại.');
      }

      setDocActionMsg({
        type: 'success',
        text: `Đã lưu cập nhật cho đề thi #${editingDoc.id} thành công!`,
      });

      // Cập nhật state nội bộ
      setAdminDocs((prev) =>
        prev.map((d) =>
          d.id === editingDoc.id
            ? {
                ...d,
                title: editTitle.trim(),
                notes: editNotes.trim(),
                subject: editSubject.trim(),
                estimated_level: editLevel.trim(),
              }
            : d
        )
      );

      setEditingDoc(null);
      if (onRefreshParentDocs) onRefreshParentDocs();
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-purple-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/40">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black bg-gradient-to-r from-rose-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
              BẢNG ĐIỀU KHIỂN QUẢN TRỊ (ADMIN PORTAL)
            </h2>
            <p className="text-xs text-slate-400">
              Đồng bộ trực tiếp hai chiều với HyperHub Discord Bot & Máy chủ
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setAdminTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            adminTab === 'moderation'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-900/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Xử Lý Kỷ Luật & Cấm (Moderation)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {bansList.length} Bans
          </span>
        </button>

        <button
          onClick={() => setAdminTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            adminTab === 'documents'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-900/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quản Lý Kho Đề (Sửa & Xóa)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {adminDocs.length} Đề
          </span>
        </button>

        <button
          onClick={() => setAdminTab('announce')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            adminTab === 'announce'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-lg shadow-sky-900/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Thông Báo Discord</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: MODERATION CONTENT */}
      {/* =================================================================== */}
      {adminTab === 'moderation' && (
        <div className="space-y-6">
          {/* Action Form */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Thực Thi Kỷ Luật Thành Viên (Ban, Kick, Timeout/Mute, Unmute)</span>
            </h3>

            {modMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  modMessage.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                }`}
              >
                {modMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{modMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteModAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Discord User ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Discord User ID</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1529864608813416449"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Action Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Hành Động</label>
                <select
                  value={modAction}
                  onChange={(e) => setModAction(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="mute">🔇 Mute / Timeout</option>
                  <option value="unmute">🔊 Gỡ Mute (Unmute)</option>
                  <option value="kick">👢 Kick Khỏi Server</option>
                  <option value="ban">🔨 Cấm Vĩnh Viễn (Ban)</option>
                </select>
              </div>

              {/* Mute Duration OR Ban delete days */}
              {modAction === 'mute' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Thời Gian Mute</label>
                  <select
                    value={modDuration}
                    onChange={(e) => setModDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={300}>5 phút</option>
                    <option value={600}>10 phút</option>
                    <option value={1800}>30 phút</option>
                    <option value={3600}>1 giờ</option>
                    <option value={86400}>24 giờ (1 ngày)</option>
                    <option value={604800}>7 ngày</option>
                    <option value={2419200}>28 ngày (Tối đa)</option>
                  </select>
                </div>
              )}

              {modAction === 'ban' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Xóa Tin Nhắn Cũ</label>
                  <select
                    value={modDeleteDays}
                    onChange={(e) => setModDeleteDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={0}>Không xóa</option>
                    <option value={1}>Tin nhắn 24 giờ qua</option>
                    <option value={7}>Tin nhắn 7 ngày qua</option>
                  </select>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-semibold text-slate-400">Lý Do Kỷ Luật</label>
                <input
                  type="text"
                  placeholder="Vi phạm quy tắc máy chủ..."
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingMod}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingMod ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : modAction === 'ban' ? (
                    <Ban className="w-4 h-4" />
                  ) : modAction === 'kick' ? (
                    <UserMinus className="w-4 h-4" />
                  ) : modAction === 'mute' ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>
                    {isSubmittingMod ? 'Đang xử lý...' : `Xác Nhận ${modAction.toUpperCase()}`}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Bans List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                <span>Danh Sách Người Dùng Bị Cấm ({bansList.length})</span>
              </h3>
              <button
                onClick={fetchBans}
                disabled={isLoadingBans}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBans ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {bansError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {bansError}
              </div>
            )}

            {bansList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs">
                Hiện tại không có thành viên nào bị cấm trên máy chủ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {bansList.map((ban) => (
                  <div
                    key={ban.user_id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ban.avatar_url ? (
                        <img
                          src={ban.avatar_url}
                          alt={ban.username}
                          className="w-10 h-10 rounded-full border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold shrink-0">
                          {ban.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {ban.display_name || ban.username}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          ID: {ban.user_id}
                        </div>
                        <div className="text-[10px] text-rose-300/80 truncate italic">
                          Lý do: {ban.reason}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnbanUser(ban.user_id, ban.display_name || ban.username)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                    >
                      Gỡ Cấm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: DOCUMENTS MANAGEMENT CONTENT */}
      {/* =================================================================== */}
      {adminTab === 'documents' && (
        <div className="space-y-4">
          {/* Controls Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm đề theo tiêu đề, tên file..."
                value={docSearchKeyword}
                onChange={(e) => setDocSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminDocs()}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={docFilterSubject}
              onChange={(e) => setDocFilterSubject(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Mọi Môn Học</option>
              <option value="MATHEMATICS">Toán Học</option>
              <option value="INFORMATICS">Tin Học / Lập Trình</option>
              <option value="LITERATURE">Ngữ Văn</option>
              <option value="ENGLISH">Tiếng Anh</option>
              <option value="PHYSICS">Vật Lý</option>
              <option value="CHEMISTRY">Hóa Học</option>
              <option value="BIOLOGY">Sinh Học</option>
              <option value="HISTORY">Lịch Sử</option>
              <option value="GEOGRAPHY">Địa Lý</option>
            </select>

            <button
              onClick={fetchAdminDocs}
              disabled={isLoadingAdminDocs}
              className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdminDocs ? 'animate-spin' : ''}`} />
              <span>Tìm Kiếm</span>
            </button>
          </div>

          {docActionMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                docActionMsg.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              }`}
            >
              {docActionMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{docActionMsg.text}</span>
            </div>
          )}

          {/* Table / List of documents */}
          <div className="max-h-[450px] overflow-y-auto rounded-2xl border border-white/10 bg-black/30">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 border-b border-white/10 text-[11px] uppercase text-slate-400 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Tiêu Đề & Ghi Chú</th>
                  <th className="py-2.5 px-3">Môn & Khối</th>
                  <th className="py-2.5 px-3">Tác Giả</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {adminDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      {isLoadingAdminDocs ? 'Đang tải danh sách đề thi...' : 'Không tìm thấy đề thi phù hợp.'}
                    </td>
                  </tr>
                ) : (
                  adminDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-purple-400">
                        #{doc.id}
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px]">
                        <div className="font-bold text-white truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {doc.file_name} ({Math.round(doc.file_size_bytes / 1024)} KB)
                        </div>
                        {doc.notes && (
                          <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mt-0.5 inline-block truncate max-w-full">
                            📝 {doc.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-300">
                          {doc.subject}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {doc.estimated_level}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {doc.author_name}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors"
                            title="Sửa tiêu đề & ghi chú"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                            title="Xóa vĩnh viễn đề thi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: THÔNG BÁO DISCORD (WEB -> DISCORD) */}
      {/* =================================================================== */}
      {adminTab === 'announce' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-sky-400" />
              <span>Gửi Thông Báo Từ Web Tới Kênh Discord</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Tin nhắn được gửi bởi Bot với tư cách quản trị viên đã đăng nhập. Hệ thống tự chặn
              mention hàng loạt (@everyone, @here) để chống spam ping.
            </p>

            {announceMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  announceMsg.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                }`}
              >
                {announceMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{announceMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSendAnnounce} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Channel ID (kênh Discord nhận thông báo)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1534147129197723749"
                  value={announceChannelId}
                  onChange={(e) => setAnnounceChannelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Nội dung thông báo ({announceMessage.length}/2000)
                </label>
                <textarea
                  rows={4}
                  value={announceMessage}
                  onChange={(e) => setAnnounceMessage(e.target.value)}
                  placeholder="Nhập thông báo gửi tới máy chủ Discord..."
                  maxLength={2000}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSendingAnnounce}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-900/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSendingAnnounce ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSendingAnnounce ? 'Đang gửi...' : 'Gửi Thông Báo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL CHỈNH SỬA ĐỀ THI & GHI CHÚ */}
      {/* =================================================================== */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Chỉnh Sửa Đề Thi #{editingDoc.id}</span>
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Tiêu Đề Đề Thi</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Môn Học</label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="MATHEMATICS">Toán Học</option>
                    <option value="INFORMATICS">Tin Học</option>
                    <option value="LITERATURE">Ngữ Văn</option>
                    <option value="ENGLISH">Tiếng Anh</option>
                    <option value="PHYSICS">Vật Lý</option>
                    <option value="CHEMISTRY">Hóa Học</option>
                    <option value="BIOLOGY">Sinh Học</option>
                    <option value="HISTORY">Lịch Sử</option>
                    <option value="GEOGRAPHY">Địa Lý</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Khối Lớp / Độ Khó</label>
                  <input
                    type="text"
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Ghi Chú Đề Thi (Notes / Đặc điểm nhận dạng)
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ví dụ: Đề thi thử đợt 1 Chuyên Sư Phạm 2025, có đáp án chi tiết..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
