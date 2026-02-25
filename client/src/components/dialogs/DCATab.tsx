import attackPotionImg from '@/assets/images/attack-potion.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import poisonPotionImg from '@/assets/images/poison-potion.png';
import revivePotionImg from '@/assets/images/revive-potion.png';
import type { SwapCall, TwammOrderKey, TwammApiPosition } from '@/api/ekubo';
import {
  DURATION_PRESETS,
  TWAMM_POOL_FEE_RAW,
  computeTwammTimes,
  generateCreateDcaOrderCalls,
  generateWithdrawProceedsCalls,
  generateCancelDcaOrderCalls,
  fetchTwammOrders,
  getDcaOrderProceeds,
} from '@/api/ekubo';
import { TOKEN_ADDRESS } from '@/utils/networkConfig';
import type { NetworkConfig } from '@/utils/networkConfig';
import { gameColors } from '@/utils/themes';
import { formatAmount } from '@/utils/utils';
import CancelIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputBase,
  LinearProgress,
  Typography,
} from '@mui/material';
import { useAccount } from '@starknet-react/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
const DCA_POTIONS = [
  { id: 'ATTACK', name: 'Attack', image: attackPotionImg, color: '#ff6b6b' },
  { id: 'REVIVE', name: 'Revive', image: revivePotionImg, color: '#00d2d3' },
  { id: 'EXTRA LIFE', name: 'Extra Life', image: lifePotionImg, color: '#ff4757' },
  { id: 'POISON', name: 'Poison', image: poisonPotionImg, color: '#a29bfe' },
];

// Resolve potion name from buy_token address (handles hex padding differences)
const POTION_ADDRESSES: Array<{ name: string; address: bigint }> = [
  { name: 'ATTACK', address: BigInt(TOKEN_ADDRESS.ATTACK) },
  { name: 'REVIVE', address: BigInt(TOKEN_ADDRESS.REVIVE) },
  { name: 'EXTRA LIFE', address: BigInt(TOKEN_ADDRESS.EXTRA_LIFE) },
  { name: 'POISON', address: BigInt(TOKEN_ADDRESS.POISON) },
];

const getPotionName = (buyToken: string): string | null => {
  const addr = BigInt(buyToken);
  return POTION_ADDRESSES.find((p) => p.address === addr)?.name ?? null;
};

interface DCATabProps {
  currentNetworkConfig: NetworkConfig;
  tokenBalances: Record<string, number>;
  setTokenBalances: (
    updater: (prev: Record<string, number>) => Record<string, number>
  ) => void;
  tokenPrices: Record<string, string>;
  getTokenIcon: (symbol: string) => ReactNode;
}

/** Active order derived from Ekubo API */
interface ActiveOrder {
  tokenId: string;
  potionId: string;
  orderKey: TwammOrderKey;
  saleRate: bigint;
  totalAmountSold: bigint;
  totalProceedsWithdrawn: bigint;
  startTime: number;
  endTime: number;
}

