import Phaser from 'phaser'
import WorldScene from './WorldScene'

let currentGame: Phaser.Game | null = null

export function createGame(parent: HTMLDivElement) {
  if (currentGame && currentGame.canvas?.parentElement === parent) {
    return currentGame
  }

  if (currentGame) {
    currentGame.destroy(true)
    currentGame = null
  }

  currentGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 450,
    backgroundColor: '#0f172a',
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [WorldScene],
  })

  const hot = import.meta as ImportMeta & {
    hot?: { dispose: (callback: () => void) => void }
  }

  if (hot.hot) {
    hot.hot.dispose(() => {
      destroyGame()
    })
  }

  return currentGame
}

export function destroyGame() {
  if (!currentGame) return
  currentGame.destroy(true)
  currentGame = null
}
