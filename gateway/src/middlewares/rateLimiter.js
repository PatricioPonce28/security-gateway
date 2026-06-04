require("dotenv").config();
const rateLimit = require("express-rate-limit");
const logger = require("../services/logger");
const eventBus = require("../services/eventBus");

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, 
  max: parseInt(process.env.RATE_LIMIT_MAX) || 20,               
  standardHeaders: true,  
  legacyHeaders: false,

  handler: (req, res) => {
    const clientIP = req.ip?.replace("::ffff:", "") || "unknown";

    logger.warn("RATE LIMIT EXCEDIDO", {
      ip: clientIP,
      method: req.method,
      path: req.path,
    });

    eventBus.emitRequest({
      ip: clientIP,
      method: req.method,
      path: req.path,
      status: "BLOCKED",
      reason: "Rate limit excedido",
      threat: "RATE_LIMIT",
    });

    return res.status(429).json({
      error: "Too Many Requests",
      message: "Demasiadas solicitudes, espera un momento",
    });
  },
});

module.exports = rateLimiter;