const getPotionAddress = (potionId: string): string => {
  const mapping: Record<string, string> = {
    ATTACK: TOKEN_ADDRESS.ATTACK,
    REVIVE: TOKEN_ADDRESS.REVIVE,
    'EXTRA LIFE': TOKEN_ADDRESS.EXTRA_LIFE,
    POISON: TOKEN_ADDRESS.POISON,
  };
  return mapping[potionId] || '';
};

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return 'Completed';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default function DCATab({
  currentNetworkConfig,
  tokenBalances,
  setTokenBalances,
  tokenPrices,
  getTokenIcon,
}: DCATabProps) {
  const { account, address } = useAccount();
  const [selectedPotion, setSelectedPotion] = useState('ATTACK');
  const [survivorAmount, setSurvivorAmount] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(86400);
  const [createInProgress, setCreateInProgress] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [proceedsMap, setProceedsMap] = useState<Record<string, bigint>>({});
  const [error, setError] = useState('');

  const survivorBalance = tokenBalances['SURVIVOR'] || 0;
  const positionsContract = currentNetworkConfig.ekuboPositions;
  const rpcUrl = currentNetworkConfig.rpcUrl;

  // Fetch active orders from Ekubo API
  const refreshOrders = useCallback(async () => {
    if (!address) return;

    let apiPositions: TwammApiPosition[] = [];
    try {
      apiPositions = await fetchTwammOrders(address);
    } catch (err) {
      console.warn('Failed to fetch TWAMM orders from API:', err);
      return;
    }

    const orders: ActiveOrder[] = [];
    for (const pos of apiPositions) {
      for (const order of pos.orders) {
        const potionId = getPotionName(order.key.buy_token);
        if (!potionId) continue; // Skip non-potion orders

        orders.push({
          tokenId: pos.token_id,
          potionId,
          orderKey: {
            sell_token: order.key.sell_token,
            buy_token: order.key.buy_token,
            fee: order.key.fee,
            start_time: order.key.start_time,
            end_time: order.key.end_time,
          },
          saleRate: BigInt(order.sale_rate),
          totalAmountSold: BigInt(order.total_amount_sold),
          totalProceedsWithdrawn: BigInt(order.total_proceeds_withdrawn),
          startTime: order.key.start_time,
          endTime: order.key.end_time,
        });
      }
    }

    setActiveOrders(orders);

    // Batch-fetch exact proceeds for all orders via single RPC call
    if (orders.length > 0) {
      try {
        const proceeds = await getDcaOrderProceeds(
          rpcUrl,
          orders.map((o) => ({ tokenId: o.tokenId, orderKey: o.orderKey }))
        );
        setProceedsMap(proceeds);
      } catch {
        // Silently skip failed RPC call
      }
    }
  }, [address, rpcUrl]);

  // Load on mount
  useEffect(() => {
    refreshOrders();
  }, []);

  // Estimated rate from token prices
  const estimatedRate = useMemo(() => {
    const survivorPrice = tokenPrices['SURVIVOR']
      ? parseFloat(tokenPrices['SURVIVOR'])
      : 0;
    const potionPrice = tokenPrices[selectedPotion]
      ? parseFloat(tokenPrices[selectedPotion])
      : 0;
    if (!survivorPrice || !potionPrice) return null;

    const inputAmount = parseFloat(survivorAmount) || 0;
    if (inputAmount <= 0) return null;

    const totalPotions = (inputAmount * survivorPrice) / potionPrice;
    const hours = selectedDuration / 3600;
    return {
      total: totalPotions,
      perHour: totalPotions / hours,
    };
  }, [tokenPrices, selectedPotion, survivorAmount, selectedDuration]);

  const handleCreate = async () => {
    if (!account || !address) return;

    const amount = parseFloat(survivorAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amount > survivorBalance) {
      setError('Insufficient SURVIVOR balance');
      return;
    }

    setError('');
    setCreateInProgress(true);

    try {
      // Get current block timestamp
      const blockRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'starknet_getBlockWithTxHashes',
          params: ['pending'],
          id: 1,
        }),
      });
      const blockJson = await blockRes.json();
      const nowSeconds = blockJson.result?.timestamp || Math.floor(Date.now() / 1000);

      const { startTime, endTime } = computeTwammTimes(nowSeconds, selectedDuration);
      const potionAddress = getPotionAddress(selectedPotion);
      const amountRaw = BigInt(Math.floor(amount)) * 10n ** 18n;

      const orderKey: TwammOrderKey = {
        sell_token: TOKEN_ADDRESS.SURVIVOR,
        buy_token: potionAddress,
        fee: TWAMM_POOL_FEE_RAW,
        start_time: startTime,
        end_time: endTime,
      };

      const calls = generateCreateDcaOrderCalls(positionsContract, orderKey, amountRaw);

      await account.execute(
        calls.map((c: SwapCall) => ({
          contractAddress: c.contractAddress,
          entrypoint: c.entrypoint,
          calldata: c.calldata,
        }))
      );

      // Optimistic balance update
      setTokenBalances((prev: Record<string, number>) => ({
        ...prev,
        SURVIVOR: Math.max(0, (prev.SURVIVOR || 0) - amount),
      }));

      setSurvivorAmount('');
      // Refresh orders from API after a delay to let the indexer catch up
      setTimeout(refreshOrders, 5000);
    } catch (err) {
      console.error('Failed to create DCA order:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setCreateInProgress(false);
    }
  };

  const handleWithdraw = async (order: ActiveOrder) => {
    if (!account || !address) return;
    setActionInProgress(order.tokenId);

    try {
      const calls = generateWithdrawProceedsCalls(
        positionsContract,
        order.tokenId,
        order.orderKey
      );

      await account.execute(
        calls.map((c: SwapCall) => ({
          contractAddress: c.contractAddress,
          entrypoint: c.entrypoint,
          calldata: c.calldata,
        }))
      );

      setTimeout(refreshOrders, 5000);
    } catch (err) {
      console.error('Failed to withdraw proceeds:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancel = async (order: ActiveOrder) => {
    if (!account || !address) return;
    setActionInProgress(order.tokenId);

    try {
      const calls = generateCancelDcaOrderCalls(
        positionsContract,
        order.tokenId,
        order.orderKey,
        order.saleRate
      );

      await account.execute(
        calls.map((c: SwapCall) => ({
          contractAddress: c.contractAddress,
          entrypoint: c.entrypoint,
          calldata: c.calldata,
        }))
      );

      setActiveOrders((prev) => prev.filter((o) => o.tokenId !== order.tokenId));
      setTimeout(refreshOrders, 5000);
    } catch (err) {
      console.error('Failed to cancel DCA order:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMaxClick = () => {
    setSurvivorAmount(String(Math.floor(survivorBalance)));
  };

  const nowSeconds = Math.floor(Date.now() / 1000);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Create DCA Order Section */}
      <Box sx={dcaStyles.section}>
        <Typography sx={dcaStyles.sectionTitle}>Create DCA Order</Typography>

        {/* Potion Selector */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          {DCA_POTIONS.map((p) => (
            <Chip
              key={p.id}
              icon={
                <img
                  src={p.image}
                  alt={p.name}
                  style={{ width: 18, height: 18 }}
                />
              }
              label={p.name}
              onClick={() => setSelectedPotion(p.id)}
              sx={{
                background:
                  selectedPotion === p.id
                    ? `${p.color}30`
                    : `${gameColors.darkGreen}60`,
                border: `1px solid ${
                  selectedPotion === p.id ? p.color : `${gameColors.accentGreen}40`
                }`,
                color: selectedPotion === p.id ? p.color : '#bbb',
                fontWeight: selectedPotion === p.id ? 700 : 400,
                fontSize: '12px',
                cursor: 'pointer',
                '&:hover': {
                  background: `${p.color}20`,
                },
              }}
            />
          ))}
        </Box>

        {/* Amount Input */}
        <Box sx={dcaStyles.inputRow}>
          <Box sx={dcaStyles.inputContainer}>
            <InputBase
              placeholder="0"
              value={survivorAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setSurvivorAmount(val);
              }}
              sx={dcaStyles.amountInput}
            />
            <Typography sx={dcaStyles.inputSuffix}>SURVIVOR</Typography>
          </Box>
          <Button onClick={handleMaxClick} sx={dcaStyles.maxButton}>
            MAX
          </Button>
        </Box>

        <Typography sx={dcaStyles.balanceText}>
          Balance: {formatAmount(survivorBalance)} {getTokenIcon('SURVIVOR')}
        </Typography>

        {/* Duration Presets */}
        <Typography sx={dcaStyles.fieldLabel}>Duration</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          {DURATION_PRESETS.map((preset) => (
            <Chip
              key={preset.seconds}
              label={preset.label}
              onClick={() => setSelectedDuration(preset.seconds)}
              size="small"
              sx={{
                background:
                  selectedDuration === preset.seconds
                    ? `${gameColors.yellow}30`
                    : `${gameColors.darkGreen}60`,
                border: `1px solid ${
                  selectedDuration === preset.seconds
                    ? gameColors.yellow
                    : `${gameColors.accentGreen}40`
                }`,
                color:
                  selectedDuration === preset.seconds
                    ? gameColors.yellow
                    : '#bbb',
                fontWeight: selectedDuration === preset.seconds ? 700 : 400,
                fontSize: '12px',
                cursor: 'pointer',
                '&:hover': {
                  background: `${gameColors.yellow}15`,
                },
              }}
            />
          ))}
        </Box>

        {/* Estimated Rate */}
        {estimatedRate && (
          <Box sx={dcaStyles.estimateRow}>
            <Typography sx={dcaStyles.estimateText}>
              Est. ~{formatAmount(estimatedRate.perHour)} {selectedPotion}/hr
            </Typography>
            <Typography sx={dcaStyles.estimateSubtext}>
              Total ~{formatAmount(estimatedRate.total)} {selectedPotion}
            </Typography>
          </Box>
        )}

        {error && (
          <Typography sx={{ color: gameColors.red, fontSize: '12px', mb: 1 }}>
            {error}
          </Typography>
        )}

        {/* Create Button */}
        <Button
          disabled={createInProgress || !survivorAmount || !account}
          onClick={handleCreate}
          fullWidth
          sx={[
            dcaStyles.actionButton,
            !!survivorAmount &&
              parseFloat(survivorAmount) > 0 &&
              parseFloat(survivorAmount) <= survivorBalance &&
              dcaStyles.actionButtonActive,
          ]}
        >
          {createInProgress ? (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={dcaStyles.buttonText}>CREATING</Typography>
              <div className="dotLoader white" />
            </Box>
          ) : (
            <Typography sx={dcaStyles.buttonText}>CREATE DCA ORDER</Typography>
          )}
        </Button>
      </Box>

      {/* Active Orders Section */}
      <Box sx={dcaStyles.section}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={dcaStyles.sectionTitle}>
            Active Orders ({activeOrders.length})
          </Typography>
          <IconButton
            size="small"
            onClick={refreshOrders}
            sx={{ color: gameColors.accentGreen }}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {activeOrders.length === 0 ? (
          <Typography sx={{ color: '#666', fontSize: '13px', textAlign: 'center', py: 2 }}>
            No active DCA orders
          </Typography>
        ) : (
          activeOrders.map((order) => {
            const potion = DCA_POTIONS.find((p) => p.id === order.potionId);
            const totalDuration = order.endTime - order.startTime;
            const elapsed = Math.max(0, Math.min(totalDuration, nowSeconds - order.startTime));
            const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 100;
            const timeRemaining = Math.max(0, order.endTime - nowSeconds);
            const isCompleted = timeRemaining <= 0;

            // sale_rate is fixed-point scaled by 2^32
            const totalSellAmount = Number((order.saleRate * BigInt(totalDuration)) >> 32n) / 1e18;
            const soldDisplay = Number(order.totalAmountSold) / 1e18;

            // Exact proceeds from RPC (uncollected potions)
            const exactProceeds = proceedsMap[order.tokenId];
            const proceedsDisplay = exactProceeds !== undefined
              ? Math.floor(Number(exactProceeds) / 1e18)
              : null;

            return (
              <Box key={order.tokenId} sx={dcaStyles.orderCard}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {potion && (
                    <img
                      src={potion.image}
                      alt={potion.name}
                      style={{ width: 32, height: 32 }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={dcaStyles.orderTitle}>
                      {formatAmount(totalSellAmount)} SURVIVOR → {potion?.name || order.potionId}
                    </Typography>
                    <Typography sx={dcaStyles.orderSubtext}>
                      {isCompleted ? 'Completed' : `${formatDuration(timeRemaining)} left`} · {formatDuration(totalDuration)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleWithdraw(order)}
                      disabled={actionInProgress === order.tokenId}
                      title="Withdraw proceeds"
                      sx={dcaStyles.orderActionButton}
                    >
                      {actionInProgress === order.tokenId ? (
                        <CircularProgress size={14} sx={{ color: '#fff' }} />
                      ) : (
                        <DownloadIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleCancel(order)}
                      disabled={actionInProgress === order.tokenId}
                      title="Cancel order"
                      sx={{
                        ...dcaStyles.orderActionButton,
                        '&:hover': { color: gameColors.red },
                      }}
                    >
                      <CancelIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    mb: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: `${gameColors.darkGreen}80`,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${potion?.color || gameColors.accentGreen}, ${gameColors.yellow})`,
                    },
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  {proceedsDisplay !== null && (
                    <Typography sx={dcaStyles.orderStatLabel}>
                      Bought:{' '}
                      <Box component="span" sx={{ color: potion?.color || gameColors.yellow, fontWeight: 700 }}>
                        {formatAmount(proceedsDisplay)} {order.potionId}
                      </Box>
                    </Typography>
                  )}
                  <Typography sx={dcaStyles.orderStatLabel}>
                    Spent:{' '}
                    <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 700 }}>
                      {formatAmount(soldDisplay)} SURVIVOR
                    </Box>
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

const dcaStyles = {
  section: {
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '8px',
    p: 2,
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 1.5,
  },
  fieldLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 0.75,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 0.75,
  },
  inputContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    px: 1.5,
    py: 0.5,
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    '& input': { padding: 0 },
  },
  inputSuffix: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 600,
    ml: 1,
    flexShrink: 0,
  },
  maxButton: {
    minWidth: 'unset',
    px: 1.5,
    py: 0.5,
    fontSize: '11px',
    fontWeight: 700,
    color: gameColors.yellow,
    border: `1px solid ${gameColors.yellow}40`,
    background: 'transparent',
    '&:hover': {
      background: `${gameColors.yellow}15`,
      border: `1px solid ${gameColors.yellow}`,
    },
  },
  balanceText: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    fontSize: '12px',
    color: '#bbb',
    mb: 1.5,
  },
  estimateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}20`,
    borderRadius: '6px',
    px: 1.5,
    py: 0.75,
    mb: 1.5,
  },
  estimateText: {
    fontSize: '13px',
    fontWeight: 600,
    color: gameColors.yellow,
  },
  estimateSubtext: {
    fontSize: '11px',
    color: '#999',
  },
  actionButton: {
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    height: '44px',
    border: `2px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.3s ease',
    opacity: 0.7,
    '&:disabled': {
      opacity: 0.4,
    },
  },
  actionButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    opacity: 1,
    boxShadow: `0 0 12px ${gameColors.brightGreen}40`,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `0 0 16px ${gameColors.brightGreen}60`,
      transform: 'translateY(-1px)',
    },
  },
  buttonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '13px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  orderCard: {
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}25`,
    borderRadius: '8px',
    p: 1.5,
    mb: 1,
    '&:last-child': { mb: 0 },
  },
  orderTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fff',
  },
  orderSubtext: {
    fontSize: '11px',
    color: '#999',
  },
  orderActionButton: {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    color: gameColors.accentGreen,
    border: `1px solid ${gameColors.accentGreen}40`,
    '&:hover': {
      color: gameColors.yellow,
      borderColor: gameColors.yellow,
    },
  },
  orderStatLabel: {
    fontSize: '11px',
    color: '#999',
  },
};
