# backend/app/core/cbt_module_types.py
from typing import TypedDict, Callable, Dict, Any, Optional, Union

# Type for the data collected during a module's progression
CBTModuleData = Dict[str, Any]

# Type for a function that processes a user's response for a step
# It takes the user's response and the current module data,
# and returns the updated module data.
ResponseProcessor = Callable[[str, CBTModuleData], CBTModuleData]

# Type for a function that dynamically generates a prompt for a step,
# potentially using data already collected in the module.
DynamicPromptGenerator = Callable[[CBTModuleData], str]

class CBTStep(TypedDict, total=False):
    """
    Defines the structure for a single step within a CBT module.
    `total=False` means not all keys are required for every step.
    """
    prompt_template: Optional[str]  # Static prompt
    dynamic_prompt_generator: Optional[DynamicPromptGenerator] # Function to generate prompt
    response_processor: Optional[ResponseProcessor] # Function to process user's response
    action: Optional[str]  # e.g., "complete_module" or custom actions

class CBTModule(TypedDict):
    """
    Defines the structure for a CBT module.
    """
    id: str
    name: str
    description: str
    steps: Dict[int, CBTStep] # Steps are keyed by an integer step number