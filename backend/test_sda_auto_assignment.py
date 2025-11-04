"""
Test script for SDA Auto-Assignment implementation.
Verifies counselor workload balancing and assignment logic.
"""
import asyncio
import sys
from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.agents.sda.sda_graph import auto_assign_node
from app.agents.graph_state import SDAState
from app.domains.mental_health.models import Case, CaseStatusEnum, CaseSeverityEnum
from app.models.agent_user import AgentUser, AgentRoleEnum
from app.models.system import CaseAssignment


# Database connection
DATABASE_URL = "postgresql+asyncpg://giga:aicare123@localhost:5432/aicare_db"


async def test_sda_auto_assignment():
    """Test SDA auto-assignment algorithm."""
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("\n" + "="*80)
    print("TESTING SDA AUTO-ASSIGNMENT")
    print("="*80 + "\n")

    async with async_session() as session:
        async with session.begin():
            # Step 1: Check existing counsellors
            print("Step 1: Checking existing counsellors...")
            counsellors_stmt = select(AgentUser).where(
                AgentUser.role == AgentRoleEnum.counselor
            )
            counsellors_result = await session.execute(counsellors_stmt)
            counsellors = counsellors_result.scalars().all()
            
            if not counsellors:
                print("❌ No counsellors found! Creating test counsellors...")
                # Create 3 test counsellors
                for i in range(1, 4):
                    counsellor = AgentUser(
                        id=f"test_counsellor_{i}",
                        role=AgentRoleEnum.counselor,
                        created_at=datetime.now()
                    )
                    session.add(counsellor)
                await session.flush()
                print(f"✅ Created 3 test counsellors")
                
                # Re-query
                counsellors_result = await session.execute(counsellors_stmt)
                counsellors = counsellors_result.scalars().all()
            
            print(f"✅ Found {len(counsellors)} counsellors:")
            for counsellor in counsellors:
                print(f"   - {counsellor.id}")
            
            # Step 2: Check active cases per counsellor
            print("\nStep 2: Checking workload...")
            active_statuses = [
                CaseStatusEnum.new,
                CaseStatusEnum.in_progress,
                CaseStatusEnum.waiting
            ]
            
            for counsellor in counsellors:
                cases_stmt = select(Case).where(
                    Case.assigned_to == counsellor.id,
                    Case.status.in_(active_statuses)
                )
                cases_result = await session.execute(cases_stmt)
                cases = cases_result.scalars().all()
                print(f"   - {counsellor.id}: {len(cases)} active cases")
            
            # Step 3: Create test case
            print("\nStep 3: Creating test case...")
            test_case = Case(
                id=uuid4(),
                status=CaseStatusEnum.new,
                severity=CaseSeverityEnum.high,
                user_hash="test_user_hash",
                session_id="test_session",
                conversation_id=None,
                summary_redacted="Test case for auto-assignment",
                triage_assessment_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            session.add(test_case)
            await session.flush()
            print(f"✅ Created test case: {test_case.id}")
            
            # Step 4: Run auto-assignment
            print("\nStep 4: Running auto-assignment...")
            state: SDAState = {
                "case_id": test_case.id,
                "user_hash": "test_user_hash",
                "session_id": "test_session",
                "severity": "high",
                "execution_id": "test_execution",
                "errors": [],
                "execution_path": []
            }
            
            updated_state = await auto_assign_node(state, session)
            
            # Step 5: Verify assignment
            print("\nStep 5: Verifying assignment...")
            if "assigned_to" in updated_state and updated_state["assigned_to"]:
                print(f"✅ Case assigned to: {updated_state['assigned_to']}")
                print(f"   Assignment ID: {updated_state.get('assignment_id')}")
                print(f"   Reason: {updated_state.get('assignment_reason')}")
                print(f"   Counsellor workload: {updated_state.get('assigned_workload')} active cases")
                
                # Verify in database
                await session.refresh(test_case)
                print(f"\nDatabase verification:")
                print(f"   Case.assigned_to: {test_case.assigned_to}")
                print(f"   Case.status: {test_case.status.value}")
                
                # Check CaseAssignment record
                assignment_stmt = select(CaseAssignment).where(
                    CaseAssignment.case_id == test_case.id
                )
                assignment_result = await session.execute(assignment_stmt)
                assignment = assignment_result.scalar_one_or_none()
                
                if assignment:
                    print(f"   CaseAssignment created:")
                    print(f"      ID: {assignment.id}")
                    print(f"      Assigned to: {assignment.assigned_to}")
                    print(f"      Assigned at: {assignment.assigned_at}")
                    print(f"      Assigned by: {assignment.assigned_by} (None = auto-assigned)")
                    success = True
                else:
                    print(f"❌ CaseAssignment record not found!")
                    success = False
            else:
                print(f"❌ Assignment failed!")
                print(f"   Reason: {updated_state.get('assignment_reason')}")
                print(f"   Errors: {updated_state.get('errors')}")
                success = False
            
            # Cleanup: Delete test case and assignment
            print("\n" + "="*80)
            print("Cleaning up test data...")
            if assignment:
                await session.delete(assignment)
            await session.delete(test_case)
            await session.commit()
            print("✅ Test data cleaned up")
            
            print("\n" + "="*80)
            if success:
                print("✅ AUTO-ASSIGNMENT TEST PASSED")
            else:
                print("❌ AUTO-ASSIGNMENT TEST FAILED")
            print("="*80 + "\n")
            
            return success

    await engine.dispose()


if __name__ == "__main__":
    try:
        success = asyncio.run(test_sda_auto_assignment())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
