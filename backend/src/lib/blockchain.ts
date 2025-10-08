/**
 * Blockchain Utilities
 * 
 * Handles interactions with FAR2048 smart contracts on Base and Arbitrum
 * Uses viem for blockchain operations
 */

import { createPublicClient, createWalletClient, http, parseUnits, Address } from 'viem';
import { base, arbitrum, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Contract ABI (minimal interface for our needs)
const FAR2048_ABI = [
  {
    name: 'createMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wagerAmount', type: 'uint256' },
      { name: 'usdcToken', type: 'address' },
      { name: 'maxPlayers', type: 'uint256' },
    ],
    outputs: [{ name: 'matchId', type: 'uint256' }],
  },
  {
    name: 'declareWinner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'winner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getMatch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'host', type: 'address' },
      { name: 'wagerAmount', type: 'uint256' },
      { name: 'usdcToken', type: 'address' },
      { name: 'maxPlayers', type: 'uint256' },
      { name: 'currentPlayers', type: 'uint256' },
      { name: 'totalPot', type: 'uint256' },
      { name: 'winner', type: 'address' },
      { name: 'status', type: 'uint8' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'endedAt', type: 'uint256' },
    ],
  },
] as const;

// Chain configurations
const CHAINS = {
  base: base,
  arbitrum: arbitrum,
  baseSepolia: baseSepolia,
  arbitrumSepolia: arbitrumSepolia,
} as const;

// USDC addresses per chain
const USDC_ADDRESSES = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  arbitrumSepolia: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
} as const;

type ChainName = keyof typeof CHAINS;

/**
 * Get public client for reading blockchain data
 */
export function getPublicClient(chain: ChainName): any {
  const chainConfig = CHAINS[chain];
  const rpcUrl = getRpcUrl(chain);

  return createPublicClient({
    chain: chainConfig,
    transport: http(rpcUrl),
  });
}

/**
 * Get wallet client for writing to blockchain (owner operations)
 */
export function getWalletClient(chain: ChainName): any {
  const chainConfig = CHAINS[chain];
  const rpcUrl = getRpcUrl(chain);
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }

  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: chainConfig,
    transport: http(rpcUrl),
  });
}

/**
 * Get RPC URL for chain
 */
function getRpcUrl(chain: ChainName): string {
  const urls = {
    base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    baseSepolia: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  };

  return urls[chain];
}

/**
 * Get contract address for chain
 */
export function getContractAddress(chain: ChainName): Address {
  const addresses = {
    base: process.env.BASE_CONTRACT_ADDRESS,
    arbitrum: process.env.ARBITRUM_CONTRACT_ADDRESS,
    baseSepolia: process.env.BASE_SEPOLIA_CONTRACT_ADDRESS,
    arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_CONTRACT_ADDRESS,
  };

  const address = addresses[chain];
  if (!address) {
    throw new Error(`Contract address not set for chain: ${chain}`);
  }

  return address as Address;
}

/**
 * Get USDC token address for chain
 */
export function getUsdcAddress(chain: ChainName): Address {
  return USDC_ADDRESSES[chain];
}

/**
 * Declare winner on-chain
 */
export async function declareWinnerOnChain(
  chain: ChainName,
  contractMatchId: bigint,
  winnerAddress: Address
): Promise<string> {
  const walletClient = getWalletClient(chain);
  const contractAddress = getContractAddress(chain);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: FAR2048_ABI,
    functionName: 'declareWinner',
    args: [contractMatchId, winnerAddress],
    chain: CHAINS[chain],
  } as any);

  console.log(`✅ Winner declared on ${chain}:`, hash);
  return hash;
}

/**
 * Get match details from blockchain
 */
export async function getMatchFromChain(
  chain: ChainName,
  contractMatchId: bigint
) {
  const publicClient = getPublicClient(chain);
  const contractAddress = getContractAddress(chain);

  const matchData = await publicClient.readContract({
    address: contractAddress,
    abi: FAR2048_ABI,
    functionName: 'getMatch',
    args: [contractMatchId],
  });

  return {
    id: matchData[0],
    host: matchData[1],
    wagerAmount: matchData[2],
    usdcToken: matchData[3],
    maxPlayers: matchData[4],
    currentPlayers: matchData[5],
    totalPot: matchData[6],
    winner: matchData[7],
    status: matchData[8],
    createdAt: matchData[9],
    startedAt: matchData[10],
    endedAt: matchData[11],
  };
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(chain: ChainName, hash: `0x${string}`) {
  const publicClient = getPublicClient(chain);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

/**
 * Parse USDC amount (6 decimals)
 */
export function parseUsdcAmount(amount: string | number): bigint {
  return parseUnits(amount.toString(), 6);
}

