import * as Phaser from 'phaser';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with canvas fallback
  width: 1280,
  height: 720,
  parent: 'phaser-game-container',
  backgroundColor: '#2d3561',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Top-down view (no gravity)
      debug: process.env.NODE_ENV === 'development',
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [], // Scenes will be registered when creating game instance
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  dom: {
    createContainer: true, // Allows HTML overlays on Phaser canvas
  },
};
