import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  Download,
  X,
  FileText,
  Check,
  Plus,
  Link2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RefreshCw,
  FileCheck,
  AlertCircle,
  Scale,
  Folder,
  School,
  GraduationCap,
  Globe,
  Copy,

  Clock,
  Layers,

} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken } from '../utils/discordAuth';
import { formatEstimatedLevel, formatFileSize } from '../utils/formatters';
import {
  OutboxItem,
  savePendingDoc,
  listPendingDocs,
  removePendingDoc,
  touchPendingDoc,
} from '../utils/outbox';
import { useToast } from '../context/ToastContext';
import {
  inspectDocumentClient,
  buildClientExamDescription,
  ClientInspectionReport,
  SUBJECT_SELECT_OPTIONS,
  GRADE_SELECT_OPTIONS,
  EXAM_TYPE_SELECT_OPTIONS,
} from '../utils/clientDocInspector';
import {
  checkHashExistsTurso,
  saveDocumentToTurso,
} from '../utils/tursoClient';

interface DocUploadZoneProps {
  apiBase: string;
  user: DiscordUser | null;
  /** true = bot online (thử gửi ngay). Không truyền = mặc định thử gửi, rớt mạng thì lưu kho đệm. */
  botOnline?: boolean;
  onOpenAuthModal: () => void;
  onPreviewDoc?: (doc: any) => void;
  onUploadSuccess?: () => void;
}

export interface QuorumScanStep {
  pass_number: number;
  pass_name: string;
  subject: string;
  subject_vi: string;
  grade: string;
  grade_vi: string;
  confidence: number;
  rationale: string;
  execution_time_ms: number;
  weight: number;
}

export interface QuorumArbitration {
  is_unanimous: boolean;
  consensus_subject: string;
  final_grade: string;
  total_execution_time_ms: number;
  arbitration_triggered: boolean;
  conflict_reason?: string;
  scans: QuorumScanStep[];
}

export interface DuplicateInfo {
  is_duplicate: boolean;
  author?: string;
  timestamp?: string;
  jump_url?: string;
  file_hash?: string;
  match_type?: string;
  duplicate_layer?: number;
}

export interface InspectionResult {
  id: number;
  title: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  detected_subject: string;
  estimated_level: string;
  exam_type: string;
  confidence_score: number;
  question_count: number;
  page_count: number;
  author_name?: string;
  author_id?: string;
  author_avatar?: string;
  short_label?: string;
  exam_description?: string;
  academic_year?: string;
  school_or_department?: string;
  summary: string;
  file_hash?: string;
  content_hash?: string;
  moet_2025_compliant?: boolean;
  moet_part1_count?: number;
  moet_part2_count?: number;
  moet_part3_count?: number;
  has_answer_keys?: boolean;
  has_detailed_solutions?: boolean;
  download_url: string;
  quorum?: QuorumArbitration;
  draft_dossier_markdown?: string;
  duplicate_info?: DuplicateInfo;
  security_verification?: {
    layer1_url_auth?: string;
    layer2_pre_probe?: string;
    layer3_sandbox_download?: string;
    layer4_antivirus_magic?: string;
    layer5_doc_inspector?: string;
  };
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'duplicate' | 'error' | 'queued';
  clientReport?: ClientInspectionReport;
  result?: InspectionResult;
  errorMessage?: string;
  duplicateInfo?: DuplicateInfo;
  userConfirmed?: boolean;
  isEditingMeta?: boolean;
}

interface GDriveBlockedDetail {
  layer: number;
  reason: string;
  detectedTitle?: string;
  detectedExt?: string;
}

