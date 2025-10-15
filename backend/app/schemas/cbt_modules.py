from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class CbtModuleStepBase(BaseModel):
    module_id: int
    step_order: int
    step_type: str
    content: str
    user_input_type: Optional[str] = None
    user_input_variable: Optional[str] = None
    feedback_prompt: Optional[str] = None
    options: Optional[dict] = None
    tool_to_run: Optional[str] = None
    is_skippable: bool = False
    delay_after_ms: int = 0
    parent_id: Optional[int] = None
    extra_data: Optional[dict] = None

class CbtModuleStepCreate(CbtModuleStepBase):
    pass

class CbtModuleStep(CbtModuleStepBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes = True)

class CbtModuleBase(BaseModel):
    title: str
    description: str

class CbtModuleCreate(CbtModuleBase):
    pass

class CbtModule(CbtModuleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    steps: List[CbtModuleStep] = []

    model_config = ConfigDict(from_attributes = True)

class CbtModuleResponse(BaseModel):
    items: List[CbtModule]
    total_count: int