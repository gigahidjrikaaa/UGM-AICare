# CareQuest Hub Typing Game – Mechanics Discussion Summary

**Date:** October 26, 2025  
**Context:** Design pivot from click/tap-based idle game to typing-based combat system  
**Documents Updated:** GDD v1.0 (Section 5.4), PRD (R7)

---

## Executive Summary

The **CareQuest Hub** has been redesigned from a traditional idle clicker to a **typing-based combat game** where players defeat "Gloom" monsters by typing mental health affirmations, CBT phrases, and therapeutic quotes. This pivot significantly enhances the therapeutic value, educational impact, and engagement quality of the mini-game experience.

---

## Why Typing Over Clicking?

### Therapeutic Benefits

1. **Cognitive Reinforcement**: Typing affirmations creates active engagement with therapeutic content, strengthening neural pathways associated with positive self-talk (CBT repetition principle).

2. **Dual-Task Learning**: Combining motor skills (typing) with cognitive processing (comprehension) enhances memory encoding compared to passive reading or mindless clicking.

3. **Mindful Practice**: Each typed sentence requires focus and attention, preventing the "autopilot" behavior common in traditional idle clickers.

4. **Exposure Therapy**: Repeated typing of positive self-statements in a low-stakes environment reduces psychological resistance to therapeutic concepts.

### Educational Value

1. **Skill Development**: Players improve typing speed (WPM) while learning mental health vocabulary in both Indonesian and English.

2. **Cultural Relevance**: Bilingual sentence database supports Indonesian students' language learning while respecting cultural mental health frameworks.

3. **CBT Integration**: Sentences can be sourced directly from active therapy modules, creating synergy between gameplay and counselor-led treatment.

4. **Measurable Progress**: Clear metrics (WPM, accuracy, combo streaks) provide visible skill improvement feedback.

### Design Superiority

| Aspect | Idle Clicker | Typing Combat |
|--------|--------------|---------------|
| **Engagement Type** | Passive, mindless | Active, cognitive |
| **Skill Practice** | None | Typing + mental health literacy |
| **Therapeutic Value** | Zero | High (CBT reinforcement) |
| **Burnout Risk** | High (repetitive strain) | Low (varied content, skill-based) |
| **Educational Benefit** | None | Bilingual vocabulary + coping strategies |
| **Uniqueness** | Saturated market | Novel combination (TypeRacer + mental health) |

---

## Core Mechanics Overview

### Attack Flow

```
1. Monster Appears (e.g., "Anxiety Goblin", HP: 150)
   ↓
2. System Displays Sentence: "I am stronger than my fears"
   ↓
3. Player Types Character-by-Character
   - ✅ Green: Correct | ❌ Red Shake: Wrong | ⏳ Gray: Pending
   ↓
4. Completion → Calculate Metrics
   - WPM: (Characters / 5) / Minutes
   - Accuracy: (Correct / Total) × 100%
   ↓
5. Apply Damage Formula
   - Base = (WPM / 60) × 0.5 × Accuracy
   - Total = Base × Upgrades × Combo × Crit
   ↓
6. Reward Distribution
   - Monster defeated → Earn JOY, CARE, Harmony
   - Resources sync to main quest system
```

### Damage Calculation

**Formula:**
```
Total Damage = (WPM / 60 × 0.5 × Accuracy%) × Upgrade Multiplier × Combo Multiplier × Crit Multiplier
```

**Example:**
- Player types at **72 WPM** with **95% accuracy**
- **Typing Power Upgrade**: Level 5 (2.0x)
- **Combo**: 10 consecutive perfect sentences (1.5x)
- **Critical Hit**: 100% accuracy (2.5x)

**Calculation:**
```
Base = (72 / 60) × 0.5 × 0.95 = 0.57
Total = 0.57 × 2.0 × 1.5 × 2.5 = 4.28 damage
```

### Progression Systems

#### 1. **Monster Scaling**
```
Monster HP = Base HP × (1 + Stage × 0.2) × Type Multiplier

Common Monsters: 80% spawn rate, 1.0x rewards
Boss Monsters: Every 10th stage, 5-10x rewards, require 3-5 sentences
```

#### 2. **Sentence Difficulty Tiers**

| Tier | Harmony Range | Words | Categories | Example |
|------|---------------|-------|------------|---------|
| 1 | 0-99 | 3-6 | Affirmations | "I am enough today" |
| 2 | 100-499 | 6-9 | Affirmations, Coping | "This feeling will pass" |
| 3 | 500-1499 | 8-12 | Coping, CBT | "I choose calm responses" |
| 4 | 1500-4999 | 10-15 | CBT, Wisdom | "My worth isn't defined by others" |
| 5 | 5000-14999 | 12-18 | Wisdom, Indonesian | "Progress isn't linear, that's okay" |
| 6 | 15000+ | 15-30 | Indonesian Proverbs | "Tak ada rotan akar pun jadi..." |

