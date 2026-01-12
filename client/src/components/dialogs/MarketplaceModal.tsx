import ROUTER_ABI from '@/abi/router-abi.json';
import { generateSwapCalls, getSwapQuote, SwapQuote } from '@/api/ekubo';
import attackPotionImg from '@/assets/images/attack-potion.png';
import corpseTokenImg from '@/assets/images/corpse-token.png';
import killTokenImg from '@/assets/images/kill-token.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import poisonPotionImg from '@/assets/images/poison-potion.png';
import revivePotionImg from '@/assets/images/revive-potion.png';
import { useController } from '@/contexts/controller';
import { useDynamicConnector } from '@/contexts/starknet';
import { useStatistics } from '@/contexts/Statistics';
import { useSystemCalls } from '@/dojo/useSystemCalls';
import { NETWORKS } from '@/utils/networkConfig';
import { gameColors } from '@/utils/themes';
import { formatAmount } from '@/utils/utils';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import RemoveIcon from '@mui/icons-material/Remove';
import SellIcon from '@mui/icons-material/Sell';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Box, Button, Dialog, IconButton, InputBase, Menu, MenuItem, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import { useProvider } from '@starknet-react/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'starknet';

interface MarketplaceModalProps {
  open: boolean;
  close: () => void;
}

interface Potion {
  id: string;
  name: string;
  image: string;
  description: string;
  color: string;
}

const POTIONS: Potion[] = [
  {
    id: 'ATTACK',
    name: 'Attack Potion',
    image: attackPotionImg,
    description: 'Increase attack power',
    color: '#ff6b6b'
  },
  {
    id: 'REVIVE',
    name: 'Revive Potion',
    image: revivePotionImg,
    description: 'Instantly revives fallen beasts',
    color: '#00d2d3'
  },
  {
    id: 'EXTRA LIFE',
    name: 'Extra Life',
    image: lifePotionImg,
    description: 'Grants an extra life when holding the summit',
    color: '#ff4757'
  },
  {
    id: 'POISON',
    name: 'Poison Potion',
    image: poisonPotionImg,
    description: 'Poison the beast on the summit',
    color: '#a29bfe'
  },
  {
    id: 'SKULL',
    name: 'Skull Token',
    image: killTokenImg,
    description: 'Used to upgrade your beasts',
    color: '#e74c3c'
  },
  {
    id: 'CORPSE',
    name: 'Corpse Token',
    image: corpseTokenImg,
    description: 'Used to give your beasts bonus health',
    color: '#95a5a6'
  }
];

const getImpactColor = (impact: number) => {
  const pct = Math.abs(impact);
  if (pct >= 0.10) return '#f7b4b4'; // high impact - red tint
  if (pct >= 0.03) return '#f7e3b4'; // medium impact - amber tint
  return '#b7f7c8'; // low impact - green tint
};

const formatImpactLabel = (impact?: number) => {
  if (impact === undefined) return '';
  const arrow = impact < 0 ? '▼' : '▲';
  return `${arrow} ${(Math.abs(impact) * 100).toFixed(1)}%`;
};

const SLIPPAGE_BPS = 100; // 1%
const OPTIMISTIC_STALE_MS = 12_000;
const MAX_QUANTITY = 1_000_000;

const EMPTY_QUANTITIES: Record<string, number> = {
  "ATTACK": 0,
  "EXTRA LIFE": 0,
  "POISON": 0,
  "REVIVE": 0,
  "SKULL": 0,
  "CORPSE": 0
};

const createEmptyQuantities = () => ({ ...EMPTY_QUANTITIES });

const EMPTY_TOKEN_QUOTES_STATE: Record<string, { amount: string; loading: boolean; error?: string; quote?: SwapQuote }> = {
  "ATTACK": { amount: '', loading: false },
  "EXTRA LIFE": { amount: '', loading: false },
  "POISON": { amount: '', loading: false },
  "REVIVE": { amount: '', loading: false },
  "SKULL": { amount: '', loading: false },
  "CORPSE": { amount: '', loading: false }
};

const createEmptyTokenQuotesState = () => ({ ...EMPTY_TOKEN_QUOTES_STATE });

