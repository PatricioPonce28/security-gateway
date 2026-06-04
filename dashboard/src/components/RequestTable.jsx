const RequestTable = ({ requests }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return "—"
    return new Date(timestamp).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="table-card">
      <h2>📋 Requests en tiempo real</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>IP</th>
              <th>Método</th>
              <th>Ruta</th>
              <th>Estado</th>
              <th>Amenaza</th>
              <th>Razón</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                  Esperando requests...
                </td>
              </tr>
            ) : (
              requests.map((req, i) => (
                <tr key={req.id || i}>
                  <td style={{ color: "#64748b" }}>{formatTime(req.timestamp)}</td>
                  <td style={{ fontFamily: "monospace", color: "#60a5fa" }}>{req.ip}</td>
                  <td style={{ fontFamily: "monospace" }}>{req.method}</td>
                  <td style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{req.path}</td>
                  <td>
                    <span className={`badge ${req.status}`}>{req.status}</span>
                  </td>
                  <td>
                    {req.threat
                      ? <span className="threat-tag">{req.threat}</span>
                      : <span style={{ color: "#334155" }}>—</span>
                    }
                  </td>
                  <td style={{ color: "#64748b", fontSize: "0.8rem" }}>
                    {req.reason || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RequestTable