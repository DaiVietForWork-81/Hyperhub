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
  ExternalLink,
  Clock,
  Layers,
  Search,
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
  ClientInspectionReport,
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const newItems: QueuedFile[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(ext)) {
        errors.push(`Tệp "${file.name}" không hợp lệ (chỉ hỗ trợ PDF, DOCX, DOC, TXT)`);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        errors.push(`Tệp "${file.name}" vượt quá 25MB`);
        return;
      }

      const alreadyInQueue = fileQueue.some(
        (q) => q.file.name === file.name && q.file.size === file.size
      );
      if (alreadyInQueue) return;

      const newItem: QueuedFile = {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
      };
      newItems.push(newItem);

      // Chạy tiền kiểm định trên Trình duyệt (Client-side Edge Inspector) để giảm tải CPU VPS
      inspectDocumentClient(file)
        .then(async (report) => {
          // Kiểm tra trùng lặp nhanh trên Turso Cloud (< 50ms)
          const dup = await checkHashExistsTurso(report.fileHash);
          setFileQueue((prev) =>
            prev.map((q) => {
              if (q.id === newItem.id) {
                if (dup.exists) {
                  return {
                    ...q,
                    clientReport: report,
                    status: 'duplicate',
                    errorMessage: `Tài liệu đã tồn tại trong kho (nộp bởi ${dup.existingDoc?.author_name || 'thành viên'} vào ${dup.existingDoc?.timestamp || 'trước đó'})`,
                  };
                }
                return { ...q, clientReport: report };
              }
              return q;
            })
          );
        })
        .catch((err) => {
          console.warn('[DocUploadZone] Lỗi client-side inspection:', err);
        });
    });

    if (errors.length > 0) {
      // Hiện tất cả tệp bị loại (kể cả khi vẫn còn tệp hợp lệ được giữ lại)
      setGeneralError(errors.join('. '));
      if (newItems.length === 0) return;
    }

    setFileQueue((prev) => [...prev, ...newItems]);
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
      let base64Content: string | undefined = undefined;
      if (file.size <= 5 * 1024 * 1024) {
        base64Content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }
      const saved = await saveDocumentToTurso(
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
          authorId: user?.id ? parseInt(user.id, 10) : 0,
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
      if (saved.duplicate) {
        throw {
          duplicate: true,
          message: saved.message || 'Tài liệu này đã tồn tại trong kho đề!',
          author: saved.existingAuthor,
          timestamp: saved.existingTimestamp,
          fileHash: clientReport.fileHash,
        };
      }
      return {
        success: true,
        doc_id: saved.docId || 0,
        file_name: file.name,
        file_size_bytes: file.size,
        subject: clientReport.detectedSubject,
        grade: clientReport.estimatedLevel,
        category: 'EXAM_PAPER',
        exam_type: clientReport.examType,
        confidence: 0.95,
        question_count: clientReport.questionCount,
        page_count: clientReport.pageCount,
        summary: clientReport.summary,
        academic_year: clientReport.academicYear,
        school_or_department: clientReport.schoolOrDepartment,
        moet_2025_compliant: clientReport.moet2025Compliant,
        moet_part1_count: clientReport.moetPart1Count,
        moet_part2_count: clientReport.moetPart2Count,
        moet_part3_count: clientReport.moetPart3Count,
        has_answer_keys: clientReport.hasAnswerKeys,
        has_detailed_solutions: clientReport.hasDetailedSolutions,
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
                authorId: user?.id ? parseInt(user.id, 10) : 0,
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
                  authorId: user?.id ? parseInt(user.id, 10) : 0,
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
        body: JSON.stringify({ url: cleanUrl }),
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
                  Kho Nộp Đề Trực Tuyến & Bot Thẩm Định AI
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Kiểm duyệt an toàn
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Tiếp nhận đề thi qua tệp trực tiếp hoặc liên kết Google Drive. Hệ thống tự động xác thực và phân loại tài liệu vào kho đề.
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
          {/* CƠ CHẾ THẨM ĐỊNH 3+1 QUORUM & CHỐNG TRÙNG LẶP */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-purple-500/20 backdrop-blur-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Scale className="w-4 h-4 text-purple-400" />
                <span>Quy trình Thẩm định 3+1 Quorum &amp; Chống Trùng Tuyệt Đối 2 Tầng</span>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>100% Heuristic • Tự Nhiên &amp; Minh Bạch • $0 API</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Lần 1: Vùng Tiêu Đề</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Phân tích không gian tiêu đề (0-1500 ký tự), bóc tách Quốc hiệu, Sở GD&amp;ĐT, Trường, Năm học và Môn.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Lần 2: BM25 Toàn Thân</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Khảo sát phân bố tần suất từ khóa chuyên sâu toàn tài liệu, loại trừ mẫu từ vựng hành chính và hợp đồng.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="font-bold text-pink-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Lần 3: Cấu Trúc &amp; Cú Pháp</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Quét cấu trúc câu hỏi, bảng đáp án, công thức hóa/toán &amp; 3 phần chuẩn Bộ GD&amp;ĐT form 2025.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-black">4</span>
                  <span>Lần 4: Trọng Tài 3+1</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Kích hoạt khi có bất đồng biểu quyết (2 vs 1) hoặc triệt tiêu đối soát tương phản (Tin vs Toán, Hóa vs Hành chính).
                </p>
              </div>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
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
              <div className={`w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-950/20 transition-transform duration-300 ${isDragging ? 'scale-110 -translate-y-1' : 'hover:scale-105'}`}>
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
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 transition-all duration-300"
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
                {fileQueue.map((item) => {
                  const res = item.result;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
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
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
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
                            <div className="font-bold text-xs sm:text-sm text-white truncate max-w-md">
                              {item.file.name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(item.file.size)}</span>
                              {item.status === 'pending' && (
                                <span className="text-slate-500">• Đang chờ nộp</span>
                              )}
                              {item.status === 'uploading' && (
                                <span className="text-purple-400 font-semibold">• Đang tiến hành thẩm định 3+1...</span>
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
                                  • Đã bảo lưu trên Turso Cloud (5GB) • Tự động đồng bộ Discord khi Bot online
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-rose-400 font-semibold">
                                  • {item.errorMessage}
                                </span>
                              )}
                            </div>

                            {/* HIỂN THỊ TIỀN KIỂM ĐỊNH TỪ TRÌNH DUYỆT (Client-side Edge Inspector) */}
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
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {item.status === 'success' && res && (
                            <>
                              {res.draft_dossier_markdown && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDossierModalContent({
                                      title: res.title || res.file_name,
                                      markdown: res.draft_dossier_markdown!,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Scale className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Dự Thảo 3+1</span>
                                </button>
                              )}

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

                      {/* KHỐI KẾT QUẢ THẨM ĐỊNH 3+1 QUORUM ARBITRATION */}
                      {item.status === 'success' && res?.quorum && (
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <Scale className="w-4 h-4 text-purple-400" />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                Hội Đồng Thẩm Định 3+1 (Quorum Arbitration)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                                  res.quorum.is_unanimous
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {res.quorum.is_unanimous ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>Đồng Thuận 3/3</span>
                                  </>
                                ) : (
                                  <>
                                    <Scale className="w-3 h-3 text-amber-400" />
                                    <span>Trọng Tài Đối Soát 3+1</span>
                                  </>
                                )}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                <span>{res.quorum.total_execution_time_ms || 0} ms</span>
                              </span>
                            </div>
                          </div>

                          {/* 4 Lần Quét Matrix */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {res.quorum.scans.map((scan) => (
                              <div
                                key={scan.pass_number}
                                className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                  scan.pass_number === 4
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-white/[0.03] border-white/5'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    {scan.pass_number === 1 && <FileText className="w-3 h-3 text-indigo-400" />}
                                    {scan.pass_number === 2 && <Search className="w-3 h-3 text-cyan-400" />}
                                    {scan.pass_number === 3 && <Layers className="w-3 h-3 text-pink-400" />}
                                    {scan.pass_number === 4 && <Scale className="w-3 h-3 text-amber-400" />}
                                    <span>Lần {scan.pass_number}</span>
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                    {Math.round(scan.confidence * 100)}%
                                  </span>
                                </div>
                                <div className="font-bold text-white text-[11px] truncate" title={scan.pass_name}>
                                  {scan.pass_name}
                                </div>
                                <div className="text-[11px] text-purple-300 font-semibold truncate">
                                  {scan.subject_vi} • {scan.grade_vi}
                                </div>
                                <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed" title={scan.rationale}>
                                  {scan.rationale}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Trigger nút mở Dự Thảo */}
                          {res.draft_dossier_markdown && (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-400 italic">
                                Biên bản thẩm định pháp quy được lập tự động từ kết quả biểu quyết
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDossierModalContent({
                                    title: res.title || res.file_name,
                                    markdown: res.draft_dossier_markdown!,
                                  })
                                }
                                className="text-purple-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>Xem toàn văn dự thảo</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CẢNH BÁO CHỐNG NỘP TRÙNG TUYỆT ĐỐI (DUPLICATE GUARD) */}
                      {item.status === 'duplicate' && item.duplicateInfo && (
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-300 font-bold">
                              <ShieldAlert className="w-4 h-4 text-amber-400" />
                              <span>Chống Nộp Trùng Tuyệt Đối (Duplicate Guard)</span>
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
                          {item.duplicateInfo.file_hash && (
                            <div className="flex items-center justify-between gap-2 bg-black/60 p-2 rounded-xl border border-white/10 font-mono text-[10px] text-slate-400">
                              <div className="truncate">
                                <span className="text-amber-400 font-bold">SHA-256: </span>
                                {item.duplicateInfo.file_hash}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.duplicateInfo!.file_hash!);
                                  showInfo('Đã sao chép mã băm SHA-256', 'Bảo Mật');
                                }}
                                className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Chép</span>
                              </button>
                            </div>
                          )}
                          {item.duplicateInfo.jump_url && (
                            <a
                              href={item.duplicateInfo.jump_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold pt-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Xem bài nộp gốc trên Discord</span>
                            </a>
                          )}
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
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {item.file_type || 'PDF'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white truncate max-w-lg">
                              {item.title || item.file_name}
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
                              <span>Dự Thảo 3+1</span>
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
                  ))}
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
                    <span>Biên Bản Giám Định Pháp Quy 3+1</span>
                    <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Hội Đồng Trọng Tài
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
                <span>100% Deterministic • Non-AI Intelligence</span>
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
