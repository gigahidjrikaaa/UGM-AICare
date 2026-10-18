from __future__ import annotations

import pytest
from app.core.llm_active_model_registry import (
    ActiveChatModelRegistry,
    normalize_openrouter_model_alias,
    is_zai_model_name,
    normalize_zai_direct_model_alias,
    is_zai_direct_model_name,
    normalize_active_chat_model,
    resolve_zai_model_name,
    resolve_zai_direct_model_name,
    build_supported_chat_models,
)


def test_active_chat_model_registry() -> None:
    registry = ActiveChatModelRegistry("initial-model")
    assert registry.get() == "initial-model"

    registry.set("new-model")
    assert registry.get() == "new-model"


def test_normalize_openrouter_model_alias() -> None:
    default = "z-ai/default"
    # Basic normalization
    assert normalize_openrouter_model_alias("  zai  ", default) == default
    assert normalize_openrouter_model_alias("Z-AI", default) == default
    assert normalize_openrouter_model_alias("z.ai", default) == default
    assert normalize_openrouter_model_alias("zai_coding", default) == default
    assert normalize_openrouter_model_alias("z.ai coding", default) == default

    # Prefix zai/
    assert normalize_openrouter_model_alias("zai/gpt-4", default) == "z-ai/gpt-4"

    # Prefix zai:
    assert normalize_openrouter_model_alias("zai:glm-4.7", default) == "z-ai/glm-4.7"
    assert normalize_openrouter_model_alias("zai: ", default) == default
    assert normalize_openrouter_model_alias("zai:provider/model", default) == "provider/model"

    # Prefix z-ai:
    assert normalize_openrouter_model_alias("z-ai:glm-4.7", default) == "z-ai/glm-4.7"
    assert normalize_openrouter_model_alias("z-ai: ", default) == default
    assert normalize_openrouter_model_alias("z-ai:provider/model", default) == "provider/model"

    # No change
    assert normalize_openrouter_model_alias("openai/gpt-4", default) == "openai/gpt-4"
    assert normalize_openrouter_model_alias("", default) == ""
    assert normalize_openrouter_model_alias(None, default) == ""


def test_is_zai_model_name() -> None:
    default = "z-ai/glm-4.7"
    assert is_zai_model_name("z-ai/glm-4.7", default) is True
    assert is_zai_model_name("zai/glm-4.7", default) is True
    assert is_zai_model_name("zai", default) is True
    assert is_zai_model_name("openai/gpt-4", default) is False
    assert is_zai_model_name("", default) is False
    assert is_zai_model_name(None, default) is False


def test_normalize_zai_direct_model_alias() -> None:
    default = "glm-4.7"
    # Basic normalization
    assert normalize_zai_direct_model_alias("zai-direct", default) == default
    assert normalize_zai_direct_model_alias("zai_direct", default) == default
    assert normalize_zai_direct_model_alias("zai-direct-coding", default) == default
    assert normalize_zai_direct_model_alias("zai coding", default) == default
    assert normalize_zai_direct_model_alias("glm", default) == default

    # Prefix zai-direct/
    assert normalize_zai_direct_model_alias("zai-direct/glm-4.7", default) == "glm-4.7"
    assert normalize_zai_direct_model_alias("zai-direct/  ", default) == default

    # Prefix zai_direct/
    assert normalize_zai_direct_model_alias("zai_direct/glm-4.7", default) == "glm-4.7"
    assert normalize_zai_direct_model_alias("zai_direct/  ", default) == default

    # No change
    assert normalize_zai_direct_model_alias("gpt-4", default) == "gpt-4"
    assert normalize_zai_direct_model_alias("", default) == ""
    assert normalize_zai_direct_model_alias(None, default) == ""


