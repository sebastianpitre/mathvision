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
- **Jugadores:** buscar, **verificar** (chulo azul junto al nombre en todo el juego: lista
  en línea, sala, perfil, ranking, SigloGamif y Triqui; los admin ya salen verificados),
  cambiar nivel, oro y diamantes, **bloquear** la cuenta (no puede
  entrar ni jugar), **quitar o devolver la voz**, dar o quitar el rol de admin y regalar
  oro o diamantes. La columna **Reportes** muestra "sin revisar / total"; al tocarla se
  ven los motivos y quién reportó, y se pueden **marcar como revisados**. La casilla
  "Más reportados primero" ordena la lista.
- **Premios y reglas:** XP y oro de Triqui, SigloGamif, InvasiónGamif y ZonaGamif según gane, empate o pierda, partidas
  premiadas al día y los diamantes extra por ¡SIGLO!. Abajo, el poder 🔄 de SigloGamif
  (activarlo y cuántos segundos dura).
- **Sonidos:** la biblioteca de música y efectos. Se suben archivos mp3, ogg, wav o m4a
  (hasta 10 MB) y se pueden escuchar, renombrar y borrar (si no se están usando). Si subes
  un archivo idéntico a uno que ya está, no se guarda otra vez: se reutiliza. Arriba se
  elige qué sonido y con qué volumen suena en cada momento: música del lobby y de cada
  juego (si un juego no tiene la suya, sigue la del lobby), clic de los botones, iniciar
  partida, invitación, emoji, ganar, perder, empate, tu turno, se acaba el tiempo, dado,
  respuestas, comodín, etc. Los sonidos que trae el juego quedan "de fábrica" y no se
  borran. En el menú flotante cada jugador puede apagar todo el sonido o solo la música, y
  la música baja sola mientras alguien habla por el walkie-talkie.
- **Temporadas:** nombre y fecha de fin de la temporada actual (por defecto duran 2 meses),
  botón "Cerrar ahora", puntos por partida (gana +30, empata +12, pierde −8), puntos de
  cada rango (Bronce, Plata, Oro, Platino, Diamante, Heroico, Maestro) y el premio de
  cada rango: cualquier mezcla de oro, diamantes, tiquetes 🎫, un personaje, una foto de
  perfil y un marco (si ya lo tiene, no se repite). Cada temporada tiene su número
  (S1, S2, S3…) que sube solo al empezar la siguiente. Al llegar la fecha de fin se cierra sola (se revisa cada
  minuto): entrega los premios, guarda el rango final de cada uno y empieza otra
  temporada con todos en Bronce. Hay historial con la tabla de cada temporada. Solo
  cuentan las partidas que dan premio (no las que pasan el límite diario).
- **Eventos:** cada evento tiene título, descripción, imagen del anuncio, fecha y hora de
  inicio y fin, y hasta 12 misiones. Cada misión: qué hacer (jugar, ganar, responder o
  acertar N preguntas, jugar N días distintos), en qué juego (o cualquiera), fechas propias
  opcionales (por ejemplo "este sábado de 3 a 6 p. m.") y su recompensa: oro, diamantes,
  un personaje, una foto de perfil y/o un marco. Se pueden editar (sin perder lo ya
  reclamado), duplicar y borrar, y se ve cuántos reclamaron cada misión.
- **Fotos y marcos:** fotos de perfil y marcos (PNG con el centro transparente) para dar en
  los eventos. "Exclusivo" = solo quien lo gana; si no, cualquiera lo puede usar.
- **GiraGamif (ruleta de la suerte):** crea ruletas con hasta 12 premios (oro, diamantes,
  tiquetes, personaje, foto de perfil, marco o "Sigue intentando") y el % de suerte de
  cada uno (deben sumar 100 %; el botón "Ajustar al 100 %" reparte lo que falte). Cada
  giro cuesta tiquetes 🎫 (1 por defecto). Si sale un personaje, foto o marco que el
  jugador ya tiene, recibe el oro que pongas. Fechas opcionales, editar, duplicar, borrar
  y ver cuántas veces salió cada premio (y el % real). Los tiquetes se ganan en las
  misiones de los **Eventos** (recompensa "Tiquetes") y también se pueden regalar desde
  **Jugadores**.
