from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.database import get_async_db, async_engine
from app.dependencies import get_admin_user

router = APIRouter(prefix="/database", tags=["Admin Database Viewer"])

class DeleteRowsRequest(BaseModel):
    rows: List[Dict[str, Any]]

@router.get("/tables", response_model=List[str])
async def list_tables(
    admin: Any = Depends(get_admin_user)
):
    """List all tables in the database."""
    try:
        async with async_engine.connect() as conn:
            tables = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_table_names()
            )
        return tables
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tables/{table_name}")
async def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    admin: Any = Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get data and schema for a specific table."""
    try:
        # 1. Get Schema (Columns)
        async with async_engine.connect() as conn:
            # Verify table exists to prevent SQL injection via table name
            tables = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_table_names()
            )
            if table_name not in tables:
                raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

            columns = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_columns(table_name)
            )
            
            # Get primary key
            pk_constraint = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_pk_constraint(table_name)
            )
            primary_keys = pk_constraint.get('constrained_columns', [])

        # 2. Get Data (Rows)
        # We use text() for dynamic table name, but we validated it above against the schema
        offset = (page - 1) * limit
        
        # Count total rows
        count_query = text(f"SELECT COUNT(*) FROM {table_name}")
        result_count = await db.execute(count_query)
        total_rows = result_count.scalar()

        # Fetch paginated rows
        # Order by primary key if available, otherwise default
        order_clause = ""
        if primary_keys:
            order_clause = f"ORDER BY {', '.join(primary_keys)} DESC"
            
        data_query = text(f"SELECT * FROM {table_name} {order_clause} LIMIT :limit OFFSET :offset")
        result_data = await db.execute(data_query, {"limit": limit, "offset": offset})
        
        # Convert rows to dicts
        rows = [dict(row._mapping) for row in result_data]

        return {
            "table_name": table_name,
            "columns": [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "primary_key": col["name"] in primary_keys
                }
                for col in columns
            ],
            "data": rows,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_rows": total_rows,
                "total_pages": (total_rows + limit - 1) // limit
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tables/{table_name}")
async def delete_table_rows(
    table_name: str,
    request: DeleteRowsRequest,
    admin: Any = Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Delete specific rows from a table."""
    try:
        # 1. Verify table and get PKs
        async with async_engine.connect() as conn:
            tables = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_table_names()
            )
            if table_name not in tables:
                raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

            pk_constraint = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_pk_constraint(table_name)
            )
            primary_keys = pk_constraint.get('constrained_columns', [])
            
            if not primary_keys:
                raise HTTPException(status_code=400, detail=f"Table '{table_name}' has no primary key, cannot delete rows safely.")

        # 2. Delete Rows
        deleted_count = 0
        
        for row_keys in request.rows:
            # Validate that we have all PKs for this row
            if not all(pk in row_keys for pk in primary_keys):
                continue # Skip invalid requests
                
            # Construct WHERE clause
            conditions = []
            params = {}
            for i, pk in enumerate(primary_keys):
                param_name = f"val_{i}"
                conditions.append(f"{pk} = :{param_name}")
                params[param_name] = row_keys[pk]
            
            where_clause = " AND ".join(conditions)
            stmt = text(f"DELETE FROM {table_name} WHERE {where_clause}")
            
            result = await db.execute(stmt, params)
            deleted_count += result.rowcount
            
        await db.commit()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Successfully deleted {deleted_count} rows from {table_name}"
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
