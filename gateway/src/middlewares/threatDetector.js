const logger = require("../services/logger");
const eventBus = require("../services/eventBus");

const THREAT_PATTERNS = {
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE|OR|AND)\b.*(\b(FROM|INTO|SET|VALUES)\b|=|>|<))|(--)|(')|(%27)|(;)/gi,
  XSS:           /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:|on\w+\s*=/gi,
  PATH_TRAVERSAL: /(\.\.[\/\\]){1,}|\/etc\/passwd|\/etc\/shadow/gi,
  COMMAND_INJECTION: /[;&|`]|\b(cmd|exec|system|eval|bash|sh)\b/gi,
};

const scanForThreats = (value) => {
  if (!value) return null;
  for (const [threatName, pattern] of Object.entries(THREAT_PATTERNS)) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      return threatName;
    }
  }
  return null;
};

const threatDetector = (req, res, next) => {
  const clientIP = req.ip?.replace("::ffff:", "") || "unknown";

  // Decodificamos todo antes de escanear
  // El navegador codifica espacios como %20, OR como %4F%52, etc
  const decodedQuery = decodeURIComponent(JSON.stringify(req.query));
  const decodedPath  = decodeURIComponent(req.path);
  const decodedBody  = JSON.stringify(req.body);

  // También escaneamos la URL raw completa por si viene doble codificada
  const rawUrl = decodeURIComponent(req.originalUrl);

  const targets = {
    query:  decodedQuery,
    path:   decodedPath,
    body:   decodedBody,
    rawUrl: rawUrl,
  };

  for (const [location, value] of Object.entries(targets)) {
    const threat = scanForThreats(value);

    if (threat) {
      logger.warn("AMENAZA DETECTADA", {
        ip: clientIP,
        threat,
        location,   // ← nos dice dónde estaba el ataque
        method: req.method,
        path: req.path,
      });

      eventBus.emitRequest({
        ip: clientIP,
        method: req.method,
        path: req.path,
        status: "BLOCKED",
        reason: `Ataque detectado en ${location}: ${threat}`,
        threat,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Contenido malicioso detectado",
        threat,
        location,
      });
    }
  }

  next();
};

module.exports = threatDetector;