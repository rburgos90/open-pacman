// maze.js
// Laberinto 28x31 fiel a la geometria del nivel 1 de Pac-Man.
// Se escribe como 31 strings de 28 chars (legible) y se parsea a numeros.
//   '#' pared(1) · '.' dot(2) · ' ' vacio transitable(0) · '-' puerta pen(3) · 'o' power pellet(4)
// Coordenadas: celda (x,y), origen arriba-izquierda. x in [0,27], y in [0,30].
// Simetrico respecto al eje vertical central (entre cols 13 y 14).

const MAZE_STR = [
  '############################', // 0  borde
  '#............##............#', // 1
  '#.####.#####.##.#####.####.#', // 2
  '#o####.#####.##.#####.####o#', // 3  power pellets en las esquinas
  '#.####.#####.##.#####.####.#', // 4
  '#..........................#', // 5
  '#.####.##.########.##.####.#', // 6
  '#.####.##.########.##.####.#', // 7
  '#......##....##....##......#', // 8
  '######.#####.##.#####.######', // 9
  '######.#####.##.#####.######', // 10
  '######.##..........##.######', // 11
  '######.##.###--###.##.######', // 12  puerta pen cols 13-14
  '######.##.#      #.##.######', // 13  interior pen
  '          #      #          ', // 14  tunel (extremos abiertos) + pen
  '######.##.#      #.##.######', // 15  interior pen
  '######.##.########.##.######', // 16  fondo pen
  '######.##..........##.######', // 17
  '######.#####.##.#####.######', // 18
  '######.#####.##.#####.######', // 19
  '#............##............#', // 20
  '#.####.#####.##.#####.####.#', // 21
  '#.####.#####.##.#####.####.#', // 22
  '#...##................##...#', // 23  fila inicio Pacman (13,23)
  '###.##.##.########.##.##.###', // 24
  '###.##.##.########.##.##.###', // 25
  '#o.....##....##....##.....o#', // 26  power pellets en las esquinas
  '#.##########.##.##########.#', // 27
  '#.##########.##.##########.#', // 28
  '#..........................#', // 29
  '############################', // 30  borde
];

function parseTile( ch ) {
  if ( ch === '#' ) return 1;
  if ( ch === '.' ) return 2;
  if ( ch === '-' ) return 3;
  if ( ch === 'o' ) return 4; // power pellet (transitable, como dot)
  return 0; // espacio = vacio transitable
}

// Matriz numerica pristina (no se muta; cada partida copia esto).
const MAZE = MAZE_STR.map( ( row ) => row.split( '' ).map( parseTile ) );

const TUNNEL_ROW = 14;
const PEN_EXIT_COLS = [ 13, 14 ]; // columnas de la puerta pen
const PEN_EXIT_Y = 11;            // fila del pasillo sobre la puerta
const PACMAN_START = { x: 13, y: 23 };
// 4 fantasmas, todos dentro de la pen (filas 13-15, cols 11-16).
// exitDelay en frames (60 fps): 0 / 240 / 480 / 720 = 0/4/8/12 s.
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter',   exitDelay: 0   }, // rojo
  { x: 14, y: 14, kind: 'ambusher', exitDelay: 240 }, // rosa  (4 s)
  { x: 12, y: 14, kind: 'hybrid',   exitDelay: 480 }, // celeste (8 s)
  { x: 15, y: 14, kind: 'shy',      exitDelay: 720 }, // naranja (12 s)
];

window.MAZE = MAZE;
window.TUNNEL_ROW = TUNNEL_ROW;
window.PEN_EXIT_COLS = PEN_EXIT_COLS;
window.PEN_EXIT_Y = PEN_EXIT_Y;
window.PACMAN_START = PACMAN_START;
window.GHOST_STARTS = GHOST_STARTS;
