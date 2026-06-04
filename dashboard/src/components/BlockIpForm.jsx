import { useState } from "react"

const BlockIpForm = ({ apiUrl }) => {
  const [ip, setIp]         = useState("")
  const [reason, setReason] = useState("")
  const [msg, setMsg]       = useState(null)   // { type: "success"|"error", text }
  const [loading, setLoading] = useState(false)

  const handleBlock = async () => {
    // Validación básica de formato IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip)) {
      setMsg({ type: "error", text: "Formato de IP inválido (ej: 192.168.1.1)" })
      return
    }

    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch(`${apiUrl}/api/block-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason: reason || "Bloqueada manualmente" }),
      })

      const data = await res.json()

      if (res.ok) {
        setMsg({ type: "success", text: `✅ IP ${ip} bloqueada correctamente` })
        setIp("")
        setReason("")
      } else {
        setMsg({ type: "error", text: data.message || "Error al bloquear IP" })
      }
    } catch (err) {
      setMsg({ type: "error", text: "No se pudo conectar al gateway" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-card">
      <h2>🚫 Bloquear IP manualmente</h2>

      <input
        type="text"
        placeholder="IP a bloquear (ej: 192.168.1.100)"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
      />

      <input
        type="text"
        placeholder="Razón (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ marginBottom: "0.75rem" }}
      />

      <button onClick={handleBlock} disabled={loading || !ip}>
        {loading ? "Bloqueando..." : "Bloquear IP"}
      </button>

      {msg && (
        <p className={msg.type === "success" ? "success-msg" : "error-msg"}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

export default BlockIpForm