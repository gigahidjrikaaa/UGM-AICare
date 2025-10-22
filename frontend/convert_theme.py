#!/usr/bin/env python3
"""
Bulk theme converter for React/TypeScript components
Converts light theme Tailwind classes to dark theme with glassmorphism
"""

import re
from pathlib import Path

# Theme conversion mappings
CONVERSIONS = [
    # Main containers
    (r'bg-white border border-gray-200', 'bg-white/5 backdrop-blur-sm border border-white/10'),
    (r'bg-white border-gray-200', 'bg-white/5 backdrop-blur-sm border-white/10'),
    (r'bg-white rounded', 'bg-white/5 backdrop-blur-sm border border-white/10 rounded'),
    
    # Text colors
    (r'text-gray-900\b', 'text-white'),
    (r'text-gray-800\b', 'text-white/90'),
    (r'text-gray-700\b', 'text-white/80'),
    (r'text-gray-600\b', 'text-white/60'),
    (r'text-gray-500\b', 'text-white/50'),
    (r'text-gray-400\b', 'text-white/40'),
    
    # Background colors
    (r'bg-gray-50\b', 'bg-white/5'),
    (r'bg-gray-100\b', 'bg-white/10'),
    (r'bg-gray-200\b', 'bg-white/20'),
    (r'bg-gray-300\b', 'bg-white/30'),
    
    # Borders
    (r'border-gray-200\b', 'border-white/10'),
    (r'border-gray-300\b', 'border-white/20'),
    (r'divide-gray-200\b', 'divide-white/10'),
    
    # Hover states
    (r'hover:bg-gray-50\b', 'hover:bg-white/10'),
    (r'hover:bg-gray-100\b', 'hover:bg-white/15'),
    (r'hover:bg-gray-200\b', 'hover:bg-white/20'),
]

def convert_file(filepath: Path):
    """Convert a single file to dark theme"""
    content = filepath.read_text(encoding='utf-8')
    original = content
    
    for pattern, replacement in CONVERSIONS:
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        filepath.write_text(content, encoding='utf-8')
        print(f"✅ Converted: {filepath.name}")
        return True
    else:
        print(f"⏭️  Skipped: {filepath.name} (no changes)")
        return False

def main():
    components_dir = Path(__file__).parent / 'src' / 'app' / 'admin' / '(protected)' / 'langgraph' / 'components'
    
    if not components_dir.exists():
        print(f"❌ Directory not found: {components_dir}")
        return
    
    files = list(components_dir.glob('*.tsx'))
    print(f"Found {len(files)} component files\n")
    
    converted_count = 0
    for file in files:
        if convert_file(file):
            converted_count += 1
    
    print(f"\n✅ Converted {converted_count}/{len(files)} files")

if __name__ == '__main__':
    main()
