import * as Phaser from 'phaser';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with canvas fallback
  width: 1920, // Higher resolution (Full HD)
  height: 1080, // Higher resolution (Full HD)
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
    mode: Phaser.Scale.FIT, // Scale to fit container while maintaining aspect ratio
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
  render: {
    antialias: true, // Better graphics quality
    pixelArt: false, // Use smooth rendering (set to true if using pixel art assets)
    roundPixels: true, // Prevent pixel blur
  },
};
