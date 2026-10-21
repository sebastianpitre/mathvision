#!/usr/bin/env bash
# =========================================================
# LUDOGAMIF · ADMINISTRACIÓN DEL JUEGO CON DOCKER
# ---------------------------------------------------------
#   sudo ./ludogamif.sh instalar [--detras-de-nginx]
#   sudo ./ludogamif.sh actualizar
#   sudo ./ludogamif.sh estado
#   sudo ./ludogamif.sh logs [app|db]
#   sudo ./ludogamif.sh reiniciar [app|db]
#   sudo ./ludogamif.sh respaldo
#   sudo ./ludogamif.sh restaurar respaldos/ARCHIVO.sql.gz
#   sudo ./ludogamif.sh consola
#   sudo ./ludogamif.sh admin [usuario]
#
# Con --detras-de-nginx se deja la marca .detras-de-nginx en
# esta carpeta y desde ahí TODOS los comandos (incluido
# actualizar) publican el juego solo en 127.0.0.1:8082.
# =========================================================

set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PROYECTO="ludogamif"
MARCA_NGINX="$DIR/.detras-de-nginx"
ENV_FILE="$DIR/.env"
RESPALDOS="$DIR/respaldos"
RESPALDOS_A_GUARDAR=30

# ---------- Colores ----------
if [[ -t 1 ]]; then
    VERDE=$'\e[32m'; ROJO=$'\e[31m'; AMARILLO=$'\e[33m'; AZUL=$'\e[36m'; NEGRITA=$'\e[1m'; NORMAL=$'\e[0m'
else
    VERDE=""; ROJO=""; AMARILLO=""; AZUL=""; NEGRITA=""; NORMAL=""
fi

titulo() { echo; echo "${NEGRITA}${AZUL}▶ $*${NORMAL}"; }
ok()     { echo "${VERDE}✔ $*${NORMAL}"; }
aviso()  { echo "${AMARILLO}⚠ $*${NORMAL}"; }
error()  { echo "${ROJO}✘ $*${NORMAL}" >&2; }
morir()  { error "$*"; exit 1; }

trap 'error "Algo falló en la línea $LINENO. Revisa el mensaje de arriba."' ERR

# ---------- Utilidades ----------

leer_env() {
    # Lee una variable del .env sin ejecutar el archivo.
    local clave="$1" valor
    valor="$(grep -E "^${clave}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
    echo "${valor%$'\r'}"
}

poner_env() {
    local clave="$1" valor="$2"
    if grep -qE "^${clave}=" "$ENV_FILE"; then
        sed -i "s|^${clave}=.*|${clave}=${valor}|" "$ENV_FILE"
    else
        echo "${clave}=${valor}" >> "$ENV_FILE"
    fi
}

archivos_compose() {
    if [[ -f "$MARCA_NGINX" ]]; then
        echo "-f docker-compose.yml -f docker-compose.detras-de-nginx.yml"
    else
        echo "-f docker-compose.yml -f docker-compose.local.yml"
    fi
}

dc() {
    # shellcheck disable=SC2046
    docker compose -p "$PROYECTO" --env-file "$ENV_FILE" $(archivos_compose) "$@"
}

requisitos() {
    command -v docker >/dev/null 2>&1 || morir "Docker no está instalado."
    docker compose version >/dev/null 2>&1 || morir "Falta 'docker compose' (plugin v2)."
    docker info >/dev/null 2>&1 || morir "No puedo hablar con Docker. ¿Usaste sudo? ¿Está corriendo el servicio?"
}

requiere_instalado() {
    [[ -f "$ENV_FILE" ]] || morir "No hay .env. Primero: sudo ./ludogamif.sh instalar --detras-de-nginx"
}

modo() {
    if [[ -f "$MARCA_NGINX" ]]; then
        echo "detrás del nginx del servidor (127.0.0.1:$(leer_env PUERTO_APP))"
    else
        echo "local (http://localhost:$(leer_env PUERTO_APP))"
    fi
}

