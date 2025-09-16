from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.dependencies import get_async_db
from app.schemas import cbt_modules as cbt_modules_schema
from app.crud import cbt_modules as cbt_modules_crud

router = APIRouter(prefix="/api/v1/admin/cbt-modules", tags=["Admin - CBT Modules"])

@router.get("", response_model=cbt_modules_schema.CbtModuleResponse)
async def get_cbt_modules(db: AsyncSession = Depends(get_async_db), page: int = 1, limit: int = 10):
    skip = (page - 1) * limit
    modules = await cbt_modules_crud.get_cbt_modules(db, skip=skip, limit=limit)
    count = await cbt_modules_crud.get_cbt_modules_count(db)
    return {"items": modules, "total_count": count}

@router.post("", response_model=cbt_modules_schema.CbtModule)
async def create_cbt_module(module: cbt_modules_schema.CbtModuleCreate, db: AsyncSession = Depends(get_async_db)):
    return await cbt_modules_crud.create_cbt_module(db=db, module=module)

@router.get("/{module_id}", response_model=cbt_modules_schema.CbtModule)
async def get_cbt_module(module_id: int, db: AsyncSession = Depends(get_async_db)):
    db_module = await cbt_modules_crud.get_cbt_module(db, module_id=module_id)
    if db_module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return db_module

@router.put("/{module_id}", response_model=cbt_modules_schema.CbtModule)
async def update_cbt_module(module_id: int, module: cbt_modules_schema.CbtModuleCreate, db: AsyncSession = Depends(get_async_db)):
    db_module = await cbt_modules_crud.update_cbt_module(db, module_id=module_id, module=module)
    if db_module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return db_module

@router.delete("/{module_id}")
async def delete_cbt_module(module_id: int, db: AsyncSession = Depends(get_async_db)):
    db_module = await cbt_modules_crud.delete_cbt_module(db, module_id=module_id)
    if db_module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"ok": True}

@router.get("/{module_id}/steps", response_model=List[cbt_modules_schema.CbtModuleStep])
async def get_cbt_module_steps(module_id: int, db: AsyncSession = Depends(get_async_db)):
    steps = await cbt_modules_crud.get_cbt_module_steps(db, module_id=module_id)
    return steps

@router.post("/{module_id}/steps", response_model=cbt_modules_schema.CbtModuleStep)
async def create_cbt_module_step(module_id: int, step: cbt_modules_schema.CbtModuleStepCreate, db: AsyncSession = Depends(get_async_db)):
    return await cbt_modules_crud.create_cbt_module_step(db=db, step=step)

@router.get("/steps/{step_id}", response_model=cbt_modules_schema.CbtModuleStep)
async def get_cbt_module_step(step_id: int, db: AsyncSession = Depends(get_async_db)):
    db_step = await cbt_modules_crud.get_cbt_module_step(db, step_id=step_id)
    if db_step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    return db_step

@router.put("/steps/{step_id}", response_model=cbt_modules_schema.CbtModuleStep)
async def update_cbt_module_step(step_id: int, step: cbt_modules_schema.CbtModuleStepCreate, db: AsyncSession = Depends(get_async_db)):
    db_step = await cbt_modules_crud.update_cbt_module_step(db, step_id=step_id, step=step)
    if db_step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    return db_step

@router.delete("/steps/{step_id}")
async def delete_cbt_module_step(step_id: int, db: AsyncSession = Depends(get_async_db)):
    db_step = await cbt_modules_crud.delete_cbt_module_step(db, step_id=step_id)
    if db_step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    return {"ok": True}
