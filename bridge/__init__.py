"""Module cầu nối tương tác thời gian thực giữa Web, Discord Bot và Discord REST API."""

from .bot_client import BotBridgeClient
from .discord_client import DiscordDirectClient

__all__ = ["BotBridgeClient", "DiscordDirectClient"]