export const DocUploadZone: React.FC<DocUploadZoneProps> = ({
  apiBase,
  user,
  botOnline = true,
  onOpenAuthModal,
  onPreviewDoc,
  onUploadSuccess,
}) => {
  // Tab chuyển đổi: Tải tệp trực tiếp HOẶC Nộp link Google Drive
  const [activeTab, setActiveTab] = useState<'file_upload' | 'gdrive_link'>('file_upload');
  const { showSuccess, showInfo, showError } = useToast();

  // --- TRẠNG THÁI TAB TẢI TỆP TRỰC TIẾP ---
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [generalError, setGeneralError] = useState<string>('');
  const [hasCompletedBatch, setHasCompletedBatch] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dossierModalContent, setDossierModalContent] = useState<{ title: string; markdown: string } | null>(null);
  const [copiedDossier, setCopiedDossier] = useState<boolean>(false);

  // --- KHO ĐỆM OFFLINE (bot offline → lưu tạm, online → tự gửi) ---
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const refreshOutbox = async () => {
    try {
      setOutboxItems(await listPendingDocs());
    } catch {
      // IndexedDB không khả dụng: bỏ qua kho đệm
    }
  };

  // --- TRẠNG THÁI TAB GOOGLE DRIVE 5 LỚP BẢO MẬT ---
  const [gdriveUrl, setGdriveUrl] = useState<string>('');
  const [isGDriveSubmitting, setIsGDriveSubmitting] = useState<boolean>(false);
  const [gdriveProcessingStep, setGdriveProcessingStep] = useState<number>(0);
  const [gdriveResults, setGdriveResults] = useState<any[]>([]);
  const [gdriveError, setGdriveError] = useState<string>('');
  const [gdriveBlockedInfo, setGdriveBlockedInfo] = useState<GDriveBlockedDetail | null>(null);

  // ----------------------------------------------------
  // LOGIC TAB 1: KÉO THẢ TỆP TRỰC TIẾP
  // ----------------------------------------------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!user) {
      onOpenAuthModal();
      setGeneralError('Vui lòng kết nối tài khoản Discord để nộp đề thi và ghi nhận credit người đóng góp vĩnh viễn!');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      onOpenAuthModal();
      setGeneralError('Vui lòng kết nối tài khoản Discord để nộp đề thi và ghi nhận credit người đóng góp vĩnh viễn!');
      if (e.target) e.target.value = '';
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const addFilesToQueue = (files: File[]) => {
    setGeneralError('');
    setHasCompletedBatch(false);

    if (!user) {
      onOpenAuthModal();
      setGeneralError('Vui lòng kết nối tài khoản Discord để nộp đề thi và ghi nhận credit người đóng góp vĩnh viễn!');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const newItems: QueuedFile[] = [];
    const errors: string[] = [];
    const seenInThisBatch = new Set<string>();

    files.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(ext)) {
        errors.push(`Tệp "${file.name}" không hợp lệ (chỉ hỗ trợ PDF, DOCX, DOC, TXT)`);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        errors.push(`Tệp "${file.name}" vượt quá giới hạn 25MB/tệp`);
        return;
      }

      const batchKey = `${file.name}::${file.size}`;
      const alreadyInQueue =
        seenInThisBatch.has(batchKey) ||
        fileQueue.some((q) => q.file.name === file.name && q.file.size === file.size);
      if (alreadyInQueue) return;
      seenInThisBatch.add(batchKey);

      const newItem: QueuedFile = {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
      };
      newItems.push(newItem);
    });

    if (errors.length > 0) {
      // Hiện tất cả tệp bị loại (kể cả khi vẫn còn tệp hợp lệ được giữ lại)
      setGeneralError(errors.join('. '));
      if (newItems.length === 0) return;
    }

    setFileQueue((prev) => [...prev, ...newItems]);

    // Chạy kiểm định theo luồng điều phối (tối đa 3 tệp đồng thời) để hỗ trợ gửi hàng chục tệp cùng lúc (miễn mỗi tệp <= 25MB) mà không làm đơ trình duyệt
    const CONCURRENCY = 3;
    let cursor = 0;
    const runWorker = async () => {
      while (cursor < newItems.length) {
        const currentIdx = cursor++;
        const currentItem = newItems[currentIdx];
        if (!currentItem) continue;
        try {
          const report = await inspectDocumentClient(currentItem.file);
          const dup = await checkHashExistsTurso(report.fileHash);
          setFileQueue((prev) =>
            prev.map((q) => {
              if (q.id === currentItem.id) {
                if (dup.exists) {
                  return {
                    ...q,
                    clientReport: report,
                    status: 'duplicate',
                    errorMessage: `Tài liệu đã tồn tại trong kho (nộp bởi ${dup.existingDoc?.author_name || 'thành viên'} vào ${dup.existingDoc?.timestamp || 'trước đó'})`,
                  };
                }
                return {
                  ...q,
                  clientReport: report,
                  userConfirmed: !report.needsUserReview,
                  isEditingMeta: Boolean(report.needsUserReview),
                };
              }
              return q;
            })
          );
        } catch (err) {
          console.warn('[DocUploadZone] Lỗi client-side inspection:', err);
        }
      }
    };
    for (let w = 0; w < Math.min(CONCURRENCY, newItems.length); w++) {
      void runWorker();
    }
  };

  const removeFileFromQueue = (id: string) => {
    if (isUploading) return;
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isUploading) return;
    setFileQueue([]);
    setHasCompletedBatch(false);
    setGeneralError('');
  };

  const toggleEditQueueItem = (id: string) => {
    if (isUploading) return;
    setFileQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isEditingMeta: !item.isEditingMeta } : item
      )
    );
  };

  const updateQueueItemReport = (
    id: string,
    patch: Partial<ClientInspectionReport>
  ) => {
    setFileQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id || !item.clientReport) return item;
        const nextReport: ClientInspectionReport = {
          ...item.clientReport,
          ...patch,
        };
        if (patch.detectedSubject) {
          const found = SUBJECT_SELECT_OPTIONS.find((s) => s.value === patch.detectedSubject);
          if (found) {
            nextReport.detectedSubjectVi = found.label;
            if (found.cap !== 'CHUNG') {
              nextReport.educationalLevel = found.cap;
              nextReport.educationalLevelVi =
                found.cap === 'CAP_2' ? 'Cấp 2 (THCS)' : 'Cấp 3 (THPT)';
            }
          }
        }
        if (patch.estimatedLevel) {
          if (/Khối [6-9]|Khối THCS/.test(patch.estimatedLevel)) {
            nextReport.educationalLevel = 'CAP_2';
            nextReport.educationalLevelVi = 'Cấp 2 (THCS)';
          } else if (/Khối 10|Khối 11|Khối 12/.test(patch.estimatedLevel)) {
            nextReport.educationalLevel = 'CAP_3';
            nextReport.educationalLevelVi = 'Cấp 3 (THPT)';
          }
        }
        if (patch.examType) {
          const foundType = EXAM_TYPE_SELECT_OPTIONS.find((t) => t.value === patch.examType);
          if (foundType) {
            nextReport.examTypeVi = foundType.label;
          }
        }
        const rebuilt = buildClientExamDescription({
          subject: nextReport.detectedSubject,
          subjectVi: nextReport.detectedSubjectVi,
          estimatedLevel: nextReport.estimatedLevel,
          examType: nextReport.examType,
          examTypeVi: nextReport.examTypeVi,
          fileName: nextReport.fileName,
          rawText: nextReport.rawTextSnippet,
          schoolOrDepartment: nextReport.schoolOrDepartment,
          academicYear: nextReport.academicYear,
          questionCount: nextReport.questionCount,
          moet2025Compliant: nextReport.moet2025Compliant,
          hasAnswerKeys: nextReport.hasAnswerKeys,
          hasDetailedSolutions: nextReport.hasDetailedSolutions,
        });
        nextReport.shortLabel = patch.shortLabel ?? rebuilt.shortLabel;
        nextReport.examDescription = patch.examDescription ?? rebuilt.examDescription;
        nextReport.summary = nextReport.examDescription;
        return {
          ...item,
          clientReport: nextReport,
        };
      })
    );
  };

  const confirmQueueItem = (id: string) => {
    setFileQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, userConfirmed: true, isEditingMeta: false }
          : item
      )
    );
    setGeneralError('');
  };

  const confirmAllPendingItems = () => {
    setFileQueue((prev) =>
      prev.map((item) =>
        item.status === 'pending'
          ? { ...item, userConfirmed: true, isEditingMeta: false }
          : item
      )
    );
    setGeneralError('');
  };

  // Tên hiển thị: thành viên Discord hoặc "Khách" (mở cho mọi người, không cần đăng nhập)
  const displayUploaderName = user?.global_name || user?.username || 'Khách';

  const uploadSingleFile = async (
    file: File,
    clientReport?: ClientInspectionReport
  ): Promise<InspectionResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploader_name', displayUploaderName);
    if (user?.id) {
      formData.append('uploader_id', user.id);
    }
    if (user?.avatar) {
      formData.append('uploader_avatar', user.avatar);
    }

    // Gửi kèm siêu dữ liệu đã kiểm định trước từ trình duyệt (Client Edge Inspector)
    if (clientReport) {
      formData.append('client_pre_parsed', 'true');
      formData.append('file_hash', clientReport.fileHash);
      formData.append('subject', clientReport.detectedSubject);
      formData.append('grade', clientReport.estimatedLevel);
      formData.append('exam_type', clientReport.examType);
      formData.append('moet_2025_compliant', clientReport.moet2025Compliant ? '1' : '0');
      formData.append('moet_part1_count', String(clientReport.moetPart1Count));
      formData.append('moet_part2_count', String(clientReport.moetPart2Count));
      formData.append('moet_part3_count', String(clientReport.moetPart3Count));
      formData.append('has_answer_keys', clientReport.hasAnswerKeys ? '1' : '0');
      formData.append('has_detailed_solutions', clientReport.hasDetailedSolutions ? '1' : '0');
      formData.append('question_count', String(clientReport.questionCount));
      formData.append('academic_year', clientReport.academicYear || '');
      formData.append('school_or_department', clientReport.schoolOrDepartment || '');
      formData.append('summary', clientReport.summary);
    }

    const uploadHeaders: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true',
    };
    const token = user?.accessToken || getDiscordAccessToken();
    if (token) {
      uploadHeaders['Authorization'] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });
    } catch (err: any) {
      // Mất mạng / bot offline giữa chừng → ném lỗi mạng để caller lưu kho đệm
      throw { network: true, message: err?.message || 'Không thể kết nối máy chủ.' };
    }

    const data = await res.json().catch(() => null);

    // Nếu chạy trên Vercel Serverless (trả về 202 queued vì multipart không đi qua RPC),
    // lưu trực tiếp tài liệu vào Turso Cloud (5GB) với đầy đủ siêu dữ liệu từ Client Edge Inspector
    if ((res.status === 202 || data?.queued) && clientReport) {
      if (clientReport.fileHash) {
        const dupCheck = await checkHashExistsTurso(clientReport.fileHash);
        if (dupCheck.exists) {
          throw {
            duplicate: true,
            message: `Tài liệu trùng lặp! Tệp '${dupCheck.existingDoc?.title || file.name}' đã được nộp trước đó.`,
            author: dupCheck.existingDoc?.author_name,
            timestamp: dupCheck.existingDoc?.timestamp,
            fileHash: clientReport.fileHash,
          };
        }
      }
      let base64Content: string | undefined = undefined;
      if (file.size <= 5 * 1024 * 1024) {
        base64Content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }
      const docId = await saveDocumentToTurso(
        {
          subject: clientReport.detectedSubject,
          title: file.name,
          fileName: file.name,
          fileSizeBytes: file.size,
          fileType: file.name.split('.').pop()?.toUpperCase() || 'PDF',
          estimatedLevel: clientReport.estimatedLevel,
          questionCount: clientReport.questionCount,
          pageCount: clientReport.pageCount,
          authorName: displayUploaderName,
          authorId: user?.id || '0',
          authorAvatar: user?.avatar,
          notes: clientReport.examDescription || clientReport.summary,
          fileHash: clientReport.fileHash,
          rawTextSnippet: clientReport.rawTextSnippet,
          academicYear: clientReport.academicYear,
          schoolOrDepartment: clientReport.schoolOrDepartment,
          moet2025Compliant: clientReport.moet2025Compliant,
          moetPart1Count: clientReport.moetPart1Count,
          moetPart2Count: clientReport.moetPart2Count,
          moetPart3Count: clientReport.moetPart3Count,
          hasAnswerKeys: clientReport.hasAnswerKeys,
          hasDetailedSolutions: clientReport.hasDetailedSolutions,
          fileContentBase64: base64Content,
        },
        'pending_bot'
      );
      return {
        id: docId || 0,
        title: file.name,
        file_name: file.name,
        file_size_bytes: file.size,
        file_type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
        detected_subject: clientReport.detectedSubject,
        estimated_level: clientReport.estimatedLevel,
        exam_type: clientReport.examType,
        confidence_score: 0.95,
        question_count: clientReport.questionCount,
        page_count: clientReport.pageCount,
        author_name: displayUploaderName,
        author_id: user?.id,
        author_avatar: user?.avatar,
        short_label: clientReport.shortLabel,
        exam_description: clientReport.examDescription,
        summary: clientReport.examDescription || clientReport.summary,
        academic_year: clientReport.academicYear,
        school_or_department: clientReport.schoolOrDepartment,
        file_hash: clientReport.fileHash,
        moet_2025_compliant: clientReport.moet2025Compliant,
        moet_part1_count: clientReport.moetPart1Count,
        moet_part2_count: clientReport.moetPart2Count,
        moet_part3_count: clientReport.moetPart3Count,
        has_answer_keys: clientReport.hasAnswerKeys,
        has_detailed_solutions: clientReport.hasDetailedSolutions,
        download_url: `/api/documents/${docId || 0}/download`,
      };
    }

    if (!res.ok || !data?.success) {
      if (data?.is_duplicate) {
        throw {
          duplicate: true,
          message: data.message || 'Tài liệu này đã tồn tại trong kho đề!',
          author: data.existing_author,
          timestamp: data.existing_timestamp || data.existing_time,
          jumpUrl: data.existing_jump_url,
          fileHash: data.file_hash,
          matchType: data.match_type,
          layer: data.duplicate_layer,
        };
      }
      throw { message: data?.error || data?.message || 'Lỗi khi kiểm định tệp.' };
    }
    return data as InspectionResult;
  };

  const queueToOutbox = async (file: File): Promise<void> => {
    await savePendingDoc(file, displayUploaderName);
    await refreshOutbox();
  };

  const markQueueItem = (
    index: number,
    patch: Partial<QueuedFile> & { status: QueuedFile['status'] }
  ) => {
    setFileQueue((prev) => prev.map((it, idx) => (idx === index ? { ...it, ...patch } : it)));
  };

  const handleBatchUpload = async () => {
    if (fileQueue.length === 0) return;

    const unconfirmedItems = fileQueue.filter(
      (it) =>
        it.status === 'pending' &&
        it.clientReport?.needsUserReview &&
        !it.userConfirmed
    );
    if (unconfirmedItems.length > 0) {
      setGeneralError(
        `Có ${unconfirmedItems.length} đề thi cần bạn kiểm tra và bấm "Xác nhận đúng thông tin" ở bên dưới để tránh nhầm lẫn phân loại trước khi nộp!`
      );
      return;
    }

    setIsUploading(true);
    setGeneralError('');
    setHasCompletedBatch(false);

    let hasSuccess = false;
    // Bot offline đã biết trước → lưu thẳng kho đệm Turso Cloud & outbox, khỏi thử từng tệp
    const offlineMode = !botOnline;

    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'success') continue;

      setCurrentProcessingIndex(i);

      if (offlineMode) {
        try {
          await queueToOutbox(item.file);

          // Bảo lưu thẳng lên Turso Cloud (5GB Storage) với queue_status = 'pending_bot'
          if (item.clientReport) {
            let base64Content: string | undefined = undefined;
            if (item.file.size <= 5 * 1024 * 1024) {
              base64Content = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string) || '');
                reader.onerror = () => resolve('');
                reader.readAsDataURL(item.file);
              });
            }
            await saveDocumentToTurso(
              {
                subject: item.clientReport.detectedSubject,
                title: item.file.name,
                fileName: item.file.name,
                fileSizeBytes: item.file.size,
                fileType: item.file.name.split('.').pop()?.toUpperCase() || 'PDF',
                estimatedLevel: item.clientReport.estimatedLevel,
                questionCount: item.clientReport.questionCount,
                pageCount: item.clientReport.pageCount,
                authorName: displayUploaderName,
                authorId: user?.id || '0',
                authorAvatar: user?.avatar,
                notes: item.clientReport.examDescription || item.clientReport.summary,
                fileHash: item.clientReport.fileHash,
                rawTextSnippet: item.clientReport.rawTextSnippet,
                academicYear: item.clientReport.academicYear,
                schoolOrDepartment: item.clientReport.schoolOrDepartment,
                moet2025Compliant: item.clientReport.moet2025Compliant,
                moetPart1Count: item.clientReport.moetPart1Count,
                moetPart2Count: item.clientReport.moetPart2Count,
                moetPart3Count: item.clientReport.moetPart3Count,
                hasAnswerKeys: item.clientReport.hasAnswerKeys,
                hasDetailedSolutions: item.clientReport.hasDetailedSolutions,
                fileContentBase64: base64Content,
              },
              'pending_bot'
            );
          }

          hasSuccess = true;
          markQueueItem(i, { status: 'queued' });
        } catch {
          markQueueItem(i, { status: 'error', errorMessage: 'Không thể lưu tạm lên Turso Cloud.' });
        }
        continue;
      }

      markQueueItem(i, { status: 'uploading' });

      try {
        const data = await uploadSingleFile(item.file, item.clientReport);
        hasSuccess = true;
        markQueueItem(i, { status: 'success', result: data });
      } catch (err: any) {
        if (err?.network) {
          // Rớt mạng giữa chừng → lưu Turso Cloud + kho đệm thay vì báo lỗi
          try {
            await queueToOutbox(item.file);
            if (item.clientReport) {
              let base64Content: string | undefined = undefined;
              if (item.file.size <= 5 * 1024 * 1024) {
                base64Content = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve((reader.result as string) || '');
                  reader.onerror = () => resolve('');
                  reader.readAsDataURL(item.file);
                });
              }
              await saveDocumentToTurso(
                {
                  subject: item.clientReport.detectedSubject,
                  title: item.file.name,
                  fileName: item.file.name,
                  fileSizeBytes: item.file.size,
                  fileType: item.file.name.split('.').pop()?.toUpperCase() || 'PDF',
                  estimatedLevel: item.clientReport.estimatedLevel,
                  questionCount: item.clientReport.questionCount,
                  pageCount: item.clientReport.pageCount,
                  authorName: displayUploaderName,
                  authorId: user?.id || '0',
                  authorAvatar: user?.avatar,
                  notes: item.clientReport.examDescription || item.clientReport.summary,
                  fileHash: item.clientReport.fileHash,
                  rawTextSnippet: item.clientReport.rawTextSnippet,
                  academicYear: item.clientReport.academicYear,
                  schoolOrDepartment: item.clientReport.schoolOrDepartment,
                  moet2025Compliant: item.clientReport.moet2025Compliant,
                  moetPart1Count: item.clientReport.moetPart1Count,
                  moetPart2Count: item.clientReport.moetPart2Count,
                  moetPart3Count: item.clientReport.moetPart3Count,
                  hasAnswerKeys: item.clientReport.hasAnswerKeys,
                  hasDetailedSolutions: item.clientReport.hasDetailedSolutions,
                  fileContentBase64: base64Content,
                },
                'pending_bot'
              );
            }
            hasSuccess = true;
            markQueueItem(i, { status: 'queued' });
          } catch {
            markQueueItem(i, { status: 'error', errorMessage: 'Không thể kết nối máy chủ.' });
          }
        } else if (err?.duplicate) {
          markQueueItem(i, {
            status: 'duplicate',
            errorMessage: err.message,
            duplicateInfo: {
              is_duplicate: true,
              author: err.author,
              timestamp: err.timestamp,
              jump_url: err.jumpUrl,
              file_hash: err.fileHash,
              match_type: err.matchType,
              duplicate_layer: err.layer,
            },
          });
        } else {
          markQueueItem(i, { status: 'error', errorMessage: err?.message || 'Lỗi khi kiểm định tệp.' });
        }
      }
    }

    setIsUploading(false);
    setCurrentProcessingIndex(-1);
    setHasCompletedBatch(true);

    if (hasSuccess) {
      showSuccess('Nộp đợt đề thi thành công! Đã cập nhật vào kho đề.', 'Nộp Đề');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    }
  };

  const mimeForExt = (ext: string): string => {
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.doc':
        return 'application/msword';
      case '.txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  };

  // Gửi lại toàn bộ kho đệm (thủ công hoặc tự động khi bot online)
  const flushOutbox = async () => {
    if (isFlushing || !botOnline) return;
    let pending: OutboxItem[];
    try {
      pending = await listPendingDocs();
    } catch {
      return;
    }
    if (pending.length === 0) return;

    setIsFlushing(true);
    let changed = false;
    for (const p of pending) {
      const file = p.blob instanceof File ? p.blob : new File([p.blob], p.name, { type: mimeForExt(p.ext) });
      try {
        await uploadSingleFile(file);
        await removePendingDoc(p.id);
        changed = true;
      } catch (err: any) {
        if (err?.network) break; // Vẫn offline → dừng, giữ nguyên kho đệm
        if (err?.duplicate) {
          await removePendingDoc(p.id);
          changed = true;
          continue;
        }
        await touchPendingDoc(p.id, {
          attempts: p.attempts + 1,
          lastError: err?.message || 'Lỗi khi kiểm định tệp.',
        }).catch(() => {});
      }
    }
    await refreshOutbox();
    setIsFlushing(false);
    if (changed) {
      showSuccess('Đã gửi thành công các tài liệu trong kho đệm ngoại tuyến!', 'Kho Đệm');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    }
  };

  useEffect(() => {
    refreshOutbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (botOnline) {
      flushOutbox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botOnline]);

  // ----------------------------------------------------
  // LOGIC TAB 2: GOOGLE DRIVE 5 LỚP BẢO MẬT
  // ----------------------------------------------------
  const handleGDriveSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanUrl = gdriveUrl.trim();
    if (!cleanUrl) {
      setGdriveError('Vui lòng dán liên kết Google Drive của đề thi.');
      return;
    }

    if (!user) {
      onOpenAuthModal();
      return;
    }

    setIsGDriveSubmitting(true);
    setGdriveError('');
    setGdriveBlockedInfo(null);
    setGdriveResults([]);
    setGdriveProcessingStep(1); // Lớp 1: Bắt đầu xác thực Link & Chống SSRF

    // Tạo hiệu ứng tiến trình từng lớp bảo mật
    const timerProbe = setTimeout(() => setGdriveProcessingStep(2), 700);
    const timerSandbox = setTimeout(() => setGdriveProcessingStep(3), 1600);
    const timerScan = setTimeout(() => setGdriveProcessingStep(4), 2700);

    try {
      const token = user?.accessToken || getDiscordAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/api/documents/import_gdrive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: cleanUrl,
          uploader_id: user?.id || '',
          uploader_name: user?.global_name || user?.username || '',
          uploader_avatar: user?.avatar || '',
        }),
      });

      clearTimeout(timerProbe);
      clearTimeout(timerSandbox);
      clearTimeout(timerScan);
      setGdriveProcessingStep(5); // Lớp 5: Hoàn tất phân tích DocInspector

      const data = await res.json();

      if (!res.ok || (!data.success && !data.new_imported)) {
        const rawResults = data.results || [];
        const blockedItem = rawResults.find((r: any) => r.blocked);
        const dupItem = rawResults.find((r: any) => r.is_duplicate);

        if (blockedItem) {
          setGdriveBlockedInfo({
            layer: blockedItem.security_layer || 2,
            reason: blockedItem.error || 'Tệp bị từ chối bởi hệ thống bảo mật đa tầng.',
            detectedTitle: blockedItem.detected_title,
            detectedExt: blockedItem.detected_ext,
          });
        } else if (dupItem) {
          setGdriveError(
            `Tài liệu này đã tồn tại trong kho đề: "${dupItem.existing_title || dupItem.file_name}" nộp bởi ${dupItem.author || 'thành viên khác'}.`
          );
        } else {
          setGdriveError(
            data.error || data.message || 'Không thể nhập tài liệu từ Google Drive.'
          );
        }
        setGdriveResults(rawResults);
      } else {
        setGdriveResults(data.results || []);
        showSuccess('Đã tiếp nhận và thẩm định thành công đề thi từ Google Drive!', 'Google Drive');
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: any) {
      clearTimeout(timerProbe);
      clearTimeout(timerSandbox);
      clearTimeout(timerScan);
      const errMsg = err.message || 'Không thể kết nối máy chủ để kiểm định Google Drive.';
      setGdriveError(errMsg);
      showError(errMsg, 'Google Drive');
    } finally {
      setIsGDriveSubmitting(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGdriveUrl(text.trim());
        setGdriveError('');
        setGdriveBlockedInfo(null);
        showInfo('Đã dán liên kết từ bộ nhớ tạm.', 'Google Drive');
      }
    } catch {
      // Bỏ qua nếu người dùng không cấp quyền clipboard
    }
  };

  const resetGDriveForm = () => {
    setGdriveUrl('');
    setGdriveResults([]);
    setGdriveError('');
    setGdriveBlockedInfo(null);
    setGdriveProcessingStep(0);
  };

  const successCount = fileQueue.filter((f) => f.status === 'success').length;
  const duplicateCount = fileQueue.filter((f) => f.status === 'duplicate').length;
  const errorCount = fileQueue.filter((f) => f.status === 'error').length;
  const pendingCount = fileQueue.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header Giới Thiệu Nộp Hàng Loạt & 5 Lớp Bảo Mật */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/95 via-blue-950/40 to-slate-950/95 border border-blue-500/20 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Đóng Góp Đề Thi & Tài Liệu Học Tập
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Kiểm duyệt an toàn
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Tải lên đề thi qua tệp trực tiếp (PDF, Word) hoặc liên kết Google Drive để chia sẻ cùng cộng đồng.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* THANH CHUYỂN TAB: TẢI TỆP TRỰC TIẾP | LINK GOOGLE DRIVE */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/10 w-fit backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setActiveTab('file_upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'file_upload'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30 scale-[1.02]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Folder className="w-4 h-4 text-purple-400" />
          <span>Tải Tệp Trực Tiếp (PDF/Word)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gdrive_link')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'gdrive_link'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-900/30 scale-[1.02]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Link2 className="w-4 h-4 text-cyan-400" />
          <span>Nộp Link Google Drive</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* NỘI DUNG TAB 1: KÉO THẢ TỆP CỤC BỘ                                        */}
      {/* ========================================================================= */}
      {activeTab === 'file_upload' && (
        <div className="space-y-6">


          {/* BANNER CREDIT NGƯỜI ĐÓNG GÓP HOẶC YÊU CẦU LIÊN KẾT DISCORD */}
          {user ? (
            <div className="hh-card-pop flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-blue-950/60 border border-purple-500/30 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={user.global_name || user.username}
                    className="hh-avatar-ring w-11 h-11 rounded-2xl border border-purple-400/60 object-cover shadow-md shadow-purple-950/50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center"
                    title="Đã liên kết tài khoản Discord"
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300/90">
                      Tác giả nộp đề:
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      {user.global_name || user.username}
                    </span>
                    <span className="text-xs font-mono text-purple-300">
                      @{user.username}
                    </span>
                    <span className="hh-badge-pop px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/40 text-[10px] font-bold uppercase tracking-wider">
                      ✍️ Tác giả
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tên &amp; Avatar Discord của bạn sẽ hiển thị trực tiếp trên từng đề thi đang nộp và lưu vĩnh viễn trong Kho Đề!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hh-author-pill flex items-center gap-2 bg-purple-950/50 border border-purple-500/35 px-3 py-1.5 rounded-2xl">
                  <img
                    src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={user.global_name || user.username}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-purple-400/50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                  <span className="text-xs font-bold text-purple-100">
                    {user.global_name || user.username}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Đang hiển thị
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-purple-950/50 border border-amber-500/30 backdrop-blur-xl shadow-lg">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">Yêu cầu liên kết Discord để nộp đề thi</h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                      Bắt buộc
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Chỉ cần kết nối tài khoản Discord để ghi nhận credit người đóng góp và vinh danh bạn trên kho đề (không yêu cầu xác minh email hay phân quyền).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40 shrink-0 cursor-pointer flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                <span>Kết Nối Discord Ngay</span>
              </button>
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (isUploading) return;
              if (!user) {
                onOpenAuthModal();
                setGeneralError('Vui lòng kết nối tài khoản Discord để nộp đề thi và ghi nhận credit người đóng góp vĩnh viễn!');
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
              isDragging
                ? 'ux-drop-active border-purple-400 bg-purple-500/15 scale-[1.02]'
                : 'border-white/10 hover:border-purple-500/40 bg-slate-950/60 hover:scale-[1.004]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className={`hh-float-icon w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-950/20 transition-transform duration-300 ${isDragging ? 'scale-110 -translate-y-1' : 'hover:scale-105'}`}>
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {fileQueue.length > 0
                    ? `Đã chọn ${fileQueue.length} tệp đề thi (Nhấn để thêm tiếp)`
                    : 'Kéo & Thả một hoặc nhiều tệp đề thi vào đây'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Hoặc nhấn vào đây để duyệt và chọn nhiều tệp từ máy tính của bạn
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Định dạng: PDF, DOCX, DOC
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  Không giới hạn số tệp (mỗi tệp ≤ 25MB)
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Tự động chống trùng lặp
                </span>
              </div>
            </div>
          </div>

          {generalError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {fileQueue.length > 0 && (
            <div className="rounded-3xl bg-black/40 border border-white/10 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Danh Sách Tệp Đang Nộp ({fileQueue.length} tệp)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {!isUploading &&
                    !hasCompletedBatch &&
                    fileQueue.some((f) => f.status === 'pending' && !f.userConfirmed) && (
                      <button
                        type="button"
                        onClick={confirmAllPendingItems}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác nhận tất cả</span>
                      </button>
                    )}

                  {!isUploading && !hasCompletedBatch && (
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  )}

                  {!hasCompletedBatch && (
                    <button
                      type="button"
                      onClick={handleBatchUpload}
                      disabled={isUploading || pendingCount === 0}
                      className="ux-btn-liquid px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang Xử Lý ({currentProcessingIndex + 1}/{fileQueue.length})...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Nộp Toàn Bộ {fileQueue.length} Đề Thi</span>
                        </>
                      )}
                    </button>
                  )}

                  {hasCompletedBatch && (
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-white flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nộp thêm đợt đề khác</span>
                    </button>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                    <span>
                      Đang quét và kiểm định: {fileQueue[currentProcessingIndex]?.file.name}
                    </span>
                    <span>
                      {Math.round(((currentProcessingIndex + 1) / fileQueue.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="hh-shimmer-bar h-full transition-all duration-300"
                      style={{
                        width: `${((currentProcessingIndex + 1) / fileQueue.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {hasCompletedBatch && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/40 to-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Hoàn tất đợt nộp đề:</span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>{successCount} thành công</span>
                    </span>
                    {duplicateCount > 0 && (
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>{duplicateCount} trùng lặp đã chặn</span>
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errorCount} lỗi</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {fileQueue.map((item, idx) => {
                  const res = item.result;
                  const cardAuthorName = res?.author_name || user?.global_name || user?.username || 'Khách';
                  const cardAuthorAvatar =
                    res?.author_avatar ||
                    user?.avatar ||
                    'https://cdn.discordapp.com/embed/avatars/0.png';
                  const cardAuthorHandle = user?.username ? `@${user.username}` : '';
                  return (
                    <div
                      key={item.id}
                      style={{ '--stagger-idx': idx } as React.CSSProperties}
                      className={`hh-card-pop p-4 rounded-2xl border transition-all duration-200 ${
                        item.status === 'uploading'
                          ? 'bg-purple-950/30 border-purple-500/50 shadow-md'
                          : item.status === 'success'
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : item.status === 'duplicate'
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : item.status === 'queued'
                          ? 'bg-sky-950/20 border-sky-500/40'
                          : item.status === 'error'
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-white/[0.02] border-white/5 hover:border-purple-500/30 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              item.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'uploading'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : item.status === 'duplicate'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : item.status === 'queued'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : item.status === 'error'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {item.status === 'uploading' ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : item.status === 'success' ? (
                              <Check className="w-5 h-5" />
                            ) : item.status === 'duplicate' ? (
                              <ShieldAlert className="w-5 h-5 text-amber-400" />
                            ) : item.status === 'queued' ? (
                              <RefreshCw className="w-5 h-5" />
                            ) : (
                              item.file.name.split('.').pop()
                            )}
                          </div>

                          <div className="overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold text-xs sm:text-sm text-white truncate max-w-md">
                                {item.file.name}
                              </div>
                              {/* HUY HIỆU TÁC GIẢ (DISCORD USER + AVATAR) HIỂN THỊ TRỰC TIẾP LÚC NỘP ĐỀ */}
                              <span
                                className="hh-author-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/35 text-[11px] text-purple-100 shrink-0"
                                title={`Tác giả đóng góp: ${cardAuthorName} ${cardAuthorHandle}`}
                              >
                                <img
                                  src={cardAuthorAvatar}
                                  alt={cardAuthorName}
                                  className="hh-avatar-ring w-4 h-4 rounded-full object-cover ring-1 ring-purple-400/60 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://cdn.discordapp.com/embed/avatars/0.png';
                                  }}
                                />
                                <span className="font-bold text-white truncate max-w-[130px]">
                                  {cardAuthorName}
                                </span>
                                {cardAuthorHandle && (
                                  <span className="text-[10px] font-mono text-purple-300 hidden sm:inline">
                                    {cardAuthorHandle}
                                  </span>
                                )}
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-200 border border-purple-400/30">
                                  ✍️ Tác giả
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(item.file.size)}</span>
                              {item.status === 'pending' && (
                                <span className="text-slate-500">• Đang chờ nộp</span>
                              )}
                              {item.status === 'uploading' && (
                                <span className="text-purple-400 font-semibold">• Đang tải lên kho đề...</span>
                              )}
                              {item.status === 'success' && res && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-emerald-400 font-semibold">
                                    • Môn: {res.detected_subject} | {formatEstimatedLevel(res.estimated_level)} | {res.page_count} trang
                                  </span>
                                  {(res.moet_2025_compliant || (res.moet_part1_count && res.moet_part1_count > 0)) && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                      <span>Chuẩn 2025</span>
                                    </span>
                                  )}
                                  {res.has_answer_keys && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      <span>Có đáp án</span>
                                    </span>
                                  )}
                                  {res.has_detailed_solutions && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                      <FileCheck className="w-3 h-3 text-purple-400" />
                                      <span>Lời giải chi tiết</span>
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.status === 'duplicate' && (
                                <span className="text-amber-400 font-semibold">
                                  • {item.errorMessage}
                                </span>
                              )}
                              {item.status === 'queued' && (
                                <span className="text-sky-400 font-semibold">
                                  • Đã lưu vào kho đề thi Orbit
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-rose-400 font-semibold">
                                  • {item.errorMessage}
                                </span>
                              )}
                            </div>

                            {/* HIỂN THỊ TÓM TẮT PHÂN LOẠI ĐỀ */}
                            {item.clientReport && item.status !== 'success' && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                    item.clientReport.educationalLevel === 'CAP_2'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : item.clientReport.educationalLevel === 'CAP_3'
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                      : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                                  }`}
                                >
                                  {item.clientReport.educationalLevel === 'CAP_2' ? (
                                    <School className="w-3 h-3" />
                                  ) : item.clientReport.educationalLevel === 'CAP_3' ? (
                                    <GraduationCap className="w-3 h-3" />
                                  ) : (
                                    <Globe className="w-3 h-3" />
                                  )}
                                  <span>{item.clientReport.educationalLevelVi}</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                  <FileText className="w-2.5 h-2.5 text-purple-400" />
                                  <span>{item.clientReport.detectedSubjectVi} • {item.clientReport.estimatedLevel}</span>
                                </span>
                                {item.clientReport.examTypeVi && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 flex items-center gap-1">
                                    <span>{item.clientReport.examTypeVi}</span>
                                  </span>
                                )}
                                {item.clientReport.moet2025Compliant && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-cyan-400" />
                                    <span>Chuẩn 2025 (P1: {item.clientReport.moetPart1Count}, P2: {item.clientReport.moetPart2Count}, P3: {item.clientReport.moetPart3Count})</span>
                                  </span>
                                )}
                                {item.clientReport.academicYear && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400 bg-white/5 border border-white/10 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{item.clientReport.academicYear}</span>
                                  </span>
                                )}
                                {item.clientReport.schoolOrDepartment && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-300 bg-white/5 border border-white/10 truncate max-w-[200px] flex items-center gap-1">
                                    <School className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{item.clientReport.schoolOrDepartment}</span>
                                  </span>
                                )}
                                {item.status === 'pending' && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                      item.userConfirmed
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    }`}
                                  >
                                    {item.userConfirmed ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>Đã kiểm tra 4 bước</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                                        <span>Cần xác nhận phân loại</span>
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* MÔ TẢ ĐỀ THI NGẮN GỌN */}
                            {item.clientReport?.examDescription && (
                              <div className="mt-1.5 text-[11px] text-slate-300 leading-relaxed bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5">
                                <span className="font-bold text-purple-300">Mô tả đề: </span>
                                <span>{item.clientReport.examDescription}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {item.status === 'success' && res && (
                            <>


                              {onPreviewDoc && (
                                <button
                                  type="button"
                                  onClick={() => onPreviewDoc(res)}
                                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem Nhanh</span>
                                </button>
                              )}

                              <a
                                href={`${apiBase}${res.download_url}${
                                  res.download_url.includes('?') ? '&' : '?'
                                }ngrok-skip-browser-warning=true`}
                                download={res.file_name}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải Về</span>
                              </a>
                            </>
                          )}

                          {!isUploading && item.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => removeFileFromQueue(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Bỏ tệp này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>



                      {/* QUY TRÌNH KIỂM TRA ĐỀ THI 4 BƯỚC (TRÁNH HIỂU LẦM PHÂN LOẠI) */}
                      {item.clientReport && item.status === 'pending' && (
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-950/75 border border-white/10 space-y-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold text-slate-200">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Kiểm Tra Đề Thi Đa Bước (Tránh Nhầm Lẫn Môn Học • Khối Lớp • Loại Đề)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleEditQueueItem(item.id)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/15 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                              >
                                {item.isEditingMeta ? 'Ẩn chỉnh sửa' : 'Chỉnh sửa phân loại'}
                              </button>
                              {!item.userConfirmed && (
                                <button
                                  type="button"
                                  onClick={() => confirmQueueItem(item.id)}
                                  className="px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Xác nhận đúng thông tin</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 4 BƯỚC ĐỐI CHIẾU CHI TIẾT */}
                          {item.clientReport.verificationSteps && item.clientReport.verificationSteps.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.clientReport.verificationSteps.map((st) => (
                                <div
                                  key={st.stepNumber}
                                  className={`p-2.5 rounded-xl border ${
                                    st.status === 'warning'
                                      ? 'bg-amber-950/30 border-amber-500/35 text-amber-200'
                                      : 'bg-white/[0.02] border-white/10 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                    {st.status === 'warning' ? (
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                    <span>{st.title}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                    {st.detail}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* CẢNH BÁO ĐIỂM DỄ GÂY HIỂU LẦM NẾU CÓ */}
                          {item.clientReport.ambiguityWarnings && item.clientReport.ambiguityWarnings.length > 0 && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                              <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Lưu ý cần kiểm tra để tránh hiểu lầm:</span>
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-1">
                                {item.clientReport.ambiguityWarnings.map((warn, wIdx) => (
                                  <li key={wIdx}>{warn}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* BẢNG CHỈNH SỬA & XÁC NHẬN TRỰC TIẾP THÔNG TIN ĐỀ */}
                          {item.isEditingMeta && (
                            <div className="p-3 rounded-xl bg-black/50 border border-purple-500/30 space-y-3">
                              <div className="text-[11px] font-bold text-purple-300">
                                Kiểm tra &amp; điều chỉnh thông tin đề thi (nếu cần):
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Môn học
                                  </label>
                                  <select
                                    value={item.clientReport.detectedSubject}
                                    onChange={(e) =>
                                      updateQueueItemReport(item.id, { detectedSubject: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                                  >
                                    {SUBJECT_SELECT_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Khối lớp
                                  </label>
                                  <select
                                    value={item.clientReport.estimatedLevel}
                                    onChange={(e) =>
                                      updateQueueItemReport(item.id, { estimatedLevel: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                                  >
                                    {GRADE_SELECT_OPTIONS.map((g) => (
                                      <option key={g} value={g}>
                                        {g}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Loại đề thi / Tài liệu
                                  </label>
                                  <select
                                    value={item.clientReport.examType}
                                    onChange={(e) =>
                                      updateQueueItemReport(item.id, { examType: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                                  >
                                    {EXAM_TYPE_SELECT_OPTIONS.map((t) => (
                                      <option key={t.value} value={t.value}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Trường / Sở GD&amp;ĐT (Tùy chọn)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.clientReport.schoolOrDepartment || ''}
                                    onChange={(e) =>
                                      updateQueueItemReport(item.id, {
                                        schoolOrDepartment: e.target.value || undefined,
                                      })
                                    }
                                    placeholder="Ví dụ: THPT Chuyên Phan Bội Châu / Sở GD&ĐT Hà Nội"
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Năm học (Tùy chọn)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.clientReport.academicYear || ''}
                                    onChange={(e) =>
                                      updateQueueItemReport(item.id, {
                                        academicYear: e.target.value || undefined,
                                      })
                                    }
                                    placeholder="Ví dụ: 2025-2026"
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => confirmQueueItem(item.id)}
                                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Lưu &amp; Xác nhận thông tin đề này</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CẢNH BÁO TÀI LIỆU TRÙNG LẶP */}
                      {item.status === 'duplicate' && item.duplicateInfo && (
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-300 font-bold">
                              <ShieldAlert className="w-4 h-4 text-amber-400" />
                              <span>Cảnh Báo Trùng Lặp Tài Liệu</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 uppercase">
                              {item.duplicateInfo.match_type || 'Trùng Lặp'}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">
                            Tài liệu này đã được lưu trữ trong kho đề trước đó bởi{' '}
                            <strong>{item.duplicateInfo.author || 'thành viên khác'}</strong> vào lúc{' '}
                            <em>{item.duplicateInfo.timestamp || 'trước đây'}</em>.
                          </p>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* KHO ĐỆM OFFLINE: đề lưu tạm khi bot offline, tự gửi khi online */}
          {outboxItems.length > 0 && (
            <div className="rounded-3xl bg-sky-950/20 border border-sky-500/30 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 text-sky-400 ${isFlushing ? 'animate-spin' : ''}`} />
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Kho Lưu Tạm ({outboxItems.length} đề đang chờ bot online)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={flushOutbox}
                  disabled={isFlushing || !botOnline}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isFlushing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>{botOnline ? 'Gửi Ngay Tất Cả' : 'Chờ Bot Online (sẽ tự gửi)'}</span>
                </button>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {outboxItems.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs sm:text-sm text-white truncate max-w-md">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatFileSize(p.size)} • {p.uploaderName}
                        {p.attempts > 0 && (
                          <span className="text-amber-400"> • Thử lại {p.attempts} lần</span>
                        )}
                        {p.lastError && <span className="text-rose-400"> • {p.lastError}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await removePendingDoc(p.id);
                        await refreshOutbox();
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                      title="Xóa khỏi kho tạm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* NỘI DUNG TAB 2: NỘP LINK GOOGLE DRIVE (KIỂM ĐỊNH 5 LỚP BẢO MẬT)           */}
      {/* ========================================================================= */}
      {activeTab === 'gdrive_link' && (
        <div className="space-y-6">
          {/* BANNER CREDIT NGƯỜI ĐÓNG GÓP HOẶC YÊU CẦU LIÊN KẾT DISCORD */}
          {user ? (
            <div className="hh-card-pop flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-teal-950/60 border border-emerald-500/30 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={user.global_name || user.username}
                    className="hh-avatar-ring w-11 h-11 rounded-2xl border border-emerald-400/60 object-cover shadow-md shadow-emerald-950/50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center"
                    title="Đã liên kết tài khoản Discord"
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">
                      Tác giả nộp đề:
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      {user.global_name || user.username}
                    </span>
                    <span className="text-xs font-mono text-emerald-300">
                      @{user.username}
                    </span>
                    <span className="hh-badge-pop px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                      ✍️ Tác giả
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Đề nhập từ Google Drive sẽ được gắn tên &amp; Avatar Discord của bạn vĩnh viễn trên Kho Đề!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hh-author-pill flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/35 px-3 py-1.5 rounded-2xl">
                  <img
                    src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={user.global_name || user.username}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-400/50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                  <span className="text-xs font-bold text-emerald-100">
                    {user.global_name || user.username}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Đang hiển thị
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-emerald-950/50 border border-amber-500/30 backdrop-blur-xl shadow-lg">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">Yêu cầu liên kết Discord để nạp Google Drive</h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                      Bắt buộc
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Hệ thống cần tài khoản Discord của bạn để ghi nhận quyền đóng góp đề thi. Không yêu cầu xác minh email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-900/40 shrink-0 cursor-pointer flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                <span>Kết Nối Discord Ngay</span>
              </button>
            </div>
          )}

          {/* Ô Nhập Link Google Drive */}
          <div className="rounded-3xl bg-slate-950/70 border border-emerald-500/20 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <form onSubmit={handleGDriveSubmit} className="space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  Đường dẫn Google Drive (Tệp Đơn hoặc Thư Mục Đề Thi)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={gdriveUrl}
                    onChange={(e) => {
                      setGdriveUrl(e.target.value);
                      if (gdriveError) setGdriveError('');
                      if (gdriveBlockedInfo) setGdriveBlockedInfo(null);
                    }}
                    placeholder="https://drive.google.com/file/d/... hoặc https://drive.google.com/drive/folders/..."
                    disabled={isGDriveSubmitting}
                    className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/60 border border-white/10 hover:border-emerald-500/40 focus:border-emerald-400 focus:outline-none text-white text-xs sm:text-sm pr-24 placeholder:text-slate-500 transition-all font-mono"
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    {gdriveUrl ? (
                      <button
                        type="button"
                        onClick={() => setGdriveUrl('')}
                        disabled={isGDriveSubmitting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Xóa link"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        disabled={isGDriveSubmitting}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                        title="Dán từ bộ nhớ tạm"
                      >
                        Dán
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Đảm bảo quyền chia sẻ tệp là: <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong>.
                </p>
              </div>

              {/* Hàng nút bấm */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hệ thống kiểm duyệt và tiếp nhận tài liệu tự động</span>
                </div>

                <div className="flex items-center gap-2">
                  {gdriveResults.length > 0 && (
                    <button
                      type="button"
                      onClick={resetGDriveForm}
                      disabled={isGDriveSubmitting}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Nhập link khác</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isGDriveSubmitting || !gdriveUrl.trim()}
                    className="px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGDriveSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang Kiểm Tra...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Xác Minh &amp; Tiếp Nhận Đề</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* QUY TRÌNH KIỂM DUYỆT TÀI LIỆU AN TOÀN */}
          <div className="rounded-3xl bg-black/40 border border-white/10 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Quy Trình Kiểm Duyệt &amp; Tiếp Nhận Tài Liệu
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                {isGDriveSubmitting ? `Tiến trình: Giai đoạn ${gdriveProcessingStep}/5` : 'Tiêu chuẩn bảo mật cao'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Bước 1 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 1
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 1</span>
                  {gdriveProcessingStep >= 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Xác Thực Liên Kết</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Kiểm tra tính an toàn và tính hợp lệ của đường liên kết.
                </div>
              </div>

              {/* Bước 2 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 2
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 2</span>
                  {gdriveProcessingStep >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Xác Minh Định Dạng</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Kiểm tra định dạng tài liệu học tập được hỗ trợ.
                </div>
              </div>

              {/* Bước 3 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 3
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 3</span>
                  {gdriveProcessingStep >= 3 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Tiếp Nhận An Toàn</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Quy trình tiếp nhận độc lập và kiểm soát dung lượng.
                </div>
              </div>

              {/* Bước 4 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 4
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 4</span>
                  {gdriveProcessingStep >= 4 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Kiểm Tra Tiêu Chuẩn</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Xác thực tính toàn vẹn và tiêu chuẩn an toàn của tệp.
                </div>
              </div>

              {/* Bước 5 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 5
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 5</span>
                  {gdriveProcessingStep >= 5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Phân Loại &amp; Lưu Trữ</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Nhận dạng môn học, khối lớp và lưu trữ vào kho đề.
                </div>
              </div>
            </div>
          </div>

          {/* CẢNH BÁO TỆP KHÔNG THỂ TIẾP NHẬN */}
          {gdriveBlockedInfo && (
            <div className="p-5 sm:p-6 rounded-3xl bg-rose-950/40 border border-rose-500/50 backdrop-blur-xl space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-rose-200">
                      TÀI LIỆU KHÔNG THỂ TIẾP NHẬN
                    </h4>
                  </div>

                  <p className="text-xs sm:text-sm text-rose-300 mt-1 font-medium">
                    Tài liệu hoặc liên kết bạn cung cấp không đáp ứng tiêu chuẩn an toàn của hệ thống. Vui lòng kiểm tra lại liên kết hoặc tệp của bạn.
                  </p>

                  <div className="text-[11px] text-slate-400 mt-2">
                    🛡️ Hệ thống tự động từ chối các tệp không đáp ứng tiêu chuẩn an toàn nhằm bảo vệ môi trường học tập.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THÔNG BÁO LỖI HOẶC TRÙNG LẶP */}
          {gdriveError && !gdriveBlockedInfo && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{gdriveError}</span>
            </div>
          )}

          {/* DANH SÁCH KẾT QUẢ ĐÃ THẨM ĐỊNH THÀNH CÔNG */}
          {gdriveResults.length > 0 && gdriveResults.some((r) => r.success) && (
            <div className="rounded-3xl bg-black/40 border border-emerald-500/30 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Tài Liệu Đã Được Tiếp Nhận Thành Công ({gdriveResults.filter((r) => r.success).length} tệp)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Đã lưu vào Kho Đề
                </span>
              </div>

              <div className="space-y-3">
                {gdriveResults
                  .filter((r) => r.success)
                  .map((item, idx) => {
                    const gdAuthorName = item.author_name || user?.global_name || user?.username || 'Khách';
                    const gdAuthorAvatar =
                      item.author_avatar ||
                      user?.avatar ||
                      'https://cdn.discordapp.com/embed/avatars/0.png';
                    const gdAuthorHandle = user?.username ? `@${user.username}` : '';
                    return (
                    <div
                      key={item.id}
                      style={{ '--stagger-idx': idx } as React.CSSProperties}
                      className="hh-card-pop p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {item.file_type || 'PDF'}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold text-sm text-white truncate max-w-lg">
                                {item.title || item.file_name}
                              </div>
                              <span
                                className="hh-author-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/35 text-[11px] text-purple-100 shrink-0"
                                title={`Tác giả đóng góp: ${gdAuthorName} ${gdAuthorHandle}`}
                              >
                                <img
                                  src={gdAuthorAvatar}
                                  alt={gdAuthorName}
                                  className="hh-avatar-ring w-4 h-4 rounded-full object-cover ring-1 ring-purple-400/60 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://cdn.discordapp.com/embed/avatars/0.png';
                                  }}
                                />
                                <span className="font-bold text-white truncate max-w-[130px]">
                                  {gdAuthorName}
                                </span>
                                {gdAuthorHandle && (
                                  <span className="text-[10px] font-mono text-purple-300 hidden sm:inline">
                                    {gdAuthorHandle}
                                  </span>
                                )}
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-200 border border-purple-400/30">
                                  ✍️ Tác giả
                                </span>
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                                Môn: {item.detected_subject}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                {formatEstimatedLevel(item.estimated_level)}
                              </span>
                              {item.page_count && (
                                <span className="text-slate-400">
                                  {item.page_count} trang
                                </span>
                              )}
                              {item.question_count > 0 && (
                                <span className="text-slate-400">
                                  • {item.question_count} câu hỏi
                                </span>
                              )}
                              {item.academic_year && (
                                <span className="text-emerald-400 font-semibold">
                                  • Năm học: {item.academic_year}
                                </span>
                              )}
                              {item.school && (
                                <span className="text-cyan-400 font-semibold">
                                  • Nguồn: {item.school}
                                </span>
                              )}
                              {(item.moet_2025_compliant || (item.moet_part1_count && item.moet_part1_count > 0)) && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                  <span>Chuẩn 2025</span>
                                </span>
                              )}
                              {item.has_answer_keys && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Có đáp án</span>
                                </span>
                              )}
                              {item.has_detailed_solutions && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                  <FileCheck className="w-3 h-3 text-purple-400" />
                                  <span>Lời giải chi tiết</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {item.draft_dossier_markdown && (
                            <button
                              type="button"
                              onClick={() =>
                                setDossierModalContent({
                                  title: item.title || item.file_name,
                                  markdown: item.draft_dossier_markdown,
                                })
                              }
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Chi Tiết Đề</span>
                            </button>
                          )}

                          {onPreviewDoc && (
                            <button
                              type="button"
                              onClick={() => onPreviewDoc(item)}
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem Nhanh</span>
                            </button>
                          )}

                          {item.download_url && (
                            <a
                              href={`${apiBase}${item.download_url}${
                                item.download_url.includes('?') ? '&' : '?'
                              }ngrok-skip-browser-warning=true`}
                              download={item.file_name}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tải Về</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Trạng Thái Xác Minh An Toàn */}
                      {item.security_verification && (
                        <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-slate-300 space-y-1">
                          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Đã Xác Minh An Toàn</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tài liệu đã vượt qua quy trình kiểm duyệt tiêu chuẩn và được cập nhật vào kho học tập.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL XEM DỰ THẢO THẨM ĐỊNH ĐỀ THI 3+1 */}
      {dossierModalContent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dossier-modal-title"
          className="fixed inset-0 z-[9995] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDossierModalContent(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-slate-950/95 border border-purple-500/30 shadow-2xl shadow-purple-950/50 backdrop-blur-2xl flex flex-col text-white animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="dossier-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Bản Tóm Tắt Thông Tin Đề Thi</span>
                    <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Đã Kiểm Duyệt
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-md font-mono mt-0.5">
                    {dossierModalContent.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDossierModalContent(null)}
                aria-label="Đóng biên bản"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable Markdown Preview */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed bg-black/40 space-y-4 whitespace-pre-wrap select-text">
              {dossierModalContent.markdown}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Orbit | Vietnam • Kho Học Liệu Mở</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(dossierModalContent.markdown);
                    setCopiedDossier(true);
                    showSuccess('Đã sao chép toàn bộ dự thảo vào bộ nhớ tạm!', 'Dự Thảo Thẩm Định');
                    setTimeout(() => setCopiedDossier(false), 2000);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedDossier ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedDossier ? 'Đã sao chép' : 'Sao chép biên bản'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDossierModalContent(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocUploadZone;