salud() {
    # Pregunta a la app desde dentro del contenedor (sirve en
    # cualquier modo, sin depender del puerto publicado).
    dc exec -T app node -e "fetch('http://127.0.0.1:3000/api/salud').then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)}).catch(e=>{console.log(e.message);process.exit(1)})" 2>/dev/null
}

esperar_salud() {
    local intentos=60
    echo -n "Esperando a que el juego responda "
    while (( intentos > 0 )); do
        if salud >/dev/null 2>&1; then
            echo
            ok "El juego responde en /api/salud."
            return 0
        fi
        echo -n "."
        sleep 3
        intentos=$((intentos - 1))
    done
    echo
    error "El juego no respondió en 3 minutos."
    echo "   Revisa los registros:  sudo ./ludogamif.sh logs app"
    exit 1
}

base_corriendo() {
    [[ "$(docker inspect -f '{{.State.Health.Status}}' "${PROYECTO}-db" 2>/dev/null || true)" == "healthy" ]]
}

# ---------- Comandos ----------

cmd_instalar() {
    local detras=0
    for arg in "$@"; do
        case "$arg" in
            --detras-de-nginx) detras=1 ;;
            *) morir "Opción desconocida: $arg" ;;
        esac
    done

    requisitos

    titulo "Instalando LudoGamif"

    if (( detras )); then
        touch "$MARCA_NGINX"
        ok "Modo servidor: el juego quedará SOLO en 127.0.0.1 detrás del nginx del sistema."
    elif [[ -f "$MARCA_NGINX" ]]; then
        ok "Ya estaba en modo servidor (detrás de nginx); se respeta."
    else
        aviso "Modo local (para tu computador). En el servidor usa: instalar --detras-de-nginx"
    fi

    # ----- .env con claves nuevas -----
    if [[ -f "$ENV_FILE" ]]; then
        ok "Ya existe .env: se conserva (no se cambian las claves)."
    else
        command -v openssl >/dev/null 2>&1 || morir "Falta openssl para generar las claves."

        if [[ -f "$MARCA_NGINX" ]]; then
            cp .env.ejemplo "$ENV_FILE"
            local dominio
            read -r -p "Dominio del juego [ludogamif.ocloudev.lat]: " dominio || true
            dominio="${dominio:-ludogamif.ocloudev.lat}"
            poner_env DOMINIO "$dominio"
            poner_env CORS_ORIGINS "https://${dominio}"
            poner_env TRUST_PROXY true
        else
            cp .env.local.ejemplo "$ENV_FILE"
        fi

        poner_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
        poner_env JWT_SECRET "$(openssl rand -hex 32)"
        chmod 600 "$ENV_FILE"
        ok "Creado .env con claves nuevas (permisos 600)."
    fi

    mkdir -p "$RESPALDOS"
    chmod 700 "$RESPALDOS"

    # ----- Levantar -----
    titulo "Construyendo y levantando (la primera vez tarda varios minutos)"
    dc up -d --build
    esperar_salud

    # ----- Base de datos -----
    titulo "Preparando la base de datos"
    dc exec -T app node scripts/migrar.js

    # ----- Administrador -----
    local hay_admin
    hay_admin="$(dc exec -T db psql -U "$(leer_env POSTGRES_USER)" -d "$(leer_env POSTGRES_DB)" -tAc "SELECT COUNT(*) FROM users WHERE rol = 'admin'" 2>/dev/null | tr -d '[:space:]' || echo 0)"

    if [[ "${hay_admin:-0}" == "0" ]]; then
        titulo "Crea tu usuario administrador (para entrar a /admin)"
        cmd_admin
    else
        ok "Ya hay ${hay_admin} administrador(es)."
    fi

    cmd_estado

    echo
    if [[ -f "$MARCA_NGINX" ]]; then
        echo "${NEGRITA}Siguiente paso:${NORMAL} el bloque de nginx (ver DESPLIEGUE.md, paso 3)."
    else
        echo "${NEGRITA}Listo:${NORMAL} abre http://localhost:$(leer_env PUERTO_APP)"
    fi
}

