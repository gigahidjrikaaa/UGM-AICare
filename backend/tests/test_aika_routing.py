import pytest

from app.agents.aika_orchestrator_graph import (
    _format_personal_memory_block,
    _normalize_user_role,
    should_invoke_agents,
    should_route_to_sca,
)


@pytest.mark.agents
@pytest.mark.unit
def test_normalize_user_role_maps_expected_values() -> None:
    assert _normalize_user_role("user") == "student"
    assert _normalize_user_role("admin") == "admin"
    assert _normalize_user_role("counselor") == "counselor"
    assert _normalize_user_role("unknown") == "student"


@pytest.mark.agents
@pytest.mark.unit
def test_format_personal_memory_block_empty_when_no_facts() -> None:
    state = {"personal_context": {"remembered_facts": []}}
    assert _format_personal_memory_block(state) == ""


@pytest.mark.agents
@pytest.mark.unit
def test_format_personal_memory_block_caps_at_20_and_strips() -> None:
    facts = ["  a ", "", "b"] + [f"x{i}" for i in range(50)]
    state = {"personal_context": {"remembered_facts": facts}}

    rendered = _format_personal_memory_block(state)

    assert rendered.startswith("User memory")
    assert "- a" in rendered
    assert "- b" in rendered
    # After stripping empties, the list is: a, b, x0..x17 (20 items total)
    assert "\n- x17" in rendered
    assert "x18" not in rendered  # capped at 20 items


@pytest.mark.agents
@pytest.mark.unit
def test_should_invoke_agents_routes_by_next_step() -> None:
    assert should_invoke_agents({"next_step": "cma", "needs_agents": True}) == "invoke_cma"
    assert should_invoke_agents({"next_step": "tca", "needs_agents": True}) == "invoke_tca"
    assert should_invoke_agents({"next_step": "ia", "needs_agents": True}) == "invoke_ia"
    assert should_invoke_agents({"next_step": "sta", "needs_agents": True}) == "invoke_sta"


@pytest.mark.agents
@pytest.mark.unit
def test_should_invoke_agents_fallbacks_to_tca_when_needs_agents_true() -> None:
    assert should_invoke_agents({"needs_agents": True}) == "invoke_tca"


@pytest.mark.agents
@pytest.mark.unit
def test_should_invoke_agents_ends_when_needs_agents_false() -> None:
    assert should_invoke_agents({"needs_agents": False}) == "end"


@pytest.mark.agents
@pytest.mark.unit
def test_should_route_to_sca_routes_high_to_sda_and_tca_to_sca() -> None:
    assert should_route_to_sca({"severity": "high"}) == "route_sda"
    assert should_route_to_sca({"severity": "critical"}) == "route_sda"
    assert should_route_to_sca({"severity": "moderate", "next_step": "tca"}) == "invoke_sca"
    assert should_route_to_sca({"severity": "low"}) == "synthesize"
