# Despliegue en el servidor vmi2728676

Paso a paso para montar LudoGamif en **https://ludogamif.ocloudev.lat** sin tocar lo
que ya funciona (catálogo, POS, APIs de clientes, `mysql-viejo`).

| | |
|---|---|
| Servidor | vmi2728676 · Ubuntu 24.04 · root · 161.97.124.0 |
| Carpeta | `/root/ludogamif` |
| Contenedores | `ludogamif-app`, `ludogamif-db` (volumen `ludogamif_db`) |
| Puerto | **solo** `127.0.0.1:8082` (8080 = catálogo, 8081 = POS) |
| nginx | bloque nuevo `/etc/nginx/sites-available/ludogamif.conf`, sin `default_server` |
| Certificado | el que ya existe: `/etc/ssl/cloudflare/ocloudev.crt/.key` (*.ocloudev.lat) |

Cada paso dice **qué hace**, **cómo comprobarlo** y **cómo volver atrás**. Si una
comprobación no da lo esperado, para ahí y comparte la salida del comando.

---

## Paso 0 · Revisar cómo está todo (solo lectura, no cambia nada)

```bash
# Puertos en uso: 8082 NO debe aparecer.
ss -ltnp | grep -E ':(80|443|8080|8081|8082)\b'

# ¿Algún bloque de nginx ya usa ludogamif.ocloudev.lat o la variable del bloque nuevo?
grep -rn "ludogamif.ocloudev.lat\|ludogamif_juego_upgrade" /etc/nginx/ || echo "libre"

# Nombres de Docker libres
docker ps -a --format '{{.Names}}' | grep -i ludogamif || echo "sin contenedores ludogamif"
docker volume ls --format '{{.Name}}' | grep -i ludogamif || echo "sin volumen ludogamif"

# Espacio: la primera construcción necesita ~3 GB libres
df -h /

# La carpeta no debe existir
ls -d /root/ludogamif 2>/dev/null || echo "carpeta libre"
```

**Esperado:** 8082 no aparece, "libre", "sin contenedores…", "sin volumen…",
al menos 3 GB libres y "carpeta libre".

> Ya existe el backend viejo (PM2, `ludogamif-api.ocloudev.lat`, puerto 3010, bloque
> `/etc/nginx/conf.d/ludogamif-api.conf`). **No se toca** en estos pasos: usa otro
> nombre, otro puerto y otro nombre de variable en nginx. Se puede apagar al final
> (paso 6, opcional).

---

## Paso 1 · DNS en Cloudflare

**Qué hace:** apunta `ludogamif.ocloudev.lat` al servidor, con la nube naranja.

1. Cloudflare → `ocloudev.lat` → **DNS** → **Records**.
2. Busca si ya existe un registro `ludogamif`:
   - **No existe:** *Add record* → Tipo **A** · Nombre **ludogamif** · IPv4 **161.97.124.0** · Proxy **activado (naranja)**.
   - **Ya existe** (por ejemplo un CNAME a Vercel): anota a qué apunta (para volver atrás)
     y **haz este paso después del paso 3**, para que el sitio no quede caído mientras
     tanto. Luego edítalo a **A → 161.97.124.0**, naranja.

**Comprobar** (puede tardar 1–2 minutos):

```bash
dig +short ludogamif.ocloudev.lat
```

Deben salir IPs de Cloudflare (104.x / 172.x), no la del servidor (eso es normal con la nube naranja).

**Volver atrás:** borra el registro, o devuélvelo a lo que tenía.

> Mientras no hagas el paso 3, esa dirección la atiende el comodín del catálogo
> (`*.ocloudev.lat`). No afecta a ninguna tienda.

---

## Paso 2 · Instalar el juego con Docker

**Qué hace:** descarga el código, crea el `.env` con claves nuevas (permisos 600),
construye la imagen (el juego se compila dentro; no hace falta Node en el servidor),
levanta PostgreSQL y la app solo en `127.0.0.1:8082`, crea las tablas y carga los
niveles iniciales, y te pide el usuario administrador.