- **Lobby: fondo y anuncios → Fondo del lobby:** elige uno de los fondos que trae el juego
  (Normal, Halloween 🎃) o sube una imagen horizontal propia (hasta 3 MB). Se ve en el
  lobby, la tienda, la sala, el ranking y el inicio de sesión. Al actualizar queda puesto
  el de Halloween (migración 012); si ya habías elegido uno, no se cambia.
- **Lobby: fondo y anuncios → Anuncios:** el carrusel de arriba a la izquierda. Cada anuncio muestra un
  juego (al tocarlo queda elegido), un evento (sale solo mientras dure y abre ese evento)
  o una pantalla (GiraGamif, Tienda, Ranking, Sala, Personajes, Perfil). Puede llevar foto
  propia o un fondo de color con título y texto pequeño, y una etiqueta ("Nuevo"). Se
  ordenan con las flechas, se elige cuántos segundos dura cada uno (5 por defecto) y, si
  quieres, los eventos activos que no estén en la lista salen solos.
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

### Eventos, temporadas y perfiles (para el jugador)

- **Jugadores en línea** (derecha del lobby): cada uno en una placa con su foto (y marco),
  su nombre (se desliza si es largo) y su rango, con el fondo del color del rango. Los
  administradores salen con un fondo especial que brilla y el chulo azul de verificado.
  La flecha de abajo oculta la lista y la vuelve a mostrar.

- **Anuncio al entrar:** al llegar al lobby sale la imagen de cada evento activo (una vez
  por evento cada vez que se abre el juego). Al tocarla va a ese evento; con la X se cierra.
- **Eventos** (botón en el lobby con el número de premios por reclamar, o menú flotante):
  el anuncio con su cuenta regresiva y las misiones con su barra de progreso y el botón
  **Reclamar**. El avance se calcula con las partidas que termina entre las fechas.
- **Carrusel de anuncios** (arriba a la izquierda del lobby, debajo del nombre): pasa
  solo, se puede deslizar o tocar los puntitos, y al tocarlo lleva a lo anunciado.
- **GiraGamif** (la ruletita que gira al lado del carrusel, con el número de tiquetes, o
  tocando los tiquetes 🎫 de arriba): ruleta redonda con
  la foto de cada premio. "Girar" gasta tiquetes y la ruleta se detiene en el premio que
  eligió el servidor; "Premios y suerte" muestra cada premio con su porcentaje.
- **Ranking → Temporada:** tabla de la temporada con el rango de cada uno, cuánto falta
  para el siguiente rango y cuándo termina. **Ranking → Recompensas** (o el botón
  "Recompensas"): lo que gana cada rango al cerrar la temporada, con su imagen, y cuál
  es tu rango ahora.
- **Insignia de rango:** escudo del color del rango con el número de la temporada (S1,
  S2…). Sale en el ranking, el perfil, la lista de jugadores en línea y el panel.
- **Perfil:** muestra el rango de la temporada. En "Foto de perfil" aparecen también las
  fotos exclusivas (con candado si no las tiene) y en "Marcos" se pone o quita el marco,
  que se ve en la barra de arriba, el perfil, la sala y el ranking.

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

## 6. Salas multijugador, SigloGamif, InvasiónGamif y ZonaGamif

Todos los juegos de 2 o más jugadores pasan por una **sala** (`/sala`):

- Se crea desde el lobby (*Elige tu juego*), desde el Mundo (*Ir a mi sala*) o al
  invitar a alguien (si no tienes sala, se te crea una).
