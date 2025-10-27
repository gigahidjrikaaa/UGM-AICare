import * as Phaser from 'phaser';
import { TypingEngine } from '../systems/TypingEngine';
import { CombatSystem } from '../systems/CombatSystem';
import { EventBridge } from '../utils/EventBridge';

/**
 * CombatScene - Typing-based combat
 * 
 * Features:
 * - Display monster and HP bar
 * - Show sentence to type
 * - Real-time input validation with color coding
 * - Damage calculation based on WPM and accuracy
 * - Victory/defeat handling with rewards
 */

interface CombatSceneData {
  monsterType: string;
  difficulty: number;
}

export class CombatScene extends Phaser.Scene {
  private monster!: Phaser.GameObjects.Sprite;
  private typingEngine!: TypingEngine;
  private combatSystem!: CombatSystem;
  private eventBridge!: EventBridge;

  private currentSentence: string = '';
  private inputText!: Phaser.GameObjects.Text;
  private sentenceText!: Phaser.GameObjects.Text;
  private monsterHPBar!: Phaser.GameObjects.Graphics;
  private statsText!: Phaser.GameObjects.Text;

  private monsterType: string = '';
  private difficulty: number = 1;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: CombatSceneData) {
    console.log('[CombatScene] Initializing combat:', data);

    this.monsterType = data.monsterType || 'Unknown Monster';
    this.difficulty = data.difficulty || 1;

    this.eventBridge = EventBridge.getInstance();

    // Load sentence database
    const sentencesDB = this.cache.json.get('sentences');
    if (!sentencesDB) {
      console.error('[CombatScene] Sentence database not loaded!');
      // Fallback
      this.typingEngine = new TypingEngine({
        sentences: [
          {
            text_en: 'I am capable of handling challenges with grace and strength.',
            text_id: 'Saya mampu menghadapi tantangan dengan tenang dan kuat.',
            difficulty: 3,
            category: 'Affirmations',
          },
        ],
      });
    } else {
      this.typingEngine = new TypingEngine(sentencesDB);
    }

    // Initialize combat system (scale HP with difficulty)
    const monsterHP = 50 + (this.difficulty * 30); // 80 HP at difficulty 1, 200 HP at difficulty 5
    this.combatSystem = new CombatSystem(monsterHP);

    // Get first sentence
    this.currentSentence = this.typingEngine.getSentence({
      difficulty: this.difficulty,
      category: 'Affirmations',
      language: 'en',
    });
  }

  create() {
    console.log('[CombatScene] Creating combat UI...');

    // Background
    this.add.rectangle(640, 360, 1280, 720, 0x1a1a2e);

    // Title
    this.add.text(640, 50, `Combat: ${this.monsterType}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Monster sprite (placeholder)
    this.monster = this.add.sprite(640, 200, 'monster-placeholder');
    this.monster.setScale(2);

    // Monster HP bar
    this.monsterHPBar = this.add.graphics();
    this.updateMonsterHP();

    // Sentence display
    this.sentenceText = this.add.text(640, 450, this.currentSentence, {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 },
      wordWrap: { width: 1100 },
    }).setOrigin(0.5);

    // User input display
    this.inputText = this.add.text(640, 550, '', {
      fontSize: '28px',
      color: '#00ff00',
      backgroundColor: '#222222',
      padding: { x: 20, y: 10 },
      wordWrap: { width: 1100 },
    }).setOrigin(0.5);

    // Stats display (combo, WPM, accuracy)
    this.statsText = this.add.text(640, 620, 'Combo: 0x | WPM: 0 | Accuracy: 0%', {
      fontSize: '18px',
      color: '#ffff00',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(640, 680, 'Type the sentence above | Backspace to correct | Press ESC to flee', {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Keyboard input
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      this.handleTyping(event);
    });

    this.eventBridge.emit('game:sceneChanged', { scene: 'Combat' });
  }

  /**
   * Handle keyboard input for typing
   */
  private handleTyping(event: KeyboardEvent) {
    // ESC to flee back to menu
    if (event.key === 'Escape') {
      console.log('[CombatScene] Fleeing combat, returning to menu');
      this.scene.start('MenuScene');
      return;
    }

    const result = this.typingEngine.handleKeyPress(event.key);

    // Update input display
    this.inputText.setText(result.input);

    // Color code: green if matches, red if mistakes
    const accuracy = result.mistakes === 0 ? 100 : Math.max(0, 100 - (result.mistakes * 10));
    const color = accuracy >= 80 ? '#00ff00' : accuracy >= 50 ? '#ffff00' : '#ff0000';
    this.inputText.setColor(color);

    // Update stats
    const comboMultiplier = this.combatSystem.getComboMultiplier();
    const comboCount = this.combatSystem.getComboCount();
    this.statsText.setText(`Combo: ${comboCount} (${comboMultiplier}x) | Typing...`);

    // Check if sentence complete
    if (result.isComplete) {
      this.handleAttack(result.wpm, result.accuracy);
    }
  }

  /**
   * Process completed sentence as attack
   */
  private handleAttack(wpm: number, accuracy: number) {
    console.log(`[CombatScene] Attack! WPM: ${wpm}, Accuracy: ${accuracy}%`);

    // Calculate damage
    const isCritical = Math.random() < 0.1; // 10% crit chance
    const damage = this.combatSystem.calculateDamage({
      wpm,
      accuracy,
      upgrades: {}, // TODO: Fetch from gameStore
      combo: this.combatSystem.getComboMultiplier(),
      isCritical,
    });

    // Apply damage
    this.combatSystem.applyDamage(damage);
    this.updateMonsterHP();

    // Visual feedback
    this.showDamageNumber(damage, isCritical);
    this.cameras.main.shake(200, isCritical ? 0.02 : 0.01);

    // Update stats
    const comboCount = this.combatSystem.getComboCount();
    const comboMultiplier = this.combatSystem.getComboMultiplier();
    this.statsText.setText(`Combo: ${comboCount} (${comboMultiplier}x) | WPM: ${wpm} | Accuracy: ${accuracy}%`);

    // Check victory
    if (this.combatSystem.isDefeated()) {
      this.handleVictory(wpm, accuracy);
    } else {
      // Reset for next sentence
      this.time.delayedCall(500, () => {
        this.currentSentence = this.typingEngine.getSentence({
          difficulty: this.difficulty,
          category: 'Affirmations',
          language: 'en',
        });
        this.sentenceText.setText(this.currentSentence);
        this.inputText.setText('');
        this.typingEngine.reset();
      });
    }
  }

  /**
   * Update monster HP bar
   */
  private updateMonsterHP() {
    const percentage = this.combatSystem.getHPPercentage();
    
    this.monsterHPBar.clear();
    
    // HP bar background
    this.monsterHPBar.fillStyle(0x333333);
    this.monsterHPBar.fillRect(440, 260, 400, 25);
    
    // HP bar fill (green → yellow → red)
    let color = 0x00ff00;
    if (percentage < 0.5) color = 0xffff00;
    if (percentage < 0.25) color = 0xff0000;
    
    this.monsterHPBar.fillStyle(color);
    this.monsterHPBar.fillRect(442, 262, 396 * percentage, 21);
    
    // Border
    this.monsterHPBar.lineStyle(2, 0xffffff);
    this.monsterHPBar.strokeRect(440, 260, 400, 25);

    // HP text
    const hpText = `${Math.ceil(this.combatSystem['monsterHP'])} / ${this.combatSystem['monsterMaxHP']} HP`;
    this.monsterHPBar.fillStyle(0xffffff, 1);
    // Note: Can't use graphics.text, need to create separate text object
    if (!this.monsterHPBar.getData('hpText')) {
      const text = this.add.text(640, 272, hpText, {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(100);
      this.monsterHPBar.setData('hpText', text);
    } else {
      this.monsterHPBar.getData('hpText').setText(hpText);
    }
  }

  /**
   * Show floating damage number
   */
  private showDamageNumber(damage: number, isCritical: boolean) {
    const text = this.add.text(640, 200, `-${damage.toFixed(1)}`, {
      fontSize: isCritical ? '56px' : '40px',
      color: isCritical ? '#ffff00' : '#ff6600',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    if (isCritical) {
      this.add.text(640, 250, 'CRITICAL!', {
        fontSize: '28px',
        color: '#ffff00',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.tweens.add({
      targets: text,
      y: 140,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Handle combat victory
   */
  private handleVictory(finalWPM: number, finalAccuracy: number) {
    console.log('[CombatScene] Victory!');

    // Calculate rewards (scale with difficulty)
    const rewards = {
      joy_delta: 5 + (this.difficulty * 3),
      care_delta: 3 + (this.difficulty * 2),
      harmony_delta: 1 + this.difficulty,
    };

    // Show victory screen
    const victoryText = this.add.text(640, 360, 'VICTORY!', {
      fontSize: '72px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: 2,
    });

    // Show rewards
    this.add.text(640, 450, `Rewards: +${rewards.joy_delta} JOY | +${rewards.care_delta} CARE | +${rewards.harmony_delta} Harmony`, {
      fontSize: '24px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    // Emit to React for backend sync
    this.eventBridge.emit('combat:victory', { rewards, finalWPM, finalAccuracy, difficulty: this.difficulty });

    // Return to menu after 3 seconds
    this.time.delayedCall(3000, () => {
      this.scene.start('MenuScene');
    });
  }
}
