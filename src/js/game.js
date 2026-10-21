// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PEN_EXIT_COLS, PEN_EXIT_Y, PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Reglas del modo asustado (power pellets).
const SCARED_FRAMES = 420;        // 7 s a 60 fps
const SCARED_FLASH_FRAMES = 120;  // ultimos 2 s: parpadeo
const POWER_PELLET_SCORE = 50;
const GHOST_EAT_BASE = 200;       // 200/400/800/1600 = 200 * 2^cadena

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    scared: 0,     // frames restantes de modo asustado
    ghostChain: 0, // fantasmas comidos en la potencia actual (0,1,2,3)
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      exitDelay: g.exitDelay,
      exited: false,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman:       bloqueado por pared (1) y puerta (3)
//   ghost:        bloqueado solo por pared (1)
//   ghostWaiting: fantasma en espera en la pen; la puerta (3) tambien le bloquea
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && ( actor === 'pacman' || actor === 'ghostWaiting' ) ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    const tile = grid[ p.y ][ p.x ];
    if ( tile === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    } else if ( tile === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += POWER_PELLET_SCORE;
      game.dotsRemaining--;
      game.scared = SCARED_FRAMES;
      game.ghostChain = 0;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
  if ( choices.length === 0 ) return;

  // Modo asustado: huir eligiendo la direccion que mas aleja de Pac-Man.
  if ( game.scared > 0 && g.exited ) {
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    let best = choices[ 0 ];
    let bestDist = -Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const dist = Math.abs( nx - px ) + Math.abs( ny - py );
      if ( dist > bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
    return;
  }

  if ( g.kind === 'hunter' ) {
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const dist = Math.abs( nx - px ) + Math.abs( ny - py );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
  } else if ( g.kind === 'ambusher' ) {
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    const pd = DIRS[ p.dir ] || { x: 0, y: 0 };
    const tx = px + pd.x * 4;
    const ty = py + pd.y * 4;
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const dist = Math.abs( nx - tx ) + Math.abs( ny - ty );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
  } else if ( g.kind === 'hybrid' ) {
    const hunter = game.ghosts.find( ( gg ) => gg.kind === 'hunter' );
    const hx = Math.round( hunter ? hunter.x : g.x );
    const hy = Math.round( hunter ? hunter.y : g.y );
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    const pd = DIRS[ p.dir ] || { x: 0, y: 0 };
    const p2x = px + pd.x * 2;
    const p2y = py + pd.y * 2;
    // objetivo = vector doble desde la posicion del hunter al punto 2 delante de Pac-Man: 2*p2 - h
    const tx = 2 * p2x - hx;
    const ty = 2 * p2y - hy;
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const dist = Math.abs( nx - tx ) + Math.abs( ny - ty );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
  } else if ( g.kind === 'shy' ) {
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    const gx = Math.round( g.x );
    const gy = Math.round( g.y );
    const dist = Math.abs( gx - px ) + Math.abs( gy - py );
    const tx = dist > 8 ? px : 1;
    const ty = dist > 8 ? py : 29;
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const d2 = Math.abs( nx - tx ) + Math.abs( ny - ty );
      if ( d2 < bestDist ) {
        bestDist = d2;
        best = dir;
      }
    }
    g.dir = best;
  } else {
    // Otros tipos: o cualquier valor desconocido -> comportamiento
    // aleatorio (fallback, tal como indica la spec).
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

// Fantasma esperando en la pen antes de su salida: patrulla aleatoria. La
// puerta le bloquea (actor 'ghostWaiting'), asi que queda confinado a la pen.
function decideWaitingGhost( game, g ) {
  const grid = game.grid;
  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghostWaiting' )
  );
  const choices = options.length ? options : [ OPPOSITE[ g.dir ] ];
  g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
}

// Ruta fija de salida de la pen: si esta fuera de las columnas de la puerta,
// se mueve horizontalmente hacia la mas cercana (13 en empate); si esta en
// columna 13 o 14, sube hasta el pasillo superior.
function decideExit( game, g ) {
  const inExitCol = PEN_EXIT_COLS.includes( Math.round( g.x ) );
  if ( !inExitCol ) {
    g.dir = g.x < PEN_EXIT_COLS[ 0 ] ? 'right' : 'left';
  } else {
    g.dir = 'up';
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;
  const waiting = g.exitDelay > 0;
  const actor = waiting ? 'ghostWaiting' : 'ghost';

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( waiting ) decideWaitingGhost( game, g );
    else if ( !g.exited ) {
      decideExit( game, g );
      if ( g.y <= PEN_EXIT_Y ) {
        g.exited = true;
        decideGhost( game, g );
      }
    } else decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, actor ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );

  // Cada frame de juego vence un frame del retraso de salida.
  if ( waiting ) g.exitDelay--;
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  // Al perder una vida se cancela el modo asustado y su cadena. Los pellets ya
  // comidos no reaparecen: no se toca el grid.
  game.scared = 0;
  game.ghostChain = 0;
  game.ghosts.forEach( ( g, i ) => {
    const start = GHOST_STARTS[ i ] || {};
    g.x = start.x !== undefined ? start.x : g.x;
    g.y = start.y !== undefined ? start.y : g.y;
    g.dir = 'up';
    g.exitDelay = start.exitDelay !== undefined ? start.exitDelay : g.exitDelay;
    g.exited = false;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// Un fantasma comido vuelve a su celda de inicio en la pen (lookup por kind,
// nunca por indice) y sale de nuevo por la ruta fija de SPEC 02.
function sendGhostToPen( g ) {
  const start = GHOST_STARTS.find( ( s ) => s.kind === g.kind );
  if ( start ) g.x = start.x;
  g.y = 14;
  g.dir = 'up';
  g.exitDelay = 0;
  g.exited = false;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( !collides( game.pacman, g ) ) continue;
    if ( game.scared > 0 ) {
      // Comido: 200, 400, 800, 1600 segun la cadena de la potencia actual.
      game.score += GHOST_EAT_BASE * Math.pow( 2, game.ghostChain );
      game.ghostChain++;
      sendGhostToPen( g );
      continue;
    }
    game.lives--;
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
    break;
  }

  // El modo asustado vence un frame al final de update, ya resueltas las
  // colisiones: un choque en el ultimo frame del modo sigue siendo comido.
  if ( game.scared > 0 ) game.scared--;

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
