"""Cầu nối giao tiếp hai chiều giữa Web và Discord Bot (Dual-Channel Client).

Hỗ trợ 2 chế độ linh hoạt:
1. REST API Bridge: Gọi trực tiếp qua HTTP tới Bot (kể cả khi Bot và Web ở 2 máy chủ khác nhau).
2. Direct DB Fallback: Khi chạy cùng máy hoặc chung CSDL từ xa, tự động truy vấn CSDL nếu Bot tạm thời offline.
"""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

try:
    from web_config import config
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))
    from web_config import config

logger = logging.getLogger("web.bridge")


class BotBridgeClient:
    """Client giao tiếp với Discord Bot từ Web."""

    def __init__(
        self,
        base_url: str | None = None,
        secret_key: str | None = None,
    ) -> None:
        self.base_url = (base_url or config.BOT_API_URL).rstrip("/")
        self.secret_key = secret_key or config.BOT_API_SECRET
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=5)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self) -> None:
        """Đóng session aiohttp."""
        if self._session and not self._session.closed:
            await self._session.close()

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "X-Bot-Secret": self.secret_key,
            "Content-Type": "application/json",
        }

    async def get_bot_status(self) -> dict[str, Any]:
        """Lấy trạng thái vận hành của Bot (Online, Ping, Uptime, Guilds)."""
        url = f"{self.base_url}/api/status"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            logger.warning(f"Không thể kết nối tới Bot qua REST API ({url}): {e}")

        # Fallback nếu không kết nối được
        return {
            "status": "offline",
            "bot_user": "Không khả dụng",
            "bot_id": 0,
            "ping_ms": -1,
            "guilds_count": 0,
            "uptime_seconds": 0,
            "error": "Bot Bridge Unreachable",
        }

    async def get_leaderboard(self, mode: str = "ranked", limit: int = 50) -> dict[str, Any]:
        """Lấy bảng xếp hạng (Hỗ trợ gọi REST API hoặc trực tiếp từ Database)."""
        url = f"{self.base_url}/api/leaderboard?mode={mode}&limit={limit}"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            logger.info(f"REST API không phản hồi, chuyển sang fallback CSDL: {e}")

        # Fallback qua CSDL trực tiếp
        return await self._db_fallback_leaderboard(mode=mode, limit=limit)

    async def _db_fallback_leaderboard(self, mode: str = "ranked", limit: int = 50) -> dict[str, Any]:
        """Truy vấn bảng xếp hạng trực tiếp từ CSDL khi không gọi được REST API."""
        try:
            from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
            from sqlalchemy import select, desc

            engine = create_async_engine(config.DATABASE_URL, echo=False)
            session_factory = async_sessionmaker(engine, expire_on_commit=False)

            # Import User model
            import sys
            from pathlib import Path
            bot_dir = Path(__file__).parent.parent.parent / "Bot"
            if str(bot_dir) not in sys.path:
                sys.path.insert(0, str(bot_dir))
            from database.models import User

            async with session_factory() as session:
                if mode == "freedom":
                    stmt = (
                        select(User)
                        .where(User.is_active.is_(True))
                        .order_by(desc(User.rating))
                        .limit(limit)
                    )
                else:
                    stmt = (
                        select(User)
                        .where(User.is_active.is_(True))
                        .order_by(desc(User.ranked_rating))
                        .limit(limit)
                    )
                result = await session.execute(stmt)
                users = result.scalars().all()

                data = []
                for idx, u in enumerate(users):
                    if mode == "freedom":
                        data.append({
                            "rank": idx + 1,
                            "discord_id": u.discord_id,
                            "cf_handle": u.cf_handle or "",
                            "rating": u.rating,
                            "tier": u.rank,
                        })
                    else:
                        data.append({
                            "rank": idx + 1,
                            "discord_id": u.discord_id,
                            "cf_handle": u.cf_handle or "",
                            "ranked_rating": u.ranked_rating,
                            "ranked_tier": u.ranked_rank,
                            "ranked_wins": u.ranked_wins,
                            "ranked_losses": u.ranked_losses,
                            "win_rate": round(
                                (u.ranked_wins / max(1, u.ranked_wins + u.ranked_losses)) * 100, 1
                            ),
                        })

                await engine.dispose()
                return {"mode": mode, "total": len(data), "leaderboard": data, "source": "database"}
        except Exception as db_err:
            logger.error(f"Fallback CSDL thất bại: {db_err}")
            return {"mode": mode, "total": 0, "leaderboard": [], "error": str(db_err)}

    async def get_active_duels(self) -> dict[str, Any]:
        """Lấy danh sách các trận đấu Ranked 1:1 thời gian thực."""
        url = f"{self.base_url}/api/duels/active"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            logger.warning(f"Lỗi lấy danh sách duels từ Bot API: {e}")

        return {"active_count": 0, "duels": []}

    async def get_user_profile(self, discord_id: int) -> dict[str, Any]:
        """Lấy hồ sơ người dùng."""
        url = f"{self.base_url}/api/user/{discord_id}"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            logger.warning(f"Lỗi lấy user profile từ Bot API: {e}")

        return {"error": "Không thể kết nối tới hồ sơ người dùng"}

    async def send_discord_notification(self, channel_id: int, message: str) -> bool:
        """Gửi thông báo từ Web vào một kênh Discord bất kỳ."""
        url = f"{self.base_url}/api/notify"
        try:
            session = await self._get_session()
            payload = {"channel_id": channel_id, "message": message}
            async with session.post(url, headers=self._get_headers(), json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("success", False)
        except Exception as e:
            logger.error(f"Lỗi gửi thông báo Discord: {e}")

        return False
