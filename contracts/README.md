# FAR2048 Smart Contracts

Solidity smart contracts for the FAR2048 betting system on Base and Arbitrum.

## Overview

The `FAR2048Bet` contract handles:
- Match creation with USDC wagers
- Player joins with ERC20 token transfers
- Escrow of bet amounts
- Winner declaration by backend oracle
- Automated payouts with platform fee

## Contract Architecture

### FAR2048Bet.sol

Main betting contract with the following key functions:

#### Player Functions
- `createMatch(uint256 wagerAmount, address usdcToken, uint256 maxPlayers)` - Create a new match
- `joinMatch(uint256 matchId)` - Join an existing match (requires USDC approval)

#### Admin Functions (Owner Only)
- `declareWinner(uint256 matchId, address winner)` - Declare winner and distribute pot
- `cancelMatch(uint256 matchId)` - Cancel match and refund players
- `setPlatformFee(uint256 newFeePercent)` - Update platform fee (max 5%)
- `setFeeCollector(address newCollector)` - Update fee collector address

#### View Functions
- `getMatch(uint256 matchId)` - Get full match details
- `getMatchPlayers(uint256 matchId)` - Get list of players
- `isPlayerInMatch(uint256 matchId, address player)` - Check if player joined
- `getUserMatches(address user)` - Get all matches for a user

## Deployment

### Prerequisites

```bash
npm install
```

Create `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASESCAN_API_KEY=your_basescan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
```

### Compile Contracts

```bash
npx hardhat compile
```

### Deploy to Testnet

```bash
# Base Sepolia
npm run deploy:base-testnet

# Arbitrum Sepolia
npm run deploy:arbitrum-testnet
```

### Deploy to Mainnet

```bash
# Base Mainnet
npm run deploy:base

# Arbitrum Mainnet
npm run deploy:arbitrum
```

### Verify Contracts

Verification happens automatically after deployment. Manual verification:

```bash
npx hardhat verify --network base CONTRACT_ADDRESS "FEE_COLLECTOR_ADDRESS"
```

## Testing

Run the full test suite:

```bash
npx hardhat test
```

Run with gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

Run specific test file:

```bash
npx hardhat test test/FAR2048Bet.test.js
```

## USDC Token Addresses

### Mainnet
- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Arbitrum**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

### Testnet
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Arbitrum Sepolia**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`

## Security Considerations

1. **Reentrancy Protection**: Uses OpenZeppelin's `ReentrancyGuard`
2. **Safe ERC20**: Uses OpenZeppelin's `SafeERC20` for token transfers
3. **Access Control**: Owner-only functions for critical operations
4. **Input Validation**: All inputs validated with require statements
5. **Platform Fee Cap**: Maximum 5% platform fee enforced

## Gas Optimization

- State variables packed efficiently
- Events emitted for off-chain indexing
- Minimal storage reads/writes
- Batch operations where possible

## Audit Checklist

Before mainnet deployment:
- [ ] Professional security audit
- [ ] Testnet deployment and testing
- [ ] Frontend integration testing
- [ ] Edge case testing (cancellations, timeouts)
- [ ] Gas optimization review
- [ ] Emergency pause mechanism (if needed)

## License

MIT

