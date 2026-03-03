import os
import re

directories = {
    'research': ['problem-statement.md', 'methodology.md', 'evaluation.md', 'ethics.md'],
    'architecture': ['system-overview.md', 'agentic-framework.md', 'meta-agent-aika.md', 'safety-triage-agent.md', 'therapeutic-coach.md', 'case-management.md', 'insights-agent.md'],
    'passive-screening': ['methodology.md', 'validated-instruments.md', 'data-safety.md'],
    'aika-autopilot': ['policy-governed-autonomy.md', 'implementation-plan.md'],
    'care-token': ['tokenomics.md', 'smart-contracts.md', 'wallet-integration.md'],
    'analytics': ['privacy-first-data.md', 'database-best-practices.md'],
    'engineering': ['tech-stack.md', 'development-workflow.md', 'api-reference.md', 'frontend-overview.md'],
    'deployment': ['infrastructure-map.md', 'ci-cd-flow.md', 'monitoring.md', 'setup.md']
}

emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]', flags=re.UNICODE)
dash_pattern = re.compile(r'—')

for d, files in directories.items():
    for idx, f in enumerate(files):
        path = os.path.join('UGM-AICare/docs-site/docs', d, f)
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            
        # Check if already has frontmatter
        if not content.startswith('---'):
            # Generate title
            title = f.replace('.md', '').replace('-', ' ').title()
            # Try to extract title from first # heading
            first_heading = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if first_heading:
                title = first_heading.group(1).strip()
                # Remove emojis from title
                title = emoji_pattern.sub('', title).strip()
            
            frontmatter = f"---\nsidebar_position: {idx + 1}\nid: {f.replace('.md', '')}\ntitle: {title}\n---\n\n"
            content = frontmatter + content
            
        # Remove emojis and em dashes (replace em dash with simple dash or comma based on context, here let's just use regular dash)
        # Actually replacing em dash with spaced en dash
        content = content.replace('—', '-')
        
        # We don't completely strip emojis because some might be in mermaid, but actually emojis in mermaid are fine. 
        # But we remove them from headings.
        lines = content.split('\n')
        for i in range(len(lines)):
            if lines[i].startswith('#'):
                lines[i] = emoji_pattern.sub('', lines[i]).strip()
                
        # Write back
        with open(path, 'w', encoding='utf-8') as file:
            file.write('\n'.join(lines))

print("Formatting complete.")