cmd_actualizar() {
    requisitos
    requiere_instalado

    titulo "Actualizando LudoGamif — modo $(modo)"

    echo "Descargando cambios de GitHub..."
    if git pull --ff-only; then
        ok "Código actualizado."
    else
        aviso "No se pudo hacer 'git pull --ff-only' (¿cambios locales o sin internet?). Sigo con el código que hay."
    fi

    if base_corriendo; then
        titulo "Respaldo previo"
        cmd_respaldo
    else
        aviso "La base no está corriendo: no se hace respaldo previo."
    fi

    titulo "Construyendo y levantando"
    dc up -d --build
    esperar_salud

    titulo "Migraciones de la base de datos"
    dc exec -T app node scripts/migrar.js

    cmd_estado
}

cmd_estado() {
    requiere_instalado
    titulo "Estado — modo $(modo)"
    dc ps

    echo
    local respuesta
    if respuesta="$(salud)"; then
        ok "El juego responde: $respuesta"
    else
        error "El juego NO responde en /api/salud. Mira: sudo ./ludogamif.sh logs app"
        exit 1
    fi

    if [[ -f "$MARCA_NGINX" ]]; then
        echo "Publicado en: ${NEGRITA}127.0.0.1:$(leer_env PUERTO_APP)${NORMAL}  →  https://$(leer_env DOMINIO)"
    else
        echo "Ábrelo en: ${NEGRITA}http://localhost:$(leer_env PUERTO_APP)${NORMAL}"
    fi
}

cmd_logs() {
    requiere_instalado
    dc logs -f --tail=200 "$@"
}

