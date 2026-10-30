import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Star,
  Copy,
  Check,
  Calendar,
  School,
  FileText,
  Hash,
  Layers,
  Scale,
  CheckCircle2,
  Info,
  BookOpen,
  PenTool,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Sparkles,
  Clock,
  Award,
} from 'lucide-react';
import { ExamDocument, getEducationLevelBadgeInfo } from './Dashboard';
import { getGradeBadgeStyle, getExamTrackInfo, formatFileSize } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import {
  fetchDocContentFromTurso,
  ParsedExamQuestion,
  parseQuestionsFromRawTextClient,
} from '../utils/tursoClient';
import { API_FETCH_HEADERS } from '../utils/apiConfig';

export type DossierModalTab = 'overview' | 'pdf_reader' | 'practice_room' | 'quorum_dossier';

interface ExamDossierModalProps {
  doc: ExamDocument | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (docId: number) => void;
  apiBase: string;
  botOnline?: boolean;
  initialTab?: DossierModalTab;
  onCompleteExam?: (docId: number, minutesSpent: number, summaryText?: string) => void;
}

export const ExamDossierModal: React.FC<ExamDossierModalProps> = ({
  doc,
  isOpen,
  onClose,
  isBookmarked,
  onToggleBookmark,
  apiBase,
  botOnline = false,
  initialTab = 'overview',
  onCompleteExam,
}) => {
  const { showSuccess, showInfo } = useToast();
  const [modalTab, setModalTab] = useState<DossierModalTab>(initialTab);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State cho Trình Đọc Đề PDF & Văn Bản Thông Minh (Phase 2)
  const [readerMode, setReaderMode] = useState<'pdf_frame' | 'smart_text'>('pdf_frame');
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [textFontSize, setTextFontSize] = useState<number>(15);
  const [searchInExam, setSearchInExam] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [rawExamText, setRawExamText] = useState<string>('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedExamQuestion[]>([]);
  const [detectedAnswerKeys, setDetectedAnswerKeys] = useState<Record<string, string>>({});
  const [base64PdfUrl, setBase64PdfUrl] = useState<string | null>(null);

  // State cho Phòng Thi Thực Chiến Split-Screen (Phiếu trả lời chuẩn 2025 + Đồng hồ)
  const [examDurationMin, setExamDurationMin] = useState<number>(45);
  const [examSecondsLeft, setExamSecondsLeft] = useState<number>(45 * 60);
  const [examTimerRunning, setExamTimerRunning] = useState<boolean>(false);
  const [part1Count, setPart1Count] = useState<number>(12);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean | null>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examScoreSummary, setExamScoreSummary] = useState<string>('');

  // Đồng bộ initialTab khi mở modal
  useEffect(() => {
    if (isOpen && doc) {
      setModalTab(initialTab);
      const defaultP1 =
        doc.moet_part1_count && doc.moet_part1_count > 0
          ? doc.moet_part1_count
          : doc.question_count && doc.question_count > 0 && doc.question_count <= 50
          ? doc.question_count
          : 12;
      setPart1Count(defaultP1);
      setExamSubmitted(false);
      setExamScoreSummary('');

      // Khôi phục bài làm nháp từ localStorage nếu có
      try {
        const savedDraft = localStorage.getItem(`orbit_exam_draft_${doc.id}`);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.mcq) setMcqAnswers(parsed.mcq);
          else setMcqAnswers({});
          if (parsed.tf) setTfAnswers(parsed.tf);
          else setTfAnswers({});
          if (parsed.short) setShortAnswers(parsed.short);
          else setShortAnswers({});
        } else {
          setMcqAnswers({});
          setTfAnswers({});
          setShortAnswers({});
        }
      } catch {
        setMcqAnswers({});
        setTfAnswers({});
        setShortAnswers({});
      }
    }
  }, [isOpen, doc, initialTab]);

  // Tự động lưu nháp phiếu trả lời
  useEffect(() => {
    if (!doc) return;
    try {
      if (
        Object.keys(mcqAnswers).length > 0 ||
        Object.keys(tfAnswers).length > 0 ||
        Object.keys(shortAnswers).length > 0
      ) {
        localStorage.setItem(
          `orbit_exam_draft_${doc.id}`,
          JSON.stringify({ mcq: mcqAnswers, tf: tfAnswers, short: shortAnswers })
        );
      }
    } catch {
      /* ignore */
    }
  }, [doc, mcqAnswers, tfAnswers, shortAnswers]);

  // Đồng hồ đếm ngược phòng thi
  useEffect(() => {
    if (!examTimerRunning) return;
    const t = window.setInterval(() => {
      setExamSecondsLeft((prev) => {
        if (prev <= 1) {
          setExamTimerRunning(false);
          showInfo('Đã hết thời gian làm bài! Hãy kiểm tra và nộp phiếu trả lời nhé.', 'Phòng Thi Orbit');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [examTimerRunning, showInfo]);

  // Nạp nội dung đề thi & câu hỏi bóc tách khi mở tab đọc đề hoặc phòng thi
  useEffect(() => {
    if (!isOpen || !doc) return;
    let cancelled = false;

    const loadDocContent = async () => {
      setIsLoadingContent(true);
      setBase64PdfUrl(null);
      try {
        // 1. Thử lấy từ Bot API (/api/documents/{id}/content) nếu Bot online
        if (botOnline) {
          const res = await fetch(`${apiBase}/api/documents/${doc.id}/content`, {
            headers: API_FETCH_HEADERS,
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data.success) {
              setRawExamText(data.raw_text || data.notes || '');
              setParsedQuestions(data.questions || []);
              setDetectedAnswerKeys(data.answer_keys || {});
              if (data.questions && data.questions.length > 0 && !doc.moet_part1_count) {
                setPart1Count(Math.min(50, Math.max(12, data.questions.length)));
              }
              setIsLoadingContent(false);
              return;
            }
          }
        }

        // 2. Fallback: Lấy trực tiếp từ Turso Cloud Database
        const tursoContent = await fetchDocContentFromTurso(doc.id);
        if (!cancelled && tursoContent) {
          setRawExamText(tursoContent.raw_text || tursoContent.notes || doc.notes || '');
          setParsedQuestions(tursoContent.questions || []);
          setDetectedAnswerKeys(tursoContent.answer_keys || {});
          if (tursoContent.file_content_base64 && (doc.file_type || 'PDF').toUpperCase() === 'PDF') {
            setBase64PdfUrl(`data:application/pdf;base64,${tursoContent.file_content_base64}`);
          }
        } else if (!cancelled) {
          const fallbackParsed = parseQuestionsFromRawTextClient(doc.notes || '');
          setRawExamText(doc.notes || '');
          setParsedQuestions(fallbackParsed.questions);
          setDetectedAnswerKeys(fallbackParsed.answer_keys);
        }
      } catch {
        if (!cancelled) {
          const fallbackParsed = parseQuestionsFromRawTextClient(doc.notes || '');
          setRawExamText(doc.notes || '');
          setParsedQuestions(fallbackParsed.questions);
          setDetectedAnswerKeys(fallbackParsed.answer_keys);
        }
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };

    loadDocContent();
    return () => {
      cancelled = true;
    };
  }, [isOpen, doc, botOnline, apiBase]);

  const isServerlessOrBotActive =
    botOnline ||
    apiBase === '' ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:');

  // Mặc định chế độ đọc: Nếu là PDF và có Cổng Vercel Serverless / Bot / Base64 PDF thì ưu tiên xem khung PDF gốc
  useEffect(() => {
    if (!doc) return;
    const isPdfFile =
      (doc.file_type || '').toUpperCase().includes('PDF') ||
      (doc.file_name || '').toLowerCase().endsWith('.pdf');
    if (isPdfFile && (isServerlessOrBotActive || base64PdfUrl)) {
      setReaderMode('pdf_frame');
    } else {
      setReaderMode('smart_text');
    }
  }, [doc, isServerlessOrBotActive, base64PdfUrl]);

  useEffect(() => {
    if (!isOpen || !doc) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      window.__lenis?.start();
    };
  }, [isOpen, doc, onClose]);

  const filteredQuestions = useMemo(() => {
    if (!searchInExam.trim()) return parsedQuestions;
    const kw = searchInExam.trim().toLowerCase();
    return parsedQuestions.filter(
      (q) =>
        q.label.toLowerCase().includes(kw) ||
        q.stem.toLowerCase().includes(kw) ||
        q.options.some((o) => o.text.toLowerCase().includes(kw))
    );
  }, [parsedQuestions, searchInExam]);

  if (!isOpen || !doc) return null;

  const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
  const trackInfo = getExamTrackInfo(doc);
  const fallbackJump =
    doc.download_url || (doc.jump_url && !doc.jump_url.includes('#vault') ? doc.jump_url : '');
  const downloadUrl = isServerlessOrBotActive
    ? `${apiBase}/api/documents/${doc.id}/download`
    : fallbackJump || '#quorum_dossier';

  // URL nhúng Inline PDF qua Vercel Serverless Edge Proxy hoặc Bot (Content-Disposition: inline)
  const inlinePdfUrl = base64PdfUrl
    ? base64PdfUrl
    : isServerlessOrBotActive
    ? `${apiBase}/api/documents/${doc.id}/view#toolbar=1&navpanes=0&zoom=${pdfZoom}`
    : '';

  const handleCopyHash = () => {
    if (doc.file_hash) {
      navigator.clipboard.writeText(doc.file_hash);
      setCopiedHash(true);
      showInfo('Đã sao chép mã băm SHA-256 vào bộ nhớ tạm.', 'Bảo Mật');
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/hub#exam-${doc.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    showSuccess('Đã sao chép liên kết đề thi vào bộ nhớ tạm!', 'Chia Sẻ');
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmitPracticeExam = () => {
    setExamTimerRunning(false);
    const answeredPart1 = Object.keys(mcqAnswers).length;
    const answeredPart2 = Object.values(tfAnswers).filter((v) => v !== null && v !== undefined).length;
    const answeredPart3 = Object.values(shortAnswers).filter((v) => v && v.trim().length > 0).length;
    const totalAnswered = answeredPart1 + answeredPart2 + answeredPart3;

    // Kiểm tra tự động nếu đề có bảng đáp án
    const keyCount = Object.keys(detectedAnswerKeys).length;
    let correctMcq = 0;
    let gradedMcq = 0;
    if (keyCount > 0) {
      for (let i = 1; i <= part1Count; i++) {
        const expected = detectedAnswerKeys[String(i)];
        const userAns = mcqAnswers[i];
        if (expected) {
          gradedMcq++;
          if (userAns && userAns.toUpperCase() === expected.toUpperCase()) {
            correctMcq++;
          }
        }
      }
    }

    const elapsedMinutes = Math.max(
      1,
      Math.round((examDurationMin * 60 - examSecondsLeft) / 60) || 15
    );

    const summary =
      gradedMcq > 0
        ? `Đúng ${correctMcq}/${gradedMcq} câu có đáp án • Đã điền ${totalAnswered} mục (${elapsedMinutes} phút)`
        : `Đã hoàn thành ${totalAnswered} mục trả lời trong ${elapsedMinutes} phút`;

    setExamSubmitted(true);
    setExamScoreSummary(summary);
    onCompleteExam?.(doc.id, elapsedMinutes, summary);
  };

  const confidencePercent =
    doc.confidence != null ? Math.round(Number(doc.confidence) * 100) : 95;

  const isUnanimousQuorum = doc.quorum_status?.includes('UNANIMOUS') ?? true;
  const isWideModal = modalTab === 'pdf_reader' || modalTab === 'practice_room' || isFullscreen;

  // Render Khung đọc PDF hoặc Văn bản thông minh (tái sử dụng cho cả Tab Đọc Đề và Tab Phòng Thi Split-Screen)
  const renderDocumentReaderPane = (compact = false) => (
    <div className="flex flex-col h-full space-y-3">
      {/* Thanh điều khiển chế độ đọc */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#0B0813] border border-white/10">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setReaderMode('pdf_frame')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              readerMode === 'pdf_frame'
                ? 'bg-[#FF3CA6] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bản Gốc PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setReaderMode('smart_text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              readerMode === 'smart_text'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              Đọc Thông Minh {parsedQuestions.length > 0 ? `(${parsedQuestions.length} câu)` : ''}
            </span>
          </button>
        </div>

        {/* Công cụ Zoom / Cỡ chữ / Tìm kiếm */}
        <div className="flex items-center gap-1.5">
          {readerMode === 'pdf_frame' ? (
            <>
              <button
                type="button"
                onClick={() => setPdfZoom((z) => Math.max(60, z - 20))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                title="Thu nhỏ PDF"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 px-1.5">{pdfZoom}%</span>
              <button
                type="button"
                onClick={() => setPdfZoom((z) => Math.min(200, z + 20))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                title="Phóng to PDF"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInExam}
                  onChange={(e) => setSearchInExam(e.target.value)}
                  placeholder="Tìm câu hỏi / từ khóa..."
                  className="h-7 pl-7 pr-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400 w-36 sm:w-44"
                />
              </div>
              <button
                type="button"
                onClick={() => setTextFontSize((s) => Math.max(12, s - 1))}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setTextFontSize((s) => Math.min(22, s + 1))}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
            title={isFullscreen ? 'Thu gọn khung đọc' : 'Mở rộng toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Nội dung chính của trình đọc */}
      {readerMode === 'pdf_frame' ? (
        inlinePdfUrl ? (
          <div
            className={`w-full rounded-2xl overflow-hidden border border-white/15 bg-[#090610] relative ${
              isFullscreen ? 'h-[74vh]' : compact ? 'h-[62vh]' : 'h-[65vh]'
            }`}
          >
            <iframe
              key={inlinePdfUrl}
              src={inlinePdfUrl}
              title={`Đọc đề PDF: ${doc.title || doc.file_name}`}
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#0B0813] border border-white/10 text-center space-y-3">
            <FileText className="w-8 h-8 text-purple-400 mx-auto" />
            <div className="text-sm font-bold text-white">
              {(doc.file_type || '').toUpperCase().includes('DOC')
                ? 'Tài liệu định dạng Word (.DOCX) — Hãy đọc qua Chế Độ Đọc Thông Minh hoặc tải tệp gốc'
                : 'Bot Discord hiện đang nghỉ nên trình duyệt chuyển sang Chế Độ Đọc Thông Minh trên Cloud'}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReaderMode('smart_text')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
              >
                📖 Chuyển Sang Đọc Văn Bản &amp; Câu Hỏi
              </button>
              {downloadUrl.startsWith('http') && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
                >
                  🔗 Mở Tệp Gốc Trên Discord
                </a>
              )}
            </div>
          </div>
        )
      ) : (
        <div
          className={`w-full rounded-2xl border border-white/15 bg-[#0B0813] p-4 sm:p-5 overflow-y-auto space-y-4 ${
            isFullscreen ? 'max-h-[74vh]' : compact ? 'max-h-[62vh]' : 'max-h-[65vh]'
          }`}
          style={{ fontSize: `${textFontSize}px` }}
        >
          {isLoadingContent ? (
            <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
              Đang bóc tách nội dung đề thi và câu hỏi từ kho lưu trữ...
            </div>
          ) : filteredQuestions.length > 0 ? (
            <div className="space-y-3">
              {/* Thanh nhảy nhanh tới câu hỏi */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
                <span className="text-[11px] font-mono text-slate-400 shrink-0 mr-1">Nhảy câu:</span>
                {filteredQuestions.slice(0, 40).map((q) => {
                  const hasSelected = Boolean(mcqAnswers[q.number]);
                  return (
                    <a
                      key={q.number}
                      href={`#reader-q-${q.number}`}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 border transition-colors ${
                        hasSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:border-purple-400'
                      }`}
                    >
                      {q.number}
                    </a>
                  );
                })}
              </div>

              {filteredQuestions.map((q) => {
                const selectedOpt = mcqAnswers[q.number];
                return (
                  <div
                    key={q.number}
                    id={`reader-q-${q.number}`}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/35 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black">
                        {q.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {q.type === 'mcq'
                          ? 'Trắc nghiệm 4 phương án'
                          : q.type === 'true_false'
                          ? 'Đúng / Sai (a, b, c, d)'
                          : 'Tự luận / Trả lời ngắn'}
                      </span>
                    </div>

                    <div className="text-slate-100 leading-relaxed whitespace-pre-wrap">{q.stem}</div>

                    {q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isChosen = selectedOpt === opt.key;
                          const isCorrectKey =
                            examSubmitted &&
                            q.answer_key &&
                            q.answer_key.toUpperCase() === opt.key.toUpperCase();
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() =>
                                setMcqAnswers((prev) => ({
                                  ...prev,
                                  [q.number]: prev[q.number] === opt.key ? '' : opt.key,
                                }))
                              }
                              className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                                isCorrectKey
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : isChosen
                                  ? 'bg-[#FF3CA6]/20 border-[#FF3CA6] text-white'
                                  : 'bg-black/40 border-white/10 text-slate-200 hover:bg-white/5'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                                  isChosen
                                    ? 'bg-[#FF3CA6] text-white'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                {opt.key}
                              </span>
                              <span className="text-sm leading-snug">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.statements.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {q.statements.map((st) => (
                          <div
                            key={st.key}
                            className="p-2 rounded-xl bg-black/40 border border-white/10 text-sm text-slate-200"
                          >
                            <strong className="text-emerald-300 font-mono mr-1.5">{st.key})</strong>
                            <span>{st.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Toàn văn bản gốc bên dưới */}
              {rawExamText && (
                <details className="pt-2">
                  <summary className="text-xs font-bold text-purple-300 cursor-pointer hover:underline">
                    📄 Xem toàn bộ văn bản thô của đề thi ({rawExamText.length.toLocaleString()} ký tự)
                  </summary>
                  <pre className="mt-2 p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {rawExamText}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Nội dung văn bản &amp; hồ sơ trích xuất
              </div>
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {rawExamText ||
                  doc.notes ||
                  `Đề thi: ${doc.title || doc.file_name}\nMôn học: ${doc.subject}\nKhối lớp: ${doc.estimated_level}\nQuy mô: ${doc.page_count || 1} trang • ${doc.question_count || 0} câu hỏi.\n\n(Nhấn sang tab "Bản Gốc PDF" hoặc "Tải Về Trực Tiếp" để xem đầy đủ biểu đồ và công thức toán học).`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-lenis-prevent
        className={`relative w-full ${
          isFullscreen
            ? 'max-w-[98vw] max-h-[96vh]'
            : isWideModal
            ? 'max-w-7xl max-h-[94vh]'
            : 'max-w-2xl max-h-[90vh]'
        } overflow-y-auto overscroll-contain rounded-3xl bg-[#100B1A]/98 border border-[#FF3CA6]/35 shadow-2xl shadow-black/80 backdrop-blur-2xl p-5 sm:p-7 space-y-5 text-[#F8F5FF] transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng hồ sơ đề thi"
          className="absolute top-5 right-5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hồ Sơ */}
        <div className="space-y-2.5 pr-10">
          <div className="flex flex-wrap items-center gap-2">
            {/* Môn học */}
            <span className="text-xs font-black uppercase px-3 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {doc.subject}
            </span>

            {/* Bậc giáo dục: Chung, Cấp 2, Cấp 3 */}
            {(() => {
              const eduBadge = getEducationLevelBadgeInfo(doc);
              return (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${eduBadge.badgeClass}`}
                >
                  <span>{eduBadge.icon}</span>
                  <span>{eduBadge.label}</span>
                </span>
              );
            })()}

            {/* Khối lớp chuẩn 7 Discord Roles */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${gradeStyle.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${gradeStyle.dotColor}`} />
              <span>{gradeStyle.label}</span>
            </span>

            {/* Phân loại Track */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${trackInfo.badgeClass}`}
            >
              <span>{trackInfo.icon}</span>
              <span>{trackInfo.label}</span>
            </span>

            {/* Trạng thái Thẩm định 3+1 Quorum */}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                isUnanimousQuorum
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {isUnanimousQuorum ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đồng Thuận 3/3</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trọng Tài 3+1</span>
                </>
              )}
            </span>

            {/* Chuẩn Bộ GD&ĐT 2025 */}
            {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) && (
              <span className="text-xs font-black uppercase px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm shadow-cyan-950/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chuẩn Bộ GD&amp;ĐT 2025</span>
              </span>
            )}

            {/* Trạng thái Đáp án */}
            {doc.has_answer_keys && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Có Đáp Án</span>
              </span>
            )}

            {/* Trạng thái Lời giải */}
            {doc.has_detailed_solutions && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Lời Giải Chi Tiết</span>
              </span>
            )}
          </div>

          <h2 id="dossier-title" className="text-lg sm:text-2xl font-black text-white leading-tight">
            {doc.title || doc.file_name}
          </h2>

          <p className="text-xs text-slate-400 font-mono">
            Tệp gốc: <span className="text-slate-300">{doc.file_name}</span> • Dung lượng:{' '}
            <span className="text-slate-300">{formatFileSize(doc.file_size_bytes)}</span> • Quy mô:{' '}
            <span className="text-slate-300">{doc.page_count || 1} trang</span>
          </p>
        </div>

        {/* 4 Tabs Chuyển Đổi: [Đọc Đề PDF] | [Làm Đề Split-Screen] | [Tổng Quan] | [Thẩm Định 3+1] */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2.5">
          <button
            type="button"
            onClick={() => setModalTab('pdf_reader')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'pdf_reader'
                ? 'bg-[#FF3CA6] text-white shadow-md shadow-[#FF3CA6]/30'
                : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Đọc Đề PDF Trực Tiếp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTab('practice_room');
              if (!examTimerRunning && examSecondsLeft === examDurationMin * 60) {
                setExamTimerRunning(true);
              }
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'practice_room'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black shadow-md'
                : 'text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Làm Đề Thực Chiến (+100 XP)</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('overview')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tổng Quan Hồ Sơ</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('quorum_dossier')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'quorum_dossier'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Dự Thảo 3+1</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: ĐỌC ĐỀ PDF / VĂN BẢN TRỰC TIẾP TRÊN WEB                     */}
        {/* ================================================================= */}
        {modalTab === 'pdf_reader' && renderDocumentReaderPane(false)}

        {/* ================================================================= */}
        {/* TAB 2: PHÒNG THI THỰC CHIẾN SPLIT-SCREEN (ĐỌC PDF + PHIẾU TRẢ LỜI) */}
        {/* ================================================================= */}
        {modalTab === 'practice_room' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột Trái (7/12): Khung Đọc Đề PDF / Câu Hỏi */}
            <div className="lg:col-span-7">{renderDocumentReaderPane(true)}</div>

            {/* Cột Phải (5/12): Đồng Hồ Đếm Ngược + Phiếu Trả Lời Chuẩn Bộ GD&ĐT 2025 */}
            <div className="lg:col-span-5 flex flex-col space-y-4 p-4 sm:p-5 rounded-2xl bg-[#0B0813] border border-white/15 max-h-[70vh] overflow-y-auto">
              {/* Đồng hồ phòng thi */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#150E24] to-pink-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FF3CA6]/20 border border-[#FF3CA6]/40 flex items-center justify-center text-[#FFB8E6]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-purple-300 uppercase">
                      Đồng hồ phòng thi
                    </div>
                    <div className="text-xl font-black font-mono text-white tabular-nums">
                      {formatTimer(examSecondsLeft)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {[15, 45, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setExamDurationMin(m);
                        setExamSecondsLeft(m * 60);
                        setExamTimerRunning(false);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                        examDurationMin === m
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m}p
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExamTimerRunning((r) => !r)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FF3CA6] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {examTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{examTimerRunning ? 'Dừng' : 'Chạy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExamTimerRunning(false);
                      setExamSecondsLeft(examDurationMin * 60);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                    title="Đặt lại đồng hồ"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Thông báo kết quả khi đã nộp bài */}
              {examSubmitted && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Đã hoàn thành phiên luyện đề! (+100 XP &amp; Duy trì 🔥 Streak)</span>
                  </div>
                  <p className="text-xs text-emerald-100/90">{examScoreSummary}</p>
                </div>
              )}

              {/* PHẦN I: TRẮC NGHIỆM 4 PHƯƠNG ÁN (A, B, C, D) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                    Phần I: Trắc nghiệm ABCD ({part1Count} câu)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPart1Count((c) => Math.max(4, c - 4))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-300 cursor-pointer"
                    >
                      -4 câu
                    </button>
                    <button
                      type="button"
                      onClick={() => setPart1Count((c) => Math.min(50, c + 4))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-300 cursor-pointer"
                    >
                      +4 câu
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: part1Count }).map((_, idx) => {
                    const qNum = idx + 1;
                    const picked = mcqAnswers[qNum];
                    const correctKey = detectedAnswerKeys[String(qNum)];
                    return (
                      <div
                        key={qNum}
                        className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-1.5"
                      >
                        <span className="text-xs font-mono font-bold text-slate-300 w-7">
                          {qNum}.
                        </span>
                        <div className="flex items-center gap-1">
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                            const active = picked === opt;
                            const isRight =
                              examSubmitted && correctKey && correctKey.toUpperCase() === opt;
                            const isWrong =
                              examSubmitted &&
                              active &&
                              correctKey &&
                              correctKey.toUpperCase() !== opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setMcqAnswers((prev) => ({
                                    ...prev,
                                    [qNum]: prev[qNum] === opt ? '' : opt,
                                  }))
                                }
                                className={`w-6 h-6 rounded-md text-[11px] font-mono font-black transition-all cursor-pointer ${
                                  isRight
                                    ? 'bg-emerald-500 text-black'
                                    : isWrong
                                    ? 'bg-rose-500 text-white'
                                    : active
                                    ? 'bg-[#FF3CA6] text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (4 CÂU x 4 Ý a,b,c,d) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider block">
                  Phần II: Đúng / Sai (4 câu × 4 ý a, b, c, d)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((qIdx) => (
                    <div
                      key={qIdx}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5"
                    >
                      <div className="text-xs font-bold text-white">Câu {qIdx} (Đúng / Sai)</div>
                      {(['a', 'b', 'c', 'd'] as const).map((sub) => {
                        const key = `${qIdx}_${sub}`;
                        const val = tfAnswers[key];
                        return (
                          <div key={sub} className="flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-300">Ý {sub})</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setTfAnswers((p) => ({
                                    ...p,
                                    [key]: p[key] === true ? null : true,
                                  }))
                                }
                                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                  val === true
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-white/5 text-slate-400 hover:text-white'
                                }`}
                              >
                                Đúng
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setTfAnswers((p) => ({
                                    ...p,
                                    [key]: p[key] === false ? null : false,
                                  }))
                                }
                                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                  val === false
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white/5 text-slate-400 hover:text-white'
                                }`}
                              >
                                Sai
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* PHẦN III: TRẢ LỜI NGẮN (6 CÂU) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-black text-indigo-300 uppercase tracking-wider block">
                  Phần III: Trả Lời Ngắn (6 câu)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-400">Câu {sIdx}</label>
                      <input
                        type="text"
                        value={shortAnswers[sIdx] || ''}
                        onChange={(e) =>
                          setShortAnswers((p) => ({ ...p, [sIdx]: e.target.value }))
                        }
                        placeholder="Đáp số..."
                        className="w-full h-8 px-2.5 rounded-lg bg-black/50 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#FF3CA6]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút Nộp Bài & Cộng Chuỗi Ngày Học */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMcqAnswers({});
                    setTfAnswers({});
                    setShortAnswers({});
                    setExamSubmitted(false);
                    localStorage.removeItem(`orbit_exam_draft_${doc.id}`);
                    showInfo('Đã xóa nháp phiếu trả lời.', 'Phòng Thi');
                  }}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Làm lại phiếu
                </button>

                <button
                  type="button"
                  onClick={handleSubmitPracticeExam}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF3CA6] via-purple-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF3CA6]/30 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>Nộp Bài &amp; Cộng Chuỗi Ngày Học (+100 XP)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: TỔNG QUAN HỒ SƠ ĐỀ THI                                     */}
        {/* ================================================================= */}
        {modalTab === 'overview' && (
          <>
            {/* Banner Mở Trình Đọc PDF & Phòng Thi Thực Chiến Nhanh */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF3CA6]/20 via-purple-900/30 to-indigo-900/30 border border-[#FF3CA6]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-[#FFB8E6] flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF3CA6]" />
                  <span>Trình Đọc Đề PDF &amp; Phòng Thi Split-Screen Đã Sẵn Sàng</span>
                </div>
                <p className="text-xs text-slate-300">
                  Xem trực tiếp đề PDF hoặc bóc tách câu hỏi ngay trên Web kèm phiếu tô đáp án chuẩn 2025.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalTab('pdf_reader')}
                  className="px-3.5 py-2 rounded-xl bg-[#FF3CA6] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Đọc Đề Ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('practice_room');
                    setExamTimerRunning(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Làm Bài Split-Screen</span>
                </button>
              </div>
            </div>

            {/* Lưới Thông Tin Trích Xuất (Inspection Metrics Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Năm học */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Năm Học</span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {doc.academic_year || 'Đang cập nhật'}
                </div>
              </div>

              {/* Trường / Nguồn ra đề */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                  <School className="w-3.5 h-3.5 text-violet-400" />
                  <span>Trường / Đơn Vị</span>
                </div>
                <div
                  className="text-sm font-bold text-white truncate"
                  title={doc.school_or_department || ''}
                >
                  {doc.school_or_department || 'Đại trà'}
                </div>
              </div>

              {/* Số câu hỏi */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                  <FileText className="w-3.5 h-3.5 text-pink-400" />
                  <span>Ước Tính</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {doc.question_count
                    ? `${doc.question_count} Câu`
                    : parsedQuestions.length > 0
                    ? `${parsedQuestions.length} Câu`
                    : 'Đề tự luận / Trắc nghiệm'}
                </div>
              </div>

              {/* Số trang */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quy Mô</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {doc.page_count ? `${doc.page_count} Trang` : '1-4 Trang'}
                </div>
              </div>
            </div>

            {/* Khối Cấu Trúc Đề Thi Chuẩn Bộ GD&ĐT 2025 */}
            {(doc.moet_2025_compliant ||
              (doc.moet_part1_count && doc.moet_part1_count > 0) ||
              (doc.moet_part2_count && doc.moet_part2_count > 0) ||
              (doc.moet_part3_count && doc.moet_part3_count > 0)) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-indigo-950/30 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Cấu Trúc Đề Thi Chuẩn Bộ GD&amp;ĐT 2025
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                    Form Mới
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="text-[11px] text-slate-400 font-medium">Phần I: 4 Phương Án</div>
                    <div className="font-bold text-white text-sm">
                      {doc.moet_part1_count ? `${doc.moet_part1_count} câu` : '12 câu'}
                    </div>
                    <div className="text-[10px] text-cyan-400/80">Chọn 1 phương án đúng</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="text-[11px] text-slate-400 font-medium">Phần II: Đúng / Sai</div>
                    <div className="font-bold text-white text-sm">
                      {doc.moet_part2_count ? `${doc.moet_part2_count} câu` : '4 câu'}
                    </div>
                    <div className="text-[10px] text-emerald-400/80">4 ý a, b, c, d mỗi câu</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="text-[11px] text-slate-400 font-medium">
                      Phần III: Trả Lời Ngắn
                    </div>
                    <div className="font-bold text-white text-sm">
                      {doc.moet_part3_count ? `${doc.moet_part3_count} câu` : '6 câu'}
                    </div>
                    <div className="text-[10px] text-indigo-400/80">Điền số / kết quả ngắn</div>
                  </div>
                </div>
              </div>
            )}

            {/* Thanh Độ Tin Cậy & Thẩm Định DocInspector */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/40 to-indigo-950/40 border border-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Độ Tin Cậy Phân Loại DocInspector
                </span>
                <span className="font-mono font-bold text-white bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
                  {confidencePercent}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>

              {doc.notes && (
                <p className="text-xs text-slate-300 italic pt-1 border-t border-white/10 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Ghi chú hệ thống: {doc.notes}</span>
                </p>
              )}
            </div>

            {/* Xác Thực Cryptographic SHA-256 (Chống Giả Mạo & Trùng Lặp) */}
            {doc.file_hash && (
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    Mã Băm Nhị Phân SHA-256 (C++ Fast Engine)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedHash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedHash ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all bg-black/80 p-2 rounded-xl border border-white/5 selection:bg-purple-500 selection:text-white">
                  {doc.file_hash}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* TAB 4: HỘI ĐỒNG THẨM ĐỊNH 3+1 (QUORUM DOSSIER VIEW)               */}
        {/* ================================================================= */}
        {modalTab === 'quorum_dossier' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950/40 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase">
                  <Scale className="w-4 h-4 text-purple-400" />
                  Cơ Chế Phân Định Hội Đồng Trọng Tài 3+1
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {isUnanimousQuorum ? 'ĐỒNG THUẬN 3/3' : 'TRỌNG TÀI 3+1'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tài liệu đã trải qua 4 tầng đối soát độc lập: Vùng Tiêu Đề, BM25 Toàn Thân, Cấu Trúc Đề &amp; Trọng Tài Tương Phản để đảm bảo không xảy ra nhận dạng sai giữa các khối môn (Toán, Tin, Hóa, Văn...).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 font-mono text-xs text-slate-200 leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap select-text">
              {doc.notes?.includes('#')
                ? doc.notes
                : `## DỰ THẢO THẨM ĐỊNH ĐỀ THI\n\n- **Tên tệp**: ${doc.file_name}\n- **Môn học**: ${doc.subject}\n- **Khối lớp**: ${doc.estimated_level}\n- **Năm học**: ${doc.academic_year || 'Đang cập nhật'}\n- **Trường/Sở**: ${doc.school_or_department || 'Đại trà'}\n- **Trạng thái Quorum**: ${isUnanimousQuorum ? 'Đồng thuận tuyệt đối 3/3' : 'Trọng tài đối soát tương phản 3+1'}\n- **Độ tin cậy**: ${confidencePercent}%\n- **Mã băm SHA-256**: ${doc.file_hash || 'N/A'}\n\n*Hồ sơ được thẩm định hoàn toàn minh bạch bằng thuật toán xác định (deterministic heuristic), không tốn chi phí AI và không gửi dữ liệu ra bên ngoài.*`}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const text = doc.notes || `Hồ sơ đề thi ${doc.title} (${doc.subject})`;
                  navigator.clipboard.writeText(text);
                  setCopiedDossier(true);
                  showSuccess('Đã sao chép nội dung dự thảo vào bộ nhớ tạm!', 'Dự Thảo');
                  setTimeout(() => setCopiedDossier(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedDossier ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedDossier ? 'Đã sao chép' : 'Sao chép văn bản dự thảo'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Thanh Tác Vụ Chính */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => onToggleBookmark(doc.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border flex items-center gap-2 transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
              <span>{isBookmarked ? 'Đã Lưu Tủ Sách' : 'Lưu Tủ Sách'}</span>
            </button>

            {/* Copy Share Link */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Sao chép liên kết chia sẻ đề thi"
            >
              {copiedShareLink ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {modalTab !== 'pdf_reader' && (
              <button
                type="button"
                onClick={() => setModalTab('pdf_reader')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF3CA6]/20 hover:bg-[#FF3CA6]/30 text-[#FFB8E6] border border-[#FF3CA6]/40 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Đọc Đề PDF</span>
              </button>
            )}

            {/* Mở xem tệp tab mới */}
            <a
              href={
                botOnline
                  ? `${apiBase}/api/documents/${doc.id}/view?ngrok-skip-browser-warning=true`
                  : downloadUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!botOnline && !downloadUrl.startsWith('http')) {
                  e.preventDefault();
                  setModalTab('pdf_reader');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs sm:text-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{botOnline ? 'Mở PDF Tab Mới' : 'Mở Trên Discord'}</span>
            </a>

            {/* Tải về trực tiếp */}
            <a
              href={downloadUrl}
              target={downloadUrl.startsWith('http') ? '_blank' : undefined}
              rel={downloadUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              download={botOnline ? doc.file_name || 'de_thi.pdf' : undefined}
              onClick={(e) => {
                if (!downloadUrl.startsWith('http')) {
                  e.preventDefault();
                  setModalTab('pdf_reader');
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{botOnline ? 'Tải Về Trực Tiếp' : 'Tải Đề Từ Kho'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
