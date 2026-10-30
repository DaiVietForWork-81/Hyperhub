"""HyperHub Web Server & Multi-Channel API Gateway.

Khởi chạy ứng dụng Web độc lập kết nối hai chiều với Discord Bot và Discord API:
1. Discord REST API (thông qua DISCORD_TOKEN)
2. Real-time Bot Bridge (thông qua BOT_API_URL và BOT_API_SECRET)
3. Shared Database (thông qua DATABASE_URL)
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Đảm bảo đường dẫn Web và ROOT nằm trong sys.path
WEB_DIR = Path(__file__).parent.resolve()
ROOT_DIR = WEB_DIR.parent.resolve()
if str(WEB_DIR) not in sys.path:
    sys.path.insert(0, str(WEB_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Đảm bảo UTF-8 an toàn cho console trên Windows
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from aiohttp import web
from web_config import config
from bridge.bot_client import BotBridgeClient
from bridge.discord_client import DiscordDirectClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
)
logger = logging.getLogger("web_server")

bot_client = BotBridgeClient()
discord_client = DiscordDirectClient()

# Rate-limit đơn giản theo IP (120 req/phút, chống spam/DoS cơ bản)
_RATE_BUCKETS: dict[str, list[float]] = {}
_RATE_MAX = 120
_RATE_WINDOW = 60.0


def _get_client_ip(request: web.Request) -> str:
    return request.headers.get("X-Forwarded-For", request.remote or "unknown").split(",")[0].strip()


def _check_rate_limit(ip: str) -> bool:
    import time as _t
    now = _t.time()
    hist = [t for t in _RATE_BUCKETS.get(ip, []) if now - t < _RATE_WINDOW]
    if len(hist) >= _RATE_MAX:
        _RATE_BUCKETS[ip] = hist
        return False
    hist.append(now)
    _RATE_BUCKETS[ip] = hist
    return True


def _is_authorized_send(request: web.Request) -> bool:
    """Yêu cầu X-Bot-Secret hoặc Bearer BOT_API_SECRET cho endpoint gửi tin nhắn."""
    secret = (config.BOT_API_SECRET or "").strip()
    insecure_keys = {
        "hyperhub_bridge_secret_key_2026",
        "secret",
        "changeme",
        "default_secret",
        "admin",
        "123456",
    }
    if not secret or len(secret) < 16 or secret.lower() in insecure_keys:
        return False
    auth = request.headers.get("Authorization", "")
    token = ""
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    elif "X-Bot-Secret" in request.headers:
        token = request.headers.get("X-Bot-Secret", "").strip()
    if not token:
        return False
    import hmac
    return hmac.compare_digest(token, secret)


@web.middleware
async def _security_middleware(request: web.Request, handler) -> web.Response:
    # Rate limit
    if not _check_rate_limit(_get_client_ip(request)):
        return web.json_response(
            {"error": "Too Many Requests", "message": "Quá nhiều yêu cầu, thử lại sau 1 phút."},
            status=429,
            headers={"Retry-After": "60"},
        )
    try:
        resp = await handler(request)
    except web.HTTPException as ex:
        resp = ex
    except Exception:
        logger.exception("Web API internal error")
        resp = web.json_response({"error": "Internal Server Error"}, status=500)
    # Security headers (chống clickjacking/MIME-sniffing, giảm lộ referrer)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Permissions-Policy"] = "microphone=(), camera=(), geolocation=()"
    return resp


async def handle_index(request: web.Request) -> web.Response:
    """Trả về trang chính của Orbit (React SPA hoặc Template)."""
    dist_index = WEB_DIR / "dist" / "index.html"
    if dist_index.exists():
        content = dist_index.read_text("utf-8")
        return web.Response(text=content, content_type="text/html")
    template_path = WEB_DIR / "templates" / "index.html"
    if template_path.exists():
        content = template_path.read_text("utf-8")
        return web.Response(text=content, content_type="text/html")
    return web.Response(
        text="<h1>Orbit Web Server</h1><p>Landing page not found.</p>",
        content_type="text/html",
    )


async def handle_logo(request: web.Request) -> web.StreamResponse:
    """Trả về file hình ảnh thương hiệu từ dist/, public/ hoặc static/."""
    req_name = request.path.lstrip("/") or "logo.png"
    allowed_files = {
        "logo.png",
        "orbit_logo_transparent.png",
        "orbit_emblem_core.png",
        "orbit_full.png",
        "hyperhub_logo.png",
        "server_icon.png",
    }
    safe_name = req_name if req_name in allowed_files else "logo.png"
    for folder in ("dist", "public", "static"):
        candidate = WEB_DIR / folder / safe_name
        if candidate.exists():
            return web.FileResponse(candidate)
    return web.Response(status=404)



async def handle_api_status(request: web.Request) -> web.Response:
    """GET /api/status: Trả về trạng thái bot từ Bridge Client."""
    status = await bot_client.get_bot_status()
    return web.json_response(status)


async def handle_api_leaderboard(request: web.Request) -> web.Response:
    """GET /api/leaderboard?mode=ranked&limit=50."""
    mode = request.query.get("mode", "ranked")
    limit = int(request.query.get("limit", 50))
    data = await bot_client.get_leaderboard(mode=mode, limit=limit)
    return web.json_response(data)


async def handle_api_duels(request: web.Request) -> web.Response:
    """GET /api/duels: Trả về danh sách trận 1:1 thời gian thực."""
    data = await bot_client.get_active_duels()
    return web.json_response(data)


async def handle_api_user(request: web.Request) -> web.Response:
    """GET /api/user/{discord_id}: Trả về thông tin thí sinh."""
    try:
        discord_id = int(request.match_info["discord_id"])
        data = await bot_client.get_user_profile(discord_id)
        return web.json_response(data)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=400)


async def handle_api_discord_server(request: web.Request) -> web.Response:
    """GET /api/discord/server: Lấy thông tin máy chủ trực tiếp qua DISCORD_TOKEN."""
    guild_info = await discord_client.get_guild()
    return web.json_response(guild_info)


async def handle_api_discord_roles(request: web.Request) -> web.Response:
    """GET /api/discord/roles: Lấy danh sách vai trò Discord trực tiếp qua DISCORD_TOKEN."""
    roles = await discord_client.get_guild_roles()
    return web.json_response({"total_roles": len(roles), "roles": roles})


async def handle_api_discord_send(request: web.Request) -> web.Response:
    """POST /api/discord/send: Gửi tin nhắn trực tiếp qua DISCORD_TOKEN (yêu cầu secret)."""
    if not _is_authorized_send(request):
        return web.json_response({"error": "Unauthorized"}, status=401)
    try:
        body = await request.json()
        channel_id = int(body.get("channel_id", 0))
        message = str(body.get("message", ""))
        if not channel_id or not message:
            return web.json_response({"error": "Thiếu channel_id hoặc message"}, status=400)
        if len(message) > 2000:
            return web.json_response({"error": "message quá dài (tối đa 2000 ký tự)"}, status=400)
        if channel_id <= 0:
            return web.json_response({"error": "channel_id không hợp lệ"}, status=400)

        success = await discord_client.send_channel_message(channel_id, message)
        return web.json_response({"success": success})
    except Exception as e:
        logger.warning("discord/send error: %s", e)
        return web.json_response({"error": "Lỗi xử lý nội bộ"}, status=500)


async def handle_api_notify(request: web.Request) -> web.Response:
    """POST /api/notify: Gửi thông báo tới kênh Discord qua Bot Bridge (yêu cầu secret)."""
    if not _is_authorized_send(request):
        return web.json_response({"error": "Unauthorized"}, status=401)
    try:
        body = await request.json()
        channel_id = int(body.get("channel_id", 0))
        message = str(body.get("message", ""))
        if not channel_id or not message:
            return web.json_response({"error": "Thiếu channel_id hoặc message"}, status=400)
        if len(message) > 2000:
            return web.json_response({"error": "message quá dài (tối đa 2000 ký tự)"}, status=400)
        success = await bot_client.send_discord_notification(channel_id, message)
        return web.json_response({"success": success})
    except Exception as e:
        logger.warning("notify error: %s", e)
        return web.json_response({"error": "Lỗi xử lý nội bộ"}, status=500)


async def handle_upload_portal(request: web.Request) -> web.Response:
    """GET /upload hoặc /portal: Trả về Cổng Nộp Đề Trực Tuyến & Thẩm Định 3+1."""
    portal_html = WEB_DIR / "templates" / "upload_portal.html"
    if portal_html.exists():
        return web.Response(text=portal_html.read_text("utf-8"), content_type="text/html")
    return web.Response(text="<h1>Upload Portal template not found</h1>", content_type="text/html")


async def handle_api_document_upload(request: web.Request) -> web.Response:
    """
    POST /api/documents/upload & POST /api/upload:
    Cổng nộp đề trực tuyến với Chống Nộp Trùng Tuyệt Đối 2 Tầng & Thẩm Định 3+1.
    """
    import asyncio
    import datetime
    import io
    import os
    import aiosqlite
    from typing import Optional
    from DocInspector.smart_pipeline import SmartDocumentPipeline
    from DocInspector.duplicate_guard import DuplicateGuard

    file_bytes: Optional[bytes] = None
    file_name: str = "tai_lieu_de_thi.pdf"
    uploader_name: str = "Khách (Web)"
    uploader_id: int = 0
    gdrive_url: Optional[str] = None

    content_type = request.content_type.lower()
    if "multipart" in content_type:
        reader = await request.multipart()
        while True:
            part = await reader.next()
            if part is None:
                break
            if part.name == "file":
                file_name = part.filename or "de_thi_upload.pdf"
                file_bytes = await part.read()
            elif part.name == "uploader_name":
                uploader_name = (await part.text()).strip() or uploader_name
            elif part.name == "uploader_id":
                try:
                    uploader_id = int((await part.text()).strip())
                except Exception:
                    pass
            elif part.name in ("url", "gdrive_url"):
                gdrive_url = (await part.text()).strip()
    elif "json" in content_type:
        body = await request.json()
        gdrive_url = body.get("url") or body.get("gdrive_url")
        uploader_name = body.get("uploader_name") or uploader_name
        file_name = body.get("file_name") or file_name
    else:
        post_data = await request.post()
        if "file" in post_data:
            field = post_data["file"]
            file_name = getattr(field, "filename", None) or file_name
            if hasattr(field, "file"):
                file_bytes = field.file.read()
        if "url" in post_data:
            gdrive_url = str(post_data["url"]).strip()
        if "uploader_name" in post_data:
            uploader_name = str(post_data["uploader_name"]).strip() or uploader_name

    if file_bytes is not None:
        file_bytes = bytes(file_bytes)
    source_target = gdrive_url if gdrive_url else file_bytes
    if not source_target:
        return web.json_response({
            "success": False,
            "error": "Vui lòng đính kèm tệp đề thi (PDF, DOCX) hoặc đường dẫn Google Drive.",
        }, status=400)

    # 1. Tính mã băm nhị phân SHA-256 (Layer 1)
    file_hash = None
    if file_bytes:
        file_hash, _, _ = DuplicateGuard.compute_hashes(file_bytes=file_bytes)

    # 2. Kiểm tra trùng lặp Layer 1 ngay lập tức trước khi phân tích
    db_path = config.LOCAL_DB_PATH
    if file_hash and db_path.exists():
        async with aiosqlite.connect(db_path) as db:
            async with db.execute(
                "SELECT id, title, author_name, timestamp, jump_url FROM documents_archive WHERE file_hash = ? LIMIT 1",
                (file_hash,),
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return web.json_response({
                        "success": False,
                        "is_duplicate": True,
                        "match_type": "BINARY_EXACT",
                        "message": f"Tài liệu trùng lặp tuyệt đối (100% Binary SHA-256)! Tệp đã được nộp trước đó bởi '{row[2]}' vào {row[3]}.",
                        "existing_id": row[0],
                        "existing_title": row[1],
                        "existing_author": row[2],
                        "existing_timestamp": row[3],
                        "existing_jump_url": row[4],
                        "file_hash": file_hash,
                    })

    # 3. Chạy toàn bộ pipeline thẩm định thông minh 3+1
    try:
        pipeline_res = await asyncio.to_thread(
            SmartDocumentPipeline.process,
            source_target,
            file_name_hint=file_name,
        )
    except Exception as pipe_err:
        logger.warning("Lỗi xử lý SmartDocumentPipeline: %s", pipe_err)
        return web.json_response({
            "success": False,
            "error": f"Không thể xử lý hoặc trích xuất tài liệu: {str(pipe_err)}",
        }, status=422)

    rep = pipeline_res.report
    content_hash = rep.content_hash
    final_file_hash = rep.file_hash or file_hash

    # 4. Kiểm tra trùng lặp Layer 2 (Content/Semantic Signature)
    if content_hash and db_path.exists():
        async with aiosqlite.connect(db_path) as db:
            try:
                async with db.execute(
                    "SELECT id, title, author_name, timestamp, jump_url FROM documents_archive WHERE content_hash = ? LIMIT 1",
                    (content_hash,),
                ) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        return web.json_response({
                            "success": False,
                            "is_duplicate": True,
                            "match_type": "CONTENT_EXACT",
                            "message": f"Nội dung đề thi hoàn toàn trùng khớp với đề '{row[1]}' do '{row[2]}' nộp vào {row[3]}!",
                            "existing_id": row[0],
                            "existing_title": row[1],
                            "existing_author": row[2],
                            "existing_timestamp": row[3],
                            "existing_jump_url": row[4],
                            "file_hash": final_file_hash,
                            "content_hash": content_hash,
                        })
            except Exception:
                pass

    # 5. Lưu vào CSDL dùng chung (bot.db)
    new_doc_id = 0
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw_text_snippet = rep.pass1.raw_text[:50000] if hasattr(rep, "pass1") and getattr(rep.pass1, "raw_text", None) else ""
    quorum_badge = "UNANIMOUS_3_3" if (rep.quorum_arbitration and rep.quorum_arbitration.get("is_unanimous")) else "ARBITRATION_3_PLUS_1"

    if db_path.exists():
        try:
            async with aiosqlite.connect(db_path) as db:
                cursor = await db.execute(
                    """
                    INSERT INTO documents_archive (
                        subject, title, file_name, file_size_bytes, file_type,
                        estimated_level, question_count, page_count, author_id,
                        author_name, timestamp, file_hash, content_hash, raw_text,
                        verdict, exam_track, confidence, academic_year, school_or_department,
                        quorum_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rep.detected_subject.name,
                        pipeline_res.file_name,
                        pipeline_res.file_name,
                        rep.file_size_bytes,
                        pipeline_res.source_type,
                        f"{rep.grade_level_label_vi} ({rep.exam_track_label_vi})",
                        pipeline_res.total_questions,
                        rep.pass1.page_count if hasattr(rep, "pass1") else 1,
                        uploader_id,
                        uploader_name,
                        now_iso,
                        final_file_hash,
                        content_hash,
                        raw_text_snippet,
                        rep.verdict.value,
                        rep.exam_track.value,
                        rep.confidence_score,
                        rep.academic_year,
                        rep.school_or_department,
                        quorum_badge,
                    ),
                )
                new_doc_id = cursor.lastrowid
                await db.commit()
        except Exception as db_err:
            logger.warning("Lỗi ghi CSDL documents_archive: %s", db_err)

    # 6. Thông báo cho Bot Discord (nếu đang hoạt động)
    try:
        asyncio.create_task(
            bot_client.send_discord_notification(
                0,
                f"📥 [ĐỀ MỚI TỪ WEB PORTAL] `{pipeline_res.file_name}` ({rep.detected_subject.value}) bởi **{uploader_name}**.",
            )
        )
    except Exception:
        pass

    det_meta = getattr(rep, "detailed_metadata", None)
    return web.json_response({
        "success": True,
        "is_duplicate": False,
        "id": new_doc_id,
        "file_name": pipeline_res.file_name,
        "title": pipeline_res.file_name,
        "file_size_bytes": rep.file_size_bytes,
        "file_type": pipeline_res.source_type,
        "detected_subject": rep.detected_subject.value,
        "subject_name": rep.detected_subject.name,
        "estimated_level": rep.grade_level_label_vi,
        "exam_type": rep.exam_type.value if hasattr(rep, "exam_type") else "EXAM",
        "exam_track": rep.exam_track_label_vi,
        "confidence_score": rep.confidence_score,
        "question_count": pipeline_res.total_questions,
        "page_count": rep.pass1.page_count if hasattr(rep, "pass1") else 1,
        "academic_year": rep.academic_year,
        "school_or_department": rep.school_or_department,
        "moet_2025_compliant": bool(getattr(rep, "moet_2025_compliant", False)),
        "moet_part1_count": getattr(det_meta, "moet_part1_count", 0) if det_meta else 0,
        "moet_part2_count": getattr(det_meta, "moet_part2_count", 0) if det_meta else 0,
        "moet_part3_count": getattr(det_meta, "moet_part3_count", 0) if det_meta else 0,
        "has_answer_keys": bool(getattr(det_meta, "has_answer_keys", False)) if det_meta else False,
        "has_detailed_solutions": bool(getattr(det_meta, "has_detailed_solutions", False)) if det_meta else False,
        "download_url": f"/api/documents/{new_doc_id}/download" if new_doc_id else "",
        "summary": rep.human_summary,
        "execution_time_ms": pipeline_res.execution_time_ms,
        "file_hash": final_file_hash,
        "content_hash": content_hash,
        "quorum": rep.quorum_arbitration,
        "draft_dossier_markdown": rep.draft_dossier_markdown,
    })


