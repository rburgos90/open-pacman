# AGENTS.md

## Project

- Vanilla JS/HTML/CSS Pac-Man clone living entirely in `src/`. No `package.json`, no build, no tests, no linter, no CI — do not invent npm/test commands; verification means opening the game in a browser and playing it.
- Run: `open src/index.html`. Scripts are classic `<script>` tags (no ES modules, no `fetch`), so `file://` works; a static server is optional.

## Wiring (easy to get wrong)

- Script order in `src/index.html` **is** the dependency graph: `maze.js` → `game.js` → `render.js` → `main.js`. Files share state only through explicit `window.X = …` exports. Adding or reordering a file requires editing the script tags in `index.html`.
- Tile encoding (`maze.js`): `1` wall, `2` dot, `0` empty, `3` pen door. `MAZE` is pristine and must never be mutated — `createGame()` copies it to `game.grid`, and both gameplay and rendering read `game.grid`.
- Maze is 28×31 cells (`x` 0–27, `y` 0–30), tunnel row `14`, Pac-Man start `(13,23)`. Every `MAZE_STR` row must be exactly 28 chars; nothing validates this. The maze is hand-tuned to be symmetric — keep it symmetric when editing.
- `TILE = 20` in `render.js` must match the canvas `560×620` in `index.html` (28×20 × 31×20).
- Movement is fractional cells: `PACMAN_SPEED = 1/8`, `GHOST_SPEED = 1/10` cells per frame, snapped by `aligned()` (epsilon `1e-3`) so turns happen on cell centers. Speeds that aren't divisors of 1 (or too coarse) break turning/eating.
- Collision rules differ by actor: Pac-Man is blocked by walls (`1`) **and** the pen door (`3`); ghosts only by walls.
- `GHOST_STARTS` (`maze.js`) currently defines 2 ghosts; `GHOST_COLORS` (`render.js`) has 4 slots. Adding a ghost = add a start; colors are picked by index.

## Conventions

- UI strings, HUD, and code comments are Spanish (`VIDAS`, `GANASTE`, `PERDISTE`, `Flechas para moverte…`). Keep new user-facing text and comments in Spanish.
- Style: 2-space indent, single quotes, spaces inside call parentheses — `foo( 'bar' )`. Match the surrounding file.
- Never commit unless explicitly asked (the `/spec-impl` skill enforces this too).

## Spec-driven workflow

- Skills live in `.agents/skills/` (pinned by `skills-lock.json`): `/spec` designs a spec, `/spec-impl NN-slug` implements it.
- `/spec` writes `specs/NN-slug.md` starting in `Draft` (the `specs/` folder does not exist yet; numbering starts at `01-`). Specs should be written in the same language as the conversation.
- `/spec-impl` refuses to run unless the spec's state means "Approved" (any language), then creates/switches to branch `spec-NN-slug` (automatic unless `specs/.spec-config.yml` sets `AutoCreateBranch: false`), shows the plan, and implements one step at a time, pausing for diff review. It never commits on your behalf.
