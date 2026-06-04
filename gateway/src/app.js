require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { createProxyMiddleware } = require("http-proxy-middleware");

const logger = require("./services/logger");
const eventBus = require("./services/eventBus");
const { initDatabase, saveLog, updateStats } = require("./services/database");

const rateLimiter = require("./middlewares/rateLimiter");
const ipBlocker = require("./middlewares/ipBlocker");
const threatDetector = require("./middlewares/threatDetector");
const headerValidator = require("./middlewares/headerValidator");

const statsRouter = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────
// 1. CONFIGURACIÓN BASE
// ─────────────────────────────────────────
app.set("trust proxy", "loopback");
const allowedOrigins = [
  "http://localhost:5173",
  "https://security-gateway-omega.vercel.app/", // ← agrega tu URL de Vercel
];
app.use(express.json());

// ─────────────────────────────────────────|
// 2. BASE DE DATOS
// ─────────────────────────────────────────
initDatabase();

// ─────────────────────────────────────────
// 3. EVENTOS → BD
// ─────────────────────────────────────────
eventBus.on("request", (data) => {
  try {
    saveLog(data);
    updateStats(data.status);
  } catch (error) {
    logger.error("Error guardando log en BD", { error: error.message });
  }
});

// ─────────────────────────────────────────
// 4. RUTAS INTERNAS — sin seguridad estricta
// ─────────────────────────────────────────
app.use("/api", statsRouter);

// ─────────────────────────────────────────
// 5. RUTA PROXY — con seguridad completa
// Los middlewares corren en orden antes del proxy
// ─────────────────────────────────────────
app.use(
  "/proxy",
  rateLimiter,      // 1ro: corta floods
  ipBlocker,        // 2do: bloquea IPs malas
  headerValidator,  // 3ro: valida CORS y User-Agent
  threatDetector,   // 4to: detecta SQLi, XSS, etc
  createProxyMiddleware({
    target: process.env.TARGET_URL,
    changeOrigin: true,
    pathRewrite: { "^/proxy": "" },
    on: {
      proxyReq: (proxyReq, req) => {
        logger.info("PROXY →", {
          target: process.env.TARGET_URL + req.path,
        });
      },
      error: (err, req, res) => {
        logger.error("PROXY ERROR", { error: err.message });
        res.status(502).json({ error: "Bad Gateway" });
      },
    },
  })
);

// ─────────────────────────────────────────
// 6. WEBSOCKET
// ─────────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  logger.info("Dashboard conectado via WebSocket");

  const handler = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  eventBus.on("request", handler);

  ws.on("close", () => {
    eventBus.off("request", handler);
    logger.info("Dashboard desconectado");
  });
});

// ─────────────────────────────────────────
// 7. SEÑALES DEL SO
// ─────────────────────────────────────────
process.on("SIGTERM", () => {
  logger.warn("SIGTERM recibido — apagando servidor...");
  httpServer.close(() => {
    logger.info("Servidor cerrado limpiamente");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.warn("SIGINT recibido — apagando servidor...");
  httpServer.close(() => {
    logger.info("Servidor cerrado limpiamente");
    process.exit(0);
  });
});

// ─────────────────────────────────────────
// 8. ARRANCAR
// ─────────────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`Gateway corriendo en http://localhost:${PORT}`);
  logger.info(`Proxy apuntando a: ${process.env.TARGET_URL}`);
  logger.info(`WebSocket listo para el dashboard`);
});

module.exports = app;