#### 3. **Upgrade System**

| Upgrade | Effect | Currency | Scaling |
|---------|--------|----------|---------|
| **Typing Power** | +20% base damage/level | JOY | 1.15^level |
| **Auto-Healer** | +0.5 passive DPS/level | JOY | 1.15^level |
| **Critical Insight** | +5% crit multiplier/level | JOY | 1.18^level |
| **Combo Mastery** | +15% combo bonus/level | Harmony | 1.20^level |

#### 4. **Combo System**

- **3 consecutive perfect**: 1.1x damage
- **5 consecutive perfect**: 1.25x damage
- **10 consecutive perfect**: 1.5x damage
- **20 consecutive perfect**: 2.0x damage
- **Break conditions**: Any mistake, timeout (>15s), manual skip

---

## Integration with Main Quest System

### Resource Synchronization

**Bi-directional Sync:**
- CareQuest Hub earnings (JOY, CARE, Harmony) automatically update main quest wallet
- Sync frequency: Every 5 seconds during active play, on exit, on main quest completion
- API: `PATCH /api/v1/quests/state/update` with delta updates

**Conflict Resolution:**
- Server-authoritative design prevents exploits
- Client state reconciled on next sync
- Retry queue with exponential backoff for network failures

### Cross-System Features

1. **Daily Quest Integration**: "Play 10 minutes of CareQuest Hub" quest awards bonus JOY
2. **Achievement Badges**: "10,000 words typed", "50 perfect sentences" displayed in main profile
3. **Content Unlocks**: Completing therapy quests unlocks exclusive sentence categories
4. **Counselor Homework**: Therapists can assign "Practice these affirmations in hub" as exercises

### Analytics Value

- Hub metrics (WPM, accuracy, session duration) feed into wellness analytics
- Insights Agent correlates typing patterns with mood trends
- Aggregate data informs sentence curation and difficulty balancing

---

## User Experience Flow

### First-Time Player

1. **Tutorial**: 3 guided sentences with mechanic explanations
2. **Calibration**: System observes initial WPM/accuracy, adjusts starting rank
3. **First Victory**: Detailed damage breakdown and resource explanation
4. **Upgrade Unlock**: Stage 3 triggers first upgrade tutorial
5. **Main Quest Link**: Toast notification about wallet synchronization

### Session Structure

**Ideal Session:** 8-12 minutes
- Warm-up: 5-10 sentences (build combo)
- Peak: Defeat 1-2 bosses (high focus)
- Cool-down: Casual typing, check upgrades
- Exit: Progress summary with encouraging Aika message

### Safety Mechanisms

- **No Punishment**: Low accuracy reduces damage but never deducts resources
- **Compassion Mode**: After 5 sentences <50% accuracy, offer easier alternatives
- **Time Warnings**: 30-minute gentle reminder, 2-hour soft cap with break suggestion
- **Positive Framing**: All UI text is supportive ("Keep practicing!" not "You failed")

---

## Implementation Phases

### Phase 1: Core Typing Engine (Priority: HIGH)
**Files:**
- `utils/typingEngine.ts` – WPM calculation, accuracy tracking, metrics
- `utils/sentenceSelector.ts` – Difficulty-based sentence retrieval
- `utils/gameLogic.ts` – Damage calculation, monster generation

**Deliverables:**
- Character-by-character validation with color feedback
- Real-time WPM/accuracy calculation
- Combo tracking with reset conditions

### Phase 2: Monster & Progression
**Files:**
- `constants.ts` – Monster types, bosses, upgrade definitions
- `types.ts` – GameState, Monster, Sentence interfaces
- `components/MonsterDisplay.tsx` – HP bar, typing interface, attack flow

**Deliverables:**
- Monster scaling formula implementation
- Boss encounters every 10 stages
- Resource reward distribution

### Phase 3: UI & Visual Feedback
**Files:**
- `components/StatCard.tsx` – Display JOY/CARE/Harmony/WPM
- `components/UpgradeCard.tsx` – Purchase and level up upgrades
- `page.tsx` – Main orchestrator with state management

**Deliverables:**
- Animated damage numbers
- Combo counter with glow effects
- Critical hit sparkle animation
- Progress summary modal

### Phase 4: Backend Integration
**Files:**
- `backend/app/routes/quests.py` – Wellness update endpoint
- `backend/app/schemas/quests.py` – Delta update schema
- `frontend/src/services/questApi.ts` – API client functions

