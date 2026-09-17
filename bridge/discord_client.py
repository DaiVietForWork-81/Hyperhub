"""Client tương tác trực tiếp với Discord REST API sử dụng DISCORD_TOKEN.

Cho phép ứng dụng Web độc lập có thể truy vấn thông tin Máy chủ (Guild),
Vai trò (Roles), Kênh (Channels), Thành viên (Members) và Gửi tin nhắn trực tiếp
tới Discord mà không bắt buộc tiến trình Discord Bot phải chạy cùng lúc.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp
from web_config import config

logger = logging.getLogger("web.discord_client")
DISCORD_API_BASE = "https://discord.com/api/v10"


class DiscordDirectClient:
    """Client giao tiếp trực tiếp với Discord API v10 qua DISCORD_TOKEN."""

    def __init__(self, token: str | None = None) -> None:
        self.token = token or config.DISCORD_TOKEN
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=8)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self) -> None:
        if self._session and not getattr(self._session, "closed", True):
            res = self._session.close()
            if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                await res

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bot {self.token}",
            "User-Agent": "HyperHubWeb/1.0 (Discord REST Bridge)",
            "Content-Type": "application/json",
        }

    async def get_bot_user(self) -> dict[str, Any]:
        """Lấy thông tin Bot Discord từ token."""
        url = f"{DISCORD_API_BASE}/users/@me"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    return await resp.json()
                logger.warning(f"Discord API /users/@me trả về status {resp.status}")
        except Exception as e:
            logger.error(f"Lỗi truy vấn Bot User qua Discord API: {e}")
        return {"error": "Không thể kết nối Discord API"}

    async def get_guild(self, guild_id: int | None = None) -> dict[str, Any]:
        """Lấy thông tin Máy chủ Discord (Tên, Icon, Số lượng thành viên...)."""
        gid = guild_id or config.GUILD_ID
        url = f"{DISCORD_API_BASE}/guilds/{gid}?with_counts=true"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    icon_hash = data.get("icon")
                    icon_url = (
                        f"https://cdn.discordapp.com/icons/{gid}/{icon_hash}.png?size=256"
                        if icon_hash
                        else None
                    )
                    return {
                        "id": data.get("id"),
                        "name": data.get("name"),
                        "icon_url": icon_url,
                        "approximate_member_count": data.get("approximate_member_count", 0),
                        "approximate_presence_count": data.get("approximate_presence_count", 0),
                        "description": data.get("description"),
                    }
                logger.warning(f"Discord API /guilds/{gid} trả về {resp.status}")
        except Exception as e:
            logger.error(f"Lỗi truy vấn Guild {gid}: {e}")
        return {"error": "Không thể kết nối Discord Guild"}

    async def get_guild_roles(self, guild_id: int | None = None) -> list[dict[str, Any]]:
        """Lấy danh sách các vai trò (Roles) trong máy chủ."""
        gid = guild_id or config.GUILD_ID
        url = f"{DISCORD_API_BASE}/guilds/{gid}/roles"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    roles = await resp.json()
                    roles.sort(key=lambda r: r.get("position", 0), reverse=True)
                    return roles
        except Exception as e:
            logger.error(f"Lỗi lấy roles của guild {gid}: {e}")
        return []

    async def get_guild_member(self, user_id: int, guild_id: int | None = None) -> dict[str, Any]:
        """Lấy thông tin thành viên trong máy chủ (Nick, Roles, Joined At)."""
        gid = guild_id or config.GUILD_ID
        url = f"{DISCORD_API_BASE}/guilds/{gid}/members/{user_id}"
        try:
            session = await self._get_session()
            async with session.get(url, headers=self._get_headers()) as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            logger.error(f"Lỗi truy vấn thành viên {user_id}: {e}")
        return {"error": "Không tìm thấy thành viên trong server"}

    async def send_channel_message(
        self, channel_id: int, content: str, embed: dict[str, Any] | None = None
    ) -> bool:
        """Gửi tin nhắn hoặc Embed trực tiếp vào kênh Discord thông qua REST API."""
        url = f"{DISCORD_API_BASE}/channels/{channel_id}/messages"
        payload: dict[str, Any] = {"content": content}
        if embed:
            payload["embeds"] = [embed]

        try:
            session = await self._get_session()
            async with session.post(url, headers=self._get_headers(), json=payload) as resp:
                if resp.status in (200, 201):
                    return True
                logger.warning(f"Gửi tin nhắn thất bại HTTP {resp.status}")
        except Exception as e:
            logger.error(f"Lỗi gửi tin nhắn trực tiếp qua Discord API: {e}")
        return False
