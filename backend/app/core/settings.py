from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(..., alias="DATABASE_URL")
    database_url_sync: str = Field(..., alias="DATABASE_URL_SYNC")
    debug_sql: bool = Field(False, alias="DEBUG_SQL")
    k_anon: int = Field(15, alias="K_ANON")
    followup_cooldown_hours: int = Field(24, alias="FOLLOWUP_COOLDOWN_HOURS")
    sda_sla_minutes: int = Field(15, alias="SDA_SLA_MINUTES")
    policy_deny_experiments_on_crisis: bool = Field(True, alias="POLICY_DENY_EXPERIMENTS_ON_CRISIS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
