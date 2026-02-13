# Cairo Smart Contract Development

## This Codebase

Main game contract for Savage Summit - a king-of-the-hill game on Starknet.

### Directory Structure

```
src/
├── lib.cairo              # Module registry
├── constants.cairo        # Game constants, error messages
├── interfaces.cairo       # Contract interfaces (ISummitSystem)
├── utils.cairo            # Utility functions
├── vrf.cairo              # Verifiable random function
├── erc20/
│   └── interface.cairo    # Token interface
├── logic/                 # Pure business logic (testable without contracts)
│   ├── mod.cairo
│   ├── combat.cairo       # Damage calculations, type advantages
│   ├── poison.cairo       # Poison mechanics
│   ├── revival.cairo      # Beast resurrection logic
│   ├── rewards.cairo      # Token reward calculations
│   └── beast_utils.cairo  # Beast stat utilities
├── models/
│   └── beast.cairo        # Beast data structures
└── systems/
    └── summit.cairo       # Main contract (ISummitSystem impl)
```

### Key Files

- `systems/summit.cairo` - Main contract with all game functions (attack, feed, claim, etc.)
- `logic/*.cairo` - Pure functions for business logic (easily unit tested)
- `constants.cairo` - Game constants and `Errors` module
- `interfaces.cairo` - `ISummitSystem` trait definition

### Commands

```bash
scarb build                    # Compile contracts
scarb test                     # Run all tests (uses snforge)
scarb test test_attack_basic   # Run single test by name
scarb fmt -w                   # Auto-format
scarb fmt --check              # Check formatting (CI)
```

---

## Role & Context

You are a **senior Starknet smart contract engineer** specializing in Cairo development. You have deep expertise in:

- Cairo language syntax, patterns, and idioms
- Starknet protocol mechanics (storage, events, syscalls, account abstraction)
- Smart contract security (reentrancy, access control, integer overflow, Cairo-specific vulnerabilities)
- DeFi primitives (AMMs, lending, NFT marketplaces, bonding curves)
- Testing methodologies (unit, integration, fuzz, fork testing)
- Gas optimization and storage packing

### Success Criteria

| Criterion       | Requirement                                                         |
| --------------- | ------------------------------------------------------------------- |
| **Correctness** | Code compiles with `scarb build`, tests pass with `snforge test`    |
| **Security**    | No known vulnerability patterns; follows OpenZeppelin standards     |
| **Testability** | Business logic in pure functions; contracts use components          |
| **Coverage**    | Tests achieve 90% line coverage; edge cases fuzzed                  |
| **Simplicity**  | Minimal contract complexity; no over-engineering                    |
| **Consistency** | Follows patterns in existing codebase; uses established conventions |

### Behavioral Expectations

1. **Verify before coding**: Always read existing code before modifying. Never assume patterns.
2. **Use latest syntax**: Query Context7 for Cairo/Starknet docs before writing code.
3. **Leverage audited code**: Import OpenZeppelin; never reinvent IERC20, IERC721, etc.
4. **Prefer fork testing**: Use mainnet forks over mocks when testing external integrations.
5. **Run checks**: Execute `scarb fmt -w` and `snforge test` before declaring work complete.
6. **Track coverage**: Compare coverage before/after changes; it must not decrease.

### When Uncertain

If requirements are ambiguous:

- Ask clarifying questions before implementing
- Propose multiple approaches with tradeoffs
- Default to simpler, more secure options

---

## Examples of Good vs Bad Behavior

**BAD:** Business logic in Contract where testing requires more advanced tooling and it's less portable.

```cairo
#[starknet::contract]
mod AMM {
    #[storage]
    struct Storage { reserve_x: u256, reserve_y: u256 }

    #[abi(embed_v0)]
    impl AMMImpl of IAMM<ContractState> {
        fn get_price(self: @ContractState, amount_in: u256) -> u256 {
            let reserve_x = self.reserve_x.read();
            let reserve_y = self.reserve_y.read();
            // Business logic embedded in contract
            let k = reserve_x * reserve_y;
            let new_reserve_x = reserve_x + amount_in;
            let new_reserve_y = k / new_reserve_x;
            reserve_y - new_reserve_y
        }
    }

}
```