export default function MarketplaceModal(props: MarketplaceModalProps) {
  const { open, close } = props;
  const { currentNetworkConfig } = useDynamicConnector();
  const { tokenBalances, fetchPaymentTokenBalances } = useController();
  const { tokenPrices, refreshTokenPrices } = useStatistics();
  const { provider } = useProvider();
  const { executeAction } = useSystemCalls();
  const [activeTab, setActiveTab] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>(createEmptyQuantities());
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>(createEmptyQuantities());
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedReceiveToken, setSelectedReceiveToken] = useState<string>('');
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [sellInProgress, setSellInProgress] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [receiveAnchorEl, setReceiveAnchorEl] = useState<null | HTMLElement>(null);
  const [tokenQuotes, setTokenQuotes] = useState<Record<string, { amount: string; loading: boolean; error?: string; quote?: SwapQuote }>>(createEmptyTokenQuotesState());
  const [optimisticPrices, setOptimisticPrices] = useState<Record<string, string>>({});
  const [optimisticPriceTimestamps, setOptimisticPriceTimestamps] = useState<Record<string, number>>({});

  const routerContract = useMemo(
    () =>
      new Contract({
        abi: ROUTER_ABI,
        address:
          NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS]
            .ekuboRouter,
        providerOrAccount: provider,
      }),
    [provider]
  );

  const paymentTokens = useMemo(() => {
    const network =
      NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS];
    return (network as any)?.paymentTokens || [];
  }, []);

  const userTokens = useMemo(() => {
    return paymentTokens
      .map((token: any) => ({
        symbol: token.name,
        balance: formatAmount(tokenBalances[token.name] || 0),
        rawBalance: tokenBalances[token.name] || 0,
        address: token.address,
        decimals: token.decimals || 18,
        displayDecimals: token.displayDecimals || 4,
      }))
  }, [paymentTokens, tokenBalances]);

  const selectedTokenData = userTokens.find(
    (t: any) => t.symbol === selectedToken
  );

  const selectedReceiveTokenData = userTokens.find(
    (t: any) => t.symbol === selectedReceiveToken
  );

  useEffect(() => {
    if (open) {
      fetchPaymentTokenBalances();
      refreshTokenPrices();

      setQuantities(createEmptyQuantities());
      setSellQuantities(createEmptyQuantities());

      if (userTokens.length > 0) {
        if (!selectedToken) {
          setSelectedToken(userTokens[0].symbol);
        }
        if (!selectedReceiveToken) {
          setSelectedReceiveToken(userTokens[0].symbol);
        }
      }
    }
  }, [open]);

  useEffect(() => {
    // Reset quotes/optimistic prices when switching tabs to avoid showing stale data
    setTokenQuotes(createEmptyTokenQuotesState());
  }, [activeTab]);

  useEffect(() => {
    // Drop optimistic prices once they've been stale long enough and a fresh price fetch has occurred
    const now = Date.now();
    let changed = false;
    const nextPrices: Record<string, string> = {};
    const nextTimestamps: Record<string, number> = {};

    Object.entries(optimisticPrices).forEach(([id, price]) => {
      const ts = optimisticPriceTimestamps[id];
      if (ts && now - ts < OPTIMISTIC_STALE_MS) {
        nextPrices[id] = price;
        nextTimestamps[id] = ts;
      } else {
        changed = true;
      }
    });

    if (changed) {
      setOptimisticPrices(nextPrices);
      setOptimisticPriceTimestamps(nextTimestamps);
    }
  }, [tokenPrices, optimisticPrices, optimisticPriceTimestamps]);

  useEffect(() => {
    if (!open) return;

    refreshTokenPrices();
    const intervalId = setInterval(() => {
      refreshTokenPrices();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [open, refreshTokenPrices]);

  const totalItems = activeTab === 0
    ? Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
    : Object.values(sellQuantities).reduce((sum, qty) => sum + qty, 0);
  const hasItems = totalItems > 0;

  const totalTokenCost = useMemo(() => {
    if (activeTab !== 0) return 0;
    let total = 0;
    POTIONS.forEach(potion => {
      const quantity = quantities[potion.id];
      if (quantity > 0 && tokenQuotes[potion.id].amount) {
        total += Number(tokenQuotes[potion.id].amount);
      }
    });
    return total;
  }, [quantities, tokenQuotes, activeTab]);

  const totalReceiveAmount = useMemo(() => {
    if (activeTab !== 1) return 0;
    let total = 0;
    POTIONS.forEach(potion => {
      const quantity = sellQuantities[potion.id];
      if (quantity > 0 && tokenQuotes[potion.id].amount) {
        total += Number(tokenQuotes[potion.id].amount);
      }
    });
    return total;
  }, [sellQuantities, tokenQuotes, activeTab]);

  const canAfford = selectedTokenData && totalTokenCost <= Number(selectedTokenData.rawBalance);
  const toBaseUnits = (quantity: number) => BigInt(quantity) * 10n ** 18n;

  const fetchPotionQuote = useCallback(
    async (potionId: string, tokenSymbol: string, quantity: number) => {
      if (quantity <= 0) {
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false }
        }));
        return;
      }

      const selectedTokenData = userTokens.find(
        (t: any) => t.symbol === tokenSymbol
      );

      if (!selectedTokenData?.address) {
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false, error: 'Token not supported' }
        }));
        return;
      }

      setTokenQuotes(prev => ({
        ...prev,
        [potionId]: { amount: '', loading: true }
      }));

      try {
        const quote = await getSwapQuote(
          -toBaseUnits(quantity),
          currentNetworkConfig.tokens.erc20.find(token => token.name === potionId)?.address!,
          selectedTokenData.address
        );

        if (quote) {
          const rawAmount = (quote.total * -1) / Math.pow(10, selectedTokenData.decimals || 18);
          if (rawAmount === 0) {
            setTokenQuotes(prev => ({
              ...prev,
              [potionId]: { amount: '', loading: false, error: 'Insufficient liquidity' }
            }));
          } else {
            const slippageAdjusted = rawAmount * (10000 - SLIPPAGE_BPS) / 10000;
            const amount = formatAmount(slippageAdjusted);
            setTokenQuotes(prev => ({
              ...prev,
              [potionId]: { amount, loading: false, quote: quote }
            }));
          }
        }
      } catch (error: any) {
        console.error('Error fetching quote:', error);
        const emsg = (error?.message || '').toLowerCase();
        const msg = emsg.includes('insufficient') || emsg.includes('not enough') || emsg.includes('route') || emsg.includes('not found')
          ? 'Insufficient liquidity'
          : 'Failed to get quote';
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false, error: msg }
        }));
      }
    },
    [userTokens, currentNetworkConfig.tokens.erc20]
  );

  const fetchSellQuote = useCallback(
    async (potionId: string, tokenSymbol: string, quantity: number) => {
      if (quantity <= 0) {
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false }
        }));
        return;
      }

      const receiveTokenData = userTokens.find(
        (t: any) => t.symbol === tokenSymbol
      );

      if (!receiveTokenData?.address) {
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false, error: 'Token not supported' }
        }));
        return;
      }

      const potionAddress = currentNetworkConfig.tokens.erc20.find(
        (token: any) => token.name === potionId
      )?.address!;

      setTokenQuotes(prev => ({
        ...prev,
        [potionId]: { amount: '', loading: true }
      }));

      try {
        const quote = await getSwapQuote(
          toBaseUnits(quantity),
          potionAddress,
          receiveTokenData.address,
        );

        if (quote) {
          const rawAmount = quote.total / Math.pow(10, receiveTokenData.decimals || 18);
          if (rawAmount === 0) {
            setTokenQuotes(prev => ({
              ...prev,
              [potionId]: { amount: '', loading: false, error: 'Insufficient liquidity' }
            }));
          } else {
            const slippageAdjusted = rawAmount * (10000 - SLIPPAGE_BPS) / 10000;
            const amount = formatAmount(slippageAdjusted);
            setTokenQuotes(prev => ({
              ...prev,
              [potionId]: { amount, loading: false, quote: quote }
            }));
          }
        } else {
          setTokenQuotes(prev => ({
            ...prev,
            [potionId]: { amount: '', loading: false, error: 'No quote available' }
          }));
        }
      } catch (error: any) {
        console.error('Error fetching sell quote:', error);
        const emsg = (error?.message || '').toLowerCase();
        const msg = emsg.includes('insufficient') || emsg.includes('not enough') || emsg.includes('route') || emsg.includes('not found')
          ? 'Insufficient liquidity'
          : 'Failed to get quote';
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false, error: msg }
        }));
      }
    },
    [userTokens, currentNetworkConfig.tokens.erc20]
  );

  const adjustQuantity = (potionId: string, delta: number) => {
    setQuantities(prev => {
      const newQuantity = Math.min(MAX_QUANTITY, Math.max(0, prev[potionId] + delta));

      if (activeTab === 0 && selectedToken) {
        fetchPotionQuote(potionId, selectedToken, newQuantity);
      }

      return {
        ...prev,
        [potionId]: newQuantity
      };
    });
  };

  const onQuantityInputChange = (potionId: string, value: string) => {
    const raw = value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);

    setQuantities(prev => {
      const newQuantity = Math.min(MAX_QUANTITY, Math.max(0, isNaN(num) ? 0 : num));

      if (activeTab === 0 && selectedToken) {
        fetchPotionQuote(potionId, selectedToken, newQuantity);
      }

      return {
        ...prev,
        [potionId]: newQuantity
      };
    });
  };

  const adjustSellQuantity = (potionId: string, delta: number) => {
    const balance = tokenBalances[potionId] || 0;
    setSellQuantities(prev => {
      const newQuantity = Math.max(0, Math.min(balance, Math.min(MAX_QUANTITY, prev[potionId] + delta)));

      if (activeTab === 1 && selectedReceiveToken) {
        fetchSellQuote(potionId, selectedReceiveToken, newQuantity);
      }

      return {
        ...prev,
        [potionId]: newQuantity
      };
    });
  };

  const onSellQuantityInputChange = (potionId: string, value: string) => {
    const raw = value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const balance = tokenBalances[potionId] || 0;
    setSellQuantities(prev => {
      const newQuantity = Math.max(0, Math.min(balance, Math.min(MAX_QUANTITY, isNaN(num) ? 0 : num)));

      if (activeTab === 1 && selectedReceiveToken) {
        fetchSellQuote(potionId, selectedReceiveToken, newQuantity);
      }

      return {
        ...prev,
        [potionId]: newQuantity
      };
    });
  };

  const handleTokenClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTokenClose = () => {
    setAnchorEl(null);
  };

  const handleReceiveTokenClick = (event: React.MouseEvent<HTMLElement>) => {
    setReceiveAnchorEl(event.currentTarget);
  };

  const handleReceiveTokenClose = () => {
    setReceiveAnchorEl(null);
  };

  const handleTokenSelect = (tokenSymbol: string) => {
    setSelectedToken(tokenSymbol);
    handleTokenClose();
  };

  const handleReceiveTokenSelect = (tokenSymbol: string) => {
    setSelectedReceiveToken(tokenSymbol);
    handleReceiveTokenClose();
  };

  const resetAfterAction = () => {
    setQuantities(createEmptyQuantities());
    setSellQuantities(createEmptyQuantities());
    setTokenQuotes(createEmptyTokenQuotesState());
  };

  const applyOptimisticPrice = (
    potionId: string,
    quote?: SwapQuote,
    direction: 'buy' | 'sell' = 'buy'
  ) => {
    const impact = quote?.price_impact ?? quote?.impact;
    const base = tokenPrices[potionId];
    if (impact === undefined || base === undefined) return;

    const baseNum = parseFloat(base);
    if (isNaN(baseNum)) return;

    const adjustedImpact = direction === 'sell' ? -impact : impact;
    const multiplier = 1 + adjustedImpact;
    if (multiplier <= 0) return;

    const updated = baseNum * multiplier;
    setOptimisticPrices((prev) => ({
      ...prev,
      [potionId]: updated.toFixed(4),
    }));
    setOptimisticPriceTimestamps((prev) => ({
      ...prev,
      [potionId]: Date.now(),
    }));
  };

  const handlePurchase = async () => {
    if (!canAfford || !hasItems || !selectedTokenData) return;
    setPurchaseInProgress(true);

    try {
      const calls: any[] = [];
      const quotedPotions: { id: string; quote: any }[] = [];

      for (const potion of POTIONS) {
        const potionAddress = currentNetworkConfig.tokens.erc20.find(token => token.name === potion.id)?.address!;
        const quantity = quantities[potion.id];
        if (quantity > 0 && tokenQuotes[potion.id].amount) {
          let quote = tokenQuotes[potion.id].quote;

          if (!quote) {
            quote = await getSwapQuote(
              -toBaseUnits(quantity),
              potionAddress,
              selectedTokenData.address
            );
          }

          if (quote) {
            quotedPotions.push({ id: potion.id, quote });
            const swapCalls = generateSwapCalls(
              routerContract,
              selectedTokenData.address,
              {
                tokenAddress: potionAddress,
                minimumAmount: quantity,
                quote: quote
              },
              SLIPPAGE_BPS
            );
            calls.push(...swapCalls);
          }
        }
      }

      if (calls.length > 0) {
        let result = await executeAction(calls, () => { });

        if (result) {
          quotedPotions.forEach((q) => applyOptimisticPrice(q.id, q.quote, 'buy'));
          resetAfterAction();
        }
      }
    } catch (error) {
      console.error('Error purchasing potions:', error);
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const handleSell = async () => {
    if (!hasItems || !selectedReceiveTokenData) return;
    setSellInProgress(true);

    try {
      const calls: any[] = [];
      const tradedPotionIds: string[] = [];
      const isPotionTokenName = (name: string) => POTIONS.some((p) => p.id === name);

      for (const potion of POTIONS) {
        const potionAddress = currentNetworkConfig.tokens.erc20.find(
          (token: any) => token.name === potion.id
        )?.address!;
        const quantity = sellQuantities[potion.id];

        if (quantity > 0) {
          let quote = tokenQuotes[potion.id].quote;

          if (!quote) {
            quote = await getSwapQuote(
              toBaseUnits(quantity),
              potionAddress,
              selectedReceiveTokenData.address,
            );
          }

          if (quote) {
            const swapCalls = generateSwapCalls(
              routerContract,
              potionAddress,
              {
                tokenAddress: selectedReceiveTokenData.address,
                minimumAmount: quantity,
                quote: quote
              },
              SLIPPAGE_BPS
            );
            calls.push(...swapCalls);
            tradedPotionIds.push(potion.id);
          }
        }
      }

      if (calls.length > 0) {
        const result = await executeAction(calls, () => { });

        if (result) {
          // Apply optimistic pricing for sells based on the quote used
          POTIONS.forEach((potion) => {
            if (sellQuantities[potion.id] > 0) {
              const quote = tokenQuotes[potion.id]?.quote;
              if (quote) {
                applyOptimisticPrice(potion.id, quote, 'sell');
              }
            }
          });
          resetAfterAction();
        }
      }
    } catch (error) {
      console.error('Error selling items:', error);
    } finally {
      setSellInProgress(false);
    }
  };

  useEffect(() => {
    if (!selectedToken || activeTab !== 0) return;

    POTIONS.forEach(potion => {
      const quantity = quantities[potion.id] || 0;
      fetchPotionQuote(potion.id, selectedToken, quantity);
    });
  }, [selectedToken, activeTab]);

  useEffect(() => {
    if (!selectedReceiveToken || activeTab !== 1) return;

    POTIONS.forEach(potion => {
      const quantity = sellQuantities[potion.id] || 0;
      if (quantity > 0) {
        fetchSellQuote(potion.id, selectedReceiveToken, quantity);
      }
    });
  }, [selectedReceiveToken, fetchSellQuote, activeTab, sellQuantities]);

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `,
            width: { xs: '95vw', sm: '90vw', md: 600 },
            maxWidth: 600,
            height: { xs: '95vh', sm: '90vh', md: '85vh' },
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }
        }
      }}
    >
      <Box sx={styles.container}>
        <IconButton onClick={close} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>
        <IconButton onClick={() => refreshTokenPrices()} sx={styles.headerRefreshButton}>
          <RefreshIcon />
        </IconButton>

        <Box sx={styles.header}>
          <Typography sx={styles.title}>MARKETPLACE</Typography>
          <Box sx={styles.divider} />
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={styles.tabs}
          >
            <Tab
              label="Buy"
              icon={<ShoppingCartIcon sx={{ fontSize: '18px' }} />}
              iconPosition="start"
              sx={styles.tab}
            />
            <Tab
              label="Sell"
              icon={<SellIcon sx={{ fontSize: '18px' }} />}
              iconPosition="start"
              sx={styles.tab}
            />
          </Tabs>
        </Box>

        <Box sx={styles.content}>
          {activeTab === 0 ? (
            // Buy Tab
            POTIONS.map((potion) => (
              <Box key={potion.id} sx={styles.potionCard}>
                <Box sx={styles.potionImage}>
                  <img
                    src={potion.image}
                    alt={potion.name}
                    style={{ width: '48px', height: '48px' }}
                  />
                </Box>

                <Box sx={styles.potionInfo}>
                  <Typography sx={styles.potionName}>{potion.name}</Typography>
                  <Typography sx={styles.potionDescription}>{potion.description}</Typography>
                  <Box sx={styles.potionPrice}>
                    <Typography sx={styles.priceText} component="span">
                      {(() => {
                        const priceStr = optimisticPrices[potion.id] ?? tokenPrices[potion.id] ?? undefined;
                        if (priceStr) {
                          return `$${priceStr}`;
                        }
                        return 'No liquidity';
                      })()}
                    </Typography>
                    {tokenQuotes[potion.id]?.quote?.price_impact !== undefined ||
                      tokenQuotes[potion.id]?.quote?.impact !== undefined || tokenQuotes[potion.id]?.error ? (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          bgcolor: tokenQuotes[potion.id]?.error
                            ? '#f7b4b4'
                            : getImpactColor(tokenQuotes[potion.id].quote.price_impact ?? tokenQuotes[potion.id].quote.impact),
                          color: '#0d1511',
                        }}
                      >
                        {tokenQuotes[potion.id]?.error
                          ? 'insufficient liquidity'
                          : formatImpactLabel(tokenQuotes[potion.id].quote.price_impact ?? tokenQuotes[potion.id].quote.impact ?? 0)}
                      </Box>
                    ) : null}
                  </Box>
                </Box>

                <Box sx={styles.quantityControls}>
                  <IconButton
                    size="small"
                    onClick={() => adjustQuantity(potion.id, -1)}
                    disabled={quantities[potion.id] === 0}
                    sx={styles.quantityButton}
                  >
                    <RemoveIcon sx={{ fontSize: '16px' }} />
                  </IconButton>

                  <Box sx={styles.quantityInput}>
                    <InputBase
                      value={quantities[potion.id]}
                      onChange={(e) => onQuantityInputChange(potion.id, e.target.value)}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        style: { textAlign: 'center' }
                      }}
                      sx={styles.quantityInputField}
                    />
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => adjustQuantity(potion.id, 1)}
                    sx={styles.quantityButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
              </Box>
            ))
          ) : (
            // Sell Tab
            POTIONS.map((potion) => {
              const potionName = potion.name.toUpperCase().replace(' POTION', '').replace(' TOKEN', '');
              const balance = tokenBalances[potionName] || 0;
              const quoteImpact = tokenQuotes[potion.id]?.quote?.price_impact ?? tokenQuotes[potion.id]?.quote?.impact;
              const quoteError = tokenQuotes[potion.id]?.error;
              const displayImpact = quoteImpact !== undefined ? -quoteImpact : undefined;
              return (
                <Box key={potion.id} sx={styles.potionCard}>
                  <Box sx={styles.potionImage}>
                    <img
                      src={potion.image}
                      alt={potion.name}
                      style={{ width: '48px', height: '48px' }}
                    />
                  </Box>

                  <Box sx={styles.potionInfo}>
                    <Typography sx={styles.potionName}>
                      {potion.name}
                    </Typography>
                    <Typography sx={styles.potionDescription}>
                      Balance: {formatAmount(balance)}
                    </Typography>
                    <Box sx={styles.potionPrice}>
                      <Typography sx={styles.priceText}>
                        {(() => {
                          const priceStr = optimisticPrices[potion.id] ?? tokenPrices[potion.id] ?? undefined;
                          if (priceStr) {
                            return `$${priceStr}`;
                          }
                          return 'No liquidity';
                        })()}
                      </Typography>
                      {(quoteImpact !== undefined || quoteError) && (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            bgcolor: quoteError ? '#f7b4b4' : getImpactColor(displayImpact ?? 0),
                            color: '#0d1511',
                          }}
                        >
                          {quoteError
                            ? 'insufficient liquidity'
                            : formatImpactLabel(displayImpact)}
                        </Box>
                      )}
                      {tokenQuotes[potion.id]?.quote && selectedReceiveTokenData && (
                        <Typography sx={styles.potionDescription}>
                          {/* Slippage already applied to displayed amount */}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={styles.quantityControls}>
                    <IconButton
                      size="small"
                      onClick={() => adjustSellQuantity(potion.id, -1)}
                      disabled={sellQuantities[potion.id] === 0}
                      sx={styles.quantityButton}
                    >
                      <RemoveIcon sx={{ fontSize: '16px' }} />
                    </IconButton>

                    <Box sx={styles.quantityInput}>
                      <InputBase
                        value={sellQuantities[potion.id]}
                        onChange={(e) => onSellQuantityInputChange(potion.id, e.target.value)}
                        inputProps={{
                          inputMode: 'numeric',
                          pattern: '[0-9]*',
                          style: { textAlign: 'center' }
                        }}
                        sx={styles.quantityInputField}
                      />
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => adjustSellQuantity(potion.id, 1)}
                      disabled={sellQuantities[potion.id] >= balance}
                      sx={styles.quantityButton}
                    >
                      <AddIcon sx={{ fontSize: '16px' }} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        <Box sx={styles.footer}>
          {activeTab === 0 ? (
            // Buy Tab Footer
            <>
              <Box sx={styles.summary}>
                <Box sx={styles.tokenSelector}>
                  <Typography sx={styles.totalLabel}>Pay with</Typography>
                  <Button
                    variant="outlined"
                    onClick={handleTokenClick}
                    fullWidth
                    sx={styles.mobileSelectButton}
                  >
                    <Box sx={{ fontSize: '0.6rem', color: 'white', pt: '2px', display: 'flex', alignItems: 'center' }}>
                      ▼
                    </Box>
                    <Box sx={styles.tokenRow}>
                      <Box sx={styles.tokenLeft}>
                        <Typography sx={styles.tokenName}>
                          {selectedTokenData ? selectedTokenData.symbol : 'Select token'}
                        </Typography>
                      </Box>
                      {selectedTokenData && (
                        <Typography sx={styles.tokenBalance}>
                          {selectedTokenData.balance}
                        </Typography>
                      )}
                    </Box>
                  </Button>

                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleTokenClose}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.5,
                          width: '200px',
                          maxHeight: '60vh',
                          overflowY: 'auto',
                          background: `${gameColors.darkGreen}`,
                          border: `1px solid ${gameColors.accentGreen}40`,
                          boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
                          zIndex: 9999,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: `${gameColors.darkGreen}40`,
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: `${gameColors.accentGreen}60`,
                            borderRadius: '4px',
                            '&:hover': {
                              background: `${gameColors.accentGreen}80`,
                            },
                          },
                        },
                      },
                    }}
                  >
                    {userTokens.map((token: any) => (
                      <MenuItem
                        key={token.symbol}
                        onClick={() => handleTokenSelect(token.symbol)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                          backgroundColor:
                            token.symbol === selectedToken
                              ? `${gameColors.accentGreen}20`
                              : 'transparent',
                          '&:hover': {
                            backgroundColor:
                              token.symbol === selectedToken
                                ? `${gameColors.accentGreen}30`
                                : `${gameColors.accentGreen}10`,
                          },
                        }}
                      >
                        <Box sx={styles.tokenRow}>
                          <Box sx={styles.tokenLeft}>
                            <Typography sx={styles.tokenName}>
                              {token.symbol}
                            </Typography>
                          </Box>
                          <Typography sx={styles.tokenBalance}>
                            {token.balance}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>

                <Box sx={styles.dividerVertical} />

                <Box sx={styles.totalInfo}>
                  <Typography sx={styles.totalLabel}>Total Cost</Typography>
                  {hasItems && selectedToken && (
                    <Box sx={[styles.totalValue, !canAfford && styles.totalInsufficient]}>
                      {totalTokenCost > 0
                        ? <Typography sx={styles.totalAmount}>
                          {totalTokenCost.toFixed(4)} {selectedToken}
                        </Typography>
                        : <Skeleton variant="text" width={100} height={18} />}
                    </Box>
                  )}
                </Box>
              </Box>

              <Button
                disabled={purchaseInProgress || !hasItems || !canAfford}
                onClick={handlePurchase}
                sx={[
                  styles.purchaseButton,
                  hasItems && canAfford && styles.purchaseButtonActive
                ]}
              >
                {purchaseInProgress ? (
                  <Box display={'flex'} alignItems={'baseline'} gap={1}>
                    <Typography sx={styles.purchaseButtonText}>PURCHASING</Typography>
                    <div className='dotLoader white' />
                  </Box>
                ) : !canAfford && hasItems ? (
                  <Typography sx={styles.purchaseButtonText}>INSUFFICIENT TOKENS</Typography>
                ) : !hasItems ? (
                  <Typography sx={styles.purchaseButtonText}>SELECT POTIONS</Typography>
                ) : (
                  <Typography sx={styles.purchaseButtonText}>BUY NOW</Typography>
                )}
              </Button>
            </>
          ) : (
            // Sell Tab Footer
            <>
              <Box sx={styles.summary}>
                <Box sx={styles.tokenSelector}>
                  <Typography sx={styles.totalLabel}>Receive</Typography>
                  <Button
                    variant="outlined"
                    onClick={handleReceiveTokenClick}
                    fullWidth
                    sx={styles.mobileSelectButton}
                  >
                    <Box sx={{ fontSize: '0.6rem', color: 'white', pt: '2px', display: 'flex', alignItems: 'center' }}>
                      ▼
                    </Box>
                    <Box sx={styles.tokenRow}>
                      <Box sx={styles.tokenLeft}>
                        <Typography sx={styles.tokenName}>
                          {selectedReceiveToken || 'Select token'}
                        </Typography>
                      </Box>
                    </Box>
                  </Button>

                  <Menu
                    anchorEl={receiveAnchorEl}
                    open={Boolean(receiveAnchorEl)}
                    onClose={handleReceiveTokenClose}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.5,
                          width: '200px',
                          maxHeight: '60vh',
                          overflowY: 'auto',
                          background: `${gameColors.darkGreen}`,
                          border: `1px solid ${gameColors.accentGreen}40`,
                          boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
                          zIndex: 9999,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: `${gameColors.darkGreen}40`,
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: `${gameColors.accentGreen}60`,
                            borderRadius: '4px',
                            '&:hover': {
                              background: `${gameColors.accentGreen}80`,
                            },
                          },
                        },
                      },
                    }}
                  >
                    {userTokens.map((token: any) => (
                      <MenuItem
                        key={token.symbol}
                        onClick={() => handleReceiveTokenSelect(token.symbol)}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                          backgroundColor:
                            token.symbol === selectedReceiveToken
                              ? `${gameColors.accentGreen}20`
                              : 'transparent',
                          '&:hover': {
                            backgroundColor:
                              token.symbol === selectedReceiveToken
                                ? `${gameColors.accentGreen}30`
                                : `${gameColors.accentGreen}10`,
                          },
                        }}
                      >
                        <Box sx={styles.tokenRow}>
                          <Box sx={styles.tokenLeft}>
                            <Typography sx={styles.tokenName}>
                              {token.symbol}
                            </Typography>
                          </Box>
                          <Typography sx={styles.tokenBalance}>
                            {token.balance}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>

                <Box sx={styles.dividerVertical} />

                <Box sx={styles.totalInfo}>
                  <Typography sx={styles.totalLabel}>You'll Receive</Typography>
                  {hasItems && selectedReceiveToken && (
                    <Box sx={styles.totalValue}>
                      {totalReceiveAmount > 0 ? <Typography sx={styles.totalAmount}>
                        {totalReceiveAmount.toFixed(4)} {selectedReceiveToken}
                      </Typography>
                        : <Skeleton variant="text" width={100} height={18} />}
                    </Box>
                  )}
                </Box>
              </Box>

              <Button
                disabled={sellInProgress || !hasItems}
                onClick={handleSell}
                sx={[
                  styles.purchaseButton,
                  hasItems && styles.purchaseButtonActive
                ]}
              >
                {sellInProgress ? (
                  <Box display={'flex'} alignItems={'baseline'} gap={1}>
                    <Typography sx={styles.purchaseButtonText}>SELLING</Typography>
                    <div className='dotLoader white' />
                  </Box>
                ) : !hasItems ? (
                  <Typography sx={styles.purchaseButtonText}>SELECT ITEMS TO SELL</Typography>
                ) : (
                  <Typography sx={styles.purchaseButtonText}>SELL NOW</Typography>
                )}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: '#999',
    zIndex: 10,
    '&:hover': {
      color: gameColors.red,
      background: 'rgba(255, 0, 0, 0.1)',
    },
  },
  headerRefreshButton: {
    position: 'absolute',
    top: '8px',
    right: '44px',
    color: gameColors.accentGreen,
    '&:hover': {
      color: gameColors.yellow,
      backgroundColor: `${gameColors.accentGreen}20`,
    },
  },
  header: {
    p: 2,
    pb: 1.5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
  },
  headerIcon: {
    fontSize: '32px',
    color: gameColors.yellow,
  },
  title: {
    fontSize: '24px',
    lineHeight: '24px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '1.5px',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  tabs: {
    minHeight: '32px',
    '& .MuiTabs-indicator': {
      backgroundColor: gameColors.yellow,
      height: '3px',
    },
  },
  tab: {
    minHeight: '32px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#999',
    '&.Mui-selected': {
      color: gameColors.yellow,
    },
    '& .MuiTab-iconWrapper': {
      mr: 0.5,
    },
  },
  divider: {
    width: '100%',
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${gameColors.yellow}, transparent)`,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    p: { xs: 1.5, sm: 2 },
    pt: 1,
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    minHeight: 0,
    '&::-webkit-scrollbar': {
      width: { xs: 0, sm: '8px' },
    },
    '&::-webkit-scrollbar-track': {
      background: `${gameColors.darkGreen}40`,
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: `${gameColors.accentGreen}60`,
      borderRadius: '4px',
      '&:hover': {
        background: `${gameColors.accentGreen}80`,
      },
    },
  },
  potionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    p: 1.5,
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      background: `${gameColors.darkGreen}60`,
      borderColor: `${gameColors.accentGreen}50`,
    },
  },
  potionImage: {
    width: '60px',
    height: '60px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  potionInfo: {
    flex: 1,
    minWidth: 0,
  },
  potionName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '0.5px',
    mb: 0.25,
  },
  potionDescription: {
    fontSize: '12px',
    color: '#bbb',
    mb: 0.5,
  },
  potionBalance: {
    fontSize: '12px',
    color: gameColors.yellow,
    mb: 0.5,
    fontWeight: 'bold',
  },
  potionPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  priceText: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  refreshButton: {
    color: gameColors.accentGreen,
    '&:hover': {
      color: gameColors.yellow,
      backgroundColor: `${gameColors.accentGreen}20`,
    },
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  quantityButton: {
    width: { xs: '44px', sm: '32px', md: '28px' },
    height: { xs: '44px', sm: '32px', md: '28px' },
    minWidth: { xs: '44px', sm: '32px', md: '28px' },
    background: `${gameColors.mediumGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    color: '#fff',
    '& svg': {
      fontSize: { xs: '20px', sm: '16px' },
    },
    '&:hover': {
      background: gameColors.mediumGreen,
      borderColor: gameColors.accentGreen,
    },
    '&:disabled': {
      opacity: 0.3,
      cursor: 'not-allowed',
    },
  },
  quantityInput: {
    width: '48px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
  },
  quantityInputField: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'center',
    px: 0.5,
    '& input': {
      textAlign: 'center',
      padding: 0,
    }
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    p: 2,
    pt: 1,
    borderTop: `2px solid ${gameColors.accentGreen}30`,
    background: `linear-gradient(0deg, ${gameColors.darkGreen}40, transparent)`,
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    py: 0.5,
    gap: 2,
  },
  tokenSelector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    flex: 1,
  },
  selectorLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  mobileSelectButton: {
    width: '220px',
    height: '36px',
    textTransform: 'none',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    color: 'inherit',
    '&:hover': {
      borderColor: `${gameColors.accentGreen}60`,
      background: `${gameColors.darkGreen}90`,
    },
  },
  tokenRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginLeft: '10px',
  },
  tokenLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  tokenName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  tokenBalance: {
    fontSize: '11px',
    color: '#FFD700',
    opacity: 0.7,
  },
  dividerVertical: {
    width: '1px',
    height: '40px',
    background: `${gameColors.accentGreen}40`,
  },
  totalInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    flex: 1,
  },
  totalLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  totalValue: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    px: 1.5,
    py: 0.5,
    transition: 'all 0.2s',
  },
  totalInsufficient: {
    border: `1px solid ${gameColors.red}`,
    boxShadow: `0 0 8px ${gameColors.red}50`,
  },
  totalAmount: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  totalUSD: {
    height: '26px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalUSDAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  itemCount: {
    fontSize: '11px',
    color: '#bbb',
    mt: -0.25,
  },
  purchaseButton: {
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    height: '48px',
    border: `2px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.3s ease',
    opacity: 0.7,
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  purchaseButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    opacity: 1,
    boxShadow: `
      0 0 12px ${gameColors.brightGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 16px ${gameColors.brightGreen}60,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
      transform: 'translateY(-1px)',
    },
  },
  purchaseButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
};