cmd_reiniciar() {
    requiere_instalado
    # "up -d" (no "restart") para que relea el .env.
    if [[ $# -gt 0 ]]; then
        titulo "Reiniciando $*"
        dc up -d --force-recreate --no-deps "$@"
    else
        titulo "Reiniciando todo"
        dc up -d --force-recreate
    fi
    esperar_salud
}

cmd_respaldo() {
    requiere_instalado
    base_corriendo || morir "La base de datos no está corriendo."

    mkdir -p "$RESPALDOS"
    chmod 700 "$RESPALDOS"

    # Nombre único: nunca pisa un respaldo existente (por ejemplo
    # el de seguridad que se toma justo antes de restaurar).
    local archivo base n=1
    base="$RESPALDOS/ludogamif-$(date +%Y%m%d-%H%M%S)"
    archivo="${base}.sql.gz"
    while [[ -e "$archivo" ]]; do
        archivo="${base}-${n}.sql.gz"
        n=$((n + 1))
    done

    dc exec -T db pg_dump -U "$(leer_env POSTGRES_USER)" -d "$(leer_env POSTGRES_DB)" --no-owner --clean --if-exists \
        | gzip > "$archivo"

    if [[ ! -s "$archivo" ]] || ! gzip -t "$archivo" 2>/dev/null; then
        rm -f "$archivo"
        morir "El respaldo salió vacío o dañado."
    fi

    chmod 600 "$archivo"
    ok "Respaldo: $archivo ($(du -h "$archivo" | cut -f1))"

    # Se guardan los últimos $RESPALDOS_A_GUARDAR; los más viejos se borran.
    local viejos
    viejos="$(ls -1t "$RESPALDOS"/ludogamif-*.sql.gz 2>/dev/null | tail -n +$((RESPALDOS_A_GUARDAR + 1)) || true)"
    if [[ -n "$viejos" ]]; then
        echo "$viejos" | xargs rm -f
        aviso "Se borraron respaldos antiguos (se guardan los últimos $RESPALDOS_A_GUARDAR)."
    fi
}

cmd_restaurar() {
    requiere_instalado
    local archivo="${1:-}"
    [[ -n "$archivo" && -f "$archivo" ]] || morir "Indica el archivo: sudo ./ludogamif.sh restaurar respaldos/ludogamif-AAAAMMDD-HHMMSS.sql.gz"
    base_corriendo || morir "La base de datos no está corriendo."

    aviso "Esto REEMPLAZA los datos actuales por los del respaldo:"
    echo "   $archivo"
    local confirma
    read -r -p "Escribe RESTAURAR para continuar: " confirma
    [[ "$confirma" == "RESTAURAR" ]] || morir "Cancelado."

    titulo "Respaldo de seguridad antes de restaurar"
    cmd_respaldo

    titulo "Restaurando"
    dc stop app
    gunzip -c "$archivo" | dc exec -T db psql -q -v ON_ERROR_STOP=1 -U "$(leer_env POSTGRES_USER)" -d "$(leer_env POSTGRES_DB)" >/dev/null
    dc up -d app
    esperar_salud
    ok "Datos restaurados."
}

cmd_consola() {
    requiere_instalado
    echo "Entrando a PostgreSQL (escribe \\q para salir)..."
    dc exec db psql -U "$(leer_env POSTGRES_USER)" -d "$(leer_env POSTGRES_DB)"
}

cmd_admin() {
    requiere_instalado
    local usuario="${1:-}" clave clave2 correo

    if [[ -z "$usuario" ]]; then
        read -r -p "Usuario administrador: " usuario
    fi
    usuario="$(echo "$usuario" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
    [[ -n "$usuario" ]] || morir "El usuario no puede estar vacío."

    read -r -s -p "Contraseña (mínimo 6; Enter = no cambiarla si ya existe): " clave; echo
    if [[ -n "$clave" ]]; then
        read -r -s -p "Repite la contraseña: " clave2; echo
        [[ "$clave" == "$clave2" ]] || morir "Las contraseñas no coinciden."
        read -r -p "Correo (opcional): " correo || true
    fi

    # La contraseña pasa como variable de entorno (no queda en
    # la lista de procesos ni en el historial).
    ADMIN_USUARIO="$usuario" ADMIN_CLAVE="$clave" ADMIN_CORREO="${correo:-}" \
        dc exec -T -e ADMIN_USUARIO -e ADMIN_CLAVE -e ADMIN_CORREO app node scripts/admin.js
}

ayuda() {
    cat <<EOF
${NEGRITA}LudoGamif — administración${NORMAL}

  sudo ./ludogamif.sh instalar [--detras-de-nginx]   primera vez
  sudo ./ludogamif.sh actualizar                     git pull + respaldo + reconstruir + migrar
  sudo ./ludogamif.sh estado                         contenedores y /api/salud
  sudo ./ludogamif.sh logs [app|db]                  registros en vivo (Ctrl+C para salir)
  sudo ./ludogamif.sh reiniciar [app|db]             vuelve a leer el .env
  sudo ./ludogamif.sh respaldo                       base de datos → ./respaldos
  sudo ./ludogamif.sh restaurar ARCHIVO.sql.gz       volver a un respaldo
  sudo ./ludogamif.sh consola                        entrar a PostgreSQL
  sudo ./ludogamif.sh admin [usuario]                crear un admin o volver admin a alguien
EOF
}

comando="${1:-ayuda}"
shift || true

case "$comando" in
    instalar)   cmd_instalar "$@" ;;
    actualizar) cmd_actualizar "$@" ;;
    estado)     cmd_estado "$@" ;;
    logs)       cmd_logs "$@" ;;
    reiniciar)  cmd_reiniciar "$@" ;;
    respaldo)   cmd_respaldo "$@" ;;
    restaurar)  cmd_restaurar "$@" ;;
    consola)    cmd_consola "$@" ;;
    admin)      cmd_admin "$@" ;;
    ayuda|-h|--help) ayuda ;;
    *) error "Comando desconocido: $comando"; ayuda; exit 1 ;;
esac
