import { useCallback, useEffect, useRef, useState } from 'react'

const WS_URL = 'ws://localhost:3001/ws'
const ROOM = 'basement-general'

type ChatMessage = {
  id: string
  room: string
  text: string
  ts: number
}

type ConnectionStatus = 'connected' | 'reconnecting' | 'offline'

export default function ChatPanel() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'reconnecting' : 'offline'
  )

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) return
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      connect()
    }, 1200)
  }, [])

  const connect = useCallback(() => {
    if (!navigator.onLine) {
      setStatus('offline')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('reconnecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.addEventListener('open', () => {
      setStatus('connected')
    })

    ws.addEventListener('close', () => {
      if (!navigator.onLine) {
        setStatus('offline')
        return
      }
      setStatus('reconnecting')
      scheduleReconnect()
    })

    ws.addEventListener('error', () => {
      ws.close()
    })

    ws.addEventListener('message', (event) => {
      const raw =
        typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data)

      try {
        const parsed = JSON.parse(raw)
        if (parsed?.type !== 'chat:message') return
        if (parsed.room !== ROOM) return
        if (typeof parsed.text !== 'string') return

        setMessages((prev) => [
          ...prev,
          {
            id: parsed.id ?? crypto.randomUUID(),
            room: parsed.room,
            text: parsed.text,
            ts: typeof parsed.ts === 'number' ? parsed.ts : Date.now(),
          },
        ])
      } catch {
        // Ignore malformed messages
      }
    })
  }, [scheduleReconnect])

  useEffect(() => {
    connect()

    const handleOnline = () => {
      setStatus('reconnecting')
      connect()
    }

    const handleOffline = () => {
      setStatus('offline')
      wsRef.current?.close()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      wsRef.current?.close()
      wsRef.current = null
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [connect])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'chat:send', room: ROOM, text: trimmed })
      )
      setInput('')
      return
    }

    setStatus(navigator.onLine ? 'reconnecting' : 'offline')
  }, [input])

  return (
    <aside className="chat-panel">
      <div className="chat-panel__header">
        <div>
          <strong>Basement Chat</strong>
          <div className="chat-panel__subtitle">{WS_URL}</div>
        </div>
        <span className={`chat-panel__status chat-panel__status--${status}`}>
          {status}
        </span>
      </div>
      <div className="chat-panel__messages">
        {messages.map((message) => (
          <div key={message.id} className="chat-panel__message">
            <span className="chat-panel__time">
              {new Date(message.ts).toLocaleTimeString()}
            </span>
            <span>{message.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-panel__input">
        <input
          type="text"
          value={input}
          placeholder="Type a message..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') sendMessage()
          }}
        />
        <button type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </aside>
  )
}