def test_is_zai_direct_model_name() -> None:
    default = "glm-4.7"
    assert is_zai_direct_model_name("glm-4.7", default) is True
    assert is_zai_direct_model_name("zai-direct/glm-4.7", default) is True
    assert is_zai_direct_model_name("zai coding", default) is True  # because it normalizes to default "glm-4.7"
    assert is_zai_direct_model_name("gpt-4", default) is False
    assert is_zai_direct_model_name("", default) is False
    assert is_zai_direct_model_name(None, default) is False


def test_normalize_active_chat_model() -> None:
    params = {
        "has_zai_api_key": True,
        "direct_default_model": "glm-4.7",
        "openrouter_default_model": "z-ai/glm-4.7",
        "gemini_auto_alias": "gemini:auto",
    }

    # Empty/None defaults to gemini:auto
    assert normalize_active_chat_model(None, **params) == "gemini:auto"
    assert normalize_active_chat_model("", **params) == "gemini:auto"

    # Gemini aliases
    assert normalize_active_chat_model("gemini", **params) == "gemini:auto"
    assert normalize_active_chat_model("gemini_google", **params) == "gemini:auto"
    assert normalize_active_chat_model("gemini-2.0-flash", **params) == "gemini-2.0-flash"

    # Z.AI OpenRouter
    assert normalize_active_chat_model("zai/glm-4.7", **params) == "z-ai/glm-4.7"
    assert normalize_active_chat_model("z-ai/glm-4.7", **params) == "z-ai/glm-4.7"

    # Z.AI Direct
    assert normalize_active_chat_model("zai-direct/glm-4.7", **params) == "glm-4.7"
    assert normalize_active_chat_model("glm-4.7", **params) == "glm-4.7"

    # Unsupported
    with pytest.raises(ValueError, match="Unsupported active chat model 'openai/gpt-4'"):
        normalize_active_chat_model("openai/gpt-4", **params)


def test_resolve_zai_model_name() -> None:
    params = {
        "openrouter_default_model": "z-ai/default",
    }

    # Preferred model is Z.AI
    assert resolve_zai_model_name("zai/gpt-4", active_model="other", **params) == "z-ai/gpt-4"

    # Active model is Z.AI, preferred is not
    assert resolve_zai_model_name(None, active_model="z-ai/active", **params) == "z-ai/active"
    assert resolve_zai_model_name("openai/gpt-4", active_model="z-ai/active", **params) == "z-ai/active"

    # Fallback to default
    assert resolve_zai_model_name(None, active_model="gemini:auto", **params) == "z-ai/default"


def test_resolve_zai_direct_model_name() -> None:
    params = {
        "direct_default_model": "glm-default",
    }

    # Preferred model is Z.AI Direct
    assert resolve_zai_direct_model_name("zai-direct/glm-4", active_model="other", **params) == "glm-4"
    assert resolve_zai_direct_model_name("glm-4.7", active_model="other", **params) == "glm-4.7"

    # Active model is Z.AI Direct
    assert resolve_zai_direct_model_name(None, active_model="glm-active", **params) == "glm-active"

    # Fallback to default
    assert resolve_zai_direct_model_name(None, active_model="gemini:auto", **params) == "glm-default"


def test_build_supported_chat_models() -> None:
    def dummy_normalizer(m: str | None) -> str:
        if not m: return "auto"
        return m.lower().strip()

    result = build_supported_chat_models(
        gemini_auto_alias="gemini:auto",
        direct_default_model="glm-4.7",
        supported_direct_models=["glm-4.7", "glm-4.6"],
        openrouter_default_model="z-ai/glm-4.7",
        supported_openrouter_models=["z-ai/glm-4.7", "z-ai/glm-4.7-flash"],
        normalizer=dummy_normalizer
    )

    expected = [
        "gemini:auto",
        "glm-4.7",
        "glm-4.6",
        "z-ai/glm-4.7",
        "z-ai/glm-4.7-flash",
    ]
    assert result == expected
    # Ensure deduplication
    assert len(result) == len(set(result))
