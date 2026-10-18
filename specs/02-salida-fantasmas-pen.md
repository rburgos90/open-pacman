# SPEC 02 — Salida de los fantasmas de la pen

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-17
> **Objective:** Cuando a un fantasma le vence su `exitDelay`, sale de la pen por la puerta siguiendo una ruta fija hasta el pasillo superior en lugar de quedar atrapado dentro.

## Por qué existe esta spec

SPEC 01 dejó a los 4 fantasmas dentro de la pen con delays escalonados, pero una vez vencido el delay la IA voraz (`decideGhost`) nunca elige subir por la puerta: subir aumenta la distancia a Pac-Man (que está debajo) y los empates se resuelven hacia `left`. Los fantasmas ciclan dentro de la pen para siempre (verificado con el código actual: tras 3600 frames siguen en filas 13–15 / cols 11–16).

## Scope

**In:**

- Modo de salida forzada en `moveGhost` (`src/js/game.js`): mientras `exitDelay === 0` y el fantasma no haya salido, la dirección se calcula con una ruta fija en vez de `decideGhost`.
- Ruta de la salida: si la celda está fuera de las columnas 13–14 → moverse horizontalmente hacia la columna más cercana (13 en empate); si está en columna 13 o 14 → subir; al alcanzar la fila 11 termina el modo salida y retoma su personalidad.
- Bandera booleana `exited` en cada fantasma, inicializada en `createGame` y reiniciada en `resetPositions`.
- La misma ruta aplica al cazador (delay 0) desde el inicio de la partida.
- Constantes de geometría de salida (`PEN_EXIT_COLS`, `PEN_EXIT_Y`) en `src/js/maze.js`, exportadas por `window`.

**Out of scope (para specs futuras):**

- Reentrada a la pen por la puerta después de salir.
- Bloqueo o colisión entre fantasmas.
- Cambios en la patrulla aleatoria durante la espera (`exitDelay > 0`).
- Cambios en delays, colores, personalidades o velocidades.
- Power pellets, sonido, niveles.

## Data model

```js
// maze.js — geometría de la salida (junto a TUNNEL_ROW)
const PEN_EXIT_COLS = [ 13, 14 ]; // columnas de la puerta pen
const PEN_EXIT_Y = 11;            // fila del pasillo sobre la puerta

// game.js — cada fantasma en game.ghosts
{ x, y, dir, speed, kind, exitDelay, exited } // exited: bool, true al alcanzar la fila 11
```

- La ruta solo se evalúa en celdas alineadas (igual que el resto del movimiento).
- `decideWaitingGhost` y el bloqueo de la puerta (`actor 'ghostWaiting'`) no cambian.

## Implementation plan

1. Añadir `PEN_EXIT_COLS` y `PEN_EXIT_Y` en `maze.js` con sus exports de `window`. Manual: consola → `[13,14]` y `11`.
2. Añadir `exited: false` a cada fantasma en `createGame` y `g.exited = false` en `resetPositions`. Manual: al crear el juego los 4 son `false`; al perder una vida vuelven a `false`.
3. Implementar `decideExit( game, g )` en `game.js` con la regla columna→subir; en `moveGhost`, cuando `!waiting && !g.exited`, llamar a `decideExit` en lugar de `decideGhost`, y marcar `g.exited = true` al quedar alineado en `y <= PEN_EXIT_Y`. Manual: pulsar Jugar → el rojo cruza la puerta y llega a la fila 11 en menos de 1 s.
4. Jugar ~15 s sin moverte: rosa, celeste y naranja salen a su vez al vencer sus delays. Manual: los 4 acaban fuera de la pen.
5. Verificar personalidades ya fuera: el rojo persigue, el naranja huye a la esquina ≤ 8 celdas. Manual: se ven trayectorias distintas al salir.

## Acceptance criteria

- [ ] El juego carga sin errores en consola.
- [ ] Al pulsar Jugar, el cazador cruza la puerta y alcanza la fila 11 en menos de 1 s.
- [ ] Cada fantasma alcanza la fila 11 en un plazo de ≤ 2 s desde que su `exitDelay` llega a 0.
- [ ] Mientras `exitDelay > 0`, el fantasma patrulla dentro de la pen y no cruza la puerta.
- [ ] Al llegar a la fila 11, el fantasma retoma su personalidad (el rojo elige la dirección que más reduce su distancia a Pac-Man).
- [ ] Al perder una vida, los 4 vuelven a la pen con `exited = false` y delays 0/4/8/12, y vuelven a salir.
- [ ] Las colisiones, el marcador y las vidas siguen funcionando igual que antes.
- [ ] `MAZE` no se muta y el laberinto sigue simétrico tras jugar una partida completa.

## Decisions

- **Sí:** ruta forzada determinista (opción a). Se ve natural y evita el salto visual del teletransporte.
- **No:** teletransporte a `(13,11)` al vencer el delay. Salto brusco e inconsistente con el movimiento fraccional del juego.
- **No:** pathfinding genérico hasta la puerta. La pen es una caja abierta 6×3; la regla "columna 13/14 → subir" la cubre sin código de búsqueda.
- **Sí:** los 4 fantasmas, incluido el cazador con delay 0 — hoy también queda atrapado.
- **No:** reentrada a la pen. Solo salida; la reentrada merece su propia spec.
- **Sí:** constantes de la salida en `maze.js` (geometría), no en `game.js` (reglas), junto a `TUNNEL_ROW`.
- **Sí:** bandera `exited` explícita en `game.ghosts[]` en vez de derivar la salida de la posición. Se reinicia de forma evidente en `resetPositions`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El delay vence a mitad de celda y la ruta se evalúa con fracciones | La ruta, como todo el movimiento, solo se evalúa en celdas alineadas. |
| La ruta asume que la pen es una caja abierta con puerta en cols 13–14 | Las constantes viven en `maze.js`; si se mueve la pen, hay que actualizarlas ahí. |

## What is **not** in this spec

- Reentrada a la pen.
- Bloqueo entre fantasmas.
- Cambios en delays, colores o personalidades.
- Power pellets / modo asustado.
