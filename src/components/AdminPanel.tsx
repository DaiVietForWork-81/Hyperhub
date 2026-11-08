import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
  useTransition,
} from 'react';
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
  LockOpen,
  Megaphone,
  Send,
  ScrollText,
  Hash,
  Settings2,
  ClipboardList,
  Users,
  Check,
  ChevronUp,
  ChevronDown,
  GitBranch,
  ArrowUpCircle,
  ExternalLink,
  HardDrive,
  Cloud,
  Crown,
  Sparkles,
  Plus,
  Layers,
  Sliders,
} from 'lucide-react';
import {
  getApiBaseUrl,
  API_FETCH_HEADERS,
  setCustomApiUrl,
  DEFAULT_TUNNEL_URL,
  LOCAL_API_URL,
  notifyBotViaWebhookHandshake,
} from '../utils/apiConfig';
import { getDiscordAccessToken, getStoredDiscordUser } from '../utils/discordAuth';
import { getTursoStorageUsage, TursoStorageStats } from '../utils/tursoClient';

interface BannedUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  reason: string;
}

interface MemberRoleBadge {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface DiscordMemberItem {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_bot: boolean;
  is_owner?: boolean;
  is_admin?: boolean;
  top_role?: string;
  top_color?: string;
  roles?: MemberRoleBadge[];
  joined_at?: string;
  timed_out_until?: string | null;
}

interface DiscordRoleItem {
  id: string;
  name: string;
  color: string;
  color_int: number;
  position: number;
  hoist: boolean;
  mentionable: boolean;
  managed: boolean;
  is_default: boolean;
  permissions: string;
  permissions_list: string[];
  member_count: number;
  tier: 'bot' | 'divider' | 'staff' | 'honor' | 'grade' | 'member' | 'other' | 'default';
  editable: boolean;
}

interface GuildOption {
  id: string;
  name: string;
  member_count: number;
}

interface DiscordChannelItem {
  channel_id: string;
  name: string;
  raw_name?: string;
  kind?: 'text' | 'voice';
  category: string;
  category_id?: string;
  topic?: string;
  is_private?: boolean;
  position?: number;
}

interface AdminExamDocument {
  id: number;
  title: string;
  subject: string;
  file_name: string;
  file_size_bytes: number;
  estimated_level: string;
  exam_track?: string;
  academic_year?: string;
  school_or_department?: string;
  question_count: number;
  page_count: number;
  author_name: string;
  author_avatar?: string;
  timestamp: string;
  notes?: string;
  jump_url?: string;
  download_url?: string;
  is_chunked?: number;
  is_duplicate?: boolean;
  is_duplicate_copy?: boolean;
  duplicate_count?: number;
  queue_status?: string;
}

interface BotBridgeStatus {
  status?: string;
  bot_user?: string;
  bot_id?: string | number;
  ping_ms?: number;
  uptime_seconds?: number;
  bridge_mode?: string;
  web_connected?: boolean;
  last_web_signal_ts?: number;
  web_handshake_count?: number;
  webhook_id?: string;
}

interface AdminIdentity {
  is_admin?: boolean;
  user_id?: string | number;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  role_name?: string;
  tier?: 'owner' | 'co_owner' | 'admin' | 'moderator';
  full_control?: boolean;
}

interface AdminPanelProps {
  onClose?: () => void;
  onRefreshParentDocs?: () => void;
}

type AdminTab = 'roles' | 'members' | 'documents' | 'channels' | 'config' | 'logs';

const SUBJECT_OPTIONS = [
  { value: 'MATHEMATICS', label: 'Toán học' },
  { value: 'PHYSICS', label: 'Vật lý' },
  { value: 'CHEMISTRY', label: 'Hóa học' },
  { value: 'BIOLOGY', label: 'Sinh học' },
  { value: 'INFORMATICS', label: 'Tin học' },
  { value: 'ENGLISH', label: 'Tiếng Anh' },
  { value: 'LITERATURE', label: 'Ngữ văn' },
  { value: 'HISTORY', label: 'Lịch sử' },
  { value: 'GEOGRAPHY', label: 'Địa lý' },
  { value: 'NATURAL_SCIENCE', label: 'Khoa học tự nhiên (Cấp 2)' },
  { value: 'HISTORY_GEOGRAPHY', label: 'Lịch sử & Địa lý (Cấp 2)' },
  { value: 'CIVIC_EDUCATION', label: 'Giáo dục công dân (Cấp 2)' },
  { value: 'ECONOMIC_LEGAL_EDU', label: 'Kinh tế & Pháp luật (Cấp 3)' },
  { value: 'TECHNOLOGY', label: 'Công nghệ' },
  { value: 'DEFENSE_SECURITY_EDU', label: 'GD Quốc phòng & An ninh' },
  { value: 'GENERAL', label: 'Tổng hợp / ĐGNL' },
];

const GRADE_LEVEL_OPTIONS = [
  'Khối 12 (Ôn thi THPT)',
  'Khối 11',
  'Khối 10',
  'Khối 9 (Ôn Vào 10)',
  'Khối 8',
  'Khối 7',
  'Khối 6',
  'Khối THCS',
];

const EXAM_TRACK_OPTIONS = [
  { value: 'Thường', label: 'Đề Thường (Đại trà / Học kỳ / Thi thử)' },
  { value: 'HSG', label: 'Đề Học Sinh Giỏi (HSG)' },
  { value: 'Chuyên', label: 'Đề Chuyên (Tuyển sinh 10 Chuyên / THPT Chuyên)' },
  { value: 'Quốc tế', label: 'Đề Quốc tế (IMO / AMC / Kangaroo / SASMO)' },
];

const ROLE_COLOR_SWATCHES = [
  '#C6F24E',
  '#F59E0B',
  '#FF2E63',
  '#10B981',
  '#06B6D4',
  '#38BDF8',
  '#3B82F6',
  '#F472B6',
  '#EF4444',
  '#22C55E',
];

const PERMISSION_PRESETS = [
  { value: 'none', label: 'Danh hiệu / Màu sắc (Không cấp quyền hệ thống)' },
  { value: 'member', label: 'Thành viên chuẩn (Xem kênh, nhắn tin, vào voice an toàn)' },
  { value: 'moderator', label: 'Điều hành viên (Kick, Ban, Mute, Xóa tin, Quản lý Thread)' },
  { value: 'admin', label: 'Quản trị tối cao (Full Administrator)' },
  { value: 'readonly', label: 'Chỉ xem & Đọc lịch sử (Read-Only)' },
];

const TIER_META: Record<string, { label: string; badgeClass: string }> = {
  staff: { label: 'Quản trị & Điều hành', badgeClass: 'bg-[#2C1620] text-[#FDA4AF] ring-1 ring-[#4C2233]' },
  honor: { label: 'Vinh danh & Học thuật', badgeClass: 'bg-[#281F12] text-[#FCD34D] ring-1 ring-[#45341B]' },
  grade: { label: 'Khối lớp (6 → 12)', badgeClass: 'bg-[#12242E] text-[#67E8F9] ring-1 ring-[#1D3B4B]' },
  member: { label: 'Thành viên', badgeClass: 'bg-[#13261C] text-[#6EE7B7] ring-1 ring-[#1F3F2E]' },
  divider: { label: 'Thanh phân cách', badgeClass: 'bg-[#1A1825] text-[#A39FB8] ring-1 ring-[#282438]' },
  bot: { label: 'Hệ thống Bot', badgeClass: 'bg-[#142234] text-[#7DD3FC] ring-1 ring-[#213854]' },
  other: { label: 'Khác', badgeClass: 'bg-[#1A1825] text-[#CBD5E1] ring-1 ring-[#282438]' },
  default: { label: 'Mặc định (@everyone)', badgeClass: 'bg-[#161421] text-[#94A3B8] ring-1 ring-[#262235]' },
};

const PERM_LABELS_VI: Record<string, string> = {
  administrator: 'Toàn quyền Admin',
  manage_guild: 'Quản lý Server',
  manage_roles: 'Quản lý Role',
  manage_channels: 'Quản lý Kênh',
  kick_members: 'Kick thành viên',
  ban_members: 'Cấm thành viên (Ban)',
  moderate_members: 'Tạm khóa (Timeout)',
  manage_messages: 'Xóa tin nhắn',
  manage_threads: 'Quản lý Thread',
  view_audit_log: 'Xem Nhật ký',
  mention_everyone: 'Ping @everyone',
  send_messages: 'Nhắn tin',
  view_channel: 'Xem kênh',
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onRefreshParentDocs }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('roles');
  const [isPendingTab, startTabTransition] = useTransition();
  const switchTab = useCallback((nextTab: AdminTab) => {
    startTabTransition(() => {
      setActiveTab(nextTab);
    });
  }, []);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('1532265330079174697');
  const [guilds, setGuilds] = useState<GuildOption[]>([
    { id: '1532265330079174697', name: 'Orbit | Vietnam', member_count: 44 },
    { id: '1567904557076316250', name: 'Orbit | Toán', member_count: 2 },
  ]);
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null);
  const [botBridgeStatus, setBotBridgeStatus] = useState<BotBridgeStatus | null>(null);
  const [botOnline, setBotOnline] = useState<boolean>(true);
  const [syncingSystem, setSyncingSystem] = useState<boolean>(false);
  const bootstrappedGuildRef = useRef<string>('');

  // Sliding Indicator cho thanh Tab Navigation
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  // Feedback Banner
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // ================= 1. ROLES STATE =================
  const [roles, setRoles] = useState<DiscordRoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);
  const [aligningRoles, setAligningRoles] = useState<boolean>(false);
  const [roleTierFilter, setRoleTierFilter] = useState<string>('ALL');
  const [roleSearch, setRoleSearch] = useState<string>('');

  // Create Role Form
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleColor, setNewRoleColor] = useState<string>('#F59E0B');
  const [newRoleHoist, setNewRoleHoist] = useState<boolean>(true);
  const [newRoleMentionable, setNewRoleMentionable] = useState<boolean>(true);
  const [newRolePermPreset, setNewRolePermPreset] = useState<string>('none');

  // Edit Role Modal
  const [editingRole, setEditingRole] = useState<DiscordRoleItem | null>(null);
  const [editRoleName, setEditRoleName] = useState<string>('');
  const [editRoleColor, setEditRoleColor] = useState<string>('#F59E0B');
  const [editRoleHoist, setEditRoleHoist] = useState<boolean>(true);
  const [editRoleMentionable, setEditRoleMentionable] = useState<boolean>(true);
  const [editRolePermPreset, setEditRolePermPreset] = useState<string>('');

  // ================= 2. MEMBERS & MODERATION STATE =================
  const [members, setMembers] = useState<DiscordMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('ALL');
  const [selectedMemberForRoles, setSelectedMemberForRoles] = useState<DiscordMemberItem | null>(null);
  const [modalRoleSearch, setModalRoleSearch] = useState<string>('');
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  const [bans, setBans] = useState<BannedUser[]>([]);
  const [loadingBans, setLoadingBans] = useState<boolean>(false);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [modReason, setModReason] = useState<string>('');
  const [muteDuration, setMuteDuration] = useState<number>(600);
  const [deleteMsgDays, setDeleteMsgDays] = useState<number>(0);

  // ================= 3. DOCUMENTS STATE =================
  const [docs, setDocs] = useState<AdminExamDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [docSearch, setDocSearch] = useState<string>('');
  const [docSubjectFilter, setDocSubjectFilter] = useState<string>('ALL');
  const [docLevelFilter, setDocLevelFilter] = useState<string>('ALL');
  const [docTrackFilter, setDocTrackFilter] = useState<string>('ALL');
  const [docStatusFilter, setDocStatusFilter] = useState<'ALL' | 'UNIQUE' | 'DUPLICATE' | 'PENDING_BOT'>('ALL');
  const [docPage, setDocPage] = useState<number>(1);
  const DOC_PAGE_SIZE = 30;
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [bulkSubject, setBulkSubject] = useState<string>('');
  const [bulkLevel, setBulkLevel] = useState<string>('');
  const [bulkTrack, setBulkTrack] = useState<string>('');
  const [tursoStats, setTursoStats] = useState<TursoStorageStats | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  // Edit Document Modal (100% fields)
  const [editingDoc, setEditingDoc] = useState<AdminExamDocument | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('MATHEMATICS');
  const [editLevel, setEditLevel] = useState<string>('Khối 12 (Ôn thi THPT)');
  const [editTrack, setEditTrack] = useState<string>('Thường');
  const [editYear, setEditYear] = useState<string>('');
  const [editSchool, setEditSchool] = useState<string>('');
  const [editAuthorName, setEditAuthorName] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // ================= 4. CHANNELS & PANELS STATE =================
  const [channels, setChannels] = useState<DiscordChannelItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [channelSearch, setChannelSearch] = useState<string>('');
  const [channelKindFilter, setChannelKindFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE' | 'TEXT' | 'VOICE'>('ALL');
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newChannelKind, setNewChannelKind] = useState<'voice' | 'text'>('text');
  const [newChannelCategoryId, setNewChannelCategoryId] = useState<string>('');
  const [newChannelLimit, setNewChannelLimit] = useState<number>(0);
  const [newChannelTopic, setNewChannelTopic] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [announceTitle, setAnnounceTitle] = useState<string>('');
  const [announceMsg, setAnnounceMsg] = useState<string>('');
  const [announceColor, setAnnounceColor] = useState<string>('#C6F24E');
  const [refreshingPanels, setRefreshingPanels] = useState<boolean>(false);

  // ================= 5. CONFIG & SYSTEM STATE =================
  const [configData, setConfigData] = useState<{
    bot?: Record<string, unknown>;
    runtime?: Record<string, unknown>;
    config?: Record<string, unknown>;
  } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>(() => getApiBaseUrl());
  const [testingUrl, setTestingUrl] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<{
    current_hash: string;
    full_hash?: string;
    commit_msg?: string;
    branch?: string;
    has_update: boolean;
    remote_hash: string;
    commits: Array<{ hash: string; message: string; author: string; time: string }>;
  } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [applyingUpdate, setApplyingUpdate] = useState<boolean>(false);
  const [reloadingBot, setReloadingBot] = useState<boolean>(false);

  // ================= 6. LOGS & AUDIT STATE =================
  const [logSubView, setLogSubView] = useState<'console' | 'audit'>('console');
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLevel, setLogLevel] = useState<'ALL' | 'INFO' | 'WARNING' | 'ERROR'>('ALL');
  const [logCount, setLogCount] = useState<number>(200);
  const [logSize, setLogSize] = useState<number>(0);
  const [logFilter, setLogFilter] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState<boolean>(false);
  const [auditEntries, setAuditEntries] = useState<
    Array<{ id: string; action: string; actor: string; target: string; reason: string; created_at: string }>
  >([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg((prev) => (prev?.text === text ? null : prev));
    }, 6500);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getDiscordAccessToken();
    const storedUser = getStoredDiscordUser();
    const headers: Record<string, string> = {
      ...API_FETCH_HEADERS,
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (storedUser?.id) {
      headers['X-Discord-User-Id'] = String(storedUser.id);
    }
    return headers;
  }, []);

  // Sliding Tab Indicator calculation
  const updateTabIndicator = useCallback(() => {
    const container = tabBarRef.current;
    const btn = tabBtnRefs.current[activeTab];
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setTabIndicator({
      left: bRect.left - cRect.left + container.scrollLeft,
      width: bRect.width,
      ready: true,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateTabIndicator();
  }, [updateTabIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateTabIndicator);
    return () => window.removeEventListener('resize', updateTabIndicator);
  }, [updateTabIndicator]);

  // Escape key closes modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingRole) setEditingRole(null);
        else if (editingDoc) setEditingDoc(null);
        else if (selectedMemberForRoles) setSelectedMemberForRoles(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingRole, editingDoc, selectedMemberForRoles]);

  // ================= FETCHERS =================
  const fetchRoles = useCallback(
    async (guildId: string = selectedGuildId, forceLive: boolean = false) => {
      setLoadingRoles(true);
      try {
        const apiBase = getApiBaseUrl();
        const qs = new URLSearchParams({ guild_id: guildId });
        if (forceLive) qs.set('live', '1');
        const res = await fetch(`${apiBase}/api/admin/roles?${qs.toString()}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.roles) {
          setRoles(data.roles);
          if (Array.isArray(data.guilds) && data.guilds.length > 0) {
            setGuilds(data.guilds);
          }
        } else {
          showFeedback('error', data.error || data.message || 'Không thể tải danh sách Role');
        }
      } catch {
        showFeedback('error', 'Lỗi kết nối tới máy chủ khi tải hệ thống Role');
      } finally {
        setLoadingRoles(false);
      }
    },
    [selectedGuildId, getAuthHeaders, showFeedback]
  );

  const fetchMembers = useCallback(
    async (searchQuery: string = '', guildId: string = selectedGuildId, forceLive: boolean = false) => {
      setLoadingMembers(true);
      try {
        const apiBase = getApiBaseUrl();
        const qs = new URLSearchParams({
          limit: '150',
          guild_id: guildId,
        });
        if (searchQuery.trim()) qs.set('search', searchQuery.trim());
        if (forceLive) qs.set('live', '1');
        const res = await fetch(`${apiBase}/api/admin/members?${qs.toString()}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.members) {
          setMembers(data.members);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingMembers(false);
      }
    },
    [selectedGuildId, getAuthHeaders]
  );

  const fetchBans = useCallback(async () => {
    setLoadingBans(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/bans`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.bans) {
        setBans(data.bans);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingBans(false);
    }
  }, [getAuthHeaders]);

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const apiBase = getApiBaseUrl();
      const [res, tursoUsage] = await Promise.all([
        fetch(`${apiBase}/api/documents?limit=1000`, { headers: API_FETCH_HEADERS }),
        getTursoStorageUsage(),
      ]);
      const data = await res.json();
      if (res.ok && data.documents) {
        setDocs(data.documents);
      }
      setTursoStats(tursoUsage);
    } catch {
      showFeedback('error', 'Không thể tải danh sách đề thi');
    } finally {
      setLoadingDocs(false);
    }
  }, [showFeedback]);

  const fetchChannels = useCallback(
    async (guildId: string = selectedGuildId, forceLive: boolean = false) => {
      setLoadingChannels(true);
      try {
        const apiBase = getApiBaseUrl();
        const qs = new URLSearchParams({ guild_id: guildId });
        if (forceLive) qs.set('live', '1');
        const res = await fetch(`${apiBase}/api/admin/channels?${qs.toString()}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.channels) {
          setChannels(data.channels);
          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
          const firstText = data.channels.find((c: DiscordChannelItem) => c.kind !== 'voice');
          if (!selectedChannelId && firstText) {
            setSelectedChannelId(firstText.channel_id);
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingChannels(false);
      }
    },
    [selectedGuildId, selectedChannelId, getAuthHeaders]
  );

  const fetchConfig = useCallback(async (forceLive: boolean = false) => {
    setLoadingConfig(true);
    try {
      const apiBase = getApiBaseUrl();
      const suffix = forceLive ? '?live=1' : '';
      const [cfgRes, updRes, stRes] = await Promise.allSettled([
        fetch(`${apiBase}/api/admin/config${suffix}`, { headers: getAuthHeaders() }),
        fetch(`${apiBase}/api/system/update_status${suffix}`, { headers: getAuthHeaders() }),
        fetch(`${apiBase}/api/status`, { headers: API_FETCH_HEADERS }),
      ]);
      if (cfgRes.status === 'fulfilled' && cfgRes.value.ok) {
        setConfigData(await cfgRes.value.json());
      }
      if (updRes.status === 'fulfilled' && updRes.value.ok) {
        setUpdateStatus(await updRes.value.json());
      }
      if (stRes.status === 'fulfilled' && stRes.value.ok) {
        const stData = await stRes.value.json();
        setBotBridgeStatus(stData);
        setBotOnline(stData.bridge_mode !== 'vercel_cloud_standby');
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingConfig(false);
    }
  }, [getAuthHeaders]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/logs?lines=${logCount}&level=${logLevel}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.lines) {
        setLogLines(data.lines);
        setLogSize(data.log_size_bytes || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingLogs(false);
    }
  }, [getAuthHeaders, logCount, logLevel]);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/audit-logs?limit=60`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.entries) {
        setAuditEntries(data.entries);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingAudit(false);
    }
  }, [getAuthHeaders]);

  /**
   * Nạp hợp nhất toàn bộ dữ liệu Admin Hub trong 1 request duy nhất (/api/admin/bootstrap)
   * giúp loại bỏ hoàn toàn hiện tượng thác nước (Waterfall) và chuyển tab 0ms!
   */
  const fetchAdminBootstrap = useCallback(
    async (guildId: string = selectedGuildId, forceLive: boolean = false) => {
      setLoadingRoles(true);
      try {
        const apiBase = getApiBaseUrl();
        const qs = new URLSearchParams({ guild_id: guildId });
        if (forceLive) qs.set('live', '1');
        const res = await fetch(`${apiBase}/api/admin/bootstrap?${qs.toString()}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.admin) setAdminIdentity(data.admin);
          if (data.status) {
            setBotBridgeStatus(data.status);
            setBotOnline(Boolean(data.bot_online ?? (data.status.bridge_mode !== 'vercel_cloud_standby')));
          }
          if (data.roles_data?.roles) {
            setRoles(data.roles_data.roles);
            if (Array.isArray(data.roles_data.guilds) && data.roles_data.guilds.length > 0) {
              setGuilds(data.roles_data.guilds);
            }
          }
          if (data.members_data?.members) {
            setMembers(data.members_data.members);
          }
          if (data.bans_data?.bans) {
            setBans(data.bans_data.bans);
          }
          if (data.channels_data?.channels) {
            setChannels(data.channels_data.channels);
            if (Array.isArray(data.channels_data.categories)) {
              setCategories(data.channels_data.categories);
            }
            const firstText = data.channels_data.channels.find((c: DiscordChannelItem) => c.kind !== 'voice');
            if (!selectedChannelId && firstText) {
              setSelectedChannelId(firstText.channel_id);
            }
          }
          if (data.config_data) {
            setConfigData(data.config_data);
          }
          if (data.update_status) {
            setUpdateStatus(data.update_status);
          }
          bootstrappedGuildRef.current = guildId;
          return;
        }
      } catch {
        /* fallback bên dưới */
      } finally {
        setLoadingRoles(false);
      }
      // Fallback nếu chạy trên bản cũ chưa có /api/admin/bootstrap
      await Promise.allSettled([
        fetchRoles(guildId, forceLive),
        fetchMembers('', guildId, forceLive),
        fetchBans(),
        fetchChannels(guildId, forceLive),
        fetchConfig(forceLive),
      ]);
      bootstrappedGuildRef.current = guildId;
    },
    [selectedGuildId, selectedChannelId, getAuthHeaders, fetchRoles, fetchMembers, fetchBans, fetchChannels, fetchConfig]
  );

  const handleFullSystemSync = useCallback(async () => {
    setSyncingSystem(true);
    try {
      const apiBase = getApiBaseUrl();
      const stored = getStoredDiscordUser();
      const [whRes, syncDocRes] = await Promise.allSettled([
        notifyBotViaWebhookHandshake({
          event: 'manual_sync',
          view: 'dashboard',
          tab: 'admin',
          username: stored?.global_name || stored?.username || 'Admin Orbit',
          userId: stored?.id,
          force: true,
        }),
        fetch(`${apiBase}/api/documents/sync_pending`, {
          method: 'POST',
          headers: getAuthHeaders(),
        }).then((r) => r.json().catch(() => ({}))),
      ]);

      await Promise.allSettled([
        fetchAdminBootstrap(selectedGuildId, true),
        fetchDocs(),
      ]);
      onRefreshParentDocs?.();

      const syncedPending =
        syncDocRes.status === 'fulfilled' ? Number(syncDocRes.value?.synced_pending || 0) : 0;
      const whOk = whRes.status === 'fulfilled' && whRes.value.ok;
      showFeedback(
        'success',
        `Đã đồng bộ 2 chiều Bot ↔ Web qua Webhook 1568882621470089247${
          syncedPending > 0 ? ` · Đã đồng bộ ${syncedPending} đề chờ lên Discord` : ''
        }${whOk ? ' · Tín hiệu Bot Active!' : '!'}`
      );
    } catch {
      showFeedback('error', 'Không thể thực hiện đồng bộ toàn hệ thống.');
    } finally {
      setSyncingSystem(false);
    }
  }, [selectedGuildId, getAuthHeaders, fetchAdminBootstrap, fetchDocs, onRefreshParentDocs, showFeedback]);

  // Khởi tạo song song 1 lần khi mở Admin Hub hoặc khi đổi Máy chủ Discord
  useEffect(() => {
    if (bootstrappedGuildRef.current !== selectedGuildId) {
      fetchAdminBootstrap(selectedGuildId, false);
      fetchDocs();
    }
  }, [selectedGuildId, fetchAdminBootstrap, fetchDocs]);

  // Chỉ tải Logs / Audit khi người dùng mở sang tab Logs
  useEffect(() => {
    if (activeTab === 'logs') {
      if (logSubView === 'console') fetchLogs();
      else fetchAuditLogs();
    }
  }, [activeTab, logSubView, fetchLogs, fetchAuditLogs]);

  // Reset trang kho đề về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setDocPage(1);
  }, [docSearch, docSubjectFilter, docLevelFilter, docTrackFilter, docStatusFilter]);

  useEffect(() => {
    if (activeTab !== 'logs' || !autoRefreshLogs || logSubView !== 'console') return;
    const timer = setInterval(fetchLogs, 4000);
    return () => clearInterval(timer);
  }, [activeTab, autoRefreshLogs, logSubView, fetchLogs]);

  // ================= ROLE ACTIONS =================
  const handleAlignRoles = async () => {
    setAligningRoles(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/roles/align`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ guild_id: selectedGuildId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã căn chỉnh chuẩn toàn bộ hệ thống Role!');
        fetchRoles(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể căn chỉnh hệ thống Role');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi căn chỉnh hệ thống Role');
    } finally {
      setAligningRoles(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      showFeedback('error', 'Vui lòng nhập tên Role mới');
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          guild_id: selectedGuildId,
          name: newRoleName.trim(),
          color: newRoleColor,
          hoist: newRoleHoist,
          mentionable: newRoleMentionable,
          permissions_preset: newRolePermPreset,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã tạo Role mới thành công!');
        setNewRoleName('');
        fetchRoles(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể tạo Role');
      }
    } catch {
      showFeedback('error', 'Lỗi mạng khi tạo Role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPatchRole = async (roleId: string, patch: Record<string, unknown>) => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/roles/${roleId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ guild_id: selectedGuildId, ...patch }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã cập nhật Role!');
        fetchRoles(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể cập nhật Role');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi cập nhật Role');
    }
  };

  const handleSaveRoleModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        guild_id: selectedGuildId,
        name: editRoleName.trim(),
        color: editRoleColor,
        hoist: editRoleHoist,
        mentionable: editRoleMentionable,
      };
      if (editRolePermPreset) {
        payload.permissions_preset = editRolePermPreset;
      }
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã lưu cấu hình Role!');
        setEditingRole(null);
        fetchRoles(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể lưu cấu hình Role');
      }
    } catch {
      showFeedback('error', 'Lỗi mạng khi lưu cấu hình Role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: DiscordRoleItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA Role "${role.name}" khỏi máy chủ?`)) return;
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(
        `${apiBase}/api/admin/roles/${role.id}?guild_id=${encodeURIComponent(selectedGuildId)}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || `Đã xóa Role ${role.name}`);
        fetchRoles(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể xóa Role');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi xóa Role');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= MEMBER ROLE & MODERATION ACTIONS =================
  const handleToggleMemberRole = async (member: DiscordMemberItem, roleId: string) => {
    setTogglingRoleId(roleId);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/members/${member.user_id}/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          guild_id: selectedGuildId,
          action: 'toggle',
          role_id: roleId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã cập nhật Role thành viên!');
        const updatedRoles: MemberRoleBadge[] = data.roles || [];
        setMembers((prev) =>
          prev.map((m) => (m.user_id === member.user_id ? { ...m, roles: updatedRoles } : m))
        );
        setSelectedMemberForRoles((prev) =>
          prev && prev.user_id === member.user_id ? { ...prev, roles: updatedRoles } : prev
        );
        fetchRoles(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể thay đổi Role cho thành viên');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi cấp/gỡ Role');
    } finally {
      setTogglingRoleId(null);
    }
  };

  const handleModAction = async (
    endpoint: 'ban' | 'unban' | 'kick' | 'timeout',
    extraPayload: Record<string, unknown> = {},
    overrideUserId?: string
  ) => {
    const uid = (overrideUserId || targetUserId).trim();
    if (!uid) {
      showFeedback('error', 'Vui lòng chọn thành viên hoặc nhập Discord User ID!');
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: uid,
          reason: modReason.trim() || undefined,
          ...extraPayload,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã thực thi lệnh thành công!');
        fetchBans();
        fetchMembers(memberSearch, selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể thực thi lệnh kỷ luật');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối tới Bot API');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= DOCUMENT ACTIONS =================
  const openEditDocModal = (doc: AdminExamDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || '');
    setEditSubject(doc.subject || 'MATHEMATICS');
    setEditLevel(doc.estimated_level || 'Khối 12 (Ôn thi THPT)');
    setEditTrack(doc.exam_track || 'Thường');
    setEditYear(doc.academic_year || '');
    setEditSchool(doc.school_or_department || '');
    setEditAuthorName(doc.author_name || '');
    setEditNotes(doc.notes || '');
  };

  const handleSaveDocEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editTitle.trim(),
          subject: editSubject,
          estimated_level: editLevel,
          exam_track: editTrack,
          academic_year: editYear.trim(),
          school_or_department: editSchool.trim(),
          author_name: editAuthorName.trim(),
          notes: editNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || `Đã cập nhật đề thi #${editingDoc.id}!`);
        setDocs((prev) =>
          prev.map((d) =>
            d.id === editingDoc.id
              ? {
                  ...d,
                  title: editTitle.trim(),
                  subject: editSubject,
                  estimated_level: editLevel,
                  exam_track: editTrack,
                  academic_year: editYear.trim(),
                  school_or_department: editSchool.trim(),
                  author_name: editAuthorName.trim(),
                  notes: editNotes.trim(),
                }
              : d
          )
        );
        setEditingDoc(null);
        onRefreshParentDocs?.();
      } else {
        showFeedback('error', data.error || 'Không thể lưu chỉnh sửa đề thi');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi lưu đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = async (doc: AdminExamDocument) => {
    if (!window.confirm(`Xác nhận XÓA VĨNH VIỄN đề thi #${doc.id}: "${doc.title}"?`)) return;
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/documents/${doc.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message);
        setDocs((prev) => prev.filter((d) => d.id !== doc.id));
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
        onRefreshParentDocs?.();
      } else {
        showFeedback('error', data.error || 'Không thể xóa đề thi');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi xóa đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDocsAction = async (action: 'delete' | 'update') => {
    const ids = Array.from(selectedDocIds);
    if (ids.length === 0) {
      showFeedback('error', 'Vui lòng tích chọn ít nhất 1 đề thi!');
      return;
    }
    if (
      action === 'delete' &&
      !window.confirm(`Bạn có chắc chắn muốn XÓA HÀNG LOẠT ${ids.length} đề thi đã chọn?`)
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const payload: Record<string, unknown> = {
        action,
        doc_ids: ids,
      };
      if (action === 'update') {
        if (bulkSubject) payload.subject = bulkSubject;
        if (bulkLevel) payload.estimated_level = bulkLevel;
        if (bulkTrack) payload.exam_track = bulkTrack;
      }
      const res = await fetch(`${apiBase}/api/admin/documents/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã thực thi thao tác hàng loạt!');
        setSelectedDocIds(new Set());
        fetchDocs();
        onRefreshParentDocs?.();
      } else {
        showFeedback('error', data.error || 'Không thể thực hiện thao tác hàng loạt');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi xử lý hàng loạt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveDoc = async (doc: AdminExamDocument) => {
    setArchivingId(doc.id);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/documents/${doc.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message);
        fetchDocs();
      } else {
        showFeedback('error', data.error || 'Offload thất bại');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi offload đề thi');
    } finally {
      setArchivingId(null);
    }
  };

  // ================= CHANNEL & PANEL ACTIONS =================
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      showFeedback('error', 'Vui lòng nhập tên kênh cần tạo');
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/channels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          guild_id: selectedGuildId,
          name: newChannelName.trim(),
          kind: newChannelKind,
          category_id: newChannelCategoryId || undefined,
          user_limit: newChannelKind === 'voice' ? newChannelLimit : 0,
          topic: newChannelKind === 'text' ? newChannelTopic.trim() : '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || `Đã tạo kênh #${data.name}!`);
        setNewChannelName('');
        setNewChannelTopic('');
        fetchChannels(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể tạo kênh');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi tạo kênh');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleChannelLock = async (ch: DiscordChannelItem) => {
    const mode = ch.is_private ? 'open' : 'lock';
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/channels/${ch.channel_id}/lockdown`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message);
        fetchChannels(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể đổi trạng thái khóa kênh');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi khóa/mở khóa kênh');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChannel = async (ch: DiscordChannelItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA kênh "${ch.name}" khỏi máy chủ?`)) return;
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/channels/${ch.channel_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message);
        fetchChannels(selectedGuildId);
      } else {
        showFeedback('error', data.error || 'Không thể xóa kênh');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi xóa kênh');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshDiscordPanels = async (target: 'all' | 'info' | 'intake' | 'search') => {
    setRefreshingPanels(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/admin/panels/refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã làm mới các bảng điều khiển trên Discord!');
      } else {
        showFeedback('error', data.error || 'Không thể làm mới bảng điều khiển');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi làm mới bảng điều khiển Discord');
    } finally {
      setRefreshingPanels(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !announceMsg.trim()) {
      showFeedback('error', 'Vui lòng chọn kênh đích và nhập nội dung thông báo!');
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/notify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          channel_id: selectedChannelId,
          title: announceTitle.trim() || 'THÔNG BÁO TỪ BAN QUẢN TRỊ ORBIT',
          message: announceMsg.trim(),
          color: announceColor,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', 'Đã phát sóng thông báo lên kênh Discord thành công!');
        setAnnounceTitle('');
        setAnnounceMsg('');
      } else {
        showFeedback('error', data.error || 'Không thể gửi thông báo');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi gửi thông báo');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= SYSTEM ACTIONS =================
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/system/check_update`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setUpdateStatus(data);
        showFeedback(
          'success',
          data.has_update
            ? `Phát hiện ${data.commits?.length || 1} bản cập nhật mới trên GitHub!`
            : 'Hệ thống đang ở phiên bản mới nhất!'
        );
      }
    } catch {
      showFeedback('error', 'Lỗi kiểm tra cập nhật GitHub');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    setApplyingUpdate(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/system/apply_update`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã cập nhật GitHub & Hot-Reload hoàn tất!');
        fetchConfig();
      } else {
        showFeedback('error', data.error || 'Cập nhật thất bại');
      }
    } catch {
      showFeedback('error', 'Lỗi khi áp dụng cập nhật');
    } finally {
      setApplyingUpdate(false);
    }
  };

  const handleHotReload = async () => {
    setReloadingBot(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/system/reload`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', data.message || 'Đã Hot-Reload toàn bộ Cogs thành công!');
        fetchConfig();
      } else {
        showFeedback('error', data.error || 'Hot-Reload thất bại');
      }
    } catch {
      showFeedback('error', 'Lỗi kết nối khi Hot-Reload');
    } finally {
      setReloadingBot(false);
    }
  };

  const handleSaveApiEndpoint = async (urlToSave: string) => {
    const clean = urlToSave.trim().replace(/\/+$/, '');
    setTestingUrl(true);
    try {
      const res = await fetch(`${clean}/api/status`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        setCustomApiUrl(clean);
        setCustomUrlInput(clean);
        showFeedback('success', `Đã kết nối và lưu cổng API: ${clean || 'Vercel Cloud Bridge'}`);
        fetchConfig();
      } else {
        showFeedback('error', `Máy chủ trả về mã lỗi HTTP ${res.status}`);
      }
    } catch {
      setCustomApiUrl(clean);
      setCustomUrlInput(clean);
      showFeedback('success', `Đã lưu cấu hình địa chỉ API: ${clean || 'Mặc định'}`);
    } finally {
      setTestingUrl(false);
    }
  };

  // ================= FILTERED DATA & TELEMETRY COUNTERS (DEFERRED FOR 60FPS) =================
  const deferredRoleSearch = useDeferredValue(roleSearch);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const deferredDocSearch = useDeferredValue(docSearch);
  const deferredChannelSearch = useDeferredValue(channelSearch);
  const deferredLogFilter = useDeferredValue(logFilter);
  const deferredModalRoleSearch = useDeferredValue(modalRoleSearch);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      if (roleTierFilter !== 'ALL' && r.tier !== roleTierFilter) return false;
      if (deferredRoleSearch.trim()) {
        const q = deferredRoleSearch.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.id.includes(q)) return false;
      }
      return true;
    });
  }, [roles, roleTierFilter, deferredRoleSearch]);

  const assignableRoles = useMemo(() => {
    return roles.filter((r) => !r.is_default && !r.managed && r.tier !== 'divider');
  }, [roles]);

  const memberByIdMap = useMemo(() => {
    const map = new Map<string, DiscordMemberItem>();
    for (const m of members) {
      map.set(m.user_id, m);
    }
    return map;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (memberRoleFilter !== 'ALL') {
        const hasR = (m.roles || []).some((r) => r.id === memberRoleFilter);
        if (!hasR) return false;
      }
      if (deferredMemberSearch.trim()) {
        const q = deferredMemberSearch.toLowerCase();
        const hay = `${m.display_name} ${m.username} ${m.user_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, memberRoleFilter, deferredMemberSearch]);

  const selectedTargetMember = useMemo(() => {
    const clean = targetUserId.trim();
    if (!clean) return null;
    return memberByIdMap.get(clean) || null;
  }, [memberByIdMap, targetUserId]);

  const duplicateDocsCount = useMemo(
    () => docs.filter((d) => d.is_duplicate_copy).length,
    [docs]
  );
  const pendingBotDocsCount = useMemo(
    () => docs.filter((d) => d.queue_status === 'pending_bot').length,
    [docs]
  );
  const uniqueDocsCount = useMemo(
    () => docs.filter((d) => !d.is_duplicate_copy).length,
    [docs]
  );
  const privateChannelsCount = useMemo(
    () => channels.filter((c) => c.is_private).length,
    [channels]
  );

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (docStatusFilter === 'UNIQUE' && d.is_duplicate_copy) return false;
      if (docStatusFilter === 'DUPLICATE' && !d.is_duplicate_copy) return false;
      if (docStatusFilter === 'PENDING_BOT' && d.queue_status !== 'pending_bot') return false;
      if (docSubjectFilter !== 'ALL' && d.subject !== docSubjectFilter) return false;
      if (docLevelFilter !== 'ALL' && !(d.estimated_level || '').includes(docLevelFilter)) return false;
      if (docTrackFilter !== 'ALL' && (d.exam_track || 'Thường') !== docTrackFilter) return false;
      if (deferredDocSearch.trim()) {
        const q = deferredDocSearch.toLowerCase();
        const hay = `${d.id} ${d.title} ${d.subject} ${d.estimated_level} ${d.school_or_department || ''} ${d.notes || ''} ${d.author_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [docs, docStatusFilter, docSubjectFilter, docLevelFilter, docTrackFilter, deferredDocSearch]);

  const totalDocPages = useMemo(
    () => Math.max(1, Math.ceil(filteredDocs.length / DOC_PAGE_SIZE)),
    [filteredDocs.length, DOC_PAGE_SIZE]
  );

  const paginatedDocs = useMemo(() => {
    const start = (docPage - 1) * DOC_PAGE_SIZE;
    return filteredDocs.slice(start, start + DOC_PAGE_SIZE);
  }, [filteredDocs, docPage, DOC_PAGE_SIZE]);

  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (channelKindFilter === 'PUBLIC' && ch.is_private) return false;
      if (channelKindFilter === 'PRIVATE' && !ch.is_private) return false;
      if (channelKindFilter === 'TEXT' && ch.kind === 'voice') return false;
      if (channelKindFilter === 'VOICE' && ch.kind !== 'voice') return false;
      if (deferredChannelSearch.trim()) {
        const q = deferredChannelSearch.toLowerCase();
        const hay = `${ch.name} ${ch.category} ${ch.topic || ''} ${ch.channel_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [channels, channelKindFilter, deferredChannelSearch]);

  const filteredLogLines = useMemo(() => {
    if (!deferredLogFilter.trim()) return logLines;
    const q = deferredLogFilter.toLowerCase();
    return logLines.filter((ln) => ln.toLowerCase().includes(q));
  }, [logLines, deferredLogFilter]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const navTabs: Array<{ id: AdminTab; label: string; badge?: number | string; icon: React.ReactNode }> = [
    { id: 'roles', label: 'Phân Quyền & Role', badge: roles.length || undefined, icon: <Crown className="w-4 h-4" /> },
    { id: 'members', label: 'Thành Viên & Cấp Role', badge: members.length || undefined, icon: <Users className="w-4 h-4" /> },
    { id: 'documents', label: 'Kho Đề Toàn Quyền', badge: docs.length || undefined, icon: <FileText className="w-4 h-4" /> },
    { id: 'channels', label: 'Kênh & Bảng Discord', badge: channels.length || undefined, icon: <Hash className="w-4 h-4" /> },
    { id: 'config', label: 'Hệ Thống & GitHub', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'logs', label: 'Nhật Ký & Console', icon: <ScrollText className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto my-2 bg-[#0B0911] ring-1 ring-[#1E1B2B] rounded-2xl overflow-hidden text-white">
      {/* ================= TOP COMMAND HEADER (RULED T-FRAME) ================= */}
      <div className="relative px-6 pt-5 pb-0 bg-[#110F18]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Trung tâm quản trị Orbit
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[#1B2214] text-[#C6F24E] ring-1 ring-[#2E3B1E]">
                {adminIdentity?.role_name || 'Quản trị viên'}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-md ring-1 flex items-center gap-1.5 tabular-nums ${
                  botOnline
                    ? 'bg-[#13261C] text-[#3FC07A] ring-[#23422D]'
                    : 'bg-[#142234] text-[#38BDF8] ring-[#253748]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    botOnline ? 'bg-[#3FC07A]' : 'bg-[#38BDF8]'
                  }`}
                />
                {botOnline
                  ? `Bot trực tuyến · ${botBridgeStatus?.ping_ms ?? 15} ms`
                  : 'Cloud trực tuyến 24/7'}
              </span>
              <code className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-[#16141F] text-[#949494] ring-1 ring-[#221F30] tabular-nums">
                Webhook #1568882621470089247
              </code>
              {isPendingTab && (
                <span className="px-2 py-0.5 text-[11px] rounded-md bg-[#1A1826] text-[#C6F24E] tabular-nums">
                  Đang chuyển phân hệ...
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] text-[#B4B4B4]">
              Phân cấp Role, kiểm soát thành viên, quản lý kho đề thi và đồng bộ hai chiều giữa Discord Bot và Web.
            </p>
          </div>

          {/* Server Selector + 1-Click Sync + Close */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFullSystemSync}
              disabled={syncingSystem}
              className="h-9 px-4 rounded-lg bg-[#C6F24E] hover:bg-[#D4F773] text-[#0B0911] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Bắn tín hiệu Webhook 1568882621470089247 và đồng bộ tức thì kho đề + cấu hình giữa Bot và Web"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSystem ? 'animate-spin' : ''}`} />
              <span>{syncingSystem ? 'Đang đồng bộ...' : 'Đồng bộ Bot ↔ Web'}</span>
            </button>

            <div className="h-9 flex items-center gap-2 bg-[#0B0911] ring-1 ring-[#262235] rounded-lg px-3">
              <span className="text-xs text-[#949494]">Máy chủ:</span>
              <select
                value={selectedGuildId}
                onChange={(e) => setSelectedGuildId(e.target.value)}
                aria-label="Chọn máy chủ Discord cần quản trị"
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer tabular-nums"
              >
                {guilds.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#110F18] text-white">
                    {g.name} ({g.member_count})
                  </option>
                ))}
              </select>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="h-9 px-3 rounded-lg bg-[#16141F] hover:bg-[#1E1B2B] ring-1 ring-[#262235] text-xs font-medium text-[#B4B4B4] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Command Dock: 1-Click Operational Triggers */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 mb-4 rounded-xl bg-[#0B0911] ring-1 ring-[#1E1B2B]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#949494] mr-1">Lệnh điều hành nhanh:</span>
            <button
              type="button"
              onClick={handleAlignRoles}
              disabled={aligningRoles}
              className="h-7 px-2.5 rounded-md bg-[#161421] hover:bg-[#1F1C2E] ring-1 ring-[#262235] text-[11px] font-medium text-[#E2E2E2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#C6F24E]" />
              <span>{aligningRoles ? 'Đang căn chỉnh...' : 'Căn chỉnh Role'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleRefreshDiscordPanels('all')}
              disabled={refreshingPanels}
              className="h-7 px-2.5 rounded-md bg-[#161421] hover:bg-[#1F1C2E] ring-1 ring-[#262235] text-[11px] font-medium text-[#E2E2E2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3 h-3 text-[#38BDF8]" />
              <span>{refreshingPanels ? 'Đang làm mới...' : 'Làm mới Panel Discord'}</span>
            </button>
            <button
              type="button"
              onClick={handleApplyUpdate}
              disabled={applyingUpdate}
              className="h-7 px-2.5 rounded-md bg-[#161421] hover:bg-[#1F1C2E] ring-1 ring-[#262235] text-[11px] font-medium text-[#E2E2E2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <GitBranch className="w-3 h-3 text-[#3FC07A]" />
              <span>{applyingUpdate ? 'Đang cập nhật...' : 'GitHub 1-Click Update'}</span>
            </button>
            <button
              type="button"
              onClick={handleHotReload}
              disabled={reloadingBot}
              className="h-7 px-2.5 rounded-md bg-[#161421] hover:bg-[#1F1C2E] ring-1 ring-[#262235] text-[11px] font-medium text-[#E2E2E2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 text-[#F59E0B] ${reloadingBot ? 'animate-spin' : ''}`} />
              <span>{reloadingBot ? 'Đang nạp Cogs...' : 'Hot-Reload Cogs'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#949494] tabular-nums">
            <span>Bộ lọc: {filteredRoles.length} role · {filteredMembers.length} thành viên · {filteredDocs.length} đề</span>
          </div>
        </div>

        {/* Unified Divided KPI Strip (1px Grid Gap Hairlines + Proportional Telemetry Bars) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#1E1B2B] ring-1 ring-[#1E1B2B] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => switchTab('roles')}
            className={`p-3.5 text-left transition-colors cursor-pointer relative ${
              activeTab === 'roles' ? 'bg-[#161421]' : 'bg-[#0B0911] hover:bg-[#12101B]'
            }`}
          >
            {activeTab === 'roles' && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C6F24E]" />
            )}
            <div className="text-xs text-[#B4B4B4] font-normal">Hệ thống Role</div>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">{roles.length}</div>
            <div className="text-xs text-[#949494] mt-0.5 tabular-nums">
              {assignableRoles.length} role cấp phát
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#1E1B2B] overflow-hidden">
              <div
                className="h-full bg-[#C6F24E]"
                style={{
                  width: `${roles.length > 0 ? Math.min(100, Math.round((assignableRoles.length / roles.length) * 100)) : 0}%`,
                }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => switchTab('members')}
            className={`p-3.5 text-left transition-colors cursor-pointer relative ${
              activeTab === 'members' ? 'bg-[#161421]' : 'bg-[#0B0911] hover:bg-[#12101B]'
            }`}
          >
            {activeTab === 'members' && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C6F24E]" />
            )}
            <div className="text-xs text-[#B4B4B4] font-normal">Thành viên</div>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">{members.length}</div>
            <div
              className={`text-xs mt-0.5 tabular-nums ${
                bans.length > 0 ? 'text-[#E5566F]' : 'text-[#949494]'
              }`}
            >
              {bans.length > 0 ? `${bans.length} tài khoản bị cấm` : '0 tài khoản bị cấm'}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#1E1B2B] overflow-hidden">
              <div
                className="h-full bg-[#38BDF8]"
                style={{ width: `${members.length > 0 ? 100 : 12}%` }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => switchTab('documents')}
            className={`p-3.5 text-left transition-colors cursor-pointer relative ${
              activeTab === 'documents' ? 'bg-[#161421]' : 'bg-[#0B0911] hover:bg-[#12101B]'
            }`}
          >
            {activeTab === 'documents' && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C6F24E]" />
            )}
            <div className="text-xs text-[#B4B4B4] font-normal">Kho đề thi</div>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">{docs.length}</div>
            <div
              className={`text-xs mt-0.5 tabular-nums ${
                duplicateDocsCount > 0 ? 'text-[#E5A93B]' : 'text-[#949494]'
              }`}
            >
              {duplicateDocsCount > 0
                ? `${duplicateDocsCount} bản trùng lặp`
                : `${uniqueDocsCount} đề độc bản`}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#1E1B2B] overflow-hidden">
              <div
                className="h-full bg-[#3FC07A]"
                style={{
                  width: `${docs.length > 0 ? Math.min(100, Math.round((uniqueDocsCount / docs.length) * 100)) : 0}%`,
                }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => switchTab('channels')}
            className={`p-3.5 text-left transition-colors cursor-pointer relative ${
              activeTab === 'channels' ? 'bg-[#161421]' : 'bg-[#0B0911] hover:bg-[#12101B]'
            }`}
          >
            {activeTab === 'channels' && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C6F24E]" />
            )}
            <div className="text-xs text-[#B4B4B4] font-normal">Kênh máy chủ</div>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">{channels.length}</div>
            <div className="text-xs text-[#949494] mt-0.5 tabular-nums">
              {privateChannelsCount} riêng tư · {Math.max(0, channels.length - privateChannelsCount)} công khai
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#1E1B2B] overflow-hidden">
              <div
                className="h-full bg-[#F59E0B]"
                style={{
                  width: `${channels.length > 0 ? Math.min(100, Math.round(((channels.length - privateChannelsCount) / channels.length) * 100)) : 0}%`,
                }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => switchTab('config')}
            className={`p-3.5 text-left transition-colors cursor-pointer relative ${
              activeTab === 'config' ? 'bg-[#161421]' : 'bg-[#0B0911] hover:bg-[#12101B]'
            }`}
          >
            {activeTab === 'config' && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C6F24E]" />
            )}
            <div className="text-xs text-[#B4B4B4] font-normal">Dung lượng Turso</div>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">
              {tursoStats ? `${(tursoStats.totalBytes / (1024 * 1024)).toFixed(1)} MB` : '0.0 MB'}
            </div>
            <div className="text-xs text-[#949494] mt-0.5 tabular-nums">
              {tursoStats ? `${tursoStats.usedPercent.toFixed(2)}% của 5 GB` : 'Hạn mức 5 GB'}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#1E1B2B] overflow-hidden">
              <div
                className="h-full bg-[#38BDF8]"
                style={{ width: `${tursoStats ? Math.max(4, Math.min(100, tursoStats.usedPercent)) : 4}%` }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => switchTab('logs')}
            className={`p-3.5 text-left transition-colors cursor-pointer relative ${
              activeTab === 'logs' ? 'bg-[#161421]' : 'bg-[#0B0911] hover:bg-[#12101B]'
            }`}
          >
            {activeTab === 'logs' && (
              <span className="absolute inset-x-0 top-0 h-[2px] bg-[#C6F24E]" />
            )}
            <div className="text-xs text-[#B4B4B4] font-normal">Phiên bản &amp; Nhật ký</div>
            <div className="text-2xl font-semibold text-white mt-1 tabular-nums">
              <code className="font-mono text-xl">{updateStatus?.current_hash || 'main'}</code>
            </div>
            <div className="text-xs text-[#3FC07A] mt-0.5 tabular-nums">
              {botBridgeStatus?.web_handshake_count
                ? `${botBridgeStatus.web_handshake_count} lần kết nối`
                : 'Đã đồng bộ Webhook'}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#1E1B2B] overflow-hidden">
              <div className="h-full bg-[#3FC07A] w-full" />
            </div>
          </button>
        </div>

        {/* Underline Navigation Tabs on a Full-Width 1px Rule */}
        <div
          ref={tabBarRef}
          className="relative flex items-center gap-5 mt-4 overflow-x-auto no-scrollbar"
        >
          {tabIndicator.ready && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 h-[2px] bg-[#C6F24E] transition-[left,width] duration-200 ease-out"
              style={{
                left: `${tabIndicator.left}px`,
                width: `${tabIndicator.width}px`,
              }}
            />
          )}
          {navTabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabBtnRefs.current[t.id] = el;
                }}
                onClick={() => switchTab(t.id)}
                className={`relative py-3 text-[13px] font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive ? 'text-white' : 'text-[#949494] hover:text-[#E2E2E2]'
                }`}
              >
                <span className={isActive ? 'text-[#C6F24E]' : 'text-[#949494]'}>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[11px] rounded tabular-nums ${
                      isActive
                        ? 'bg-[#22222C] text-white'
                        : 'bg-[#16141F] text-[#949494]'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= STATUS FEEDBACK BANNER ================= */}
      {statusMsg && (
        <div
          role="status"
          className={`mx-6 mt-4 p-3.5 rounded-xl ring-1 flex items-center justify-between gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-[#172A1D] border-[#254630] text-[#3FC07A]'
              : 'bg-[#2C1A20] border-[#4A2631] text-[#E5566F]'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="p-6">
        {/* =====================================================================
            TAB 1: QUẢN TRỊ ROLE & PHÂN QUYỀN (100% FULL CONTROL)
           ===================================================================== */}
        {activeTab === 'roles' && (
          <div className="space-y-6 hh-swap-panel">
            {/* Top Action Banner: 1-Click Auto Alignment */}
            <div className="p-5 rounded-xl bg-[#110F18] ring-1 ring-[#1E1B2B] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-[#C6F24E]" />
                  <span>Căn chỉnh chuẩn hệ thống Role &amp; quyền hạn (Bot ưu tiên cao nhất)</span>
                </div>
                <p className="text-xs text-[#B4B4B4] leading-relaxed max-w-3xl">
                  Tự động sắp xếp thứ tự phân cấp chuẩn từ trên xuống dưới (Quản trị viên → Vinh danh Orbit → Khối lớp 12..6 → Thành viên → Bot), chuẩn hóa bảng màu sắc tách biệt, khóa quyền nguy hiểm ở <code className="text-white">@everyone</code> và tự động cấp Role <code className="text-[#3FC07A]">Học sinh</code> / <code className="text-[#E2D4FF]">Tác giả</code> cho thành viên đủ điều kiện.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleAlignRoles}
                  disabled={aligningRoles}
                  className="h-9 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs flex items-center gap-2 disabled:opacity-50 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${aligningRoles ? 'animate-spin' : ''}`} />
                  <span>{aligningRoles ? 'Đang căn chỉnh Role...' : 'Căn chỉnh Role chuẩn (1-Click)'}</span>
                </button>
                <button
                  onClick={() => fetchRoles(selectedGuildId, true)}
                  disabled={loadingRoles}
                  className="h-9 px-3.5 rounded-lg bg-[#181622] hover:bg-[#221F30] ring-1 ring-[#282438] text-xs font-medium text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRoles ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Create New Role Form */}
              <form
                onSubmit={handleCreateRole}
                className="lg:col-span-4 bg-[#110F18] ring-1 ring-[#1E1B2B] rounded-xl p-5 space-y-4 h-fit"
              >
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#C6F24E]" />
                  Tạo Role Mới Trên Máy Chủ
                </h3>

                <div>
                  <label className="block text-xs text-white/70 mb-1 font-medium">Tên Role mới</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="VD: Chiến Thần Giải Đề"
                    className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C6F24E]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-1.5 font-medium">
                    Màu sắc hiển thị ({newRoleColor})
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="w-10 h-9 rounded-lg bg-transparent ring-1 ring-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs tabular-nums text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setNewRoleColor(hex)}
                        title={hex}
                        className={`w-6 h-6 rounded-lg ring-1 transition-transform ${
                          newRoleColor.toUpperCase() === hex
                            ? 'scale-110 border-white'
                            : 'border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-1 font-medium">Mẫu quyền hạn (Permissions Preset)</label>
                  <select
                    value={newRolePermPreset}
                    onChange={(e) => setNewRolePermPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#C6F24E]"
                  >
                    {PERMISSION_PRESETS.map((p) => (
                      <option key={p.value} value={p.value} className="bg-[#14111F]">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/35 ring-1 ring-white/10 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={newRoleHoist}
                      onChange={(e) => setNewRoleHoist(e.target.checked)}
                      className="accent-[#C6F24E]"
                    />
                    <span>Tách nhóm (Hoist)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/35 ring-1 ring-white/10 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={newRoleMentionable}
                      onChange={(e) => setNewRoleMentionable(e.target.checked)}
                      className="accent-[#C6F24E]"
                    />
                    <span>Cho phép @ping</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-[#C6F24E] hover:bg-[#D4F773] text-[#0B0911] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Role Ngay
                </button>
              </form>

              {/* Right Column: Interactive Role Hierarchy */}
              <div className="lg:col-span-8 bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      Thang Phân Cấp Role Trực Tiếp ({filteredRoles.length}/{roles.length})
                    </h3>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      Bấm nút Lên/Xuống để đổi vị trí ưu tiên, bật/tắt Hoist hoặc bấm Sửa để tùy chỉnh 100% thông số Role.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        placeholder="Tìm tên hoặc ID role..."
                        className="pl-8 pr-3 py-1.5 bg-black/45 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#C6F24E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Tier Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: 'Tất cả tầng' },
                    { id: 'staff', label: 'Quản trị' },
                    { id: 'honor', label: 'Vinh danh & Học thuật' },
                    { id: 'grade', label: 'Khối lớp' },
                    { id: 'member', label: 'Thành viên' },
                    { id: 'divider', label: 'Thanh phân cách' },
                    { id: 'bot', label: 'Hệ thống Bot' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setRoleTierFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ring-1 transition ${
                        roleTierFilter === f.id
                          ? 'bg-[#1D2414] text-[#C6F24E] ring-1 ring-[#35461F]'
                          : 'bg-black/30 text-white/60 border-white/10 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Role List */}
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {loadingRoles ? (
                    <div className="py-12 text-center text-xs text-white/50">
                      Đang đồng bộ danh sách Role từ máy chủ Discord...
                    </div>
                  ) : filteredRoles.length === 0 ? (
                    <div className="py-12 text-center text-xs text-white/45">
                      Không có Role nào khớp với bộ lọc hiện tại.
                    </div>
                  ) : (
                    filteredRoles.map((role) => {
                      const tierInfo = TIER_META[role.tier] || TIER_META.other;
                      return (
                        <div
                          key={role.id}
                          className={`p-3 rounded-xl ring-1 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            role.tier === 'divider'
                              ? 'bg-black/60 border-white/10'
                              : 'bg-black/35 hover:bg-black/50 border-white/10 hover:ring-[#322D47]'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <span className="w-8 text-center tabular-nums text-[11px] text-white/45 tabular-nums shrink-0">
                              #{role.position}
                            </span>
                            <span
                              className="w-4 h-4 rounded-full ring-1 ring-white/30 shrink-0 mt-0.5 sm:mt-0"
                              style={{ backgroundColor: role.color }}
                              title={`Màu: ${role.color}`}
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="font-bold text-sm truncate"
                                  style={{ color: role.color !== '#000000' ? role.color : '#FFFFFF' }}
                                >
                                  {role.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ring-1 ${tierInfo.badgeClass}`}
                                >
                                  {tierInfo.label}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] rounded-md bg-white/5 text-white/65 tabular-nums">
                                  {role.member_count} thành viên
                                </span>
                                {role.managed && (
                                  <span className="px-2 py-0.5 text-[10px] rounded-md bg-[#142234] text-[#38BDF8] ring-1 ring-[#233B59]">
                                    Bot Managed
                                  </span>
                                )}
                              </div>
                              {/* Permission Badges */}
                              {role.permissions_list.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {role.permissions_list.slice(0, 6).map((perm) => (
                                    <span
                                      key={perm}
                                      className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] text-white/70 ring-1 ring-white/10"
                                    >
                                      {PERM_LABELS_VI[perm] || perm}
                                    </span>
                                  ))}
                                  {role.permissions_list.length > 6 && (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-white/50">
                                      +{role.permissions_list.length - 6} quyền khác
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Role Controls */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {!role.is_default && !role.managed && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPatchRole(role.id, { hoist: !role.hoist })}
                                  title="Bật/tắt hiển thị tách nhóm trên thanh bên phải Discord (Hoist)"
                                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold ring-1 transition ${
                                    role.hoist
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                                      : 'bg-white/5 text-white/45 border-white/10 hover:text-white/80'
                                  }`}
                                >
                                  Hoist: {role.hoist ? 'BẬT' : 'TẮT'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPatchRole(role.id, { direction: 'up' })}
                                  title="Đẩy Role lên cao hơn 1 bậc"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 ring-1 ring-white/10 text-white/75"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPatchRole(role.id, { direction: 'down' })}
                                  title="Hạ Role xuống thấp hơn 1 bậc"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 ring-1 ring-white/10 text-white/75"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {role.editable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRole(role);
                                  setEditRoleName(role.name);
                                  setEditRoleColor(role.color.startsWith('#') ? role.color : '#C6F24E');
                                  setEditRoleHoist(role.hoist);
                                  setEditRoleMentionable(role.mentionable);
                                  setEditRolePermPreset('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#181624] hover:bg-[#221F32] text-[#E2E2E2] ring-1 ring-[#2C2840] text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Sửa
                              </button>
                            )}
                            {!role.is_default && !role.managed && role.editable && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/30 transition"
                                title="Xóa Role"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: THÀNH VIÊN, CẤP ROLE 100% & KỶ LUẬT SERVER
           ===================================================================== */}
        {activeTab === 'members' && (
          <div className="space-y-6 hh-swap-panel">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Live Member Directory + 1-Click Role Assignment */}
              <div className="lg:col-span-7 bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Danh Bạ Thành Viên &amp; Phân Quyền Trực Tiếp ({filteredMembers.length})
                    </h3>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      Bấm nút <strong className="text-[#C6F24E]">Cấp / Gỡ Role</strong> trên bất kỳ thành viên nào để bật/tắt 100% các Role trong Server.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchMembers(memberSearch, selectedGuildId, true)}
                    disabled={loadingMembers}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5 self-start"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMembers ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                </div>

                {/* Search & Role Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Tìm theo tên, @username hoặc Discord ID..."
                      className="w-full pl-9 pr-3 py-2 bg-black/45 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                    />
                  </div>
                  <select
                    value={memberRoleFilter}
                    onChange={(e) => setMemberRoleFilter(e.target.value)}
                    aria-label="Lọc thành viên theo Role"
                    className="px-3 py-2 bg-black/45 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <option value="ALL" className="bg-[#14111F]">
                      Lọc theo Role: Tất cả thành viên ({members.length})
                    </option>
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#14111F]">
                        {r.name} ({r.member_count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Member Cards */}
                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {loadingMembers ? (
                    <div className="py-12 text-center text-xs text-white/50">
                      Đang tải danh sách thành viên máy chủ...
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-white/45">
                      Không tìm thấy thành viên nào phù hợp.
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const isSelected = targetUserId === m.user_id;
                      return (
                        <div
                          key={m.user_id}
                          className={`p-3.5 rounded-xl ring-1 transition ${
                            isSelected
                              ? 'bg-[#171B14] ring-1 ring-[#384A20]'
                              : 'bg-black/35 hover:bg-black/50 border-white/10'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={
                                  m.avatar_url ||
                                  'https://cdn.discordapp.com/embed/avatars/0.png'
                                }
                                alt={m.display_name}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className="font-bold text-sm truncate"
                                    style={{ color: m.top_color || '#FFFFFF' }}
                                  >
                                    {m.display_name}
                                  </span>
                                  <span className="text-xs text-white/50">@{m.username}</span>
                                  {m.is_owner && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40">
                                      Chủ sở hữu
                                    </span>
                                  )}
                                  {m.is_bot && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#142234] text-[#38BDF8] ring-1 ring-[#233B59]">
                                      BOT
                                    </span>
                                  )}
                                  {m.timed_out_until && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40">
                                      Đang tạm khóa
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] tabular-nums text-white/40 mt-0.5">
                                  ID: {m.user_id}
                                </div>
                                {/* Current Roles Pills */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {(m.roles || []).map((r) => (
                                    <span
                                      key={r.id}
                                      className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-black/50 ring-1 ring-white/15 flex items-center gap-1"
                                      style={{ color: r.color !== '#000000' ? r.color : '#E2E8F0' }}
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: r.color }}
                                      />
                                      {r.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedMemberForRoles(m)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 ring-1 ring-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                Cấp / Gỡ Role
                              </button>
                              <button
                                type="button"
                                onClick={() => setTargetUserId(m.user_id)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/85 transition"
                              >
                                Chọn xử lý
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right 5 Cols: Moderation Command Box + Bans List */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Bảng Điều Khiển Kỷ Luật (Mute / Kick / Ban)
                  </h3>

                  {selectedTargetMember && (
                    <div className="p-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            selectedTargetMember.avatar_url ||
                            'https://cdn.discordapp.com/embed/avatars/0.png'
                          }
                          alt={selectedTargetMember.display_name}
                          className="w-9 h-9 rounded-full ring-1 ring-rose-400/40 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {selectedTargetMember.display_name}{' '}
                            <span className="text-white/50 font-normal">@{selectedTargetMember.username}</span>
                          </div>
                          <div className="text-[10px] text-rose-200/80 truncate">
                            {(selectedTargetMember.roles || []).length > 0
                              ? `${(selectedTargetMember.roles || []).length} Role hiện tại`
                              : 'Chưa có Role phân nhóm'}
                            {selectedTargetMember.timed_out_until ? ' · Đang tạm khóa' : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTargetUserId('')}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/60"
                        title="Bỏ chọn thành viên"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Discord User ID mục tiêu</label>
                    <input
                      type="text"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="Chọn thành viên bên trái hoặc dán Discord ID..."
                      className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[#E5566F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/70 mb-1">Lý do xử lý (Ghi vào Audit Log)</label>
                    <input
                      type="text"
                      value={modReason}
                      onChange={(e) => setModReason(e.target.value)}
                      placeholder="VD: Vi phạm nội quy server / Spam..."
                      className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#E5566F]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-white/65 mb-1">Thời lượng Mute (Timeout)</label>
                      <select
                        value={muteDuration}
                        onChange={(e) => setMuteDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                      >
                        <option value={300} className="bg-[#14111F]">5 phút</option>
                        <option value={900} className="bg-[#14111F]">15 phút</option>
                        <option value={3600} className="bg-[#14111F]">1 giờ</option>
                        <option value={21600} className="bg-[#14111F]">6 giờ</option>
                        <option value={86400} className="bg-[#14111F]">24 giờ (1 ngày)</option>
                        <option value={604800} className="bg-[#14111F]">7 ngày (1 tuần)</option>
                        <option value={2419200} className="bg-[#14111F]">28 ngày (Tối đa)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/65 mb-1">Xóa tin nhắn khi Ban</label>
                      <select
                        value={deleteMsgDays}
                        onChange={(e) => setDeleteMsgDays(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                      >
                        <option value={0} className="bg-[#14111F]">Không xóa tin nhắn</option>
                        <option value={1} className="bg-[#14111F]">Xóa 24 giờ gần nhất</option>
                        <option value={3} className="bg-[#14111F]">Xóa 3 ngày gần nhất</option>
                        <option value={7} className="bg-[#14111F]">Xóa 7 ngày gần nhất</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        handleModAction('timeout', { action: 'mute', duration_seconds: muteDuration })
                      }
                      className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 ring-1 ring-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <VolumeX className="w-4 h-4" />
                      Mute (Timeout)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleModAction('timeout', { action: 'unmute', duration_seconds: 0 })}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 ring-1 ring-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                      Gỡ Mute (Unmute)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleModAction('kick')}
                      className="py-2.5 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/35 text-orange-200 ring-1 ring-orange-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <UserMinus className="w-4 h-4" />
                      Kick Khỏi Server
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleModAction('ban', { delete_message_days: deleteMsgDays })}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Ban className="w-4 h-4" />
                      Ban Vĩnh Viễn
                    </button>
                  </div>
                </div>

                {/* Banned Users List */}
                <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserX className="w-4 h-4 text-rose-400" />
                      Danh Sách Tài Khoản Bị Cấm ({bans.length})
                    </h3>
                    <button
                      onClick={fetchBans}
                      disabled={loadingBans}
                      className="text-xs text-[#C6F24E] hover:text-[#E2E2E2] flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingBans ? 'animate-spin' : ''}`} />
                      Tải lại
                    </button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {bans.length === 0 ? (
                      <div className="py-6 text-center text-xs text-white/45">
                        Hiện không có tài khoản nào trong danh sách cấm.
                      </div>
                    ) : (
                      bans.map((b) => (
                        <div
                          key={b.user_id}
                          className="p-2.5 rounded-xl bg-black/40 ring-1 ring-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {b.display_name} (@{b.username})
                            </div>
                            <div className="text-[11px] text-white/50 truncate">{b.reason}</div>
                          </div>
                          <button
                            onClick={() => handleModAction('unban', {}, b.user_id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 ring-1 ring-emerald-500/35 text-[11px] font-bold shrink-0"
                          >
                            Gỡ Ban
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: KHO ĐỀ THI TOÀN QUYỀN (100% FIELD EDIT + BULK ACTIONS)
           ===================================================================== */}
        {activeTab === 'documents' && (
          <div className="space-y-5 hh-swap-panel">
            {/* Turso Storage Telemetry Bar */}
            {tursoStats && (
              <div className="p-4 rounded-xl bg-[#110F18] ring-1 ring-[#1E1B2B] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-[#949494]">
                    Dung lượng lưu trữ Turso Cloud (Hạn mức 5 GB)
                  </div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    Đã dùng {(tursoStats.totalBytes / (1024 * 1024)).toFixed(2)} MB / 5,120 MB (
                    {tursoStats.usedPercent.toFixed(3)}%) · Còn trống{' '}
                    {(Math.max(0, tursoStats.limitBytes - tursoStats.totalBytes) / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {duplicateDocsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocStatusFilter('DUPLICATE');
                        setDocPage(1);
                        setSelectedDocIds(
                          new Set(docs.filter((d) => d.is_duplicate_copy).map((d) => d.id))
                        );
                        showFeedback(
                          'success',
                          `Đã chọn tự động ${duplicateDocsCount} bản sao đề thi trùng lặp để bạn xử lý hoặc xóa 1-Click!`
                        );
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 ring-1 ring-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Chọn {duplicateDocsCount} bản trùng lặp
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${getApiBaseUrl()}/api/documents/sync_pending`, {
                          method: 'POST',
                          headers: getAuthHeaders(),
                        });
                        const data = await res.json().catch(() => ({}));
                        showFeedback(
                          'success',
                          data.message || 'Đã đồng bộ Kho Đề giữa Turso Cloud và Discord Bot!'
                        );
                      } catch {
                        showFeedback('error', 'Không thể gọi đồng bộ Kho Đề');
                      }
                      await fetchDocs();
                    }}
                    disabled={loadingDocs}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                    Đồng bộ Kho Đề
                  </button>
                </div>
              </div>
            )}

            {/* Quick Status Filter Pills (All / Unique / Duplicates / Pending Bot) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL' as const, label: `Tất cả đề (${docs.length})` },
                  { id: 'UNIQUE' as const, label: `Đề gốc độc bản (${uniqueDocsCount})` },
                  { id: 'DUPLICATE' as const, label: `Bản sao trùng lặp (${duplicateDocsCount})` },
                  { id: 'PENDING_BOT' as const, label: `Chờ đồng bộ Bot (${pendingBotDocsCount})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setDocStatusFilter(st.id);
                      setDocPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition ${
                      docStatusFilter === st.id
                        ? 'bg-[#1D2414] text-[#C6F24E] ring-1 ring-[#35461F]'
                        : 'bg-black/35 text-white/60 border-white/10 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-white/50 tabular-nums">
                Hiển thị {paginatedDocs.length} / {filteredDocs.length} đề (Trang {docPage}/{totalDocPages})
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/[0.03] ring-1 ring-white/10 p-4 rounded-2xl">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => {
                    setDocSearch(e.target.value);
                    setDocPage(1);
                  }}
                  placeholder="Tìm tiêu đề, ID, trường, mô tả..."
                  className="w-full pl-9 pr-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#C6F24E]"
                />
              </div>
              <select
                value={docSubjectFilter}
                onChange={(e) => {
                  setDocSubjectFilter(e.target.value);
                  setDocPage(1);
                }}
                aria-label="Lọc theo môn học"
                className="px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
              >
                <option value="ALL" className="bg-[#14111F]">Tất cả môn học ({docs.length})</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#14111F]">
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={docLevelFilter}
                onChange={(e) => {
                  setDocLevelFilter(e.target.value);
                  setDocPage(1);
                }}
                aria-label="Lọc theo khối lớp"
                className="px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
              >
                <option value="ALL" className="bg-[#14111F]">Tất cả khối lớp</option>
                {['12', '11', '10', '9', '8', '7', '6'].map((g) => (
                  <option key={g} value={g} className="bg-[#14111F]">
                    Khối lớp {g}
                  </option>
                ))}
              </select>
              <select
                value={docTrackFilter}
                onChange={(e) => {
                  setDocTrackFilter(e.target.value);
                  setDocPage(1);
                }}
                aria-label="Lọc theo phân ban đề thi"
                className="px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
              >
                <option value="ALL" className="bg-[#14111F]">Mọi phân ban (Thường / HSG / Chuyên / Quốc tế)</option>
                {EXAM_TRACK_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#14111F]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Selection Action Bar */}
            <div className="p-3.5 rounded-2xl bg-[#110F18] ring-1 ring-[#262235] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-[#E2E2E2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filteredDocs.length > 0 &&
                      filteredDocs.every((d) => selectedDocIds.has(d.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
                      } else {
                        setSelectedDocIds(new Set());
                      }
                    }}
                    className="accent-[#C6F24E] w-4 h-4"
                  />
                  <span>
                    Chọn tất cả ({selectedDocIds.size}/{filteredDocs.length} đề đang chọn)
                  </span>
                </label>
              </div>

              {selectedDocIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    className="px-2.5 py-1.5 bg-black/60 ring-1 ring-white/15 rounded-lg text-xs text-white"
                  >
                    <option value="">-- Đổi môn học --</option>
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value} className="bg-[#14111F]">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bulkLevel}
                    onChange={(e) => setBulkLevel(e.target.value)}
                    className="px-2.5 py-1.5 bg-black/60 ring-1 ring-white/15 rounded-lg text-xs text-white"
                  >
                    <option value="">-- Đổi khối lớp --</option>
                    {GRADE_LEVEL_OPTIONS.map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-[#14111F]">
                        {lvl}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bulkTrack}
                    onChange={(e) => setBulkTrack(e.target.value)}
                    className="px-2.5 py-1.5 bg-black/60 ring-1 ring-white/15 rounded-lg text-xs text-white"
                  >
                    <option value="">-- Đổi phân ban --</option>
                    {EXAM_TRACK_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value} className="bg-[#14111F]">
                        {t.value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleBulkDocsAction('update')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Áp dụng ({selectedDocIds.size})
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleBulkDocsAction('delete')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa ({selectedDocIds.size})
                  </button>
                </div>
              )}
            </div>

            {/* Documents List (Paginated for 60fps DOM performance) */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {loadingDocs ? (
                <div className="py-12 text-center text-xs text-white/50">
                  Đang tải danh sách đề thi trong kho lưu trữ...
                </div>
              ) : paginatedDocs.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/45">
                  Không có đề thi nào khớp với bộ lọc hiện tại.
                </div>
              ) : (
                paginatedDocs.map((doc) => {
                  const checked = selectedDocIds.has(doc.id);
                  return (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-xl ring-1 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                        checked
                          ? 'bg-[#171B14] ring-1 ring-[#384A20]'
                          : 'bg-black/35 hover:bg-black/50 border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedDocIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(doc.id);
                              else next.delete(doc.id);
                              return next;
                            });
                          }}
                          className="mt-1 accent-[#C6F24E] w-4 h-4 shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] tabular-nums font-bold rounded bg-[#1A1826] text-[#C6F24E] ring-1 ring-[#2C2840]">
                              #{doc.id}
                            </span>
                            <span className="font-bold text-sm text-white">{doc.title}</span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">
                              {doc.subject}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
                              {doc.estimated_level}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#1B2214] text-[#C6F24E] ring-1 ring-[#2E3B1E]">
                              {doc.exam_track || 'Thường'}
                            </span>
                            {doc.is_duplicate_copy && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40">
                                Bản sao trùng lặp
                              </span>
                            )}
                            {doc.queue_status === 'pending_bot' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40">
                                Chờ đồng bộ Bot
                              </span>
                            )}
                          </div>
                          {doc.notes && (
                            <p className="text-xs text-emerald-300/90 line-clamp-2">{doc.notes}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/50">
                            <span>Tệp: {doc.file_name}</span>
                            <span>• {formatBytes(doc.file_size_bytes)}</span>
                            {doc.school_or_department && <span>• Trường/Sở: {doc.school_or_department}</span>}
                            {doc.academic_year && <span>• Năm học: {doc.academic_year}</span>}
                            <span>• Tác giả: {doc.author_name || 'Thành viên Orbit'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                        <a
                          href={`${getApiBaseUrl()}/api/documents/${doc.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-white/85 text-xs font-semibold flex items-center gap-1 transition"
                          title="Mở xem trực tiếp tệp PDF đề thi"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Xem PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => openEditDocModal(doc)}
                          className="px-3 py-1.5 rounded-xl bg-[#181624] hover:bg-[#221F32] text-[#E2E2E2] ring-1 ring-[#2C2840] text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Chỉnh sửa 100%
                        </button>
                        <button
                          type="button"
                          disabled={archivingId === doc.id}
                          onClick={() => handleArchiveDoc(doc)}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition"
                          title="Offload tệp lên Discord Cloud"
                        >
                          <Cloud className="w-3.5 h-3.5" />
                          {archivingId === doc.id ? 'Đang offload...' : 'Offload'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/30 transition"
                          title="Xóa vĩnh viễn đề thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Footer */}
            {totalDocPages > 1 && (
              <div className="flex items-center justify-between pt-3">
                <span className="text-xs text-white/55 tabular-nums">
                  Trang <strong className="text-white">{docPage}</strong> / {totalDocPages} • Tổng {filteredDocs.length} đề
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={docPage <= 1}
                    onClick={() => setDocPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-bold"
                  >
                    ← Trang trước
                  </button>
                  <button
                    type="button"
                    disabled={docPage >= totalDocPages}
                    onClick={() => setDocPage((p) => Math.min(totalDocPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-bold"
                  >
                    Trang sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 4: KÊNH DISCORD & BẢNG ĐIỀU KHIỂN TƯƠNG TÁC
           ===================================================================== */}
        {activeTab === 'channels' && (
          <div className="space-y-6 hh-swap-panel">
            {/* 1-Click Refresh Discord Interactive Panels */}
            <div className="p-5 rounded-xl bg-[#110F18] ring-1 ring-[#1E1B2B] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C6F24E]" />
                  Đồng bộ &amp; làm mới bảng điều khiển tương tác trên Discord
                </h3>
                <p className="text-xs text-[#B4B4B4] mt-1">
                  Cập nhật tức thì các bảng hướng dẫn và nút bấm tương tác tại kênh <code className="text-white">#info</code>, <code className="text-white">#nộp-tài-liệu</code> và <code className="text-white">#lấy-tài-liệu</code>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRefreshDiscordPanels('all')}
                  disabled={refreshingPanels}
                  className="h-9 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingPanels ? 'animate-spin' : ''}`} />
                  Làm mới tất cả Panel
                </button>
                <button
                  onClick={() => handleRefreshDiscordPanels('info')}
                  disabled={refreshingPanels}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold"
                >
                  #info
                </button>
                <button
                  onClick={() => handleRefreshDiscordPanels('intake')}
                  disabled={refreshingPanels}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold"
                >
                  #nộp-tài-liệu
                </button>
                <button
                  onClick={() => handleRefreshDiscordPanels('search')}
                  disabled={refreshingPanels}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold"
                >
                  #lấy-tài-liệu
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 Cols: Create Channel + Send Announcement */}
              <div className="lg:col-span-5 space-y-6">
                <form
                  onSubmit={handleCreateChannel}
                  className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-3.5"
                >
                  <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Tạo Kênh Text / Voice Mới
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewChannelKind('text')}
                      className={`py-2 rounded-xl text-xs font-bold ring-1 ${
                        newChannelKind === 'text'
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                          : 'bg-black/40 text-white/60 border-white/10'
                      }`}
                    >
                      # Kênh Văn Bản (Text)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChannelKind('voice')}
                      className={`py-2 rounded-xl text-xs font-bold ring-1 ${
                        newChannelKind === 'voice'
                          ? 'bg-[#1D2414] text-[#C6F24E] ring-1 ring-[#35461F]'
                          : 'bg-black/40 text-white/60 border-white/10'
                      }`}
                    >
                      Kênh Thoại (Voice)
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Tên kênh (VD: thảo-luận-toán)"
                    className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  />
                  <select
                    value={newChannelCategoryId}
                    onChange={(e) => setNewChannelCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  >
                    <option value="" className="bg-[#14111F]">-- Danh mục (Category) tự động --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[#14111F]">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {newChannelKind === 'text' ? (
                    <input
                      type="text"
                      value={newChannelTopic}
                      onChange={(e) => setNewChannelTopic(e.target.value)}
                      placeholder="Chủ đề kênh (Topic)..."
                      className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={newChannelLimit}
                      onChange={(e) => setNewChannelLimit(Number(e.target.value))}
                      placeholder="Giới hạn thành viên (0 = Không giới hạn)"
                      className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo Kênh Ngay
                  </button>
                </form>

                {/* Broadcast Embed Form */}
                <form
                  onSubmit={handleSendAnnouncement}
                  className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-3.5"
                >
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Phát Sóng Thông Báo / Embed Lên Discord
                  </h3>
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  >
                    <option value="" className="bg-[#14111F]">-- Chọn kênh nhận thông báo --</option>
                    {channels
                      .filter((c) => c.kind !== 'voice')
                      .map((c) => (
                        <option key={c.channel_id} value={c.channel_id} className="bg-[#14111F]">
                          {c.name} ({c.category})
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    placeholder="Tiêu đề thông báo..."
                    className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  />
                  <textarea
                    rows={4}
                    value={announceMsg}
                    onChange={(e) => setAnnounceMsg(e.target.value)}
                    placeholder="Nội dung thông báo (hỗ trợ Markdown Discord)..."
                    className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {['#C6F24E', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAnnounceColor(c)}
                          className={`w-6 h-6 rounded-full ring-1 ${
                            announceColor === c ? 'border-white scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Gửi Thông Báo
                    </button>
                  </div>
                </form>
              </div>

              {/* Right 7 Cols: Channel List with Lock/Open & Delete */}
              <div className="lg:col-span-7 bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#C6F24E]" />
                    Danh Sách Kênh Trong Máy Chủ ({filteredChannels.length}/{channels.length})
                  </h3>
                  <button
                    onClick={() => fetchChannels(selectedGuildId, true)}
                    disabled={loadingChannels}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1 self-start"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingChannels ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                </div>

                {/* Channel Search & Kind Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="Tìm tên kênh, danh mục hoặc chủ đề..."
                      className="w-full pl-8 pr-3 py-1.5 bg-black/45 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#C6F24E]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'ALL' as const, label: 'Tất cả' },
                      { id: 'PUBLIC' as const, label: 'Công khai' },
                      { id: 'PRIVATE' as const, label: 'Riêng tư' },
                      { id: 'TEXT' as const, label: '# Text' },
                      { id: 'VOICE' as const, label: 'Voice' },
                    ].map((cf) => (
                      <button
                        key={cf.id}
                        type="button"
                        onClick={() => setChannelKindFilter(cf.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ring-1 transition ${
                          channelKindFilter === cf.id
                            ? 'bg-[#1D2414] text-[#C6F24E] ring-1 ring-[#35461F]'
                            : 'bg-black/30 text-white/60 border-white/10 hover:text-white'
                        }`}
                      >
                        {cf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {filteredChannels.map((ch) => (
                    <div
                      key={ch.channel_id}
                      className="p-3 rounded-xl bg-black/35 hover:bg-black/50 ring-1 ring-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-white">{ch.name}</span>
                          <span className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/60">
                            {ch.category}
                          </span>
                          {ch.is_private ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/35">
                              Riêng tư (Staff)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                              Công khai
                            </span>
                          )}
                        </div>
                        {ch.topic && (
                          <div className="text-[11px] text-white/45 truncate mt-0.5">{ch.topic}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleChannelLock(ch)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ring-1 transition ${
                            ch.is_private
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/35 hover:bg-amber-500/30'
                          }`}
                        >
                          {ch.is_private ? (
                            <>
                              <LockOpen className="w-3.5 h-3.5" />
                              Mở khóa
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Khóa riêng tư
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/30 transition"
                          title="Xóa kênh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 5: HỆ THỐNG, GITHUB 1-CLICK UPDATE & CẤU HÌNH
           ===================================================================== */}
        {activeTab === 'config' && (
          <div className="space-y-6 hh-swap-panel">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GitHub Sync & Hot-Reload */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    Đồng Bộ GitHub &amp; Hot-Reload Hệ Thống
                  </h3>
                  <span className="px-2.5 py-0.5 text-[11px] tabular-nums rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                    Commit: {updateStatus?.current_hash || 'main'}
                  </span>
                </div>

                {updateStatus?.commit_msg && (
                  <div className="p-3 rounded-xl bg-black/40 ring-1 ring-white/10 text-xs text-white/80">
                    <div className="text-[11px] text-white/45 mb-0.5">Bản cập nhật hiện hành:</div>
                    <div className="font-semibold">{updateStatus.commit_msg}</div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleCheckUpdate}
                    disabled={checkingUpdate}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    Kiểm tra GitHub
                  </button>
                  <button
                    onClick={handleApplyUpdate}
                    disabled={applyingUpdate}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    {applyingUpdate ? 'Đang cập nhật...' : '1-Click Pull & Update'}
                  </button>
                  <button
                    onClick={handleHotReload}
                    disabled={reloadingBot}
                    className="px-3.5 py-2 rounded-xl bg-[#C6F24E] hover:bg-[#D4F773] text-[#0B0911] text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    {reloadingBot ? 'Đang Reload Cogs...' : 'Hot-Reload Toàn Bộ Cogs'}
                  </button>
                </div>
              </div>

              {/* API Gateway Switcher */}
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  Cấu Hình Cổng Kết Nối API Gateway
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="Để trống để dùng Vercel Cloud Bridge mặc định"
                    className="flex-1 px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs tabular-nums text-white"
                  />
                  <button
                    onClick={() => handleSaveApiEndpoint(customUrlInput)}
                    disabled={testingUrl}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveApiEndpoint(DEFAULT_TUNNEL_URL)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold"
                  >
                    Dùng Vercel Cloud Bridge (Mặc định)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveApiEndpoint(LOCAL_API_URL)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold"
                  >
                    Localhost (127.0.0.1:8080)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const stored = getStoredDiscordUser();
                      const res = await notifyBotViaWebhookHandshake({
                        event: 'manual_sync',
                        view: 'dashboard',
                        tab: 'admin',
                        username: stored?.global_name || stored?.username || 'Admin Orbit',
                        userId: stored?.id,
                        force: true,
                      });
                      if (res.ok) {
                        showFeedback(
                          'success',
                          'Đã gửi tín hiệu tới kênh Discord qua Webhook 1568882621470089247 — Bot đang đồng bộ 2 chiều!'
                        );
                        fetchConfig();
                      } else {
                        showFeedback('error', 'Không thể gửi tín hiệu Webhook, vui lòng kiểm tra mạng.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-pink-600/30 hover:bg-pink-600/50 ring-1 ring-pink-500/40 text-pink-200 text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    Ping Webhook &amp; Kết Nối Bot
                  </button>
                </div>
              </div>
            </div>

            {/* Runtime Info */}
            {configData && (
              <div className="bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#C6F24E]" />
                    Thông Số Vận Hành Bot &amp; Cogs Đang Hoạt Động
                  </h3>
                  <button
                    onClick={() => fetchConfig(true)}
                    disabled={loadingConfig}
                    className="text-xs text-[#C6F24E] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-black/40 ring-1 ring-white/10">
                    <div className="text-[11px] text-white/50">Bot User</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {String(configData.bot?.user || 'Orbit#6143')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 ring-1 ring-white/10">
                    <div className="text-[11px] text-white/50">Độ trễ Gateway</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5 tabular-nums">
                      {String(configData.bot?.ping_ms ?? 0)} ms
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 ring-1 ring-white/10">
                    <div className="text-[11px] text-white/50">Số Cogs Đã Nạp</div>
                    <div className="text-sm font-bold text-[#C6F24E] mt-0.5 tabular-nums">
                      {String(configData.runtime?.cogs_loaded ?? 0)} Cogs
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 ring-1 ring-white/10">
                    <div className="text-[11px] text-white/50">Dung lượng SQLite Local</div>
                    <div className="text-sm font-bold text-cyan-300 mt-0.5 tabular-nums">
                      {formatBytes(Number(configData.runtime?.db_size_bytes || 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 6: NHẬT KÝ KIỂM TOÁN DISCORD & CONSOLE LOGS
           ===================================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4 hh-swap-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLogSubView('console')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ring-1 ${
                    logSubView === 'console'
                      ? 'bg-[#1D2414] text-[#C6F24E] ring-1 ring-[#35461F]'
                      : 'bg-black/40 text-white/60 border-white/10'
                  }`}
                >
                  <ScrollText className="w-4 h-4" />
                  Bot Console Logs ({formatBytes(logSize)})
                </button>
                <button
                  onClick={() => setLogSubView('audit')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ring-1 ${
                    logSubView === 'audit'
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
                      : 'bg-black/40 text-white/60 border-white/10'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Nhật Ký Kiểm Toán Discord ({auditEntries.length})
                </button>
              </div>

              {logSubView === 'console' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Lọc từ khóa trong log..."
                    className="px-3 py-1.5 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  />
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value as 'ALL' | 'INFO' | 'WARNING' | 'ERROR')}
                    className="px-2.5 py-1.5 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  >
                    <option value="ALL" className="bg-[#14111F]">Mức: ALL</option>
                    <option value="INFO" className="bg-[#14111F]">INFO</option>
                    <option value="WARNING" className="bg-[#14111F]">WARNING</option>
                    <option value="ERROR" className="bg-[#14111F]">ERROR</option>
                  </select>
                  <select
                    value={logCount}
                    onChange={(e) => setLogCount(Number(e.target.value))}
                    className="px-2.5 py-1.5 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                  >
                    <option value={100} className="bg-[#14111F]">100 dòng</option>
                    <option value={200} className="bg-[#14111F]">200 dòng</option>
                    <option value={500} className="bg-[#14111F]">500 dòng</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-white/75 cursor-pointer px-2">
                    <input
                      type="checkbox"
                      checked={autoRefreshLogs}
                      onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                      className="accent-[#C6F24E]"
                    />
                    Tự làm mới
                  </label>
                  <button
                    onClick={fetchLogs}
                    disabled={loadingLogs}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                    Tải lại
                  </button>
                </div>
              ) : (
                <button
                  onClick={fetchAuditLogs}
                  disabled={loadingAudit}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  Làm mới Audit Log
                </button>
              )}
            </div>

            {logSubView === 'console' ? (
              <pre className="bg-[#08070C] ring-1 ring-[#1E1B2B] rounded-xl p-4 font-mono text-[11px] leading-relaxed max-h-[540px] overflow-y-auto space-y-1 whitespace-pre-wrap">
                {filteredLogLines.length === 0 ? (
                  <div className="py-12 text-center text-white/40">Không có dòng log nào.</div>
                ) : (
                  filteredLogLines.map((ln, idx) => {
                    const isErr = ln.includes('[ERROR');
                    const isWarn = ln.includes('[WARNING');
                    return (
                      <div
                        key={idx}
                        className={`break-all ${
                          isErr ? 'text-rose-400' : isWarn ? 'text-amber-300' : 'text-slate-300'
                        }`}
                      >
                        {ln}
                      </div>
                    );
                  })
                )}
              </pre>
            ) : (
              <div className="space-y-2 max-h-[540px] overflow-y-auto">
                {auditEntries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-white/45">
                    Chưa có bản ghi kiểm toán nào.
                  </div>
                ) : (
                  auditEntries.map((en) => (
                    <div
                      key={en.id}
                      className="p-3 rounded-xl bg-black/40 ring-1 ring-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-amber-300">{en.action}</span> • Thực hiện bởi{' '}
                        <span className="font-semibold text-white">{en.actor}</span> → Mục tiêu:{' '}
                        <span className="text-cyan-300">{en.target}</span>
                        {en.reason && <div className="text-white/55 mt-0.5">Lý do: {en.reason}</div>}
                      </div>
                      <span className="text-[11px] tabular-nums text-white/40 shrink-0">
                        {en.created_at ? new Date(en.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL 1: EDIT ROLE (100% OPTIONS) ================= */}
      {editingRole && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setEditingRole(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveRoleModal}
            className="w-full max-w-lg bg-[#141122] ring-1 ring-1 ring-[#2E2942] rounded-2xl p-6 space-y-4 hh-card-pop"
          >
            <div className="flex items-center justify-between pb-3 bg-[#141122]">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Chỉnh Sửa Toàn Diện Role: {editingRole.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingRole.is_default && (
              <>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Tên Role</label>
                  <input
                    type="text"
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Màu sắc ({editRoleColor})</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={editRoleColor}
                      onChange={(e) => setEditRoleColor(e.target.value)}
                      className="w-10 h-9 rounded-lg bg-transparent ring-1 ring-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editRoleColor}
                      onChange={(e) => setEditRoleColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs tabular-nums text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setEditRoleColor(hex)}
                        className="w-6 h-6 rounded-lg ring-1 ring-white/20"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 ring-1 ring-white/10 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRoleHoist}
                      onChange={(e) => setEditRoleHoist(e.target.checked)}
                      className="accent-[#C6F24E]"
                    />
                    <span>Hiển thị tách nhóm (Hoist)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 ring-1 ring-white/10 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRoleMentionable}
                      onChange={(e) => setEditRoleMentionable(e.target.checked)}
                      className="accent-[#C6F24E]"
                    />
                    <span>Cho phép @mention</span>
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-white/70 mb-1">
                Cập nhật bộ quyền hạn (Để trống nếu giữ nguyên quyền hiện tại)
              </label>
              <select
                value={editRolePermPreset}
                onChange={(e) => setEditRolePermPreset(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
              >
                <option value="" className="bg-[#14111F]">-- Giữ nguyên quyền hạn hiện tại --</option>
                {PERMISSION_PRESETS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#14111F]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Lưu Thay Đổi Role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 2: 100% MEMBER ROLE SELECTOR MATRIX ================= */}
      {selectedMemberForRoles && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedMemberForRoles(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#141122] ring-1 ring-amber-400/40 rounded-2xl p-6 space-y-4 hh-card-pop max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 bg-[#141122]">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedMemberForRoles.avatar_url ||
                    'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt={selectedMemberForRoles.display_name}
                  className="w-10 h-10 rounded-full ring-1 ring-amber-400/40"
                />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Phân Quyền &amp; Cấp Role: {selectedMemberForRoles.display_name}
                  </h3>
                  <p className="text-xs text-white/55">
                    Bấm vào bất kỳ Role nào bên dưới để cấp hoặc gỡ ngay lập tức (100% Quyền Lựa Chọn).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMemberForRoles(null);
                  setModalRoleSearch('');
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={modalRoleSearch}
                onChange={(e) => setModalRoleSearch(e.target.value)}
                placeholder="Tìm nhanh Role để cấp / gỡ..."
                className="w-full pl-9 pr-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
            </div>

            {(['staff', 'honor', 'grade', 'member', 'other'] as const).map((tierKey) => {
              const tierRoles = assignableRoles.filter(
                (r) =>
                  r.tier === tierKey &&
                  (!deferredModalRoleSearch.trim() ||
                    r.name.toLowerCase().includes(deferredModalRoleSearch.trim().toLowerCase()))
              );
              if (tierRoles.length === 0) return null;
              const memberRoleIds = new Set((selectedMemberForRoles.roles || []).map((r) => r.id));
              return (
                <div key={tierKey} className="space-y-2">
                  <div className="text-xs font-semibold text-[#B4B4B4]">
                    {TIER_META[tierKey]?.label || tierKey}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tierRoles.map((r) => {
                      const active = memberRoleIds.has(r.id);
                      const busy = togglingRoleId === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleMemberRole(selectedMemberForRoles, r.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold ring-1 flex items-center gap-2 transition ${
                            active
                              ? 'bg-emerald-500/20 text-white border-emerald-400'
                              : 'bg-black/45 text-white/65 border-white/15 hover:border-white/35 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: r.color }}
                          />
                          <span>{r.name}</span>
                          {active && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setSelectedMemberForRoles(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT DOCUMENT (100% FIELDS) ================= */}
      {editingDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setEditingDoc(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveDocEdit}
            className="w-full max-w-2xl bg-[#141122] ring-1 ring-1 ring-[#2E2942] rounded-2xl p-6 space-y-4 hh-card-pop max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 bg-[#141122]">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C6F24E]" />
                Chỉnh Sửa 100% Thông Tin Đề Thi #{editingDoc.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Tiêu đề đề thi</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Môn học</label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                >
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#14111F]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Khối lớp</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                >
                  {GRADE_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl} className="bg-[#14111F]">
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Phân ban / Cấp độ đề</label>
                <select
                  value={editTrack}
                  onChange={(e) => setEditTrack(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                >
                  {EXAM_TRACK_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#14111F]">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Năm học</label>
                <input
                  type="text"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="VD: 2025-2026"
                  className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Trường / Sở GD&amp;ĐT</label>
                <input
                  type="text"
                  value={editSchool}
                  onChange={(e) => setEditSchool(e.target.value)}
                  placeholder="VD: Sở GD&ĐT Hà Nội"
                  className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Tác giả đóng góp</label>
                <input
                  type="text"
                  value={editAuthorName}
                  onChange={(e) => setEditAuthorName(e.target.value)}
                  placeholder="Tên hiển thị tác giả"
                  className="w-full px-3 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">
                Mô tả đề thi (VD: Lớp 9 Chuyên Tin • Đề thi chọn HSG...)
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-black/50 ring-1 ring-white/15 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#C6F24E] hover:bg-[#D4F773] text-[#0B0911] text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Lưu Toàn Bộ Thông Tin
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
