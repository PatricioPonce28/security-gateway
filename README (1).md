# 🛡️ Security Gateway Dashboard

Un **reverse proxy con firewall de aplicación web (WAF)** construido con Node.js + Express, con dashboard en tiempo real para monitoreo de amenazas. Proyecto integrador de **Sistemas Operativos, Infraestructura y Ciberseguridad**.

🌐 **Demo en vivo:**
- Dashboard: `https://tu-dashboard.vercel.app`
- Gateway API: `https://tu-gateway.up.railway.app`

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
| **Sistemas Operativos** | Sistema de archivos | SQLite persiste en Railway Volume |
| **Infraestructura** | Reverse Proxy | `http-proxy-middleware` redirige al backend |
| **Infraestructura** | Rate Limiting | Control de recursos por IP y ventana de tiempo |
| **Infraestructura** | WebSockets | Comunicación bidireccional en tiempo real |
| **Infraestructura** | Contenedores | Despliegue en Railway con volumen persistente |
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
│   ├── nixpacks.toml               ← Configuración de build Railway
│   ├── .env                        ← Variables locales (no se sube a Git)
│   └── package.json
│
├── dashboard/                      ← Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── StatsCards.jsx      ← Contadores en tiempo real
│   │   │   ├── RequestTable.jsx    ← Tabla de requests
│   │   │   ├── ThreatChart.jsx     ← Gráfica de amenazas (Recharts)
│   │   │   └── BlockIpForm.jsx     ← Formulario bloqueo manual
│   │   └── App.jsx
│   ├── .env.production             ← URLs de producción (Railway)
│   └── package.json
│
├── railway.json                    ← Configuración de despliegue Railway
├── .gitignore
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

Crear archivo `gateway/.env`:
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

## 🧪 Pruebas en local

Todas las pruebas se hacen contra `http://localhost:3000`.
El dashboard en `localhost:5173` se actualiza automáticamente.

### ✅ Requests limpias

```
GET http://localhost:3000/proxy/users
GET http://localhost:3000/proxy/posts/1
GET http://localhost:3000/proxy/comments?postId=1
```

### 🔴 SQL Injection
```
GET http://localhost:3000/proxy/users?id=1 OR 1=1
GET http://localhost:3000/proxy/posts?search=SELECT * FROM users
GET http://localhost:3000/proxy/users?q=DROP TABLE users--
```

### 🔴 XSS
```
GET http://localhost:3000/proxy/users?name=<script>alert('xss')</script>
GET http://localhost:3000/proxy/users?input=<img onerror=alert(1)>
GET http://localhost:3000/proxy/users?r=javascript:alert(document.cookie)
```

### 🔴 Path Traversal
```
GET http://localhost:3000/proxy/users?file=../../etc/passwd
GET http://localhost:3000/proxy/files?path=../../../windows/system32
```

### 🔴 Rate Limiting
Más de 20 requests en 1 minuto. Con curl:
```bash
for i in {1..25}; do
  curl -s http://localhost:3000/proxy/users -o /dev/null -w "%{http_code}\n"
done
```
A partir del request 21 responde `429 Too Many Requests`.

### 🔴 User-Agent malicioso (Postman)
```
Header: User-Agent: sqlmap/1.0
GET http://localhost:3000/proxy/users
```
Agentes bloqueados: `sqlmap`, `nikto`, `nmap`, `masscan`

### 🔴 CORS Violation (Postman)
```
Header: Origin: https://sitio-malicioso.com
GET http://localhost:3000/proxy/users
```

### 🔴 Bloqueo manual de IP
Desde el dashboard en `localhost:5173`, formulario "Bloquear IP":
```
IP:    127.0.0.1
Razón: Prueba de bloqueo manual
```
Luego cualquier request al gateway responde `403 Forbidden`.

---

## 🌐 Pruebas en producción

Las mismas pruebas pero apuntando a la URL de Railway.

### ✅ Requests limpias
```
GET https://tu-gateway.up.railway.app/proxy/users
GET https://tu-gateway.up.railway.app/proxy/posts/1
GET https://tu-gateway.up.railway.app/proxy/comments?postId=1
```

