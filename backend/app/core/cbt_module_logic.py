# backend/app/core/cbt_module_logic.py
from typing import Dict, Any, Tuple, Optional, Literal
from app.core.cbt_module_types import CBTModule, CBTStep, CBTModuleData, ResponseProcessor, DynamicPromptGenerator

# Import individual module definitions
from app.core.cbt_modules.cognitive_restructuring_module import COGNITIVE_RESTRUCTURING_MODULE # Assuming you refactor this
from app.core.cbt_modules.problem_solving_module import PROBLEM_SOLVING_MODULE # Assuming you refactor this
from app.core.cbt_modules.express_feelings_module import EXPRESS_FEELINGS_MODULE
from app.core.cbt_modules.deal_with_guilt_module import DEAL_WITH_GUILT_MODULE


# The central registry of all available CBT modules
CBT_MODULES_REGISTRY: Dict[str, CBTModule] = {
    COGNITIVE_RESTRUCTURING_MODULE["id"]: COGNITIVE_RESTRUCTURING_MODULE,
    PROBLEM_SOLVING_MODULE["id"]: PROBLEM_SOLVING_MODULE,
    EXPRESS_FEELINGS_MODULE["id"]: EXPRESS_FEELINGS_MODULE,
    DEAL_WITH_GUILT_MODULE["id"]: DEAL_WITH_GUILT_MODULE,
}

def get_module_definition(module_id: str) -> Optional[CBTModule]:
    """Retrieves a module definition from the registry."""
    return CBT_MODULES_REGISTRY.get(module_id)

def get_module_step(module_id: str, step_number: int) -> Optional[CBTStep]:
    """Retrieves a specific step from a module definition."""
    module = get_module_definition(module_id)
    if module:
        return module["steps"].get(step_number)
    return None

def get_module_step_prompt(
    module_id: str,
    step_number: int,
    module_data: CBTModuleData
) -> Optional[str]:
    """
    Generates the prompt for a given module step.
    It prioritizes a dynamic prompt generator if available, otherwise uses the static template.
    """
    step = get_module_step(module_id, step_number)
    if not step:
        return None

    if "dynamic_prompt_generator" in step and step["dynamic_prompt_generator"]:
        generator: DynamicPromptGenerator = step["dynamic_prompt_generator"]
        return generator(module_data)
    elif "prompt_template" in step and step["prompt_template"]:
        return step["prompt_template"]
    
    # If a step is defined but has no prompt (e.g. only an action), return an empty string or specific message
    return "Tidak ada prompt untuk langkah ini." # Or handle as an error/empty response

def process_user_response_for_step(
    module_id: str,
    step_number: int,
    user_response: str,
    module_data: CBTModuleData
) -> Tuple[CBTModuleData, int, Optional[str]]:
    """
    Processes the user's response for a given module step.

    Returns:
        Tuple of (updated_module_data, next_step_number, optional_action_string).
        The action string (e.g., "complete_module") is returned if the step defines one.
    """
    step = get_module_step(module_id, step_number)
    updated_data = module_data.copy() # Work on a copy

    if step and "response_processor" in step and step["response_processor"]:
        processor: ResponseProcessor = step["response_processor"]
        updated_data = processor(user_response, updated_data)

    next_step_number = step_number + 1
    action = step.get("action") if step else None
    
    # Handle custom internal actions if defined by a processor
    # For example, 'offer_exit' from express_feelings_module's _step1_processor
    # This internal signal can influence the next prompt without necessarily changing the step number yet
    # or could lead to a specific branch/end state not tied to linear step progression.
    # For now, we'll keep the primary flow linear (step_number + 1) unless an 'action' like 'complete_module' is hit.
    # More complex branching logic could be added here if needed.

    if action == "complete_module":
        # Next step isn't relevant if module is complete, but we return it for consistency.
        # The router (chat.py) will use the 'action' to clear state.
        return updated_data, next_step_number, action

    # Check if the next step exists. If not, it implies module completion by running out of steps.
    if not get_module_step(module_id, next_step_number) and not action:
         # If there's no explicit 'complete_module' action on the current step,
         # but the next step doesn't exist, treat as module completion.
        return updated_data, next_step_number, "complete_module"

    return updated_data, next_step_number, action

# Helper to get basic module info (e.g., for listing modules to the user)
def get_available_modules_info() -> list[Dict[str, str]]:
    """Returns a list of module IDs, names, and descriptions."""
    return [
        {"id": mod["id"], "name": mod["name"], "description": mod["description"]}
        for mod in CBT_MODULES_REGISTRY.values()
    ]