async def handle_api_import_gdrive(request: web.Request) -> web.Response:
    """POST /api/documents/import_gdrive: Xử lý liên kết Google Drive qua 5 lớp bảo mật & Thẩm Định 3+1."""
    import asyncio
    import datetime
    import aiosqlite
    from DocInspector.smart_pipeline import SmartDocumentPipeline
    from DocInspector.url_detector import URLSourceDetector

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"success": False, "error": "Payload JSON không hợp lệ."}, status=400)

    url = (body.get("url") or body.get("gdrive_url") or "").strip()
    uploader_name = (body.get("uploader_name") or "Thành viên Web").strip()
    if not url:
        return web.json_response({"success": False, "error": "Vui lòng cung cấp đường dẫn Google Drive."}, status=400)

    # Lớp 1: Xác thực nguồn liên kết
    src_info = URLSourceDetector.classify_url(url)
    if not src_info.is_trusted:
        return web.json_response({
            "success": False,
            "new_imported": 0,
            "results": [{
                "blocked": True,
                "security_layer": 1,
                "error": src_info.reason or "Liên kết không thuộc nguồn Google Drive hợp lệ.",
            }],
        }, status=422)

    try:
        pipeline_res = await asyncio.to_thread(SmartDocumentPipeline.process, url)
    except Exception as err:
        return web.json_response({
            "success": False,
            "new_imported": 0,
            "results": [{
                "blocked": True,
                "security_layer": 3,
                "error": f"Không thể tải hoặc giải mã tệp từ Google Drive: {err}",
            }],
        }, status=422)

    rep = pipeline_res.report
    final_file_hash = rep.file_hash
    content_hash = rep.content_hash
    db_path = config.LOCAL_DB_PATH

    if db_path.exists() and (final_file_hash or content_hash):
        async with aiosqlite.connect(db_path) as db:
            async with db.execute(
                "SELECT id, title, author_name, timestamp FROM documents_archive WHERE file_hash = ? OR (content_hash IS NOT NULL AND content_hash = ?) LIMIT 1",
                (final_file_hash or "", content_hash or ""),
            ) as cur:
                dup_row = await cur.fetchone()
                if dup_row:
                    return web.json_response({
                        "success": False,
                        "new_imported": 0,
                        "results": [{
                            "is_duplicate": True,
                            "existing_id": dup_row[0],
                            "existing_title": dup_row[1],
                            "author": dup_row[2],
                            "timestamp": dup_row[3],
                        }],
                    })

    new_doc_id = 0
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw_text_snippet = rep.pass1.raw_text[:50000] if hasattr(rep, "pass1") and getattr(rep.pass1, "raw_text", None) else ""
    quorum_badge = "UNANIMOUS_3_3" if (rep.quorum_arbitration and rep.quorum_arbitration.get("is_unanimous")) else "ARBITRATION_3_PLUS_1"

    if db_path.exists():
        try:
            async with aiosqlite.connect(db_path) as db:
                cursor = await db.execute(
                    """
                    INSERT INTO documents_archive (
                        subject, title, file_name, file_size_bytes, file_type,
                        estimated_level, question_count, page_count, author_id,
                        author_name, jump_url, timestamp, file_hash, content_hash, raw_text,
                        verdict, exam_track, confidence, academic_year, school_or_department,
                        quorum_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rep.detected_subject.name,
                        pipeline_res.file_name,
                        pipeline_res.file_name,
                        rep.file_size_bytes,
                        pipeline_res.source_type,
                        f"{rep.grade_level_label_vi} ({rep.exam_track_label_vi})",
                        pipeline_res.total_questions,
                        rep.pass1.page_count if hasattr(rep, "pass1") else 1,
                        0,
                        uploader_name,
                        url,
                        now_iso,
                        final_file_hash,
                        content_hash,
                        raw_text_snippet,
                        rep.verdict.value,
                        rep.exam_track.value,
                        rep.confidence_score,
                        rep.academic_year,
                        rep.school_or_department,
                        quorum_badge,
                    ),
                )
                new_doc_id = cursor.lastrowid
                await db.commit()
        except Exception as db_err:
            logger.warning("Lỗi ghi CSDL import_gdrive: %s", db_err)

    det_meta = getattr(rep, "detailed_metadata", None)
    item_payload = {
        "success": True,
        "id": new_doc_id,
        "title": pipeline_res.file_name,
        "file_name": pipeline_res.file_name,
        "file_type": pipeline_res.source_type,
        "file_size_bytes": rep.file_size_bytes,
        "detected_subject": rep.detected_subject.value,
        "estimated_level": rep.grade_level_label_vi,
        "page_count": rep.pass1.page_count if hasattr(rep, "pass1") else 1,
        "question_count": pipeline_res.total_questions,
        "academic_year": rep.academic_year,
        "school": rep.school_or_department,
        "moet_2025_compliant": bool(getattr(rep, "moet_2025_compliant", False)),
        "moet_part1_count": getattr(det_meta, "moet_part1_count", 0) if det_meta else 0,
        "moet_part2_count": getattr(det_meta, "moet_part2_count", 0) if det_meta else 0,
        "moet_part3_count": getattr(det_meta, "moet_part3_count", 0) if det_meta else 0,
        "has_answer_keys": bool(getattr(det_meta, "has_answer_keys", False)) if det_meta else False,
        "has_detailed_solutions": bool(getattr(det_meta, "has_detailed_solutions", False)) if det_meta else False,
        "download_url": f"/api/documents/{new_doc_id}/download" if new_doc_id else "",
        "quorum": rep.quorum_arbitration,
        "draft_dossier_markdown": rep.draft_dossier_markdown,
        "security_verification": {
            "layer1_url_auth": "PASSED",
            "layer2_pre_probe": "PASSED",
            "layer3_sandbox_download": "PASSED",
            "layer4_antivirus_magic": "PASSED",
            "layer5_doc_inspector": "PASSED",
        },
    }
    return web.json_response({
        "success": True,
        "new_imported": 1,
        "results": [item_payload],
    })


async def handle_api_document_inspect(request: web.Request) -> web.Response:
    """POST /api/documents/inspect & POST /api/inspect: Kiểm tra thẩm định xem trước, không lưu DB."""
    import asyncio
    from typing import Optional
    from DocInspector.smart_pipeline import SmartDocumentPipeline

    content_type = request.content_type.lower()
    file_bytes: Optional[bytes] = None
    file_name: str = "tai_lieu_kiem_tra.pdf"
    gdrive_url: Optional[str] = None

    if "multipart" in content_type:
        reader = await request.multipart()
        while True:
            part = await reader.next()
            if part is None:
                break
            if part.name == "file":
                file_name = part.filename or file_name
                file_bytes = await part.read()
            elif part.name in ("url", "gdrive_url"):
                gdrive_url = (await part.text()).strip()
    elif "json" in content_type:
        body = await request.json()
        gdrive_url = body.get("url") or body.get("gdrive_url")
        file_name = body.get("file_name") or file_name

    source_target = gdrive_url if gdrive_url else file_bytes
    if not source_target:
        return web.json_response({"error": "Thiếu dữ liệu tệp hoặc url"}, status=400)

    try:
        pipeline_res = await asyncio.to_thread(
            SmartDocumentPipeline.process,
            source_target,
            file_name_hint=file_name,
        )
        rep = pipeline_res.report
        return web.json_response({
            "success": True,
            "file_name": pipeline_res.file_name,
            "detected_subject": rep.detected_subject.value,
            "estimated_level": rep.grade_level_label_vi,
            "exam_track": rep.exam_track_label_vi,
            "confidence_score": rep.confidence_score,
            "question_count": pipeline_res.total_questions,
            "summary": rep.human_summary,
            "execution_time_ms": pipeline_res.execution_time_ms,
            "quorum": rep.quorum_arbitration,
            "draft_dossier_markdown": rep.draft_dossier_markdown,
        })
    except Exception as e:
        return web.json_response({"success": False, "error": str(e)}, status=500)


async def handle_api_documents_archive(request: web.Request) -> web.Response:
    """
    GET /api/docs/archive & GET /api/documents/archive:
    Lấy danh sách đề thi thời gian thực từ CSDL dùng chung với FTS5 Full-Text Search.
    """
    import aiosqlite
    db_path = config.LOCAL_DB_PATH
    if not db_path.exists():
        return web.json_response({"total": 0, "items": []})

    q = request.query.get("q", "").strip()
    subject_filter = request.query.get("subject", "").strip().upper()
    grade_filter = request.query.get("grade", "").strip()
    limit = min(100, max(1, int(request.query.get("limit", 30))))
    offset = max(0, int(request.query.get("offset", 0)))

    try:
        async with aiosqlite.connect(db_path) as db:
            items = []
            if q:
                # FTS5 Fast Search query
                words = [f'"{w}"' for w in q.split() if w]
                fts_expr = " ".join(words)
                try:
                    sql = """
                        SELECT d.id, d.title, d.file_name, d.subject, d.estimated_level,
                               d.jump_url, d.author_name, d.timestamp, d.page_count,
                               d.file_size_bytes, d.academic_year, d.school_or_department,
                               d.quorum_status
                        FROM documents_archive d
                        WHERE d.id IN (SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?)
                        ORDER BY d.id DESC LIMIT ? OFFSET ?
                    """
                    async with db.execute(sql, (fts_expr, limit, offset)) as cursor:
                        rows = await cursor.fetchall()
                        for r in rows:
                            items.append({
                                "id": r[0], "title": r[1] or r[2], "file_name": r[2],
                                "subject": r[3], "estimated_level": r[4], "jump_url": r[5],
                                "author_name": r[6], "timestamp": r[7], "page_count": r[8],
                                "file_size_bytes": r[9], "academic_year": r[10],
                                "school_or_department": r[11], "quorum_status": r[12],
                            })
                except Exception:
                    pass

            if not items:
                # Regular SQL query with filters
                where_clauses = ["1=1"]
                params = []
                if subject_filter:
                    where_clauses.append("(subject = ? OR subject LIKE ?)")
                    params.extend([subject_filter, f"%{subject_filter}%"])
                if grade_filter:
                    where_clauses.append("estimated_level LIKE ?")
                    params.append(f"%{grade_filter}%")
                where_str = " AND ".join(where_clauses)

                sql = f"""
                    SELECT id, title, file_name, subject, estimated_level,
                           jump_url, author_name, timestamp, page_count,
                           file_size_bytes, academic_year, school_or_department,
                           quorum_status
                    FROM documents_archive
                    WHERE {where_str}
                    ORDER BY id DESC LIMIT ? OFFSET ?
                """
                params.extend([limit, offset])
                async with db.execute(sql, tuple(params)) as cursor:
                    rows = await cursor.fetchall()
                    for r in rows:
                        items.append({
                            "id": r[0], "title": r[1] or r[2], "file_name": r[2],
                            "subject": r[3], "estimated_level": r[4], "jump_url": r[5],
                            "author_name": r[6], "timestamp": r[7], "page_count": r[8],
                            "file_size_bytes": r[9], "academic_year": r[10],
                            "school_or_department": r[11], "quorum_status": r[12],
                        })

            return web.json_response({
                "success": True,
                "total": len(items),
                "limit": limit,
                "offset": offset,
                "items": items,
                "documents": items,
            })
    except Exception as e:
        logger.warning("Lỗi truy vấn kho tài liệu: %s", e)
        return web.json_response({"success": False, "error": str(e), "items": [], "documents": []}, status=500)


async def handle_api_documents_stats(request: web.Request) -> web.Response:
    """GET /api/documents/stats: Thống kê số lượng đề thi trong kho."""
    import aiosqlite
    db_path = config.LOCAL_DB_PATH
    if not db_path.exists():
        return web.json_response({"success": True, "total_real": 0, "unique_items": 0, "duplicate_items": 0})
    try:
        async with aiosqlite.connect(db_path) as db:
            async with db.execute("SELECT COUNT(*), COUNT(DISTINCT file_hash) FROM documents_archive") as cur:
                row = await cur.fetchone()
                total = row[0] if row else 0
                unique = row[1] if row else 0
                return web.json_response({
                    "success": True,
                    "total_real": total,
                    "unique_items": unique,
                    "duplicate_items": max(0, total - unique),
                })
    except Exception as e:
        return web.json_response({"success": False, "error": str(e)}, status=500)


async def handle_api_document_download(request: web.Request) -> web.Response:
    """GET /api/documents/{id}/download: Tải hoặc chuyển tiếp tới link tài liệu."""
    import aiosqlite
    doc_id = request.match_info.get("id")
    db_path = config.LOCAL_DB_PATH
    if not db_path.exists():
        return web.Response(text="Database not found", status=404)
    try:
        async with aiosqlite.connect(db_path) as db:
            async with db.execute(
                "SELECT jump_url, file_name FROM documents_archive WHERE id = ?", (doc_id,)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return web.Response(text="Document not found", status=404)
                jump_url = row[0]
                if jump_url and jump_url.startswith("http"):
                    raise web.HTTPFound(jump_url)
                return web.Response(text=f"Tài liệu #{doc_id}: {row[1]}", status=200)
    except web.HTTPFound:
        raise
    except Exception as e:
        return web.Response(text=f"Download error: {e}", status=500)


async def on_cleanup(app: web.Application) -> None:
    """Dọn dẹp tài nguyên khi tắt server."""
    await bot_client.close()
    await discord_client.close()


def create_app() -> web.Application:
    """Khởi tạo ứng dụng aiohttp web."""
    app = web.Application(middlewares=[_security_middleware], client_max_size=50 * 1024 * 1024)
    app.router.add_get("/", handle_index)
    app.router.add_get("/intro", handle_index)
    app.router.add_get("/hub", handle_index)
    app.router.add_get("/admin", handle_index)
    app.router.add_get("/upload", handle_upload_portal)
    app.router.add_get("/portal", handle_upload_portal)
    for asset_name in (
        "/logo.png",
        "/orbit_logo_transparent.png",
        "/orbit_emblem_core.png",
        "/orbit_full.png",
        "/hyperhub_logo.png",
        "/server_icon.png",
    ):
        app.router.add_get(asset_name, handle_logo)

    # Static assets routes
    dist_assets = WEB_DIR / "dist" / "assets"
    if dist_assets.exists():
        app.router.add_static("/assets", dist_assets)

    dist_fonts = WEB_DIR / "dist" / "fonts"
    public_fonts = WEB_DIR / "public" / "fonts"
    if dist_fonts.exists():
        app.router.add_static("/fonts", dist_fonts)
    elif public_fonts.exists():
        app.router.add_static("/fonts", public_fonts)

    static_dir = WEB_DIR / "static"
    if static_dir.exists():
        app.router.add_static("/static", static_dir)

    # Standard API endpoints
    app.router.add_get("/api/status", handle_api_status)
    app.router.add_get("/api/leaderboard", handle_api_leaderboard)
    app.router.add_get("/api/duels", handle_api_duels)
    app.router.add_get("/api/user/{discord_id}", handle_api_user)
    app.router.add_get("/api/discord/server", handle_api_discord_server)
    app.router.add_get("/api/discord/roles", handle_api_discord_roles)
    app.router.add_post("/api/discord/send", handle_api_discord_send)
    app.router.add_post("/api/notify", handle_api_notify)

    # Document Intake, 3+1 Quorum Arbitration & Absolute Duplicate Guard endpoints
    app.router.add_post("/api/documents/upload", handle_api_document_upload)
    app.router.add_post("/api/upload", handle_api_document_upload)
    app.router.add_post("/api/documents/import_gdrive", handle_api_import_gdrive)
    app.router.add_post("/api/documents/inspect", handle_api_document_inspect)
    app.router.add_post("/api/inspect", handle_api_document_inspect)
    app.router.add_get("/api/docs/archive", handle_api_documents_archive)
    app.router.add_get("/api/documents/archive", handle_api_documents_archive)
    app.router.add_get("/api/documents", handle_api_documents_archive)
    app.router.add_get("/api/documents/stats", handle_api_documents_stats)
    app.router.add_get("/api/documents/{id}/download", handle_api_document_download)

    app.on_cleanup.append(on_cleanup)
    return app


def main() -> None:
    """Chạy Web Server độc lập."""
    app = create_app()
    print("\n" + "=" * 62)
    print(" 🚀 ORBIT | VIETNAM WEB PLATFORM ĐÃ KHỞI CHẠY THÀNH CÔNG!")
    print("=" * 62)
    print(f" 👉 Mở trình duyệt truy cập: http://localhost:{config.WEB_PORT}")
    print(f" 👉 Hoặc:                    http://127.0.0.1:{config.WEB_PORT}")
    print(f" ℹ️  Lắng nghe mạng:        {config.WEB_HOST}:{config.WEB_PORT}")
    print(" ⚠️  Lưu ý: Trình duyệt Windows không hỗ trợ mở trực tiếp '0.0.0.0'.")
    print("    Vui lòng sử dụng 'localhost' hoặc '127.0.0.1'.")
    print("=" * 62 + "\n")
    web.run_app(app, host=config.WEB_HOST, port=config.WEB_PORT, print=lambda msg: None)


if __name__ == "__main__":
    main()
