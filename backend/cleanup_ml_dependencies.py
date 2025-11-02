#!/usr/bin/env python3
"""
Cleanup script to remove PyTorch/ONNX ML dependencies.

This script:
1. Identifies and removes old ML classifier files
2. Updates requirements.txt to remove ML dependencies
3. Verifies no other files import the deleted modules

Run: python cleanup_ml_dependencies.py
"""

import os
import re
from pathlib import Path
from typing import List, Set


# Files to delete
FILES_TO_DELETE = [
    "backend/app/agents/sta/ml_classifier.py",
    "backend/app/agents/sta/ml_classifier_onnx.py",
]

# Dependencies to remove from requirements.txt
ML_DEPENDENCIES = [
    "torch",
    "onnx",
    "onnxruntime",
    "sentence-transformers",
    "transformers",
    "scikit-learn",
]


def find_project_root() -> Path:
    """Find project root (where backend/ folder is)."""
    current = Path.cwd()
    
    # Try current directory
    if (current / "backend").exists():
        return current
    
    # Try parent directory
    if (current.parent / "backend").exists():
        return current.parent
    
    raise FileNotFoundError("Cannot find project root with backend/ folder")


def delete_ml_files(root: Path) -> List[str]:
    """Delete old ML classifier files."""
    deleted = []
    
    print("\n" + "="*80)
    print("STEP 1: Deleting ML Classifier Files")
    print("="*80)
    
    for file_path in FILES_TO_DELETE:
        full_path = root / file_path
        
        if full_path.exists():
            print(f"🗑️  Deleting: {file_path}")
            full_path.unlink()
            deleted.append(file_path)
            print(f"   ✅ Deleted successfully")
        else:
            print(f"⚠️  Not found: {file_path} (already deleted?)")
    
    return deleted


def update_requirements(root: Path) -> List[str]:
    """Remove ML dependencies from requirements.txt."""
    print("\n" + "="*80)
    print("STEP 2: Updating requirements.txt")
    print("="*80)
    
    req_path = root / "backend" / "requirements.txt"
    
    if not req_path.exists():
        print(f"❌ requirements.txt not found at {req_path}")
        return []
    
    # Read current requirements
    with open(req_path, "r") as f:
        lines = f.readlines()
    
    # Filter out ML dependencies
    removed = []
    new_lines = []
    
    for line in lines:
        line_lower = line.lower().strip()
        
        # Check if line contains any ML dependency
        should_remove = False
        for dep in ML_DEPENDENCIES:
            if line_lower.startswith(dep.lower()) or f"{dep.lower()}==" in line_lower:
                should_remove = True
                removed.append(line.strip())
                print(f"🗑️  Removing: {line.strip()}")
                break
        
        if not should_remove:
            new_lines.append(line)
    
    # Write updated requirements
    with open(req_path, "w") as f:
        f.writelines(new_lines)
    
    print(f"\n✅ Removed {len(removed)} ML dependencies")
    
    return removed


def check_remaining_imports(root: Path, deleted_files: List[str]) -> List[str]:
    """Check if any files still import deleted modules."""
    print("\n" + "="*80)
    print("STEP 3: Checking for Remaining Imports")
    print("="*80)
    
    # Extract module names from deleted files
    module_patterns = []
    for file_path in deleted_files:
        # Extract module name from path
        # e.g., backend/app/agents/sta/ml_classifier.py -> ml_classifier
        module_name = Path(file_path).stem
        module_patterns.append(module_name)
    
    # Search for imports
    problematic_files = []
    backend_path = root / "backend"
    
    for py_file in backend_path.rglob("*.py"):
        # Skip deleted files
        if any(deleted in str(py_file) for deleted in deleted_files):
            continue
        
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Check for imports
            for module in module_patterns:
                patterns = [
                    f"from .{module} import",
                    f"from app.agents.sta.{module} import",
                    f"import {module}",
                ]
                
                for pattern in patterns:
                    if pattern in content:
                        rel_path = py_file.relative_to(root)
                        problematic_files.append((str(rel_path), module, pattern))
                        print(f"⚠️  Found import in {rel_path}:")
                        print(f"    Pattern: {pattern}")
        
        except Exception as e:
            print(f"⚠️  Error reading {py_file}: {e}")
    
    if problematic_files:
        print(f"\n❌ Found {len(problematic_files)} problematic imports!")
        print("   These files need manual cleanup:")
        for file, module, pattern in problematic_files:
            print(f"   - {file} (imports {module})")
    else:
        print(f"\n✅ No remaining imports to deleted modules found")
    
    return problematic_files


