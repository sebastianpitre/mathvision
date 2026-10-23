# LudoGamif

Juegos educativos en línea: **juego de preguntas por grado y asignatura**,
**salas multijugador** (Triqui matemático y SigloGamif, de 2 a 4 jugadores),
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
- **Tienda:** precio de cada personaje en oro y/o diamantes y nivel mínimo.
- **Jugadores:** buscar, ver progreso, dar o quitar el rol de admin, regalar oro o diamantes.

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

## 5. Salas multijugador y SigloGamif

Todos los juegos de 2 o más jugadores pasan por una **sala** (`/sala`):

- Se crea desde el lobby (*Elige tu juego*), desde el Mundo (*Ir a mi sala*) o al
  invitar a alguien (si no tienes sala, se te crea una).
- Se entra por **invitación** o con el **código** de 5 letras. Máximo 4 jugadores.
- Se ven los **personajes 3D** de todos los que están.
- El **creador** elige el juego e inicia. *Iniciar* solo se activa si la cantidad de
  jugadores sirve (Triqui: 2 · SigloGamif: 2 a 4). Si el creador se va, el siguiente
  pasa a serlo.
- Al terminar la partida todos vuelven a la sala. Si alguien recarga la página, tiene
  20 segundos para volver sin perder su lugar.

**SigloGamif:** cada jugador tiene 5 espacios. Al empezar se vota el tiempo de turno
(15, 20, 30 o 45 s). Por turnos se tira el dado y se elige poner el número como unidad
(4) o decena (40) en el espacio de la ronda. Quien pasa de 100 queda eliminado al
instante; quien completa los 5 espacios con exactamente 100 hace **¡SIGLO!** y gana
enseguida; si solo queda uno en pie, gana. Si nadie llega a 100, gana el más cercano
sin pasarse, y si hay empate se desempata con un tiro de dado. Si se acaba el tiempo
del turno, el juego tira y elige la opción más prudente.

Para agregar otro juego a las salas: `servidor/src/salas/juegos.js` (cuántos
jugadores admite) y su inicio en `servidor/src/salas/salaSockets.js`.

---

## 6. Estructura

```
├── src/                     juego (React)
│   ├── pages/Admin/         panel de administración
│   ├── pages/Preguntas/     elegir nivel
│   ├── pages/Sala/          sala multijugador
│   └── games/               preguntas, Triqui, SigloGamif, Escape Álgebra
├── public/                  imágenes, sonidos y modelos 3D
├── servidor/
│   ├── server.js            Express + Socket.IO (Mundo, salas, Triqui)
│   ├── src/                 rutas y lógica (partidas, niveles, tienda, admin)
│   ├── src/salas/           salas multijugador (2 a 4) y sus eventos
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

1. Copia el modelo a `public/models/characters/nombre.vrm` y su foto a
   `public/models/characters/img/nombre.png`.
2. Crea una migración, por ejemplo `004_personaje_nombre.sql`:

   ```sql
   INSERT INTO characters (id, name, model_path, thumbnail_path, precio_oro, nivel_minimo, orden)
   VALUES ('nombre', 'Nombre', '/models/characters/nombre.vrm', '/models/characters/img/nombre.png', 600, 4, 8)
   ON CONFLICT (id) DO NOTHING;
   ```

3. Pull Request a `master` y `sudo ./ludogamif.sh actualizar`. El precio luego se ajusta desde el panel.
