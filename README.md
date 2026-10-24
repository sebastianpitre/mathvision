# LudoGamif

Juegos educativos en línea: **juego de preguntas por grado y asignatura**,
**salas multijugador** (Triqui matemático y SigloGamif, de 2 a 8 jugadores),
Escape Álgebra y un mundo 3D con personajes. Los jugadores
ganan **XP, oro y diamantes**, suben de nivel y desbloquean personajes en la tienda.
El administrador crea niveles nuevos desde el panel adjuntando un JSON.

| Parte | Con qué está hecho |
|---|---|
| Juego (frontend) | React 19 + Vite, Tailwind, Three.js (personajes VRM) |
| Servidor (`servidor/`) | Node 22, Express, Socket.IO |
| Base de datos | PostgreSQL 16 |
| Despliegue | Docker Compose + `ludogamif.sh`, detrás del nginx del servidor |

El servidor sirve **todo desde el mismo dominio**: el juego compilado, la API
(`/api/...`) y el tiempo real (`/socket.io/`). No hay CORS que configurar.

---

## 1. Probarlo en tu computador (Docker Desktop)

Necesitas [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto.

**Windows (PowerShell):**

```powershell
git clone https://github.com/sebastianpitre/mathvision.git ludogamif
cd ludogamif
copy .env.local.ejemplo .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

**Linux / Mac:**

```bash
git clone https://github.com/sebastianpitre/mathvision.git ludogamif
cd ludogamif
./ludogamif.sh instalar        # crea el .env, levanta todo y te pide el admin
```

Abre **http://localhost:8082**. La primera vez tarda unos minutos (compila el juego).

Crear tu usuario administrador en Windows (en Linux ya lo pidió `instalar`):

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml exec -e ADMIN_USUARIO=profe -e ADMIN_CLAVE=tu_clave app node scripts/admin.js
```

Comandos útiles en tu PC:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml ps          # estado
docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f app # registros
docker compose -f docker-compose.yml -f docker-compose.local.yml down        # apagar (los datos se conservan)
```

### Programar sin Docker (opcional)

```bash
# Terminal 1 · servidor (necesita un PostgreSQL local)
cd servidor
npm install
# crea servidor/.env con: PORT=3000, DATABASE_URL=postgresql://..., JWT_SECRET=(32+ caracteres)
npm run migrar
ADMIN_USUARIO=profe ADMIN_CLAVE=secreto123 npm run admin
npm run dev

# Terminal 2 · juego con recarga en vivo (reenvía /api y /socket.io al puerto 3000)
npm install
npm run dev        # http://localhost:5173
```

---

## 2. Montarlo por primera vez en el servidor

El paso a paso exacto para el servidor (Cloudflare, nginx, comprobaciones y cómo
volver atrás) está en **[DESPLIEGUE.md](DESPLIEGUE.md)**. En resumen:

```bash
cd /root
git clone https://github.com/sebastianpitre/mathvision.git ludogamif
cd ludogamif && chmod +x ludogamif.sh
sudo ./ludogamif.sh instalar --detras-de-nginx
```

El juego queda solo en `127.0.0.1:8082`; el nginx del servidor lo publica en
`https://ludogamif.ocloudev.lat`.

---

## 3. El día a día

Los cambios llegan a `master` con un Pull Request en GitHub. Luego, en el servidor:

```bash
cd /root/ludogamif && sudo ./ludogamif.sh actualizar
```

`actualizar` hace: `git pull --ff-only` → respaldo de la base → reconstruye y
levanta → migraciones → muestra el estado.

| Comando | Para qué |
|---|---|
| `sudo ./ludogamif.sh estado` | contenedores y si el juego responde en `/api/salud` |
| `sudo ./ludogamif.sh logs [app\|db]` | registros en vivo (Ctrl+C para salir) |
| `sudo ./ludogamif.sh reiniciar [app\|db]` | reinicia y vuelve a leer el `.env` |
| `sudo ./ludogamif.sh respaldo` | copia de la base en `./respaldos` (se guardan los últimos 30) |
| `sudo ./ludogamif.sh restaurar respaldos/ARCHIVO.sql.gz` | volver a un respaldo (antes hace otro de seguridad) |
| `sudo ./ludogamif.sh consola` | entrar a PostgreSQL |
| `sudo ./ludogamif.sh admin [usuario]` | crear un administrador o volver admin a alguien |

---

## 4. Panel de administración

Entra con tu usuario administrador → menú de tu perfil → **Panel de administración**
(o `https://ludogamif.ocloudev.lat/admin`).

- **Resumen:** partidas jugadas (hoy, 7 días, por día), por juego, por grado y
  asignatura, mejores jugadores y últimas partidas.
- **Niveles y preguntas:** crear, editar, ocultar o borrar niveles. Cada nivel tiene
  grado, asignatura, dificultad, preguntas por partida, tiempo, vidas y su premio.
- **Personajes:** crear personajes nuevos subiendo su modelo `.vrm`/`.glb` (hasta 60 MB) y su
  foto; cambiar nombre, archivos, precio en oro y/o diamantes, nivel mínimo, mostrar u
  ocultar en la tienda, y borrarlos (quien lo usaba vuelve al personaje inicial).
- **Jugadores:** buscar, cambiar nivel, oro y diamantes, **bloquear** la cuenta (no puede
  entrar ni jugar), **quitar o devolver la voz**, dar o quitar el rol de admin y regalar
  oro o diamantes. La columna **Reportes** muestra "sin revisar / total"; al tocarla se
  ven los motivos y quién reportó, y se pueden **marcar como revisados**. La casilla
  "Más reportados primero" ordena la lista.
- **Premios:** XP y oro de Triqui y SigloGamif según gane, empate o pierda, partidas
  premiadas al día y los diamantes extra por ¡SIGLO!.
- **Voz y reportes:** activar o apagar la voz para todos, segundos máximos por turno
  (5 por defecto), espera para volver a hablar (3) y cuántos reportes sin revisar de
  jugadores distintos quitan la voz (3).

### Formato del JSON de preguntas

Se puede adjuntar solo la lista de preguntas, o un objeto con los datos del nivel
(si viene `nivel`, el formulario se llena solo):

```json
{
  "nivel": {
    "nombre": "Fracciones básicas",
    "grado": "5°",
    "asignatura": "Matemáticas",
    "dificultad": "media"
  },
  "preguntas": [
    {
      "pregunta": "¿Cuánto es la mitad de 10?",
      "opciones": ["2", "5", "8", "10"],
      "respuesta": 1,
      "explicacion": "10 ÷ 2 = 5"
    },
    { "pregunta": "¿Qué fracción es un pedazo de 4?", "opciones": ["1/2", "1/4"], "respuesta": "B" }
  ]
}
```

- `respuesta`: posición de la correcta **desde 0**, la letra (`"A"`, `"B"`…) o el texto exacto.
- Entre 2 y 6 opciones por pregunta. `explicacion` es opcional (se muestra al responder).
- También sirve el formato anterior: `question`, `options`, `correctAnswer`.
- El panel muestra una vista previa y los errores con su número de pregunta antes de guardar.
- Ejemplos completos: `servidor/datos/niveles/*.json` (son los niveles que vienen al instalar).

### Cómo se gana

| | |
|---|---|
| **Según sus aciertos** | Si llega al mínimo de aciertos, gana la parte del premio que corresponde a lo que acertó (8 de 10 → 80 %). |
| **Todo al terminar** | Gana el premio completo solo si responde todas las preguntas y llega al mínimo. |
| **Premios por día** | Cuántas partidas de ese nivel dan premio a cada jugador al día (0 = sin límite). Evita repetir un nivel fácil sin parar. |
| **Subir de nivel** | Nivel 1→2: 100 XP; cada nivel pide 50 XP más que el anterior. Al subir gana +25 de oro y +1 diamante. |
| **Triqui en línea** | Ganar: 30 XP y 15 de oro · empate: 15 XP y 5 de oro · perder: 10 XP (hasta 15 partidas premiadas al día). |
| **SigloGamif** | Ganar: 40 XP y 20 de oro (+1 diamante si hace ¡SIGLO! con exactamente 100) · perder: 10 XP (hasta 15 partidas premiadas al día). |
| **Escape Álgebra** | 5 XP y 2 de oro por acierto, con tope de 50 XP y 20 de oro (5 partidas premiadas al día). |

Todo se calcula en el servidor: el navegador nunca conoce la respuesta correcta antes de
responder ni decide cuánto gana.

---

## 5. Diseño del juego (como Free Fire)

El juego está pensado primero para **teléfono en horizontal**; en el PC se ve igual,
más grande.

- **Tamaño:** en las pantallas rediseñadas todo se mide en `rem`, y `1rem` depende del
  **alto** de la pantalla (`.escala-juego` en `src/styles/globals.css`). Por eso se ve
  igual con o sin pantalla completa y en cualquier teléfono. Las pantallas que aún no
  se rediseñan (inicio de sesión y panel de administración) usan el modo anterior;
  al rediseñar una, se agrega su ruta a `RUTAS_JUEGO` en `index.html`.
- **Lobby:** el personaje ocupa el centro; arriba el perfil, oro y diamantes; a la
  izquierda el menú; a la derecha los jugadores en línea (se pliega); abajo los atajos,
  el juego elegido y el botón **INICIAR** (un jugador → entra directo; multijugador →
  sala con ese juego ya elegido).
- **Menú flotante:** botón redondo que se arrastra a cualquier borde. Tiene pantalla
  completa, sonido (silencia todo el juego), Inicio, Mi sala, Tienda, Personajes,
  Perfil, Panel (admin) y Cerrar sesión.
- **Pantallas** (Personajes/Tienda, Perfil, Sala, Preguntas): barra del jugador arriba
  con el título y la ✕, pestañas a la izquierda y el contenido al lado, como el
  inventario y el perfil de Free Fire (`PantallaFF` en `src/components/juego/`).
- **Juegos** (SigloGamif, Triqui, Preguntas, Escape Álgebra): sin encabezado; solo las
  partes del juego, y los controles (salir, reloj, sonido, emojis) van dentro de ellas.
  La lista de emojis se abre centrada para que nunca quede por fuera de la pantalla.
- El **Mundo** se quitó: los jugadores en línea y las invitaciones están en el lobby.
- **Ranking** (`/ranking`): los 50 mejores por nivel, victorias o aciertos, y tu puesto.
  Al tocar a alguien se ve su personaje en 3D al lado (para ver su skin) y su perfil.
- **Invitaciones:** llegan arriba, en cualquier pantalla, por unos segundos. Se puede
  invitar a la misma persona las veces que quieras (con 10 s entre una y otra). Cada
  jugador aparece como *Disponible*, *En una sala* o *Jugando*, y la lista se actualiza
  sola (también hay botón de actualizar).

---

## 6. Salas multijugador y SigloGamif

Todos los juegos de 2 o más jugadores pasan por una **sala** (`/sala`):

- Se crea desde el lobby (*Elige tu juego*), desde el Mundo (*Ir a mi sala*) o al
  invitar a alguien (si no tienes sala, se te crea una).
- Se entra por **invitación** o con el **código** de 5 letras. Máximo 8 jugadores.
- Se ven los **personajes 3D** de todos los que están.
- El **creador** elige el juego (botón *Cambiar*) e inicia. *Iniciar* solo se activa si la cantidad de
  jugadores sirve (Triqui: 2 · SigloGamif: 2 a 8). Si el creador se va, el siguiente
  pasa a serlo.
- El creador puede **sacar** a alguien antes de iniciar. Esa persona ya no puede volver
  con el código; solo si el creador la vuelve a invitar.
- **Emojis:** en la sala aparecen sobre el personaje de quien los envía; en SigloGamif,
  en su fila del tablero; en el Triqui, como siempre.
- La sala lleva la cuenta de las **partidas ganadas** de cada uno (por juego).
- Al terminar SigloGamif, el creador puede **Jugar otra vez** sin volver a la sala.
- **Compartir:** el botón verde de la sala comparte por WhatsApp (o la app que elija el
  teléfono) el enlace `https://ludogamif.ocloudev.lat/sala/CÓDIGO`. Quien lo abre entra
  directo a la sala; si no ha iniciado sesión, entra después de hacerlo.
- **Voz (walkie-talkie):** en la sala, SigloGamif y el Triqui en línea hay un botón de
  micrófono: se **mantiene presionado** para hablar. Habla una persona a la vez, máximo
  5 s por turno y luego se espera 3 s (se cambia en el panel). El servidor hace cumplir
  estas reglas. Junto a cada jugador hay botones para **silenciarlo** (solo para ti, se
  recuerda en ese navegador) y para **reportarlo** eligiendo el motivo. Un jugador con
  varios reportes sin revisar se queda sin voz hasta que el admin los revise. El
  micrófono necesita HTTPS (el sitio ya lo tiene).
- Al terminar la partida todos vuelven a la sala. Si alguien recarga la página, tiene
  20 segundos para volver sin perder su lugar.

**SigloGamif:** cada jugador tiene 5 espacios. Al empezar se vota el tiempo de turno
(15, 20, 30 o 45 s). Por turnos se tira el dado y se elige poner el número como unidad
(4) o decena (40) en el espacio de la ronda. Quien pasa de 100 queda eliminado al
instante; quien completa los 5 espacios con exactamente 100 hace **¡SIGLO!** y gana
enseguida; si solo queda uno en pie, gana. Si nadie llega a 100, gana el más cercano
sin pasarse, y si hay empate se desempata con un tiro de dado. Si se acaba el tiempo
del turno, el juego tira y elige la opción más prudente.

- **Joker:** muy de vez en cuando (1 de cada 20 tiros) el dado sale joker y el jugador
  elige el número que quiera del 0 al 6, y luego unidad o decena.
- **Volver a tirar:** una vez por partida, después de tirar, el jugador puede pagar
  **1 diamante** para volver a tirar. Si su turno se acaba mientras se cobra, se le
  devuelve el diamante.

Para agregar otro juego a las salas: `servidor/src/salas/juegos.js` (cuántos
jugadores admite) y su inicio en `servidor/src/salas/salaSockets.js`.

---

## 7. Estructura

```
├── src/                     juego (React)
│   ├── pages/Admin/         panel de administración
│   ├── pages/Preguntas/     elegir nivel
│   ├── pages/Sala/          sala multijugador
│   ├── components/juego/    menú flotante y notificaciones (en todas las pantallas)
│   └── games/               preguntas, Triqui, SigloGamif, Escape Álgebra
├── public/                  imágenes, sonidos y modelos 3D
├── servidor/
│   ├── server.js            Express + Socket.IO (Mundo, salas, Triqui)
│   ├── src/                 rutas y lógica (partidas, niveles, tienda, admin)
│   ├── src/salas/           salas multijugador (2 a 8) y sus eventos
│   ├── src/world/           jugadores en línea e invitaciones
│   ├── src/games/siglo/     reglas de SigloGamif
│   ├── src/database/migraciones/   pasos numerados de la base
│   ├── scripts/             migrar.js, admin.js, check.js
│   └── datos/niveles/       niveles que se cargan al instalar
├── Dockerfile
├── docker-compose.yml                  base de datos + app
├── docker-compose.detras-de-nginx.yml  servidor: 127.0.0.1:8082
├── docker-compose.local.yml            tu PC: localhost:8082
├── ludogamif.sh                        administración
└── nginx/ludogamif.conf.ejemplo        bloque para el nginx del servidor
```

### Cambios en la base de datos

Van en `servidor/src/database/migraciones/` como pasos numerados (`004_algo.sql` o
`004_algo.js`). Cada paso se aplica una sola vez (queda anotado en
`schema_migraciones`) y además se escribe para que correrlo dos veces no rompa nada
(`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
`actualizar` los aplica solos.

### Agregar un personaje a la tienda

Desde el panel: **Personajes → Nuevo personaje**, sube el modelo `.vrm` y la foto, pon el
precio y listo. Los archivos subidos se guardan en el volumen de Docker
`ludogamif_archivos` (se sirven en `/archivos/…`) y sobreviven a las actualizaciones.

Para subir modelos grandes, el bloque nginx de ludogamif necesita
`client_max_body_size 64m;` (ver `nginx/ludogamif.conf.ejemplo`).