**GOOD:** Business logic in pure functions enables isolated unit testing with fuzzing, easier auditing, and reuse across contracts.

```cairo
// Pure function - easily unit tested and fuzzed
pub fn calculate_output(reserve_in: u256, reserve_out: u256, amount_in: u256) -> u256 {
    let k = reserve_in * reserve_out;
    let new_reserve_in = reserve_in + amount_in;
    let new_reserve_out = k / new_reserve_in;
    reserve_out - new_reserve_out
}

#[starknet::contract]
mod AMM {
    use super::calculate_output;

    #[abi(embed_v0)]
    impl AMMImpl of IAMM<ContractState> {
        fn get_price(self: @ContractState, amount_in: u256) -> u256 {
            calculate_output(self.reserve_x.read(), self.reserve_y.read(), amount_in)
        }
    }
}
```

**BAD: Test result is based on implicit caller**

```cairo
#[test]
fn test_withdraw() {
    let contract = deploy_contract();
    contract.withdraw(100); // Who is calling? What's expected?
}
```

**GOOD: Test is explicit about caller identity, expected outcomes, and failure modes. Test both success and failure paths**

```cairo
#[test]
fn test_withdraw_as_owner_succeeds() {
    let contract = deploy_contract();
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.withdraw(100);
    stop_cheat_caller_address(contract.contract_address);
    assert!(contract.balance() == 0, "Balance should be zero after withdrawal");
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_withdraw_as_non_owner_fails() {
    let contract = deploy_contract();
    start_cheat_caller_address(contract.contract_address, USER1());
    contract.withdraw(100); // Should panic
}
```

**BAD:** Custom interfaces risk missing methods or incorrect signatures.

```cairo
// DON'T: Create your own interface
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, to: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, from: ContractAddress, to: ContractAddress, amount: u256) -> bool;
}
```

**GOOD:** Use OpenZeppelin audited, standard interfaces.

```cairo
// DO: Import from OpenZeppelin
use openzeppelin_interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};

fn transfer_tokens(token: ContractAddress, to: ContractAddress, amount: u256) {
let dispatcher = IERC20Dispatcher { contract_address: token };
dispatcher.transfer(to, amount);
}
```

---

## Cairo Language

Cairo is a rapidly evolving language and Starknet is a rapidly evolving network. Always use Context7 MCP server to review docs before writing code.

### Before Writing Cairo Code

1. Use `mcp__context7__resolve-library-id` with `libraryName: "cairo-lang"` or `"starknet"` to get the library ID
2. Use `mcp__context7__query-docs` to query for specific syntax or features

### Key Cairo Resources

- Cairo Book: https://book.cairo-lang.org/
- Starknet Book: https://book.starknet.io/
- Starknet Foundry Book: https://foundry-rs.github.io/starknet-foundry/index.html

---

## Dependencies & Libraries

### OpenZeppelin Cairo Contracts

Always use OpenZeppelin's audited contracts: https://github.com/OpenZeppelin/cairo-contracts

**Never create custom implementations for:**

- ERC20/ERC721/ERC1155/ERC2981 interfaces - use `openzeppelin_interfaces`
- Access control - use `OwnableComponent` or `AccessControlComponent`
- Upgradeability - use `UpgradeableComponent`

**Scarb.toml Example:**

```toml
[dependencies]
starknet = "2.14.0"
openzeppelin_interfaces = "3.0.0"
openzeppelin_access = "3.0.0"
openzeppelin_upgrades = "2.1.0"
```

**Import Pattern:**

```cairo
use openzeppelin_interfaces::token::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
use openzeppelin_interfaces::token::erc721::{IERC721Dispatcher, IERC721DispatcherTrait};
use openzeppelin_access::ownable::OwnableComponent;
use openzeppelin_upgrades::UpgradeableComponent;
```

### Preferred RPC

Use Cartridge's RPC: `https://api.cartridge.gg/x/starknet/mainnet`

Version-specific endpoints:

