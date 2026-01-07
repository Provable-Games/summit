# Dojo World - Event Indexing

This codebase emits events for Torii indexing. It does NOT contain game logic (that's in `/contracts`).

## Purpose

The Dojo world acts as an event relay layer:
1. Main contract (`/contracts`) calls this contract to emit events
2. Events are indexed by Torii (Dojo's indexer)
3. Client subscribes to Torii for real-time game state updates

## Commands

```bash
sozo build           # Build the Dojo world
sozo test            # Run tests
scarb fmt -w         # Format code
```

## Directory Structure

```
src/
├── lib.cairo              # Module registry
├── constants.cairo        # Namespace constant (DEFAULT_NS)
├── models/
│   ├── beast.cairo        # LiveBeastStats model
│   └── summit.cairo       # Event structs (BattleEvent, SummitEvent, etc.)
└── systems/
    └── summit.cairo       # Event emission contract (summit_events)
```

## Key Files

### src/systems/summit.cairo
The main contract that emits all game events:
- `emit_beast_event` - Beast stats updates
- `emit_battle_event` - Combat results (attacker, defender, damage)
- `emit_summit_event` - Summit ownership changes
- `emit_reward_event` - Token rewards claimed
- `emit_poison_event` - Poison applied
- `emit_diplomacy_event` - Diplomacy bonus tracking
- `emit_corpse_event` / `emit_skull_event` - Token collection events

### src/models/summit.cairo
Event struct definitions that Torii indexes:
- `BattleEvent`, `SummitEvent`, `RewardEvent`, `PoisonEvent`, etc.

## Relationship to /contracts

| Aspect | /contracts | /dojo |
|--------|-----------|-------|
| Game logic | Yes | No |
| State storage | Yes | No (events only) |
| Event emission | Calls dojo | Emits to Torii |
| Testing | snforge | sozo test |

The main contract in `/contracts/src/systems/summit.cairo` dispatches to this contract via `ISummitEventsDispatcher`.

## When to Modify This Codebase

**DO modify dojo/ when:**
- Adding new indexed events for the client
- Changing event payload structure
- Adding new event types

**DO NOT modify dojo/ when:**
- Changing game logic (use `/contracts`)
- Fixing combat calculations (use `/contracts`)
- Updating token economics (use `/contracts`)

## Dependencies

From `Scarb.toml`:
- Cairo 2.13.1
- Dojo 1.8.0
- Starknet 2.13.1

## Parent Project

See `/CLAUDE.md` for project overview and `/contracts/CLAUDE.md` for Cairo development standards.
