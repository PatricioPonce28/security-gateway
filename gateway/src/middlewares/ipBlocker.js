// gateway/src/middlewares/ipBlocker.js

require("dotenv").config();
const logger = require("../services/logger");
const eventBus = require("../services/eventBus");
const { isIpBlocked } = require("../services/database");

const BLOCKED_IPS = new Set(
  (process.env.BLOCKED_IPS || "").split(",").map((ip) => ip.trim())
);

const ipBlocker = (req, res, next) => {
  const clientIP = req.ip?.replace("::ffff:", "") || "unknown";

  // ✅ CHECK 1: Lista del .env (en memoria)
  if (BLOCKED_IPS.has(clientIP)) {
    logger.warn("IP BLOQUEADA (.env)", {
      ip: clientIP,
      method: req.method,
      path: req.path,
    });

    eventBus.emitRequest({
      ip: clientIP,
      method: req.method,
      path: req.path,
      status: "BLOCKED",
      reason: "IP en lista negra (.env)",
      threat: "IP_BLACKLIST",
    });

    return res.status(403).json({
      error: "Forbidden",
      message: "Tu IP no tiene acceso a este servicio",
    });
  }

  // ✅ CHECK 2: Lista negra dinámica en BD (separado del anterior)
  const dbBlocked = isIpBlocked(clientIP);
  if (dbBlocked) {
    logger.warn("IP BLOQUEADA (BD)", {
      ip: clientIP,
      method: req.method,
      path: req.path,
    });

    eventBus.emitRequest({
      ip: clientIP,
      method: req.method,
      path: req.path,
      status: "BLOCKED",
      reason: "IP en lista negra (dinámica)",
      threat: "IP_BLACKLIST_DB",
    });

    return res.status(403).json({
      error: "Forbidden",
      message: "Tu IP no tiene acceso a este servicio",
    });
  }

  // ✅ IP LIMPIA: pasó ambos checks
  logger.info("IP PERMITIDA", { ip: clientIP, path: req.path });

  eventBus.emitRequest({
    ip: clientIP,
    method: req.method,
    path: req.path,
    status: "ALLOWED",
    reason: null,
    threat: null,
  });

  next();
};

module.exports = ipBlocker;