- Se entra por **invitación** o con el **código** de 5 letras. Máximo 8 jugadores.
- Se ven los **personajes 3D** de todos los que están.
- El **creador** elige el juego (botón *Cambiar*) e inicia. *Iniciar* solo se activa si la cantidad de
  jugadores sirve (Triqui: 2 · SigloGamif: 2 a 8 · InvasiónGamif y ZonaGamif: 2 a 6). Si el creador se va, el siguiente
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
- **Poder 🔄:** muy rara vez (más o menos en 1 de cada 4 partidas; puede no salir o salir
  hasta 3 veces), entre la ronda 2 y la 4, aparece un 🔄 flotando para todos. El primero
  que lo toca elige a otro jugador en juego, la decena (**0, 1 o 2**) y luego el número de
  esa decena (0–9, 10–19 o 20–29): ese
  número se pone en el **siguiente espacio vacío** del otro, que pierde ese turno (y si se
  pasa de 100, queda eliminado). Tiene 10 s para usarlo o lo pierde. En el panel
  (**Premios y reglas**) solo se activa o apaga y se cambian sus segundos.
- **Volver a tirar:** una vez por partida, después de tirar, el jugador puede pagar
  **1 diamante** para volver a tirar. Si su turno se acaba mientras se cobra, se le
  devuelve el diamante.

Para agregar otro juego a las salas: `servidor/src/salas/juegos.js` (cuántos
jugadores admite) y su inicio en `servidor/src/salas/salaSockets.js`.

---

### InvasiónGamif

Responder rápido y pintar el tablero con tu color (de 2 a 6 jugadores, **sin turnos**).

- **En la sala**, al elegir InvasiónGamif aparece **Tema**: el creador elige un nivel de
  *Niveles y preguntas* o "Mezcla de temas" (preguntas de todos los niveles activos).
- **Tablero según los jugadores** (pequeño, para que se peleen las casillas): 2 → 4×4 ·
  3 o 4 → 5×5 · 5 o 6 → 6×6. Cada uno tiene
  un color (rojo, azul, verde, naranja, morado, rosado).
- **Votación al empezar (15 s):** todos votan el tiempo para responder (10, 15 o 20 s) y
  lo que dura la partida (2, 3 o 5 min). Gana lo más votado; si hay empate decide el voto
  del creador. Sin votos: 15 s y 3 min.
- **Jugar:** cualquiera toca una casilla vacía o de otro color (las suyas no se pueden
  tocar). Mientras la responde queda **apartada** con un candado de su color y nadie más
  la puede tocar. Sale la pregunta con su reloj:
  - **Acierta** → la casilla queda de su color (si era de otro, se la **invade**).
  - **Falla o se acaba el tiempo** → la casilla queda como estaba, sale el **profesor**
    flotando con la respuesta correcta y la **explicación** de la pregunta (el campo
    *explicación* del banco; si no tiene, dice cuál era la correcta) y espera **3 s**
    para tocar otra.
- **Fin:** al acabarse el tiempo gana quien tenga más casillas (empate si hay varios en el
  primer lugar). Si se van todos menos uno, gana el que queda. Premios en
  *Premios y reglas*, puntos de temporada y misiones de eventos (cuentan las preguntas
  respondidas y acertadas). El creador puede *Jugar otra vez* desde el final.
- La respuesta correcta nunca llega al navegador antes de responder: el servidor decide.
- Música propia en *Sonidos* (InvasiónGamif) y el sonido "Te invaden una casilla".

### ZonaGamif

Carrera por turnos de 2 a 6 jugadores con **2 fichas** cada uno, desde la salida (arriba)
hasta la **META** (abajo), en una pista de **15 filas × 6 columnas**.

- **Dado:** cada cara mueve la ficha 1 casilla: 1 ↘ · 2 ↓ · 3 → · 4 ← · 5 ↑ (retrocede) ·
  6 ↙. En tu turno tiras, ves a dónde llegaría cada ficha (círculo punteado) y tocas la
  que quieras mover. Si ninguna puede, pierdes el turno. 20 s por turno; si se acaban, el
  juego mueve la ficha que más avanza.
