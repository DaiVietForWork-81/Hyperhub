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

# Đảm bảo đường dẫn Web nằm trong sys.path
WEB_DIR = Path(__file__).parent.resolve()
if str(WEB_DIR) not in sys.path:
    sys.path.insert(0, str(WEB_DIR))

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


async def handle_index(request: web.Request) -> web.Response:
    """Trả về trang Landing Page chính của HyperHub (React SPA hoặc Template)."""
    dist_index = WEB_DIR / "dist" / "index.html"
    if dist_index.exists():
        content = dist_index.read_text("utf-8")
        return web.Response(text=content, content_type="text/html")
    template_path = WEB_DIR / "templates" / "index.html"
    if template_path.exists():
        content = template_path.read_text("utf-8")
        return web.Response(text=content, content_type="text/html")
    return web.Response(
        text="<h1>HyperHub Web Server</h1><p>Landing page not found.</p>",
        content_type="text/html",
    )


async def handle_logo(request: web.Request) -> web.StreamResponse:
    """Trả về file logo.png cho favicon và các thẻ hình ảnh."""
    logo_path = WEB_DIR / "dist" / "logo.png"
    if not logo_path.exists():
        logo_path = WEB_DIR / "static" / "logo.png"
    if logo_path.exists():
        return web.FileResponse(logo_path)
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
    """POST /api/discord/send: Gửi tin nhắn trực tiếp qua DISCORD_TOKEN."""
    try:
        body = await request.json()
        channel_id = int(body.get("channel_id", 0))
        message = body.get("message", "")
        if not channel_id or not message:
            return web.json_response({"error": "Thiếu channel_id hoặc message"}, status=400)

        success = await discord_client.send_channel_message(channel_id, message)
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def handle_api_notify(request: web.Request) -> web.Response:
    """POST /api/notify: Gửi thông báo tới kênh Discord qua Bot Bridge."""
    try:
        body = await request.json()
        channel_id = int(body.get("channel_id", 0))
        message = body.get("message", "")
        success = await bot_client.send_discord_notification(channel_id, message)
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def on_cleanup(app: web.Application) -> None:
    """Dọn dẹp tài nguyên khi tắt server."""
    await bot_client.close()
    await discord_client.close()


def create_app() -> web.Application:
    """Khởi tạo ứng dụng aiohttp web."""
    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/logo.png", handle_logo)

    # Static assets routes
    dist_assets = WEB_DIR / "dist" / "assets"
    if dist_assets.exists():
        app.router.add_static("/assets", dist_assets)

    static_dir = WEB_DIR / "static"
    if static_dir.exists():
        app.router.add_static("/static", static_dir)

    app.router.add_get("/api/status", handle_api_status)
    app.router.add_get("/api/leaderboard", handle_api_leaderboard)
    app.router.add_get("/api/duels", handle_api_duels)
    app.router.add_get("/api/user/{discord_id}", handle_api_user)
    app.router.add_get("/api/discord/server", handle_api_discord_server)
    app.router.add_get("/api/discord/roles", handle_api_discord_roles)
    app.router.add_post("/api/discord/send", handle_api_discord_send)
    app.router.add_post("/api/notify", handle_api_notify)
    app.on_cleanup.append(on_cleanup)
    return app


def main() -> None:
    """Chạy Web Server độc lập."""
    app = create_app()
    print("\n" + "=" * 62)
    print(" 🚀 HYPERHUB WEB PLATFORM ĐÃ KHỞI CHẠY THÀNH CÔNG!")
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
