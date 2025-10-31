#!/usr/bin/env python3
"""Remove all emoji characters from orchestrator.py"""

def remove_emojis(text):
    """Remove emoji characters by filtering out non-ASCII and common emojis"""
    import unicodedata
    
    # Keep only ASCII and common Latin-1 characters
    result = []
    for char in text:
        # Keep ASCII, newlines, tabs, and basic punctuation
        if ord(char) < 128 or char in '\n\r\t':
            result.append(char)
        # Skip emojis and special Unicode characters
        elif unicodedata.category(char) not in ('So', 'Sk', 'Sm'):
            result.append(char)
    
    return ''.join(result)

if __name__ == '__main__':
    filepath = 'app/agents/aika/orchestrator.py'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    cleaned = remove_emojis(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(cleaned)
    
    print(f'✓ Cleaned {filepath}')
