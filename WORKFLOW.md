# MON-T-BLASTER — Development Workflow

## How we work
- William + Claude Chat → design decisions, visual changes, new features
- Claude Code → implements changes directly in the correct files and commits

## File Structure
mon-t-blaster/
├── index.html              ← HTML structure only
├── assets/
│   ├── css/
│   │   └── style.css       ← all styles
│   ├── js/
│   │   └── game.js         ← all game logic
│   ├── sprites/            ← PNG assets from Leonardo AI
│   └── audio/              ← sound effects (coming soon)
├── PROJECT_STATUS.md       ← updated on every commit
├── WORKFLOW.md             ← this file
└── README.md

## Commit Rules (follow every time)
- Always update PROJECT_STATUS.md + README.md + WORKFLOW.md on every commit
- Format: "vX.X - [area]: description of change"
- Areas: feat | fix | refactor | assets | balance
- Example: "v1.2 - fix: bonus coin no longer deals damage"

## Pending Features
- [ ] Power-ups in game (double shot, slow motion, shield)
- [ ] Sound effects
- [ ] Real sprite PNGs from Leonardo AI
- [ ] High score persistence (localStorage)
- [ ] PWA support for mobile install

## Completed Features
- [v1.0] Full game in HTML5 Canvas (3 lanes, shoot, dodge, upgrades shop)
- [v1.1] HTML / CSS / JS split into separate files
- [v1.2] Projectile speed rebalanced — upgrades now feel meaningful
- [v1.3] Main menu responsive for iPhone (safe areas, 100dvh, viewport-fit)
- [v1.4] Projectile base speed lowered to 3 -- slower at start, upgrades matter more
- [v1.4] Projectile base speed lowered to 3 -- slower at start, upgrades matter more
- [v1.4] Projectile base speed lowered to 3 — much slower feel at start
- [v1.4] Projectile base speed lowered to 3 — much slower feel at start
