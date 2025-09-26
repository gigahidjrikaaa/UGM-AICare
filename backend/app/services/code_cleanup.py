"""Development code cleanup utilities."""

import os
import re
import logging
from typing import List, Dict, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class CodeCleanupService:
    """Service for cleaning up development and debug code."""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.cleanup_patterns = {
            # Debug statements
            'console_debug': [
                r'console\.debug\([^)]*\);?\n?',
                r'console\.log\([^)]*debug[^)]*\);?\n?',
                r'print\([^)]*debug[^)]*\)\n?',
                r'logger\.debug\([^)]*\)\n?'
            ],
            
            # TODO/FIXME comments (but keep important ones)
            'todo_fixme': [
                r'^\s*#\s*TODO.*\n',
                r'^\s*//\s*TODO.*\n',
                r'^\s*#\s*FIXME.*\n',
                r'^\s*//\s*FIXME.*\n',
                r'^\s*#\s*HACK.*\n',
                r'^\s*//\s*HACK.*\n'
            ],
            
            # Temporary instrumentation
            'temp_code': [
                r'^\s*#.*temporary.*\n',
                r'^\s*//.*temporary.*\n',
                r'^\s*#.*debug counters.*\n',
                r'^\s*//.*debug counters.*\n',
                r'^\s*#.*Debug log removed.*\n',
                r'^\s*//.*Debug log removed.*\n'
            ],
            
            # Unused imports (basic detection)
            'unused_imports': [
                r'^import\s+(?:Image|router)\s*$\n',  # Specific unused imports
            ],
            
            # Empty debug blocks
            'empty_blocks': [
                r'if\s+__name__\s*==\s*["\']__main__["\']\s*:\s*\n\s*pass\s*\n',
                r'if\s+DEBUG\s*:\s*\n\s*pass\s*\n'
            ]
        }
        
        self.safe_patterns = {
            # Patterns to avoid (important TODOs, production debug logs, etc.)
            'password_reset_todo',  # Important TODO for password reset
            'authentication',       # Important auth-related TODOs
            'security',            # Security-related TODOs
            'CRITICAL',            # Critical TODOs
            'SECURITY',            # Security TODOs
        }
    
    def scan_file(self, file_path: Path) -> Dict[str, List[Tuple[int, str]]]:
        """Scan a file for cleanup opportunities."""
        findings = {category: [] for category in self.cleanup_patterns}
        
        if not file_path.exists() or file_path.suffix not in ['.py', '.tsx', '.ts', '.js']:
            return findings
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                # Skip lines with safe patterns
                if any(safe in line for safe in self.safe_patterns):
                    continue
                
                for category, patterns in self.cleanup_patterns.items():
                    for pattern in patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            findings[category].append((line_num, line.strip()))
                            break
                            
        except Exception as e:
            logger.error(f"Error scanning file {file_path}: {e}")
        
        return findings
    
    def scan_directory(self, directory: Path) -> Dict[str, Dict[str, List[Tuple[int, str]]]]:
        """Scan a directory recursively for cleanup opportunities."""
        all_findings = {}
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and file_path.suffix in ['.py', '.tsx', '.ts', '.js']:
                # Skip node_modules, .git, and other irrelevant directories
                if any(part in str(file_path) for part in ['.git', 'node_modules', '__pycache__', '.next']):
                    continue
                
                findings = self.scan_file(file_path)
                if any(findings.values()):  # Only include files with findings
                    all_findings[str(file_path.relative_to(self.project_root))] = findings
        
        return all_findings
    
    def clean_file(self, file_path: Path, categories: List[str] = None) -> Dict[str, int]:
        """Clean a file by removing matching patterns."""
        if categories is None:
            categories = ['console_debug', 'temp_code', 'empty_blocks']
        
        stats = {category: 0 for category in categories}
        
        if not file_path.exists():
            return stats
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            for category in categories:
                if category in self.cleanup_patterns:
                    for pattern in self.cleanup_patterns[category]:
                        matches = re.findall(pattern, content, re.MULTILINE | re.IGNORECASE)
                        stats[category] += len(matches)
                        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.IGNORECASE)
            
            # Only write if content changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                logger.info(f"Cleaned file: {file_path}")
            
        except Exception as e:
            logger.error(f"Error cleaning file {file_path}: {e}")
        
        return stats
    
    def generate_cleanup_report(self) -> Dict[str, any]:
        """Generate a comprehensive cleanup report."""
        frontend_findings = self.scan_directory(self.project_root / 'frontend' / 'src')
        backend_findings = self.scan_directory(self.project_root / 'backend' / 'app')
        
        # Aggregate statistics
        total_files = len(frontend_findings) + len(backend_findings)
        category_totals = {category: 0 for category in self.cleanup_patterns}
        
        for findings in list(frontend_findings.values()) + list(backend_findings.values()):
            for category, items in findings.items():
                category_totals[category] += len(items)
        
        return {
            'summary': {
                'total_files_with_issues': total_files,
                'category_totals': category_totals,
                'scan_timestamp': '2025-09-25T00:00:00Z'
            },
            'frontend_findings': frontend_findings,
            'backend_findings': backend_findings,
            'recommendations': self._generate_recommendations(category_totals)
        }
    
    def _generate_recommendations(self, category_totals: Dict[str, int]) -> List[str]:
        """Generate cleanup recommendations based on findings."""
        recommendations = []
        
        if category_totals['console_debug'] > 0:
            recommendations.append(
                f"Remove {category_totals['console_debug']} debug console/print statements "
                "to improve performance and reduce log noise"
            )
        
        if category_totals['todo_fixme'] > 5:
            recommendations.append(
                f"Review and address {category_totals['todo_fixme']} TODO/FIXME comments. "
                "Consider creating GitHub issues for important tasks"
            )
        
        if category_totals['temp_code'] > 0:
            recommendations.append(
                f"Remove {category_totals['temp_code']} temporary code blocks "
                "and instrumentation left from development"
            )
        
        if category_totals['unused_imports'] > 0:
            recommendations.append(
                f"Clean up {category_totals['unused_imports']} unused imports "
                "to reduce bundle size and improve load times"
            )
        
        if sum(category_totals.values()) == 0:
            recommendations.append("✅ Codebase is clean! No immediate cleanup needed.")
        
        return recommendations
    
    def auto_cleanup(self, categories: List[str] = None, dry_run: bool = True) -> Dict[str, any]:
        """Automatically clean files based on specified categories."""
        if categories is None:
            categories = ['console_debug', 'temp_code', 'empty_blocks']
        
        results = {
            'files_processed': 0,
            'total_removals': 0,
            'category_stats': {cat: 0 for cat in categories},
            'processed_files': []
        }
        
        # Process frontend files
        frontend_dir = self.project_root / 'frontend' / 'src'
        if frontend_dir.exists():
            results.update(self._process_directory(frontend_dir, categories, dry_run, results))
        
        # Process backend files
        backend_dir = self.project_root / 'backend' / 'app'
        if backend_dir.exists():
            results.update(self._process_directory(backend_dir, categories, dry_run, results))
        
        return results
    
    def _process_directory(self, directory: Path, categories: List[str], dry_run: bool, results: Dict) -> Dict:
        """Process all files in a directory."""
        for file_path in directory.rglob('*'):
            if file_path.is_file() and file_path.suffix in ['.py', '.tsx', '.ts', '.js']:
                # Skip irrelevant directories
                if any(part in str(file_path) for part in ['.git', 'node_modules', '__pycache__']):
                    continue
                
                if dry_run:
                    findings = self.scan_file(file_path)
                    file_total = sum(len(items) for items in findings.values())
                    if file_total > 0:
                        results['files_processed'] += 1
                        results['total_removals'] += file_total
                        results['processed_files'].append({
                            'file': str(file_path.relative_to(self.project_root)),
                            'findings': file_total
                        })
                else:
                    stats = self.clean_file(file_path, categories)
                    file_total = sum(stats.values())
                    if file_total > 0:
                        results['files_processed'] += 1
                        results['total_removals'] += file_total
                        results['processed_files'].append({
                            'file': str(file_path.relative_to(self.project_root)),
                            'removed': file_total
                        })
                        
                        for category, count in stats.items():
                            results['category_stats'][category] += count
        
        return results


# Usage example and CLI interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python cleanup_service.py <project_root> [--clean] [--categories console_debug,temp_code]")
        sys.exit(1)
    
    project_root = sys.argv[1]
    cleanup_service = CodeCleanupService(project_root)
    
    if "--clean" in sys.argv:
        categories = None
        if "--categories" in sys.argv:
            cat_index = sys.argv.index("--categories") + 1
            if cat_index < len(sys.argv):
                categories = sys.argv[cat_index].split(',')
        
        print("🧹 Starting automatic cleanup...")
        results = cleanup_service.auto_cleanup(categories, dry_run=False)
        print(f"✅ Processed {results['files_processed']} files")
        print(f"🗑️  Removed {results['total_removals']} code patterns")
        
        for category, count in results['category_stats'].items():
            if count > 0:
                print(f"  - {category}: {count} removals")
    else:
        print("📊 Generating cleanup report...")
        report = cleanup_service.generate_cleanup_report()
        print(f"📁 Files with issues: {report['summary']['total_files_with_issues']}")
        
        for category, count in report['summary']['category_totals'].items():
            if count > 0:
                print(f"  - {category}: {count} issues")
        
        print("\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"  • {rec}")
        
        print("\n🔍 Run with --clean to automatically fix issues")