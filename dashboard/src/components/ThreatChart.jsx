import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const COLORS = {
  SQL_INJECTION:      "#f87171",
  XSS:                "#fb923c",
  RATE_LIMIT:         "#facc15",
  IP_BLACKLIST:       "#a78bfa",
  IP_BLACKLIST_DB:    "#818cf8",
  CORS_VIOLATION:     "#38bdf8",
  MALICIOUS_AGENT:    "#34d399",
  PATH_TRAVERSAL:     "#f472b6",
  COMMAND_INJECTION:  "#ff6b6b",
}

const ThreatChart = ({ requests }) => {
  // Contamos cuántas veces apareció cada tipo de amenaza
  const threatCounts = requests.reduce((acc, req) => {
    if (req.threat) {
      acc[req.threat] = (acc[req.threat] || 0) + 1
    }
    return acc
  }, {})

  const data = Object.entries(threatCounts).map(([name, count]) => ({
    name: name.replace(/_/g, " "), // SQL_INJECTION → SQL INJECTION
    original: name,
    count,
  }))

  return (
    <div className="chart-card">
      <h2>⚠️ Amenazas detectadas</h2>
      {data.length === 0 ? (
        <div style={{ color: "#64748b", textAlign: "center", padding: "2rem 0", fontSize: "0.9rem" }}>
          Sin amenazas detectadas aún
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1e2235",
                border: "1px solid #2d3148",
                borderRadius: "8px",
                color: "#e2e8f0",
              }}
              cursor={{ fill: "#ffffff10" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.original}
                  fill={COLORS[entry.original] || "#6366f1"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default ThreatChart