from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, asc, or_, select
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import logging

from app.database import get_async_db
from app.models import User, Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
from app.dependencies import get_current_active_user, get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Admin - Surveys"],
    dependencies=[Depends(get_admin_user)]
)

class SurveyQuestionCreate(BaseModel):
    question_text: str
    question_type: str
    options: Optional[List[str]] = None

class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    questions: List[SurveyQuestionCreate]

class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SurveyQuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None

    class Config:
        from_attributes = True

class SurveyResponseModel(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    questions: List[SurveyQuestionResponse]

    class Config:
        from_attributes = True

@router.get("", response_model=List[SurveyResponseModel])
async def get_surveys(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Survey).order_by(desc(Survey.created_at)))
    surveys = result.scalars().all()
    return surveys

@router.post("", response_model=SurveyResponseModel, status_code=status.HTTP_201_CREATED)
async def create_survey(survey_data: SurveyCreate, db: AsyncSession = Depends(get_async_db)):
    db_survey = Survey(title=survey_data.title, description=survey_data.description)
    db.add(db_survey)
    await db.commit()
    await db.refresh(db_survey)

    for question_data in survey_data.questions:
        db_question = SurveyQuestion(
            survey_id=db_survey.id,
            **question_data.dict()
        )
        db.add(db_question)
    
    await db.commit()
    await db.refresh(db_survey)

    return db_survey

@router.get("/{survey_id}", response_model=SurveyResponseModel)
async def get_survey(survey_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Survey).filter(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    return survey

@router.put("/{survey_id}", response_model=SurveyResponseModel)
async def update_survey(survey_id: int, survey_data: SurveyUpdate, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Survey).filter(Survey.id == survey_id))
    db_survey = result.scalar_one_or_none()
    if not db_survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    update_data = survey_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_survey, key, value)
    
    db.add(db_survey)
    await db.commit()
    await db.refresh(db_survey)
    return db_survey

@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_survey(survey_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Survey).filter(Survey.id == survey_id))
    db_survey = result.scalar_one_or_none()
    if not db_survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    await db.delete(db_survey)
    await db.commit()

class SurveyAnswerResponse(BaseModel):
    id: int
    question_text: str
    answer_text: str

    class Config:
        from_attributes = True

class SurveySubmissionResponse(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    answers: List[SurveyAnswerResponse]

    class Config:
        from_attributes = True

@router.get("/{survey_id}/responses", response_model=List[SurveySubmissionResponse])
async def get_survey_responses(survey_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(SurveyResponse)
        .filter(SurveyResponse.survey_id == survey_id)
        .order_by(desc(SurveyResponse.created_at))
    )
    responses = result.scalars().all()
    
    response_models = []
    for response in responses:
        result = await db.execute(
            select(SurveyAnswer.id, SurveyQuestion.question_text, SurveyAnswer.answer_text)
            .join(SurveyQuestion)
            .filter(SurveyAnswer.response_id == response.id)
        )
        answers = result.all()
        response_models.append(
            SurveySubmissionResponse(
                id=response.id,
                user_id=response.user_id,
                created_at=response.created_at,
                answers=[
                    SurveyAnswerResponse(id=a.id, question_text=a.question_text, answer_text=a.answer_text) for a in answers
                ]
            )
        )
    return response_models

user_router = APIRouter(
    tags=["Surveys"],
    dependencies=[Depends(get_current_active_user)]
)

@user_router.get("/active", response_model=SurveyResponseModel)
async def get_active_survey(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Survey).filter(Survey.is_active == True).order_by(desc(Survey.created_at)))
    survey = result.scalars().first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active survey found")
    return survey

class SurveyAnswerCreate(BaseModel):
    question_id: int
    answer_text: str

class SurveyResponseCreate(BaseModel):
    answers: List[SurveyAnswerCreate]

@user_router.post("/{survey_id}/responses", status_code=status.HTTP_201_CREATED)
async def submit_survey_response(
    survey_id: int,
    response_data: SurveyResponseCreate,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_active_user)
):
    db_response = SurveyResponse(survey_id=survey_id, user_id=user.id)
    db.add(db_response)
    await db.commit()
    await db.refresh(db_response)

    for answer_data in response_data.answers:
        db_answer = SurveyAnswer(
            response_id=db_response.id,
            **answer_data.dict()
        )
        db.add(db_answer)
    
    await db.commit()