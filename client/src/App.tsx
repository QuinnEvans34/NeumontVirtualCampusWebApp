import { useEffect, useRef } from 'react'
import './App.css'
import { createGame, destroyGame } from './game/createGame'
import ChatPanel from './ui/ChatPanel'

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    createGame(containerRef.current)

    return () => {
      destroyGame()
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Phaser + React</h1>
        <p>Phaser should render the main map with a movable player.</p>
      </header>
      <div className="game-wrapper">
        <div ref={containerRef} className="game-container" />
      </div>
      <ChatPanel />
    </div>
  )
}

export default App