- **Paredes:** si una flecha saca la ficha por un lado, esa ficha no puede usar ese
  número… salvo con el **poder de atravesar paredes**: pasa de la columna 6 a la 1 (o al
  revés) y gasta un uso. Mientras lo tienes, las paredes de la pista se ven **verdes y
  gruesas**; cuando se acaban los usos vuelven a la normalidad.
- **Casillas al azar en cada partida** (filas 2 a 14): ❓ preguntas (~25 %) y trampas con
  flecha y número (~15 %; la mayoría hacia atrás, algunas azules ayudan).
  - ❓ **Acierta** → avanza 1 a 3 filas o gana el poder de paredes (1 o 2 usos).
  - ❓ **Falla o no responde** (20 s) → retrocede 1 o 2 filas y sale el **profesor** con
    la explicación; la partida sigue mientras la lees.
- **Caer sobre otro jugador:** te quedas tú y su ficha se va a la casilla de donde venías.
- **Zona:** las 6 filas desde la ficha más adelantada hacia atrás (marco verde). Lo de
  más atrás queda con niebla: esas fichas no se mueven y, si las dos están fuera, el
  jugador pierde el turno hasta que la zona vuelva a alcanzarlo. Se ve una ventana de 10
  filas alrededor de la zona y a un lado el mapa de toda la pista.
- **Gana** el primero que llega a la meta o el único que queda con fichas en la zona.
- Tema de las preguntas, premios, temporada y misiones igual que en InvasiónGamif.

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

Desde el panel: **Personajes → Nuevo personaje**, sube el modelo (`.vrm` o `.glb`) y la
foto, pon el precio y listo. Al subirlo, el panel lo revisa, dice cómo se va a ver y muestra
una vista previa:

| Modelo | En el juego |
| --- | --- |
| VRM 1.0 | Se anima completo: camina, saluda y parpadea. |
| VRM 0.x (el de muchas apps de teléfono) | Se gira y se corrigen sus ejes solos. Se anima completo. |
| GLB con esqueleto (Mixamo, Unreal, VRoid, Blender…) | Camina y saluda (no parpadea). Se ajusta a la altura de los demás y se para en el piso. |
| GLB sin esqueleto | Se muestra con su propia animación, si trae; si no, quieto. |

- De Sketchfab descarga el formato **GLB** (no FBX).
- Para que un modelo sin esqueleto camine, pásalo por **Mixamo** (gratis), que le pone el
  esqueleto, y expórtalo a GLB con Blender.
- Personajes VRM: **VRoid Hub** (revisa que permita descarga y uso), **Booth** (busca
  "VRM 無料") o créalos en **VRoid Studio** (gratis).
- **Posición:** en el mismo lugar (regla 📏) hay dos barras para correr el modelo a los lados
  y hacia arriba/abajo (±1 m, con flechas para ajustes finos y "Centrar"), por si se
  hunde en el piso, flota o queda corrido. Se aplica en todo el juego.
- **Tamaño:** si un modelo sale muy grande o muy pequeño, en el panel (al crearlo, o con el
  botón de la regla 📏 en su fila) toca **Ajustar solo** (lo mide y lo deja con la altura
  de los demás) o usa la barra, que va del 1 % al 10.000 %, el campo de porcentaje exacto
  y los botones ÷2, −, Normal, +, ×2. La vista previa tiene una línea con la altura normal
  para comparar. Se aplica en todo el juego.
- **Créditos del autor:** si la licencia lo pide (por ejemplo CC Attribution), escríbelos
  en el campo "Créditos": se muestran en la tienda debajo del nombre. Los archivos subidos se guardan en el volumen de Docker
`ludogamif_archivos` (se sirven en `/archivos/…`) y sobreviven a las actualizaciones.

Para subir modelos grandes, el bloque nginx de ludogamif necesita
`client_max_body_size 64m;` (ver `nginx/ludogamif.conf.ejemplo`).
