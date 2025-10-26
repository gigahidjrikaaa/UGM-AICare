import Phaser from 'phaser';

/**
 * BootScene - Asset loading and initialization
 * 
 * Responsibilities:
 * - Load all game assets (sprites, backgrounds, audio, JSON)
 * - Display loading progress bar
 * - Transition to WorldMapScene when complete
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    console.log('[BootScene] Loading assets...');

    // Loading bar UI
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(440, 320, 400, 50);

    const loadingText = this.add.text(640, 280, 'Loading CareQuest...', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Progress events
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(450, 330, 380 * value, 30);
    });

    this.load.on('complete', () => {
      console.log('[BootScene] All assets loaded');
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load assets
    // TODO: Replace with real asset paths when generated
    
    // Backgrounds
    // this.load.image('ugm-campus', '/assets/backgrounds/ugm-campus-map.png');
    
    // Player sprite
    // this.load.spritesheet('player', '/assets/sprites/player.png', {
    //   frameWidth: 32,
    //   frameHeight: 48,
    // });
    
    // Monster sprites (5 common + 5 bosses)
    // this.load.spritesheet('monster-anxiety', '/assets/monsters/anxiety.png', {
    //   frameWidth: 64,
    //   frameHeight: 64,
    // });
    
    // NPC sprites
    // this.load.spritesheet('npc-aika', '/assets/npcs/aika.png', {
    //   frameWidth: 32,
    //   frameHeight: 48,
    // });

    // Sentence database (already exists)
    this.load.json('sentences', '/assets/game/sentences-database.json');

    // Placeholder: Create temporary assets for testing
    this.createPlaceholderAssets();
  }

  create() {
    console.log('[BootScene] Assets loaded, transitioning to WorldMapScene');
    this.scene.start('WorldMapScene');
  }

  /**
   * Create placeholder graphics for testing (remove when real assets ready)
   */
  private createPlaceholderAssets() {
    // Placeholder player sprite
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x00ff00, 1);
    playerGraphics.fillCircle(16, 24, 15);
    playerGraphics.generateTexture('player-placeholder', 32, 48);
    playerGraphics.destroy();

    // Placeholder monster sprite
    const monsterGraphics = this.add.graphics();
    monsterGraphics.fillStyle(0xff0000, 1);
    monsterGraphics.fillCircle(32, 32, 30);
    monsterGraphics.generateTexture('monster-placeholder', 64, 64);
    monsterGraphics.destroy();

    // Placeholder NPC sprite
    const npcGraphics = this.add.graphics();
    npcGraphics.fillStyle(0x0000ff, 1);
    npcGraphics.fillCircle(16, 24, 15);
    npcGraphics.generateTexture('npc-placeholder', 32, 48);
    npcGraphics.destroy();
  }
}