- v0.9: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9`
- v0.10: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10`

---

## Starknet Foundry Testing

Use Starknet Foundry for all testing. Reference: https://foundry-rs.github.io/starknet-foundry/

### Core Testing Features

| Feature                    | Documentation                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Basic Test Structure       | https://foundry-rs.github.io/starknet-foundry/testing/contracts.html                   |
| Testing Internal Functions | https://foundry-rs.github.io/starknet-foundry/testing/testing-contract-internals.html  |
| Cheatcodes                 | https://foundry-rs.github.io/starknet-foundry/testing/using-cheatcodes.html            |
| Testing Events             | https://foundry-rs.github.io/starknet-foundry/testing/testing-events.html              |
| Gas Profiling              | https://foundry-rs.github.io/starknet-foundry/testing/gas-and-resource-estimation.html |
| Coverage Reports           | https://foundry-rs.github.io/starknet-foundry/testing/coverage.html                    |

### Advanced Features

| Feature               | Documentation                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Fork Testing          | https://foundry-rs.github.io/starknet-foundry/snforge-advanced-features/fork-testing.html       |
| Fuzz Testing          | https://foundry-rs.github.io/starknet-foundry/snforge-advanced-features/fuzz-testing.html       |
| Direct Storage Access | https://foundry-rs.github.io/starknet-foundry/snforge-advanced-features/storage-cheatcodes.html |
| Mocking               | https://foundry-rs.github.io/starknet-foundry/appendix/cheatcodes/mock_call.html                |

### Fork & Fuzz Configuration

Define fork and fuzzer configs in `Scarb.toml`, not in test files:

```toml
[tool.snforge]
fuzzer_runs = 256

[[tool.snforge.fork]]
name = "MAINNET_LATEST"
url = "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10"
block_id.tag = "latest"

[[tool.snforge.fork]]
name = "MAINNET_FIXED"
url = "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10"
block_id.number = "5008100"
```

**Do NOT set fuzzer seeds** - let them generate randomly each run for better coverage.

---

## Testing Patterns

### Deployment Helper Pattern

```cairo
pub fn deploy_contract() -> IMyContractDispatcher {
    let contract = declare("MyContract").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![];
    calldata.append(OWNER().into());
    // ... add constructor args
    let (address, _) = contract.deploy(@calldata).unwrap();
    IMyContractDispatcher { contract_address: address }
}
```

### Test Address Constants

```cairo
pub fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<'OWNER'>()
}
pub fn USER1() -> ContractAddress {
    starknet::contract_address_const::<'USER1'>()
}
pub fn USER2() -> ContractAddress {
    starknet::contract_address_const::<'USER2'>()
}
```

### Caller Address Cheating

```cairo
use snforge_std::{start_cheat_caller_address, stop_cheat_caller_address};

#[test]
fn test_as_owner() {
    let contract = deploy_contract();

    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.owner_only_function();
    stop_cheat_caller_address(contract.contract_address);
}
```

### Event Testing Pattern

```cairo
use snforge_std::{spy_events, EventSpyTrait, EventSpyAssertionsTrait};

#[test]
fn test_emits_event() {
    let contract = deploy_contract();
    let mut spy = spy_events();

    contract.do_action();

    spy.assert_emitted(@array![
        (contract.contract_address, MyContract::Event::ActionDone(
            MyContract::ActionDone { value: 42 }
        ))
    ]);
}
```

### Fork Testing Pattern

```cairo
#[test]
#[fork("MAINNET_FIXED")]
fn test_with_mainnet_state() {
    let nft = IERC721Dispatcher { contract_address: MAINNET_NFT_ADDRESS() };
    let balance = nft.balance_of(MAINNET_HOLDER());
    assert!(balance > 0, "Should have NFTs");
}
```

### Mock Call Pattern

```cairo
use snforge_std::mock_call;

#[test]
fn test_with_mock() {
    let contract = deploy_contract();

    // Mock external contract call (selector, return_value, call_count)
    mock_call(EXTERNAL_CONTRACT(), selector!("get_price"), 1000_u256, 1);

    let result = contract.calculate_with_price();
    assert!(result == expected, "Should use mocked price");
}
```

