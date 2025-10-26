# CareQuest Typing Game - Implementation Guide

## Game Concept
**TypeWriter × Tap Titans × Mental Health**

Instead of clicking/tapping to attack monsters, players **type mental health affirmations, CBT phrases, and positive quotes** to deal damage. This reinforces therapeutic concepts while providing engaging gameplay.

---

## Core Mechanics

### Attack System
- **Input:** Type sentences displayed on screen
- **Output:** Damage based on typing speed + accuracy
- **Formula:** `Damage = (WPM / 60) × Accuracy% × Upgrades × Combo`

### Damage Calculation
```typescript
interface TypingResult {
  wpm: number;           // Words per minute
  accuracy: number;      // 0.0 to 1.0 (percentage)
  timeElapsed: number;   // milliseconds
  mistakes: number;      // incorrect characters
  isPerfect: boolean;    // 100% accuracy
}

function calculateDamage(result: TypingResult, upgrades: GameState): number {
  const baseWPMDamage = (result.wpm / 60) * 0.5; // 0.5 damage per WPM
  const accuracyMultiplier = result.accuracy;
  const upgradeMultiplier = upgrades.upgrades.typingPower.value;
  const comboMultiplier = getComboMultiplier(gameState.combo);
  const critMultiplier = result.isPerfect ? (upgrades.upgrades.criticalInsight.value / 100) : 1;
  
  return baseWPMDamage * accuracyMultiplier * upgradeMultiplier * comboMultiplier * critMultiplier;
}
```

### Combo System
- **3 consecutive correct sentences:** 1.1x damage
- **5 consecutive:** 1.25x damage
- **10 consecutive:** 1.5x damage
- **20 consecutive:** 2.0x damage
- **Break combo:** 1 mistake or taking >10 seconds

### Critical Hits
- **Trigger:** 100% accuracy on a sentence
- **Effect:** 2.5x damage multiplier + gold sparkle animation
- **Upgrade:** "Critical Insight" increases crit chance

---

## UI Components Changes

### 1. Replace MonsterDisplay Attack Button
**Old:** Tap button  
**New:** Typing interface

```tsx
// MonsterDisplay.tsx - New typing section
<div className="typing-interface">
  {/* Target sentence (what to type) */}
  <div className="target-sentence">
    <p className="text-gray-400 text-sm mb-2">Type this affirmation:</p>
    <p className="text-2xl font-semibold text-white mb-4">
      {currentSentence.split('').map((char, i) => (
        <span
          key={i}
          className={
            i < typedText.length
              ? typedText[i] === char
                ? 'text-teal-400' // Correct
                : 'text-red-500 animate-shake' // Wrong
              : 'text-gray-500' // Not typed yet
          }
        >
          {char}
        </span>
      ))}
    </p>
  </div>

  {/* Input field (invisible, captures typing) */}
  <input
    ref={inputRef}
    type="text"
    value={typedText}
    onChange={handleTyping}
    onPaste={(e) => e.preventDefault()} // No cheating!
    className="w-full p-4 bg-white/10 rounded-lg text-white text-xl"
    placeholder="Start typing..."
    autoFocus
  />

  {/* Stats display */}
  <div className="stats-bar flex justify-between mt-4">
    <div>
      <span className="text-sm text-gray-400">WPM:</span>
      <span className="text-xl text-teal-400 ml-2">{currentWPM}</span>
    </div>
    <div>
      <span className="text-sm text-gray-400">Accuracy:</span>
      <span className="text-xl text-purple-400 ml-2">{accuracy}%</span>
    </div>
    <div>
      <span className="text-sm text-gray-400">Combo:</span>
      <span className="text-xl text-orange-400 ml-2">×{comboMultiplier}</span>
    </div>
  </div>
</div>
```

### 2. New Game State Properties
```typescript
interface GameState {
  // ... existing properties ...
  
  // NEW: Typing-specific state
  currentSentence: string;
  sentenceId: string;
  typedText: string;
  typingStartTime: number | null;
  mistakes: number;
  combo: number;
  highestCombo: number;
  totalWordsTyped: number;
  averageWPM: number;
  perfectSentences: number;
}
```

