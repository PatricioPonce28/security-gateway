// dashboard/src/components/StatsCards.jsx

const StatsCards = ({ stats }) => {
  return (
    <div className="stats-grid">
      <div className="card total">
        <h3>Total Requests</h3>
        <div className="number">{stats.total_requests}</div>
      </div>
      <div className="card blocked">
        <h3>Bloqueadas</h3>
        <div className="number">{stats.total_blocked}</div>
      </div>
      <div className="card allowed">
        <h3>Permitidas</h3>
        <div className="number">{stats.total_allowed}</div>
      </div>
    </div>
  )
}

export default StatsCards