def verify_gemini_classifier(root: Path) -> bool:
    """Verify new Gemini classifier exists and is properly integrated."""
    print("\n" + "="*80)
    print("STEP 4: Verifying Gemini Classifier Integration")
    print("="*80)
    
    # Check if gemini_classifier.py exists
    gemini_path = root / "backend" / "app" / "agents" / "sta" / "gemini_classifier.py"
    
    if not gemini_path.exists():
        print(f"❌ Gemini classifier not found at {gemini_path}")
        return False
    
    print(f"✅ Found gemini_classifier.py")
    
    # Check if service.py imports GeminiSTAClassifier
    service_path = root / "backend" / "app" / "agents" / "sta" / "service.py"
    
    if not service_path.exists():
        print(f"❌ service.py not found")
        return False
    
    try:
        with open(service_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        # Try with different encoding
        try:
            with open(service_path, "r", encoding="latin-1") as f:
                content = f.read()
        except Exception as e:
            print(f"❌ Could not read service.py: {e}")
            return False
    
    if "from app.agents.sta.gemini_classifier import GeminiSTAClassifier" in content:
        print(f"✅ service.py imports GeminiSTAClassifier")
    else:
        print(f"❌ service.py does NOT import GeminiSTAClassifier")
        return False
    
    if "GeminiSTAClassifier()" in content:
        print(f"✅ service.py instantiates GeminiSTAClassifier")
    else:
        print(f"⚠️  service.py may not use GeminiSTAClassifier")
    
    return True


def main():
    """Run cleanup process."""
    print("\n" + "="*80)
    print("ML DEPENDENCY CLEANUP")
    print("Removing PyTorch/ONNX from UGM-AICare Backend")
    print("="*80)
    
    try:
        root = find_project_root()
        print(f"\n📂 Project root: {root}")
        
        # Step 1: Delete ML files
        deleted_files = delete_ml_files(root)
        
        # Step 2: Update requirements.txt
        removed_deps = update_requirements(root)
        
        # Step 3: Check for remaining imports
        problematic = check_remaining_imports(root, deleted_files)
        
        # Step 4: Verify Gemini classifier
        gemini_ok = verify_gemini_classifier(root)
        
        # Final summary
        print("\n" + "="*80)
        print("CLEANUP SUMMARY")
        print("="*80)
        print(f"✅ Deleted {len(deleted_files)} ML classifier files")
        print(f"✅ Removed {len(removed_deps)} ML dependencies from requirements.txt")
        
        if problematic:
            print(f"⚠️  {len(problematic)} files still reference deleted modules (manual cleanup needed)")
        else:
            print(f"✅ No orphaned imports found")
        
        if gemini_ok:
            print(f"✅ Gemini classifier properly integrated")
        else:
            print(f"❌ Gemini classifier integration needs attention")
        
        print("\n" + "="*80)
        print("NEXT STEPS")
        print("="*80)
        print("1. Review and fix any problematic imports (if any)")
        print("2. Run: pip install -r backend/requirements.txt")
        print("3. Test STA: python backend/test_gemini_sta.py")
        print("4. Verify deployment size reduced (should drop ~800MB)")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Cleanup failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
