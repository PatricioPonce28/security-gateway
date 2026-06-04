const express = require("express");
const router = express.Router();
const { getRecentLogs, getStats } = require("../services/database");
const logger = require("../services/logger");

// GET /api/stats → contadores generales
router.get("/stats", (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    logger.error("Error obteniendo stats", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/logs → últimos 50 logs
router.get("/logs", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    logger.error("Error obteniendo logs", { error: error.message });
    res.status(500).json({ error: "Error interno" });
  }
});

const { blockIp } = require("../services/database")

router.post("/block-ip", (req, res) => {
  const { ip, reason } = req.body

  if (!ip) {
    return res.status(400).json({ message: "IP requerida" })
  }

  try {
    blockIp(ip, reason || "Bloqueada manualmente desde dashboard")
    logger.warn("IP bloqueada desde dashboard", { ip, reason })
    res.json({ success: true, message: `IP ${ip} bloqueada` })
  } catch (error) {
    logger.error("Error bloqueando IP", { error: error.message })
    res.status(500).json({ message: "Error interno" })
  }
})

module.exports = router;