```bash
cd /root
git clone https://github.com/sebastianpitre/mathvision.git ludogamif
cd ludogamif && chmod +x ludogamif.sh
sudo ./ludogamif.sh instalar --detras-de-nginx
```

Te preguntará:
- **Dominio del juego:** Enter para `ludogamif.ocloudev.lat`.
- **Usuario administrador** y **contraseña** (no se muestra al escribir).

La primera vez tarda varios minutos (descarga imágenes y compila).

**Comprobar:**

```bash
sudo ./ludogamif.sh estado
```

Debe terminar con `✔ El juego responde: {"ok":true,...,"database":"ok",...}`.

```bash
curl -I -H 'Host: ludogamif.ocloudev.lat' http://127.0.0.1:8082/
```

Debe responder `HTTP/1.1 200 OK`.

```bash
docker ps --format '{{.Names}}\t{{.Ports}}'
```

Debe verse `ludogamif-app   127.0.0.1:8082->3000/tcp` y `ludogamif-db` **sin puertos**.
Los demás contenedores (catálogo, POS, `mysql-viejo`…) siguen igual que antes.

```bash
ss -ltn | grep 8082
```

Debe decir `127.0.0.1:8082` (nunca `0.0.0.0:8082`).

**Volver atrás** (no deja rastro, nada más fue tocado):

```bash
cd /root/ludogamif
docker compose -p ludogamif -f docker-compose.yml -f docker-compose.detras-de-nginx.yml down
# Solo si quieres borrar también los datos del juego:
#   docker volume rm ludogamif_db
cd /root && mv ludogamif ludogamif-descartado
```

---

## Paso 3 · nginx

**Qué hace:** agrega un bloque nuevo para `ludogamif.ocloudev.lat` (80 → 301 a HTTPS y
443 → `127.0.0.1:8082`, con WebSockets). No usa `default_server` y el nombre exacto le
gana al comodín del catálogo, así que no cambia nada de lo demás.

```bash
# 1. Copiar el bloque
sudo cp /root/ludogamif/nginx/ludogamif.conf.ejemplo /etc/nginx/sites-available/ludogamif.conf

# 2. Activarlo
sudo ln -s /etc/nginx/sites-available/ludogamif.conf /etc/nginx/sites-enabled/ludogamif.conf

# 3. Probar la configuración. SI FALLA, NO RECARGUES: ve a "Volver atrás".
sudo nginx -t
```

Solo si `nginx -t` dice `syntax is ok` y `test is successful`:

```bash
sudo systemctl reload nginx
```

**Comprobar** (desde el propio servidor, sin depender del DNS):

```bash
curl -sk --resolve ludogamif.ocloudev.lat:443:127.0.0.1 https://ludogamif.ocloudev.lat/api/salud
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" --resolve ludogamif.ocloudev.lat:80:127.0.0.1 http://ludogamif.ocloudev.lat/
```

Primero `{"ok":true,...}`; luego `301 https://ludogamif.ocloudev.lat/`.

Y que lo demás siga igual (cambia los nombres por una tienda real y tu POS):

```bash
curl -sk -o /dev/null -w "catálogo %{http_code}\n" --resolve UNATIENDA.ocloudev.lat:443:127.0.0.1 https://UNATIENDA.ocloudev.lat/
curl -sk -o /dev/null -w "POS %{http_code}\n" --resolve jhscristoenmi.ocloudev.lat:443:127.0.0.1 https://jhscristoenmi.ocloudev.lat/
```

Deben dar el mismo código que daban antes (normalmente 200 o 302).

**Volver atrás:**

