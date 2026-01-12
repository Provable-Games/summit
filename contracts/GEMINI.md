# Savage Summit - Contracts (Gemini Context)

## Project Overview

**Savage Summit** is a king-of-the-hill strategy game on Starknet. This directory (`contracts/`) contains the core smart contract logic written in Cairo.

*   **Goal:** Beasts compete to hold the "Summit" and earn tokens.
*   **Tech Stack:** Cairo v2.13.1, Scarb, Starknet Foundry (`snforge`, `sncast`).
*   **Architecture:** Component-based design using standard OpenZeppelin contracts and custom game logic.

## Environment & Tools

*   **Scarb:** v2.13.1 (Build tool & package manager)
*   **Starknet Foundry:** v0.54.0 (Testing framework `snforge` & interaction tool `sncast`)
*   **Node/NPM:** Used for some scripts (likely in parent/sibling directories).

## Directory Structure

| Path | Purpose |
| :--- | :--- |
| **`src/`** | Source code root. |
| `src/systems/summit.cairo` | **Main Contract Entry Point**. Implements `ISummitSystem`. |
| `src/models/` | Data structures (Beasts, Game State). |
| `src/logic/` | **Pure Business Logic**. Testable, isolated functions (combat, rewards). |
| `src/constants.cairo` | Game constants and error messages (`Errors` module). |
| **`tests/`** | Test suite (Unit, Integration, Fork). |

## Development Workflow

1.  **Modify Code:**
    *   **Logic:** Edit `src/logic/*.cairo` for business rules.
    *   **State:** Edit `src/systems/*.cairo` for contract interactions.
2.  **Format:**
    *   Run `scarb fmt` (Essential before commits).
3.  **Build:**
    *   Run `scarb build`.
4.  **Test:**
    *   Run `scarb test` (Executes `snforge test`).
    *   **Specific Test:** `scarb test test_name_filter`.

## Coding Conventions

*   **Formatting:** Strict adherence to `scarb fmt`.
*   **Safety:**
    *   Use `checked_add` / `checked_sub` where overflows are possible (though Cairo 2 panics on overflow by default, explicit checks are good for logic).
    *   Use OpenZeppelin components for standard functionality (ERC20, Ownable).
*   **Testing:**
    *   **Unit Tests:** Test pure logic in `src/logic` directly.
    *   **Integration Tests:** Use `snforge` with `deploy_contract` helpers in `tests/`.
    *   **Fork Tests:** Configured in `Scarb.toml` (`[tool.snforge.fork]`). Use when interacting with mainnet state.

## Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Build** | `scarb build` | Compile the contracts. |
| **Test** | `scarb test` | Run all tests using `snforge`. |
| **Test (Single)** | `scarb test <filter>` | Run tests matching the name filter. |
| **Format** | `scarb fmt` | Auto-format code. |
| **Coverage** | `snforge test --coverage` | Run tests with coverage reporting (requires `lcov` to view). |
