# Phaser 3 CareQuest - Quick Start Guide

## ✅ Installation Complete

Phaser 3 has been successfully installed and configured! Here's what was created:

## 📁 File Structure

```
frontend/src/
├── game/                              # Phaser 3 game code
│   ├── config.ts                      # Phaser configuration
│   ├── scenes/                        # Game scenes
│   │   ├── BootScene.ts               # Asset loading
│   │   ├── WorldMapScene.ts           # UGM campus exploration
│   │   └── CombatScene.ts             # Typing combat
│   ├── systems/                       # Game logic
│   │   ├── TypingEngine.ts            # Typing mechanics
│   │   └── CombatSystem.ts            # Damage calculation
│   └── utils/
│       └── EventBridge.ts             # Phaser ↔ React communication
│
├── components/game/
│   └── PhaserGame.tsx                 # React wrapper
│
├── store/
│   └── gameStore.ts                   # Zustand shared state
│
└── app/carequest/
    ├── layout.tsx                     # Shared navigation
    ├── world/page.tsx                 # Phaser 3 game route
    ├── guild/page.tsx                 # Guild system (React)
    ├── market/page.tsx                # Block Market (React)
    └── activities/page.tsx            # Mini-games (React)
```

## 🚀 How to Run

1. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to CareQuest:**
   - Open browser: `http://localhost:4000/carequest/world`
   - The Phaser 3 game will load automatically

## 🎮 Test the Game

### Current Features (Working)

1. **World Map Scene:**
   - Arrow keys to move player
   - Click blue NPC to interact (Aika)
   - Click red zones to enter combat

2. **Combat Scene:**
   - Type sentences displayed on screen
   - Real-time feedback (green/yellow/red text)
   - Damage calculated from WPM and accuracy
   - Victory rewards sync to backend

3. **Navigation:**
   - `/carequest/world` - Phaser 3 game (full-screen)
   - `/carequest/guild` - Guild system (React)
   - `/carequest/market` - Block Market (React)
   - `/carequest/activities` - Mini-games (React)

### Testing Checklist

- [ ] Game loads without errors
- [ ] Player can move with arrow keys
- [ ] Can click NPC (shows alert dialogue)
- [ ] Can enter combat (click red zone)
- [ ] Typing mechanics work
  - [ ] Characters turn green when correct
  - [ ] Can use backspace
  - [ ] Sentence completion triggers attack
- [ ] Monster HP bar updates
- [ ] Victory screen appears
- [ ] Rewards displayed
- [ ] Can navigate to Guild/Market/Activities pages
- [ ] Header navigation works on non-game pages

## 🔧 Next Steps

### Phase 1: Replace Placeholders (This Week)
1. **Generate Assets:**
   - UGM campus map background
   - Player sprite (walk animations)
   - 5 monster sprites + 5 boss sprites
   - NPC sprites (Aika, counselors)

2. **Update Asset Loading:**
   Edit `BootScene.ts` and uncomment real asset paths:
   ```typescript
   // Replace this line in BootScene.ts:
   this.createPlaceholderAssets();
   
   // With:
   this.load.image('ugm-campus', '/assets/backgrounds/ugm-campus-map.png');
   this.load.spritesheet('player', '/assets/sprites/player.png', {
     frameWidth: 32,
     frameHeight: 48,
   });
   // ... etc.
   ```

### Phase 2: Expand World Map (Next Week)
1. **Add More Locations:**
   - Library
   - Classroom building
   - Garden (peaceful zone)
   - Balairung (guild headquarters)
   - Counselor office

2. **NPC Dialogue System:**
   - Replace `alert()` with DialogueScene overlay
   - Implement dialogue trees
   - Quest markers

3. **Monster Encounters:**
   - Random encounters while walking
   - Boss fight zones
   - Monster variety (5 types + 5 bosses)

### Phase 3: Polish & Features (Weeks 3-4)
1. **Visual Effects:**
   - Particle systems (damage numbers, victory animations)
   - Screen shake on attacks
   - Sprite animations

