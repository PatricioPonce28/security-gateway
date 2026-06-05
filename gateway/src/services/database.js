const Database = require("better-sqlite3");
const path = require("path");
const logger = require("./logger");

// El archivo .db se crea automáticamente si no existe
const DB_PATH = process.env.NODE_ENV === "production"
  ? "/app/data/gateway.db"
  : path.join(__dirname, "../../gateway.db");

let db;

const initDatabase = () => {
  try {
    db = new Database(DB_PATH);

    // WAL mode: mejora rendimiento en lecturas concurrentes
    db.pragma("journal_mode = WAL");

    // Tabla de logs de requests
    db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ip          TEXT NOT NULL,
        method      TEXT NOT NULL,
        path        TEXT NOT NULL,
        status      TEXT NOT NULL,
        reason      TEXT,
        threat      TEXT,
        timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de IPs bloqueadas dinámicamente
    db.exec(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ip          TEXT UNIQUE NOT NULL,
        reason      TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de estadísticas generales
    db.exec(`
      CREATE TABLE IF NOT EXISTS stats (
        id              INTEGER PRIMARY KEY CHECK (id = 1),
        total_requests  INTEGER DEFAULT 0,
        total_blocked   INTEGER DEFAULT 0,
        total_allowed   INTEGER DEFAULT 0
      )
    `);

    // Insertamos fila inicial de stats si no existe
    db.exec(`
      INSERT OR IGNORE INTO stats (id, total_requests, total_blocked, total_allowed)
      VALUES (1, 0, 0, 0)
    `);

    logger.info("Base de datos inicializada correctamente", { path: DB_PATH });
  } catch (error) {
    logger.error("Error iniciando base de datos", { error: error.message });
    process.exit(1); // Si la BD falla, no tiene sentido seguir
  }
};

// Guarda un log de request
const saveLog = (data) => {
  const stmt = db.prepare(`
    INSERT INTO logs (ip, method, path, status, reason, threat)
    VALUES (@ip, @method, @path, @status, @reason, @threat)
  `);
  return stmt.run(data);
};

// Actualiza contadores de stats
const updateStats = (status) => {
  db.prepare(`
    UPDATE stats SET
      total_requests = total_requests + 1,
      total_blocked  = total_blocked  + CASE WHEN ? = 'BLOCKED' THEN 1 ELSE 0 END,
      total_allowed  = total_allowed  + CASE WHEN ? = 'ALLOWED' THEN 1 ELSE 0 END
    WHERE id = 1
  `).run(status, status);
};

// Obtiene los últimos N logs
const getRecentLogs = (limit = 50) => {
  return db.prepare(`
    SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?
  `).all(limit);
};

// Obtiene las estadísticas generales
const getStats = () => {
  return db.prepare(`SELECT * FROM stats WHERE id = 1`).get();
};

// Agrega una IP a la lista negra dinámica
const blockIp = (ip, reason) => {
  return db.prepare(`
    INSERT OR IGNORE INTO blocked_ips (ip, reason) VALUES (?, ?)
  `).run(ip, reason);
};

// Verifica si una IP está en la lista negra de la BD
const isIpBlocked = (ip) => {
  return db.prepare(`
    SELECT id FROM blocked_ips WHERE ip = ?
  `).get(ip);
};

module.exports = {
  initDatabase,
  saveLog,
  updateStats,
  getRecentLogs,
  getStats,
  blockIp,
  isIpBlocked,
};