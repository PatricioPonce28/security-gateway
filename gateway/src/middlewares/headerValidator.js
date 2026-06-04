require("dotenv").config();
const logger = require("../services/logger");
const eventBus = require("../services/eventBus");

// Orígenes permitidos para CORS
const ALLOWED_ORIGINS = [
  "http://localhost:5173", // Vite dev server del dashboard
  "http://localhost:3000",
  "https://security-gateway-omega.vercel.app/", // URL de producción del dashboard
];

// User-Agents conocidos como maliciosos o scanners
const BLOCKED_AGENTS = [
  "sqlmap",     // herramienta de SQL injection automática
  "nikto",      // scanner de vulnerabilidades
  "nmap",       // scanner de puertos
  "masscan",    // scanner masivo
];

const headerValidator = (req, res, next) => {
  const clientIP = req.ip?.replace("::ffff:", "") || "unknown";
  const origin = req.headers["origin"] || "";
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();

  // 1. Verificar User-Agent malicioso
  const blockedAgent = BLOCKED_AGENTS.find((agent) =>
    userAgent.includes(agent)
  );

  if (blockedAgent) {
    logger.warn("USER-AGENT BLOQUEADO", { ip: clientIP, userAgent });

    eventBus.emitRequest({
      ip: clientIP,
      method: req.method,
      path: req.path,
      status: "BLOCKED",
      reason: `User-Agent bloqueado: ${blockedAgent}`,
      threat: "MALICIOUS_AGENT",
    });

    return res.status(403).json({
      error: "Forbidden",
      message: "Cliente no permitido",
    });
  }

  // 2. Verificar CORS si viene con Origin header
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    logger.warn("ORIGEN NO PERMITIDO", { ip: clientIP, origin });

    eventBus.emitRequest({
      ip: clientIP,
      method: req.method,
      path: req.path,
      status: "BLOCKED",
      reason: `Origen no permitido: ${origin}`,
      threat: "CORS_VIOLATION",
    });

    return res.status(403).json({
      error: "Forbidden",
      message: "Origen no autorizado",
    });
  }

  // 3. Agregar headers de seguridad a la respuesta
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  next();
};

module.exports = headerValidator;