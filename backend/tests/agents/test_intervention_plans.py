# Test script for intervention plans backend

import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from app.models.interventions import InterventionPlanRecord
from app.schemas.intervention_plans import InterventionPlanData, PlanStep, NextCheckIn
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ugm_aicare")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def test_database_tables():
    """Test if intervention plan tables exist"""
    print("🔍 Testing database tables...")
    
    db = SessionLocal()
    try:
        # Check if tables exist
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('intervention_plan_records', 'intervention_plan_step_completions')
        """))
        tables = [row[0] for row in result]
        
        print(f"✅ Found tables: {tables}")
        
        # Check table structure
        result = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'intervention_plan_records'
            ORDER BY ordinal_position
        """))
        columns = [(row[0], row[1]) for row in result]
        
        print(f"\n📋 intervention_plan_records columns:")
        for col_name, col_type in columns:
            print(f"  - {col_name}: {col_type}")
        
        return len(tables) == 2
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        db.close()

def test_models():
    """Test if models can be imported"""
    print("\n🔍 Testing models...")
    try:
        from app.models.interventions import InterventionPlanRecord, InterventionPlanStepCompletion
        print("✅ Models imported successfully")
        print(f"  - InterventionPlanRecord: {InterventionPlanRecord.__tablename__}")
        print(f"  - InterventionPlanStepCompletion: {InterventionPlanStepCompletion.__tablename__}")
        return True
    except Exception as e:
        print(f"❌ Model import error: {e}")
        return False

def test_schemas():
    """Test if schemas work"""
    print("\n🔍 Testing schemas...")
    try:
        test_data = InterventionPlanData(
            plan_steps=[
                PlanStep(
                    title="Test Step",
                    description="This is a test step",
                    completed=False
                )
            ],
            resource_cards=[],
            next_check_in=NextCheckIn(
                timeframe="1 week",
                method="chat"
            )
        )
        print("✅ Schemas work correctly")
        print(f"  - Created test plan with {len(test_data.plan_steps)} steps")
        return True
    except Exception as e:
        print(f"❌ Schema error: {e}")
        return False

def test_service():
    """Test if service can be imported"""
    print("\n🔍 Testing service...")
    try:
        from app.services.intervention_plan_service import InterventionPlanService
        print("✅ Service imported successfully")
        return True
    except Exception as e:
        print(f"❌ Service import error: {e}")
        return False

def test_routes():
    """Test if routes can be imported"""
    print("\n🔍 Testing routes...")
    try:
        from app.routes.intervention_plans import router
        print("✅ Routes imported successfully")
        print(f"  - Router prefix: /intervention-plans")
        return True
    except Exception as e:
        print(f"❌ Routes import error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 INTERVENTION PLANS BACKEND TEST")
    print("=" * 60)
    
    results = []
    results.append(("Database Tables", test_database_tables()))
    results.append(("Models", test_models()))
    results.append(("Schemas", test_schemas()))
    results.append(("Service", test_service()))
    results.append(("Routes", test_routes()))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("\nNext steps:")
        print("1. Start the backend: uvicorn app.main:app --reload")
        print("2. Test the API endpoint: curl http://localhost:8000/api/intervention-plans")
        print("3. Start the frontend and test the Resources page")
    else:
        print("⚠️  SOME TESTS FAILED - Please fix the issues above")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)
