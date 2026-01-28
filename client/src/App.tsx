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
      <div ref={containerRef} className="game-container" />
      <ChatPanel />
    </div>
  )
}

export default App