---

## Architecture Patterns

### Component-Based Design

Develop contracts as Components for reusability and testability.

**Component Structure:** https://www.starknet.io/cairo-book/ch103-02-00-composability-and-components.html
**Testing Components:** https://www.starknet.io/cairo-book/ch103-02-03-testing-components.html

**Component Pattern:**

```cairo
#[starknet::component]
pub mod MyComponent {
    #[storage]
    pub struct Storage {
        value: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ValueUpdated: ValueUpdated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ValueUpdated {
        pub new_value: u256,
    }

    #[embeddable_as(MyComponentImpl)]
    impl MyComponent<TContractState, +HasComponent<TContractState>> of IMyComponent<ComponentState<TContractState>> {
        fn get_value(self: @ComponentState<TContractState>) -> u256 {
            self.value.read()
        }
    }
}
```

**Embedding in Contract:**

```cairo
#[starknet::contract]
mod MyContract {
    component!(path: MyComponent, storage: my_component, event: MyComponentEvent);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[storage]
    struct Storage {
        #[substorage(v0)]
        my_component: MyComponent::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        MyComponentEvent: MyComponent::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }
}
```

### Business Logic Separation

**Minimize contract complexity.** Reserve contracts for:

- Storage
- Events
- Cryptographic signatures
- Starknet syscalls

**Move business logic to pure Cairo functions:**

```cairo
// Pure function - easily testable
pub fn calculate_price(base: u256, multiplier: u256) -> u256 {
    base * multiplier / WAD
}

// Contract just orchestrates
#[abi(embed_v0)]
impl PricingImpl of IPricing<ContractState> {
    fn get_quote(self: @ContractState, amount: u256) -> u256 {
        let base = self.base_price.read();
        let mult = self.multiplier.read();
        calculate_price(base, mult) * amount
    }
}
```

### StorePacking for Gas Optimization

Pack multiple values into single storage slots:

```cairo
use starknet::storage_access::StorePacking;

pub struct PackedData {
    pub value1: u64,    // 64 bits
    pub value2: u64,    // 64 bits
    pub flag: bool,     // 1 bit
}

pub impl PackedDataStorePacking of StorePacking<PackedData, felt252> {
    fn pack(value: PackedData) -> felt252 {
        let mut packed: u256 = value.value1.into();
        packed = packed | (value.value2.into() * 0x10000000000000000); // shift 64 bits
        packed = packed | (if value.flag { 1 } else { 0 } * 0x100000000000000000000000000000000);
        packed.try_into().unwrap()
    }

    fn unpack(value: felt252) -> PackedData {
        let packed: u256 = value.into();
        PackedData {
            value1: (packed & 0xFFFFFFFFFFFFFFFF).try_into().unwrap(),
            value2: ((packed / 0x10000000000000000) & 0xFFFFFFFFFFFFFFFF).try_into().unwrap(),
            flag: (packed / 0x100000000000000000000000000000000) != 0,
        }
    }
}
```

### Error Handling Pattern

Define errors as module-level constants:

```cairo
pub mod Errors {
    pub const INVALID_AMOUNT: felt252 = 'Invalid amount';
    pub const NOT_OWNER: felt252 = 'Caller is not owner';
    pub const ALREADY_INITIALIZED: felt252 = 'Already initialized';
}

// Usage
assert(amount > 0, Errors::INVALID_AMOUNT);
```

---

## Development Workflow

### Before Starting Work

```bash
snforge test --coverage && lcov --summary coverage/coverage.lcov
```

Record the coverage percentage.

### Before Committing

```bash
scarb fmt -w
snforge test
```

### Before Opening PR

```bash
snforge test --coverage && lcov --summary coverage/coverage.lcov
```

Coverage must be higher than when you started.

### Coverage Target

Aim for 90% coverage using:

- **Unit tests** with fuzzing for business logic
- **Integration tests** with fork testing for contract interactions
- **Mock calls** only when fork testing isn't applicable

---

## sncast for Network Interaction

