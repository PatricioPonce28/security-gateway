# 🛡️ Security Gateway Dashboard

Un **reverse proxy con firewall de aplicación web (WAF)** construido con Node.js + Express, con dashboard en tiempo real para monitoreo de amenazas.

---

## 📐 Arquitectura

```
REQUEST ENTRANTE
      ↓
┌─────────────────────────────┐
│      GATEWAY (Puerto 3000)  │  ← Servidor Express + WebSocket
│                             │
│  1. Rate Limiter            │  ← Máx 20 req/min por IP
│  2. IP Blocker              │  ← Lista negra .env + SQLite
│  3. Header Validator        │  ← CORS + User-Agent malicioso
│  4. Threat Detector         │  ← SQLi, XSS, Path Traversal
└─────────────────────────────┘
      ↓ si pasa todo
┌─────────────────────────────┐
│   PROXY → Backend protegido │  ← jsonplaceholder.typicode.com
└─────────────────────────────┘
      ↓ eventos en tiempo real
┌─────────────────────────────┐
│   DASHBOARD (Puerto 5173)   │  ← React + WebSocket
└─────────────────────────────┘
```

---

## 🧠 Conceptos demostrados

| Área | Concepto | Implementación |
|---|---|---|
| **Sistemas Operativos** | Señales del SO (SIGTERM, SIGINT) | Graceful shutdown del servidor |
| **Sistemas Operativos** | Procesos y recursos | Event Loop de Node.js, manejo de memoria |
| **Infraestructura** | Reverse Proxy | `http-proxy-middleware` redirige al backend |
| **Infraestructura** | Rate Limiting | Control de recursos por IP y ventana de tiempo |
| **Infraestructura** | WebSockets | Comunicación bidireccional en tiempo real |
| **Ciberseguridad** | SQL Injection | Detección por regex en query params y body |
| **Ciberseguridad** | XSS | Detección de scripts maliciosos |
| **Ciberseguridad** | Path Traversal | Bloqueo de `../../etc/passwd` |
| **Ciberseguridad** | CORS | Validación de origen de requests |
| **Ciberseguridad** | IP Blacklist | Lista negra estática (.env) y dinámica (SQLite) |

---

## 📁 Estructura del proyecto

```
security-gateway/
│
├── gateway/                        ← Backend principal
│   ├── src/
│   │   ├── middlewares/
│   │   │   ├── rateLimiter.js      ← Control de flood por IP
│   │   │   ├── ipBlocker.js        ← Lista negra de IPs
│   │   │   ├── threatDetector.js   ← Detección SQLi, XSS, Path Traversal
│   │   │   └── headerValidator.js  ← CORS y User-Agents maliciosos
│   │   │
│   │   ├── services/
│   │   │   ├── logger.js           ← Winston: logs con niveles
│   │   │   ├── eventBus.js         ← Canal de eventos (Singleton)
│   │   │   └── database.js         ← SQLite: logs, IPs bloqueadas, stats
│   │   │
│   │   ├── routes/
│   │   │   └── stats.js            ← API REST del dashboard
│   │   │
│   │   └── app.js                  ← Orquestador principal
│   │
│   ├── .env
│   └── package.json
│
├── dashboard/                      ← Frontend React
│   └── src/
│       ├── components/
│       │   ├── StatsCards.jsx      ← Contadores en tiempo real
│       │   ├── RequestTable.jsx    ← Tabla de requests
│       │   ├── ThreatChart.jsx     ← Gráfica de amenazas (Recharts)
│       │   └── BlockIpForm.jsx     ← Formulario bloqueo manual
│       └── App.jsx
│
└── README.md
```

---

## 🚀 Instalación y uso local

### Requisitos
- Node.js v18 o superior
- npm v9 o superior

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/security-gateway.git
cd security-gateway
```

### 2. Configurar el gateway
```bash
cd gateway
npm install
```

Crear archivo `.env` en `gateway/`:
```env
PORT=3000
TARGET_URL=https://jsonplaceholder.typicode.com
BLOCKED_IPS=192.168.1.100,10.0.0.1
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
NODE_ENV=development
```

### 3. Arrancar el gateway
```bash
npm run dev
```
Deberías ver:
```
info: Base de datos inicializada correctamente
info: Gateway corriendo en http://localhost:3000
info: Proxy apuntando a: https://jsonplaceholder.typicode.com
info: WebSocket listo para el dashboard
```

### 4. Arrancar el dashboard
```bash
# Nueva terminal
cd dashboard
npm install
npm run dev
```
Abrir `http://localhost:5173`

---

## 🧪 Pruebas de seguridad

Todas las pruebas se hacen contra `http://localhost:3000`. El dashboard en `localhost:5173` se actualiza automáticamente vía WebSocket.

---

### ✅ Requests limpias (deben pasar)

**Listar usuarios**
```
GET http://localhost:3000/proxy/users
```
Respuesta esperada: Array JSON con 10 usuarios. Badge `ALLOWED` en dashboard.

**Ver un post específico**
```
GET http://localhost:3000/proxy/posts/1
```

**Listar comentarios**
```
GET http://localhost:3000/proxy/comments?postId=1
```

---

### 🔴 SQL Injection

El gateway detecta palabras clave SQL combinadas con operadores de comparación.

