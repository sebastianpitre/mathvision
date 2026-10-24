# =========================================================
# LUDOGAMIF · IMAGEN DEL JUEGO
# ---------------------------------------------------------
# Tres etapas:
#   1. frontend  → compila el juego (React + Vite). Así el
#                  servidor no necesita Node instalado.
#   2. servidor  → instala solo las dependencias de producción
#                  del servidor (Express + Socket.IO + pg).
#   3. final     → imagen pequeña que corre el servidor con un
#                  usuario sin privilegios (UID 10001) y sirve
#                  el juego compilado, la API y Socket.IO.
# =========================================================


# ---------- 1. Compilar el juego ----------
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public

# Vacío = la API está en el mismo dominio del juego.
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

RUN npm run build


# ---------- 2. Dependencias del servidor ----------
FROM node:22-alpine AS servidor

WORKDIR /app/servidor

COPY servidor/package.json servidor/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund


# ---------- 3. Imagen final ----------
FROM node:22-alpine

# Usuario fijo y sin privilegios. Las carpetas que se monten
# desde el servidor deben pertenecer a este número (10001).
ARG APP_UID=10001
RUN addgroup -S -g ${APP_UID} ludogamif \
 && adduser -S -D -H -u ${APP_UID} -G ludogamif ludogamif

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=UTC \
    FRONTEND_DIR=/app/dist \
    ARCHIVOS_DIR=/app/archivos

WORKDIR /app/servidor

COPY --from=servidor --chown=ludogamif:ludogamif /app/servidor/node_modules ./node_modules
COPY --chown=ludogamif:ludogamif servidor/ ./
COPY --from=frontend --chown=ludogamif:ludogamif /app/dist /app/dist

# Modelos y fotos subidos desde el panel (en un volumen de Docker).
RUN mkdir -p /app/archivos && chown ludogamif:ludogamif /app/archivos

USER ludogamif

EXPOSE 3000

# Docker sabe si el juego responde (lo usa "docker ps" y el script).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Al arrancar aplica las migraciones pendientes (no borran
# datos y se pueden repetir) y luego levanta el servidor.
CMD ["sh", "-c", "node scripts/migrar.js && exec node server.js"]