### 🔴 SQL Injection
```
GET https://tu-gateway.up.railway.app/proxy/users?id=1 OR 1=1
GET https://tu-gateway.up.railway.app/proxy/posts?q=SELECT * FROM users
```

### 🔴 XSS
```
GET https://tu-gateway.up.railway.app/proxy/users?name=<script>alert('xss')</script>
```

### 🔴 Path Traversal
```
GET https://tu-gateway.up.railway.app/proxy/users?file=../../etc/passwd
```

### 🔴 Rate Limiting
```bash
for i in {1..25}; do
  curl -s https://tu-gateway.up.railway.app/proxy/users -o /dev/null -w "%{http_code}\n"
done
```

### 🔴 User-Agent malicioso (Postman)
```
Header: User-Agent: nikto/2.1.6
GET https://tu-gateway.up.railway.app/proxy/users
```

### 🔴 CORS Violation (Postman)
```
Header: Origin: https://atacante.com
GET https://tu-gateway.up.railway.app/proxy/users
```

### 🔴 Bloqueo manual de IP
Desde el dashboard en Vercel, formulario "Bloquear IP":
```
IP:    100.64.0.21
Razón: IP sospechosa detectada
```

> **Nota sobre IPs en producción:** En Railway las IPs que aparecen (`100.64.0.X`) son las del load balancer interno de Railway, no las IPs reales de los usuarios. Esto es normal en cualquier proveedor cloud (AWS, GCP, Azure funcionan igual).

---

## 📊 API REST

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/stats` | Contadores totales |
| `GET` | `/api/logs` | Últimos 50 logs |
| `GET` | `/api/logs?limit=100` | Últimos N logs |
| `POST` | `/api/block-ip` | Agregar IP a lista negra |

**Ejemplo:**
```bash
curl -X POST https://tu-gateway.up.railway.app/api/block-ip \
  -H "Content-Type: application/json" \
  -d '{"ip": "100.64.0.21", "reason": "Actividad sospechosa"}'
```

---

## 🔧 Variables de entorno

### Gateway (`gateway/.env`)
| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `TARGET_URL` | Backend protegido | `https://jsonplaceholder.typicode.com` |
| `BLOCKED_IPS` | IPs bloqueadas estáticas | `192.168.1.1,10.0.0.1` |
| `RATE_LIMIT_WINDOW_MS` | Ventana de rate limit (ms) | `60000` |
| `RATE_LIMIT_MAX` | Máximo requests por ventana | `20` |
| `NODE_ENV` | Entorno | `production` |

### Dashboard (`dashboard/.env.production`)
| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL HTTPS del gateway en Railway |
| `VITE_WS_URL` | URL WSS del gateway en Railway |

---

## 🌐 Despliegue

### Gateway → Railway
1. Crear cuenta en [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Settings → Root Directory: `gateway`
4. Agregar variables de entorno en el panel
5. Volumes → Add Volume → Mount Path: `/app/data`
6. Settings → Networking → Generate Domain

### Dashboard → Vercel
1. Crear cuenta en [vercel.com](https://vercel.com)
2. New Project → Import from GitHub
3. Settings → Root Directory: `dashboard`
4. Agregar variables de entorno:
   ```
   VITE_WS_URL  = wss://tu-gateway.up.railway.app
   VITE_API_URL = https://tu-gateway.up.railway.app
   ```
5. Redeploy

---

## 🛠️ Tecnologías

**Backend:** Node.js v22 · Express · http-proxy-middleware · express-rate-limit · better-sqlite3 · winston · ws

**Frontend:** React · Vite · Recharts · WebSocket API nativa

**Infraestructura:** Railway (backend + SQLite Volume) · Vercel (frontend estático) · GitHub (CI/CD automático)

---

## 👤 Autor

Desarrollado como proyecto integrador para prácticas profesionales.
Cubre: **Sistemas Operativos · Infraestructura · Ciberseguridad**