### 3. Updated Upgrades
```typescript
const UPGRADE_TYPES = {
  typingPower: {
    name: 'Typing Power',
    description: 'Increase damage per word typed',
    icon: FiEdit3,
    baseCost: 10,
    baseValue: 1,
    increment: 0.2, // +20% per level
    currency: 'joy',
  },
  autoHealer: {
    name: 'Auto-Healer',
    description: 'Passive damage per second while resting',
    icon: FiZap,
    baseCost: 50,
    baseValue: 1,
    increment: 0.5,
    currency: 'care',
  },
  criticalInsight: {
    name: 'Critical Insight',
    description: 'Chance for bonus damage on perfect accuracy',
    icon: FiTarget,
    baseCost: 100,
    baseValue: 5, // 5% crit chance
    increment: 2, // +2% per level
    currency: 'joy',
  },
  comboMastery: {
    name: 'Combo Mastery',
    description: 'Increase combo damage multiplier',
    icon: FiTrendingUp,
    baseCost: 200,
    baseValue: 1,
    increment: 0.15, // +15% to combo bonuses
    currency: 'harmony',
  },
};
```

---

## Implementation Steps

### Phase 1: Core Typing Logic (Priority: HIGH)
**File:** `frontend/src/app/carequest/(hub)/utils/typingEngine.ts`

```typescript
export interface TypingMetrics {
  wpm: number;
  accuracy: number;
  timeElapsed: number;
  mistakes: number;
  isPerfect: boolean;
}

export function calculateWPM(
  text: string,
  timeElapsedMs: number
): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = timeElapsedMs / 60000;
  return Math.round(words / minutes);
}

export function calculateAccuracy(
  target: string,
  typed: string
): number {
  if (typed.length === 0) return 100;
  
  let correct = 0;
  const minLength = Math.min(target.length, typed.length);
  
  for (let i = 0; i < minLength; i++) {
    if (target[i] === typed[i]) correct++;
  }
  
  return Math.round((correct / target.length) * 100);
}

export function getTypingMetrics(
  targetSentence: string,
  typedText: string,
  startTime: number,
  endTime: number
): TypingMetrics {
  const timeElapsed = endTime - startTime;
  const wpm = calculateWPM(typedText, timeElapsed);
  const accuracy = calculateAccuracy(targetSentence, typedText);
  const mistakes = countMistakes(targetSentence, typedText);
  const isPerfect = accuracy === 100 && typedText === targetSentence;
  
  return { wpm, accuracy: accuracy / 100, timeElapsed, mistakes, isPerfect };
}

function countMistakes(target: string, typed: string): number {
  let mistakes = 0;
  const minLength = Math.min(target.length, typed.length);
  
  for (let i = 0; i < minLength; i++) {
    if (target[i] !== typed[i]) mistakes++;
  }
  
  return mistakes;
}
```

### Phase 2: Sentence Selection System
**File:** `frontend/src/app/carequest/(hub)/utils/sentenceSelector.ts`

```typescript
import sentencesDB from '@/public/assets/game/sentences-database.json';

export function getRandomSentence(
  difficulty: number,
  language: 'en' | 'id' = 'en'
): { id: string; text: string; category: string; words: number } {
  const difficultyConfig = sentencesDB.difficulty_mapping[difficulty];
  const allowedCategories = difficultyConfig.categories;
  
  // Collect all sentences from allowed categories
  const availableSentences = [];
  for (const category of allowedCategories) {
    const sentences = sentencesDB.sentences[category];
    if (sentences) {
      availableSentences.push(...sentences.filter(s => s.difficulty === difficulty));
    }
  }
  
  // Random selection
  const selected = availableSentences[Math.floor(Math.random() * availableSentences.length)];
  
  return {
    id: selected.id,
    text: language === 'id' ? selected.text_id : selected.text_en,
    category: selected.category,
    words: selected.words,
  };
}

export function getDifficultyFromRank(harmonyScore: number): number {
  if (harmonyScore < 100) return 1;
  if (harmonyScore < 500) return 2;
  if (harmonyScore < 1500) return 3;
  if (harmonyScore < 5000) return 4;
  if (harmonyScore < 15000) return 5;
  return 6;
}
```

### Phase 3: Update page.tsx - Replace Clicking Logic
**File:** `frontend/src/app/carequest/(hub)/page.tsx`

**Key Changes:**
1. Remove `handleTap` function
2. Add typing state management
3. Add `handleTypingComplete` function
4. Update damage calculation to use typing metrics