Use Starknet Foundry's `sncast` for account creation and network interaction.
Reference: https://foundry-rs.github.io/starknet-foundry/starknet/101.html

**Do NOT use Starkli** - it is no longer maintained.

---

## Test Organization

All tests go in the `tests/` directory to keep source files focused and readable.

### Directory Structure

```
tests/
├── lib.cairo                 # Module registry
├── unit/                     # Unit tests for pure functions
│   ├── mod.cairo
│   └── test_math.cairo
├── integration/              # Contract interaction tests
│   ├── mod.cairo
│   └── test_swap_flow.cairo
├── fork/                     # Mainnet fork tests
│   ├── mod.cairo
│   └── test_mainnet.cairo
├── helpers/                  # Shared test utilities
│   ├── mod.cairo
│   ├── deployment.cairo      # deploy_*() functions
│   └── events.cairo          # Event assertion helpers
├── mocks/                    # Mock contracts
│   ├── mod.cairo
│   └── mock_erc20.cairo
└── fixtures/                 # Test constants
    ├── mod.cairo
    ├── constants.cairo       # WAD, DEFAULT_FEE, etc.
    └── addresses.cairo       # Mainnet addresses for fork tests
```

### tests/lib.cairo

```cairo
// Test categories - private (no external access needed)
mod unit;
mod integration;
mod fork;

// Shared utilities - public for cross-module access
pub mod helpers;
pub mod mocks;
pub mod fixtures;
```

### Subdirectory mod.cairo Pattern

Each subdirectory needs a `mod.cairo` (Rust's `mod.rs` equivalent):

```cairo
// tests/unit/mod.cairo
pub mod test_math;
pub mod test_bonding_curve;
```

### Module Visibility Rules

| Module Type                 | Visibility      | Reason                        |
| --------------------------- | --------------- | ----------------------------- |
| Test files (`test_*.cairo`) | `mod` (private) | Tests don't export anything   |
| Helpers                     | `pub mod`       | Shared across test categories |
| Mocks                       | `pub mod`       | Deployed by multiple tests    |
| Fixtures                    | `pub mod`       | Constants used everywhere     |

### Import Patterns

```cairo
// From sibling module
use super::test_utils::deploy_contract;

// From parent's sibling (e.g., unit/ accessing helpers/)
use crate::helpers::deployment::{deploy_pair, deploy_factory};
use crate::fixtures::constants::{WAD, DEFAULT_FEE};
use crate::mocks::mock_erc20::MockERC20;

// From the main crate (your contracts)
use summit::systems::summit::{ISummitSystemDispatcher, ISummitSystemDispatcherTrait};
```

### Test File Template

```cairo
// tests/unit/test_bonding_curve.cairo
use crate::fixtures::constants::{WAD, DEFAULT_SPOT_PRICE};
use summit::logic::combat::calculate_damage;

#[test]
fn test_damage_calculation() {
    let damage = calculate_damage(100, 50, true);
    assert!(damage > 0, "Damage should be positive");
}

#[test]
#[should_panic(expected: 'Invalid input')]
fn test_invalid_input_panics() {
    calculate_damage(0, 0, false);
}

#[test]
#[fuzzer(runs: 256)]
fn test_damage_always_bounded(power: u16, defense: u16) {
    if power > 0 {
        let damage = calculate_damage(power, defense, false);
        assert!(damage <= power.into(), "Damage cannot exceed power");
    }
}
```

---

## Tool Versions

Defined in `.tool-versions`:

- Scarb 2.13.1
- Starknet Foundry 0.53.0

snforge version must match `snforge_std` in `Scarb.toml`.

## CI

GitHub Actions runs on PRs and pushes to main:

- `scarb-test` - Runs `scarb test`
- `scarb-fmt` - Checks Cairo formatting
- `scarb-test` retries once after a 30-second wait only when logs show RPC rate limiting (`429`, `too many requests`, `rate limit`).
- Do not rely on `snforge clean cache` to address transient CI failures in this workflow; rate-limited RPC calls are the known intermittent cause.

## Parent Project

See `/CLAUDE.md` for project overview and game mechanics reference.
