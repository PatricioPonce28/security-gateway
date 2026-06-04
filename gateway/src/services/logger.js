const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize } = format;

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
  return `[${timestamp}] ${level}: ${message} ${metaStr}`;
});

const logger = createLogger({
  level: "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    consoleFormat
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), consoleFormat),
    }),
    new transports.File({ filename: "logs/combined.log" }),
    new transports.File({ filename: "logs/errors.log", level: "error" }),
  ],
});

module.exports = logger;