**Deliverables:**
- 5-second sync loop with retry queue
- Query invalidation for header refresh
- Session analytics submission

### Phase 5: Sentence Database & Polish
**Files:**
- `public/assets/game/sentences-database.json` – 25+ sentences across categories
- Monster sprites (optional, text placeholders acceptable for MVP)
- Background illustrations (optional, gradients acceptable)

**Deliverables:**
- Bilingual sentence content (EN/ID)
- Counselor-reviewed therapeutic appropriateness
- Cultural sensitivity validation

---

## Success Metrics (from PRD)

### Engagement Metrics
- ≥40% of pilot users try CareQuest Hub within first 7 days
- ≥25% of hub users return for 3+ sessions within first 14 days
- Average session duration: 8-12 minutes

### Performance Metrics
- Average typing accuracy improvement: ≥5% from 1st to 10th session
- ≥80% of typed sentences from Affirmations/Coping categories
- Input latency: <50ms keystroke to visual feedback

### Safety Metrics
- Zero reports of triggering content from counselors
- Zero addictive behavior patterns flagged
- <5% of users hit 2-hour daily cap

### Technical Metrics
- Sync success rate: ≥99.5%
- Sync latency: <2 seconds for delta updates
- Offline play capability: 100% of core mechanics functional

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Typing becomes addictive** | Medium | Session time warnings (30 min), daily cap (2 hr), usage monitoring |
| **Sentence content triggers distress** | High | Counselor review required, skip button always available, trigger warnings |
| **Input latency on low-end devices** | Medium | Performance profiling, debouncing, graceful degradation to 30 FPS |
| **Sync conflicts with main quest** | Low | Server-authoritative design, last-write-wins, delta-based updates |
| **Sentence database insufficient** | Medium | Launch with 25 sentences, expand weekly based on usage analytics |

---

## Open Questions for Stakeholders

### Counseling Team
1. Should typing metrics (WPM, accuracy) be visible in student progress dashboards?
2. What is acceptable session time before suggesting break? (Current: 30 min warning, 2 hr cap)
3. Should sentence database include content warnings for sensitive topics?
4. How often should sentences rotate to prevent memorization vs. reinforcement?

### Product Team
5. Language toggle: Default to Indonesian for UGM students or user choice on first launch?
6. Should we track "most helpful sentences" via user feedback for curation?
7. Integration priority: Hub-first or main quest completion-gated?

### Technical Team
8. Target device range for performance optimization? (Proposal: Android 8+, iOS 12+)
9. Offline sync queue: Max size before requiring online validation?
10. Analytics granularity: Per-sentence tracking or session aggregates only?

---

## Next Steps

### Immediate (Week 1)
1. ✅ Update GDD Section 5.4 (COMPLETED)
2. ✅ Update PRD Requirement R7 (COMPLETED)
3. ✅ Create sentence database JSON with 25 initial entries (COMPLETED)
4. ⏳ Implement Phase 1: Core Typing Engine
5. ⏳ Get counselor sign-off on sentence content

### Short-term (Week 2-3)
6. Implement Phase 2: Monster & Progression
7. Implement Phase 3: UI & Visual Feedback
8. Internal playtesting with 5 volunteers
9. Performance profiling on target devices

### Mid-term (Week 4-6)
10. Implement Phase 4: Backend Integration
11. Closed beta with 10 UGM students
12. Gather qualitative feedback, iterate on sentence difficulty
13. Expand sentence database to 50+ entries

### Long-term (Post-MVP)
14. Add monster sprite artwork (currently text placeholders)
15. Background illustrations by rank (currently gradients)
16. Sound effects and particle animations
17. Leaderboards and multiplayer typing races
18. Voice narration for accessibility

---

## Conclusion

The **typing-based combat system** transforms CareQuest Hub from a mindless clicker into a **therapeutic educational tool** that combines skill development with mental health reinforcement. By requiring players to actively type affirmations and CBT phrases, we create meaningful cognitive engagement that supports the main quest system's therapeutic goals while providing an enjoyable, skill-based gameplay experience.

This design leverages evidence-based CBT principles (repetition, active processing, positive framing) while creating a unique gaming experience that no other mental health platform offers. The integration with the main quest system ensures hub progress contributes to overall wellness metrics, creating a cohesive ecosystem where gameplay and therapy reinforce each other.

**Key Differentiator:** We're not just asking students to click mindlessly—we're asking them to practice the very skills that improve mental health, one typed word at a time.

---

**Document Status:** Final  
**Stakeholder Review Required:** Counseling Team (sentence content), Product Team (success metrics validation), Engineering Team (feasibility confirmation)  
**Next Review Date:** November 2, 2025 (after Phase 1 implementation)
