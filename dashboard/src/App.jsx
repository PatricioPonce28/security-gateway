// dashboard/src/App.jsx
import { useState, useEffect, useRef } from "react"
import RequestTable from "./components/RequestTable"
import StatsCards from "./components/StatsCards"
import ThreatChart from "./components/ThreatChart"
import BlockIpForm from "./components/BlockIpForm"

// En desarrollo apunta a localhost, en producción a Railway
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000"
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

function App() {
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ total_requests: 0, total_blocked: 0, total_allowed: 0 })
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  // ── Cargar logs históricos al iniciar
  useEffect(() => {
    fetch(`${API_URL}/api/logs`)
      .then((r) => r.json())
      .then((logs) => setRequests(logs))
      .catch((e) => console.error("Error cargando logs:", e))

    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then((s) => setStats(s))
      .catch((e) => console.error("Error cargando stats:", e))
  }, [])

  // ── WebSocket: recibir eventos en tiempo real
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("WebSocket conectado")
        setConnected(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        // Agrega al inicio de la lista (más reciente primero)
        setRequests((prev) => [data, ...prev].slice(0, 100))

        // Actualiza contadores
        setStats((prev) => ({
          total_requests: prev.total_requests + 1,
          total_blocked:  prev.total_blocked  + (data.status === "BLOCKED" ? 1 : 0),
          total_allowed:  prev.total_allowed  + (data.status === "ALLOWED" ? 1 : 0),
        }))
      }

      ws.onclose = () => {
        setConnected(false)
        console.log("WebSocket desconectado, reintentando en 3s...")
        // Reconexión automática
        setTimeout(connect, 3000)
      }

      ws.onerror = (err) => console.error("WebSocket error:", err)
    }

    connect()

    return () => {
      wsRef.current?.close()
    }
  }, [])

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="shield">🛡️</span>
          <h1>Security Gateway Dashboard</h1>
        </div>
        <div className={`status ${connected ? "connected" : "disconnected"}`}>
          <span className="dot" />
          {connected ? "En vivo" : "Desconectado"}
        </div>
      </header>

      <main className="main">
        {/* Tarjetas de estadísticas */}
        <StatsCards stats={stats} />

        <div className="bottom-grid">
          {/* Gráfica de amenazas */}
          <ThreatChart requests={requests} />
          {/* Formulario bloqueo de IPs */}
          <BlockIpForm apiUrl={API_URL} />
        </div>

        {/* Tabla de requests */}
        <RequestTable requests={requests} />
      </main>
    </div>
  )
}

export default App