2. **Sound & Music:**
   - Background music for each scene
   - Typing sound effects
   - Combat sound effects
   - Victory/defeat jingles

3. **Quest System:**
   - Quest log overlay (Phaser.Scene)
   - Track active quests
   - Quest markers on map

### Phase 4: React Features (Weeks 5-6)
1. **Guild System:**
   - Real-time chat (WebSockets)
   - Guild roster (fetch from backend)
   - Guild management (create, join, invite)

2. **Block Market:**
   - Fetch vouchers/merch from backend
   - Purchase flow with $CARE tokens
   - Purchase history

3. **Activities:**
   - Implement mindfulness exercises
   - CBT workshops
   - Mood journaling
   - Breathing exercises

## 📝 Development Tips

### Adding New Scenes

1. Create scene file in `game/scenes/`:
   ```typescript
   import Phaser from 'phaser';
   
   export class NewScene extends Phaser.Scene {
     constructor() {
       super({ key: 'NewScene' });
     }
     
     create() {
       // Scene logic
     }
   }
   ```

2. Register in PhaserGame.tsx:
   ```typescript
   import { NewScene } from '@/game/scenes/NewScene';
   
   const config = {
     ...GAME_CONFIG,
     scene: [BootScene, WorldMapScene, CombatScene, NewScene],
   };
   ```

3. Transition from another scene:
   ```typescript
   this.scene.start('NewScene', { data });
   ```

### Communicating with React

**From Phaser to React:**
```typescript
const eventBridge = EventBridge.getInstance();
eventBridge.emit('custom:event', { data });
```

**From React to Phaser:**
```typescript
// In PhaserGame.tsx
eventBridge.on('custom:event', (data) => {
  // Handle event
});
```

### Syncing to Backend

**Automatic (via EventBridge):**
```typescript
// In Phaser scene
eventBridge.emit('combat:victory', { rewards: { joy_delta: 10 } });

// PhaserGame.tsx listens and calls:
await updateWellnessFromGame(rewards);
```

**Manual (from React):**
```typescript
import { useGameStore } from '@/store/gameStore';

const { updateWellnessFromGame } = useGameStore();
await updateWellnessFromGame({ joy_delta: 10 });
```

## 🐛 Troubleshooting

### "Cannot find module 'phaser'"
- Run: `npm install phaser@3.87.0`
- Restart dev server

### Game not rendering
- Check browser console for errors
- Verify `#phaser-game-container` exists
- Check Phaser.Game initialization in PhaserGame.tsx

### Typing not working
- Ensure `sentences-database.json` exists at `/public/assets/game/`
- Check CombatScene keyboard listener setup
- Verify TypingEngine initialization

### Backend sync not working
- Check network tab for failed API calls
- Verify `questApi.ts` updateWellnessState function
- Check backend endpoint is running

## 📚 Resources

- **Phaser 3 Docs:** https://photonstorm.github.io/phaser3-docs/
- **Phaser Examples:** https://phaser.io/examples
- **Phaser Discord:** https://discord.gg/phaser
- **TypeScript + Phaser:** https://phaser.io/tutorials/getting-started-phaser3/part5

## 🎯 Current Status

✅ Phaser 3 installed and configured  
✅ Core game loop working  
✅ Typing mechanics implemented  
✅ Combat system with damage calculation  
✅ World map exploration  
✅ React ↔ Phaser communication  
✅ Backend sync (wellness rewards)  
✅ Navigation between Game/Guild/Market/Activities  
⏳ Visual assets (placeholders active)  
⏳ Sound effects and music  
⏳ Guild/Market/Activities features  

---

**Ready to start development!** 🚀

For questions or issues, refer to:
- `PHASER3_MIGRATION_PLAN.md` - Full migration roadmap
- `UGM-AICare-Quest-GDD.md` - Game design document
- `PRD-UGM-AICare-Quest.md` - Product requirements

Happy coding! 🎮✨
