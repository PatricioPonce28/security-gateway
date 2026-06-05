**Security Gateway Dashboard\
Documentación Técnica y Guía de Pruebas**
=========================================
**Versión para entrega académica y despliegue en producción**\
Proyecto Integrador: Sistemas Operativos, Infraestructura y Ciberseguridad
## **1. Descripción General**
Security Gateway Dashboard es una solución de seguridad perimetral desarrollada con Node.js y Express que funciona como Reverse Proxy y Web Application Firewall (WAF). El sistema inspecciona todas las solicitudes entrantes antes de enviarlas al backend protegido, permitiendo detectar y bloquear ataques comunes como SQL Injection, Cross-Site Scripting (XSS), Path Traversal, abuso de recursos mediante Rate Limiting, direcciones IP bloqueadas y herramientas de reconocimiento maliciosas.
## **2. Arquitectura del Sistema**
El flujo de procesamiento consiste en: Cliente → Gateway de Seguridad → Validaciones de Seguridad → Reverse Proxy → Backend Protegido. El gateway incorpora Rate Limiter, IP Blocker, Header Validator y Threat Detector. Además, transmite eventos en tiempo real al dashboard mediante WebSockets.
## **3. Componentes Principales**
Rate Limiter: limita solicitudes por IP.\
IP Blocker: bloquea direcciones definidas manualmente o almacenadas en SQLite.\
Header Validator: valida CORS y User-Agent.\
Threat Detector: detecta patrones asociados a SQL Injection, XSS y Path Traversal.\
Dashboard React: muestra métricas y eventos en tiempo real.\
SQLite: almacena registros, estadísticas e IPs bloqueadas.
## **4. Ejecución Local**
Instalar dependencias con npm install tanto en gateway como dashboard. Configurar variables de entorno y ejecutar npm run dev. El gateway se expone en http://localhost:3000 y el dashboard en http://localhost:5173.
## **5. Pruebas Locales**
Solicitudes permitidas:\
GET http://localhost:3000/proxy/users\
GET http://localhost:3000/proxy/posts/1\
\
Pruebas de SQL Injection:\
GET http://localhost:3000/proxy/users?id=1 OR 1=1\
\
Pruebas XSS:\
GET http://localhost:3000/proxy/users?name=<script>alert('xss')</script>\
\
Pruebas Path Traversal:\
GET http://localhost:3000/proxy/users?file=../../etc/passwd\
\
Rate Limiting:\
Enviar más de 20 solicitudes por minuto para obtener respuesta HTTP 429.
## **6. Despliegue en Producción**
El gateway se encuentra desplegado en Railway y expuesto públicamente mediante la URL:\
https://security-gateway-production.up.railway.app\
\
Todas las solicitudes deben realizarse a través de esta URL, manteniendo la ruta /proxy para acceder al backend protegido. Railway aloja el gateway, el WAF y el reverse proxy.
## **7. Pruebas en Producción**
Solicitudes permitidas:\
GET https://security-gateway-production.up.railway.app/proxy/users\
GET https://security-gateway-production.up.railway.app/proxy/posts/1\
\
SQL Injection:\
GET https://security-gateway-production.up.railway.app/proxy/users?id=1 OR 1=1\
\
XSS:\
GET https://security-gateway-production.up.railway.app/proxy/users?name=<script>alert('xss')</script>\
\
Path Traversal:\
GET https://security-gateway-production.up.railway.app/proxy/users?file=../../etc/passwd\
\
User-Agent malicioso:\
Configurar User-Agent: sqlmap/1.0 en Postman.\
\
CORS:\
Enviar Origin: https://sitio-malicioso.com.\
\
Rate Limiting:\
Enviar más de 20 solicitudes consecutivas para verificar respuesta HTTP 429.
## **8. API del Dashboard**
GET /api/stats → estadísticas generales.\
GET /api/logs → registros recientes.\
POST /api/block-ip → bloqueo manual de direcciones IP.\
\
Ejemplo:\
POST https://security-gateway-production.up.railway.app/api/block-ip
## **9. Beneficios de Seguridad**
La solución permite proteger aplicaciones web mediante una capa intermedia que inspecciona tráfico, registra eventos, detecta amenazas conocidas y proporciona monitoreo en tiempo real. Esto reduce riesgos asociados a ataques de inyección, ejecución de scripts maliciosos y abuso de recursos.
## **10. Conclusiones**
El proyecto demuestra la integración práctica de conceptos de Sistemas Operativos, Infraestructura y Ciberseguridad mediante la implementación de un gateway de seguridad funcional, desplegado en producción y acompañado de herramientas de monitoreo en tiempo real.
