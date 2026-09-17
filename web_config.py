"""Cấu hình ứng dụng Web & Cầu nối liên kết với Discord Bot và Discord API."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Tải cấu hình từ file .env nếu có (ưu tiên .env trong Web, sau đó tới .env trong Bot)
WEB_DIR = Path(__file__).parent.resolve()
BOT_DIR = WEB_DIR.parent / "Bot"

if (WEB_DIR / ".env").exists():
    load_dotenv(WEB_DIR / ".env")
elif (BOT_DIR / ".env").exists():
    load_dotenv(BOT_DIR / ".env")


class WebConfig:
    """Thiết lập cấu hình Web, Discord API Token và kết nối với Bot."""

    # Địa chỉ Web Server (chạy độc lập)
    WEB_HOST: str = os.getenv("WEB_HOST", "0.0.0.0")
    WEB_PORT: int = int(os.getenv("WEB_PORT", "5000"))

    # ==================== DISCORD DIRECT API ====================
    # Áp dụng Discord Token trực tiếp cho Web để tương tác với Discord REST API
    DISCORD_TOKEN: str = os.getenv("DISCORD_TOKEN", "")
    GUILD_ID: int = int(os.getenv("GUILD_ID", "1532265330079174697"))

    # ==================== BOT REST API BRIDGE ====================
    # Cấu hình cầu nối kết nối với Bot (Hỗ trợ dù Bot và Web ở bất kỳ server nào)
    # - Khi cùng máy: http://localhost:8080
    # - Khi khác server: https://bot.domain.com hoặc IP máy chủ Bot
    BOT_API_URL: str = os.getenv("BOT_API_URL", "http://localhost:8080")
    BOT_API_SECRET: str = os.getenv("BOT_API_SECRET", "hyperhub_bridge_secret_key_2026")

    # ==================== DATABASE ====================
    # CSDL chung (Hỗ trợ cả SQLite cục bộ và PostgreSQL từ xa)
    LOCAL_DB_PATH = (BOT_DIR / "bot.db").resolve()
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{LOCAL_DB_PATH.as_posix()}"
    )


config = WebConfig()