```bash
sudo rm /etc/nginx/sites-enabled/ludogamif.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## Paso 4 · Comprobar todo

1. Abre **https://ludogamif.ocloudev.lat** → crea una cuenta o entra con tu admin.
2. **Juego de preguntas:** Inicio → *Preguntas* → elige un nivel → juega → al final
   debe salir el premio y cambiar tu oro/XP arriba.
3. **Panel:** menú de tu perfil → *Panel de administración* → crea un nivel con el
   botón *JSON de ejemplo* (descárgalo y adjúntalo).
4. **Dos jugadores a la vez (WebSockets):** abre el juego en dos navegadores (o uno en
   incógnito) con dos cuentas → *Mundo* → uno invita al otro → acepta → juegan Triqui.
   Al terminar, ambos ven el aviso del premio.
5. **Lo demás sigue igual:** abre una tienda del catálogo, el POS
   (`*.ocloudevpos.lat` y `jhscristoenmi.ocloudev.lat`) y una de las APIs de clientes.

Si algo falla: `sudo ./ludogamif.sh logs app` y `sudo tail -n 50 /var/log/nginx/error.log`.

---

## Paso 5 · Actualizar (cada vez que haya cambios)

1. En GitHub: Pull Request de la rama a `master` → *Merge*.
2. En el servidor:

```bash
cd /root/ludogamif && sudo ./ludogamif.sh actualizar
```

Hace `git pull --ff-only` → respaldo de la base en `./respaldos` → reconstruye y
levanta → migraciones → estado. El `--detras-de-nginx` se recuerda solo (archivo
`.detras-de-nginx`).

**Volver atrás de una actualización:**

```bash
cd /root/ludogamif
git log --oneline -5                     # elige el commit anterior
git checkout <commit-anterior>
sudo ./ludogamif.sh actualizar           # reconstruye con ese código (el pull avisará y seguirá)
# Si además hay que devolver los datos:
ls -t respaldos | head                   # el respaldo de justo antes de actualizar
sudo ./ludogamif.sh restaurar respaldos/ludogamif-AAAAMMDD-HHMMSS.sql.gz
# Para volver a seguir master después:  git checkout master
```

---

## Paso 6 · (Opcional) Apagar el backend viejo

Solo cuando el paso 4 esté bien. El juego nuevo ya no usa
`ludogamif-api.ocloudev.lat`.

```bash
pm2 list                                 # comprobar el nombre: ludogamif
pm2 stop ludogamif && pm2 save

sudo mkdir -p /root/respaldo-nginx
sudo mv /etc/nginx/conf.d/ludogamif-api.conf /root/respaldo-nginx/
sudo nginx -t && sudo systemctl reload nginx
```

**Comprobar:** `pm2 list` lo muestra *stopped* y `sudo nginx -t` sigue bien.

**Volver atrás:**

```bash
sudo mv /root/respaldo-nginx/ludogamif-api.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
pm2 start ludogamif && pm2 save
```

La base de datos vieja de ese backend no se toca. Si el frontend sigue conectado en
Vercel, desconecta ese proyecto: el juego ahora vive en el servidor.

---

## Datos útiles

| | |
|---|---|
| Configuración | `/root/ludogamif/.env` (permisos 600, nunca en git) |
| Respaldos | `/root/ludogamif/respaldos/` (últimos 30; también se hace uno antes de cada actualización) |
| Datos de la base | volumen Docker `ludogamif_db` (sobrevive a actualizaciones y reinicios) |
| Registros | `sudo ./ludogamif.sh logs app` · nginx: `/var/log/nginx/` |
| Salud | `https://ludogamif.ocloudev.lat/api/salud` |
| Cambiar una clave del `.env` | editar → `sudo ./ludogamif.sh reiniciar` (si cambias `JWT_SECRET`, todos vuelven a iniciar sesión) |

**Cloudflare (opcional):** los modelos 3D (`/models/*.vrm`, ~15 MB cada uno) no se
guardan en la caché de Cloudflare por defecto. Para que carguen más rápido, crea una
*Cache Rule*: "URI Path starts with `/models/`" → *Eligible for cache*.