```typescript
// Add state for typing
const [currentSentence, setCurrentSentence] = useState('');
const [sentenceId, setSentenceId] = useState('');
const [typedText, setTypedText] = useState('');
const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
const [mistakes, setMistakes] = useState(0);
const [currentWPM, setCurrentWPM] = useState(0);
const [accuracy, setAccuracy] = useState(100);

// Load new sentence when monster appears
useEffect(() => {
  if (gameState.currentMonster) {
    const difficulty = getDifficultyFromRank(gameState.harmony);
    const sentence = getRandomSentence(difficulty, 'en'); // or 'id' for Indonesian
    setCurrentSentence(sentence.text);
    setSentenceId(sentence.id);
    setTypedText('');
    setTypingStartTime(null);
    setMistakes(0);
  }
}, [gameState.currentMonster?.id]);

// Handle typing input
const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
  const typed = e.target.value;
  
  // Start timer on first character
  if (typingStartTime === null) {
    setTypingStartTime(Date.now());
  }
  
  setTypedText(typed);
  
  // Calculate real-time WPM and accuracy
  if (typingStartTime) {
    const elapsed = Date.now() - typingStartTime;
    const wpm = calculateWPM(typed, elapsed);
    const acc = calculateAccuracy(currentSentence, typed);
    setCurrentWPM(wpm);
    setAccuracy(acc);
  }
  
  // Check if sentence is complete
  if (typed === currentSentence) {
    handleTypingComplete(typed);
  }
};

// Handle completed sentence
const handleTypingComplete = (typedText: string) => {
  if (!typingStartTime) return;
  
  const metrics = getTypingMetrics(
    currentSentence,
    typedText,
    typingStartTime,
    Date.now()
  );
  
  // Calculate damage
  const damage = calculateDamage(metrics, gameState);
  
  // Deal damage to monster
  dealDamage(damage);
  
  // Update combo
  if (metrics.isPerfect) {
    setGameState(prev => ({
      ...prev,
      combo: prev.combo + 1,
      perfectSentences: prev.perfectSentences + 1,
    }));
    toast.success(`Perfect! 🎯 +${damage.toFixed(1)} damage`);
  } else {
    setGameState(prev => ({ ...prev, combo: 0 }));
    toast.success(`+${damage.toFixed(1)} damage`);
  }
  
  // Load next sentence
  const difficulty = getDifficultyFromRank(gameState.harmony);
  const newSentence = getRandomSentence(difficulty, 'en');
  setCurrentSentence(newSentence.text);
  setSentenceId(newSentence.id);
  setTypedText('');
  setTypingStartTime(null);
};
```

### Phase 4: Visual Feedback
- Green characters for correct typing
- Red shake animation for mistakes
- Gold sparkle for perfect accuracy (critical hits)
- Combo counter with animated multiplier
- Floating damage numbers with typing stats

### Phase 5: Statistics Tracking
Add to player stats:
- Total words typed
- Average WPM
- Best WPM
- Perfect sentences count
- Highest combo
- Total typing time

---

## Benefits of This Approach

### Therapeutic Value
✅ **Repetition = Reinforcement** - Typing affirmations ingrains positive thinking  
✅ **Active Learning** - Players engage with CBT concepts directly  
✅ **Cultural Relevance** - Indonesian language quotes connect with students  
✅ **Skill Building** - Typing speed improvement + mental health knowledge  

### Gameplay Benefits
✅ **More Engaging** - Active typing > passive clicking  
✅ **Skill-Based** - Rewards practice and improvement  
✅ **Educational** - Learn coping strategies while playing  
✅ **Unique** - No other game combines typing + mental health + idle mechanics  

### Technical Benefits
✅ **Easy to Expand** - Just add more sentences to JSON  
✅ **Measurable** - Clear metrics (WPM, accuracy, combos)  
✅ **Multilingual** - Support both English and Indonesian  
✅ **Integration** - Can pull from existing CBT modules  

---

## Next Steps

1. **Implement typing engine** (`utils/typingEngine.ts`)
2. **Create sentence selector** (`utils/sentenceSelector.ts`)
3. **Update MonsterDisplay** with typing UI
4. **Modify page.tsx** to use typing instead of clicking
5. **Add visual feedback** (character coloring, animations)
6. **Test and balance** damage calculations
7. **Expand sentence database** with more quotes

---

## Future Enhancements

- **Daily Challenge:** Type specific therapeutic quotes
- **Leaderboards:** Highest WPM, longest combo
- **Language Toggle:** Switch between English/Indonesian
- **Voice Over:** Narrate sentences (accessibility)
- **CBT Module Integration:** Pull sentences from active therapy modules
- **Multiplayer:** Race to type affirmations against friends
- **Achievements:** "Typed 1000 words", "Perfect streak of 10"

---

**This is a MUCH better game for mental health education!** 🎮✨
