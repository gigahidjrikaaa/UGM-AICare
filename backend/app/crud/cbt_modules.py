from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app import models
from app.schemas import cbt_modules as cbt_modules_schema

async def get_cbt_module(db: AsyncSession, module_id: int):
    result = await db.execute(select(models.CbtModule).options(selectinload(models.CbtModule.steps)).filter(models.CbtModule.id == module_id))
    return result.scalar_one_or_none()

async def get_cbt_modules(db: AsyncSession, skip: int = 0, limit: int = 10):
    result = await db.execute(select(models.CbtModule).options(selectinload(models.CbtModule.steps)).offset(skip).limit(limit))
    return result.scalars().all()

async def get_cbt_modules_count(db: AsyncSession):
    result = await db.execute(select(func.count(models.CbtModule.id)))
    return result.scalar_one()

async def create_cbt_module(db: AsyncSession, module: cbt_modules_schema.CbtModuleCreate):
    db_module = models.CbtModule(**module.dict())
    db.add(db_module)
    await db.commit()
    await db.refresh(db_module)
    return db_module

async def update_cbt_module(db: AsyncSession, module_id: int, module: cbt_modules_schema.CbtModuleCreate):
    db_module = await get_cbt_module(db, module_id)
    if db_module:
        for key, value in module.dict().items():
            setattr(db_module, key, value)
        await db.commit()
        await db.refresh(db_module)
    return db_module

async def delete_cbt_module(db: AsyncSession, module_id: int):
    db_module = await get_cbt_module(db, module_id)
    if db_module:
        await db.delete(db_module)
        await db.commit()
    return db_module

async def get_cbt_module_step(db: AsyncSession, step_id: int):
    result = await db.execute(select(models.CbtModuleStep).filter(models.CbtModuleStep.id == step_id))
    return result.scalar_one_or_none()

async def get_cbt_module_steps(db: AsyncSession, module_id: int, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.CbtModuleStep).filter(models.CbtModuleStep.module_id == module_id).offset(skip).limit(limit))
    return result.scalars().all()

async def create_cbt_module_step(db: AsyncSession, step: cbt_modules_schema.CbtModuleStepCreate):
    db_step = models.CbtModuleStep(**step.dict())
    db.add(db_step)
    await db.commit()
    await db.refresh(db_step)
    return db_step

async def update_cbt_module_step(db: AsyncSession, step_id: int, step: cbt_modules_schema.CbtModuleStepCreate):
    db_step = await get_cbt_module_step(db, step_id)
    if db_step:
        for key, value in step.dict().items():
            setattr(db_step, key, value)
        await db.commit()
        await db.refresh(db_step)
    return db_step

async def delete_cbt_module_step(db: AsyncSession, step_id: int):
    db_step = await get_cbt_module_step(db, step_id)
    if db_step:
        await db.delete(db_step)
        await db.commit()
    return db_step