**Prueba 1 — OR clásico**
```
GET http://localhost:3000/proxy/users?id=1 OR 1=1
```

**Prueba 2 — SELECT en parámetro**
```
GET http://localhost:3000/proxy/posts?search=SELECT * FROM users WHERE 1=1
```

**Prueba 3 — DROP TABLE**
```
GET http://localhost:3000/proxy/users?table=DROP TABLE users--
```

Respuesta esperada en todas:
```json
{
  "error": "Forbidden",
  "message": "Contenido malicioso detectado",
  "threat": "SQL_INJECTION",
  "location": "rawUrl"
}
```

---

### 🔴 XSS (Cross-Site Scripting)

**Prueba 1 — Script tag**
```
GET http://localhost:3000/proxy/users?name=<script>alert('xss')</script>
```

**Prueba 2 — Event handler**
```
GET http://localhost:3000/proxy/users?input=<img onerror=alert(1)>
```

**Prueba 3 — javascript: protocol**
```
GET http://localhost:3000/proxy/users?redirect=javascript:alert(document.cookie)
```

Respuesta esperada:
```json
{
  "error": "Forbidden",
  "message": "Contenido malicioso detectado",
  "threat": "XSS"
}
```

---

### 🔴 Path Traversal

Intento de leer archivos del sistema operativo.

**Prueba 1 — etc/passwd (Linux)**
```
GET http://localhost:3000/proxy/users?file=../../etc/passwd
```

**Prueba 2 — Múltiples niveles**
```
GET http://localhost:3000/proxy/files?path=../../../windows/system32
```

Respuesta esperada:
```json
{
  "error": "Forbidden",
  "message": "Contenido malicioso detectado",
  "threat": "PATH_TRAVERSAL"
}
```

---

### 🔴 IP Bloqueada

**Paso 1** — Desde el dashboard en `localhost:5173`, en el formulario "Bloquear IP manualmente":
```
IP:    127.0.0.1
Razón: Prueba de bloqueo manual
```

**Paso 2** — Hacer cualquier request al gateway:
```
GET http://localhost:3000/proxy/users
```

Respuesta esperada:
```json
{
  "error": "Forbidden",
  "message": "Tu IP no tiene acceso a este servicio"
}
```

> **Nota:** Para desbloquear, abrir `gateway.db` con SQLite Viewer en VSCode y eliminar el registro de `blocked_ips`.

---

### 🔴 Rate Limiting

Enviar más de 20 requests en menos de 1 minuto a cualquier ruta:

**Con curl (recomendado para esta prueba):**
```bash
for i in {1..25}; do curl -s http://localhost:3000/proxy/users -o /dev/null -w "%{http_code}\n"; done
```

**Manualmente:** Recargar `http://localhost:3000/proxy/users` más de 20 veces rápido.

A partir del request 21 la respuesta será:
```json
{
  "error": "Too Many Requests",
  "message": "Demasiadas solicitudes, espera un momento"
}
```
HTTP Status: `429`

---

### 🔴 User-Agent malicioso

Con Postman, cambiar el header `User-Agent`:

```
Header: User-Agent: sqlmap/1.0
GET http://localhost:3000/proxy/users
```

Herramientas bloqueadas: `sqlmap`, `nikto`, `nmap`, `masscan`

Respuesta esperada:
```json
{
  "error": "Forbidden",
  "message": "Cliente no permitido"
}
```

---

### 🔴 CORS Violation

Con Postman, agregar header de origen no autorizado:
```
Header: Origin: https://sitio-malicioso.com
GET http://localhost:3000/proxy/users
```

Respuesta esperada:
```json
{
  "error": "Forbidden",
  "message": "Origen no autorizado"
}
```

---

## 📊 API REST del dashboard

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/stats` | Contadores totales (requests, bloqueadas, permitidas) |
| `GET` | `/api/logs` | Últimos 50 logs de requests |
| `GET` | `/api/logs?limit=100` | Últimos N logs |
| `POST` | `/api/block-ip` | Agregar IP a lista negra dinámica |

**Ejemplo block-ip:**
```bash
curl -X POST http://localhost:3000/api/block-ip \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.50", "reason": "Actividad sospechosa"}'
```

---

## 🔧 Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del gateway | `3000` |
| `TARGET_URL` | URL del backend protegido | — |
| `BLOCKED_IPS` | IPs bloqueadas estáticas (separadas por coma) | — |
| `RATE_LIMIT_WINDOW_MS` | Ventana de tiempo para rate limit (ms) | `60000` |
| `RATE_LIMIT_MAX` | Máximo de requests por ventana | `20` |
| `NODE_ENV` | Entorno de ejecución | `development` |

---

## 🌐 Despliegue en producción

### Gateway → Railway
1. Crear cuenta en [railway.app](https://railway.app)

### Dashboard → Vercel
1. https://security-gateway-omega.vercel.app/


## 🛠️ Tecnologías utilizadas

**Backend:**
- Node.js v22 + Express
- `http-proxy-middleware` — Reverse proxy
- `express-rate-limit` — Control de flood
- `better-sqlite3` — Base de datos local
- `winston` — Logging profesional
- `ws` — WebSockets

**Frontend:**
- React + Vite
- Recharts — Gráficas
- WebSocket API nativa

---

## 👤 Autor

Desarrollado por Gean Patricio Ponce Oto
