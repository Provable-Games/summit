import ROUTER_ABI from '@/abi/router-abi.json';
import type { SwapQuote } from '@/api/ekubo';
import { generateSwapCalls, getSwapQuote } from '@/api/ekubo';
import attackPotionImg from '@/assets/images/attack-potion.png';
import corpseTokenImg from '@/assets/images/corpse-token.png';
import killTokenImg from '@/assets/images/skull-token.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import poisonPotionImg from '@/assets/images/poison-potion.png';
import revivePotionImg from '@/assets/images/revive-potion.png';
import starkImg from '@/assets/images/stark.svg';
import { useController } from '@/contexts/controller';
import { useDynamicConnector } from '@/contexts/starknet';
import { useSystemCalls } from '@/dojo/useSystemCalls';
import { NETWORKS, TOKEN_ADDRESS } from '@/utils/networkConfig';
import { gameColors } from '@/utils/themes';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CloseIcon from '@mui/icons-material/Close';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Box, Button, CircularProgress, Dialog, IconButton, InputBase, Menu, MenuItem, Typography } from '@mui/material';
import { useAccount, useProvider } from '@starknet-react/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Contract } from 'starknet';

interface TopUpStrkModalProps {
  open: boolean;
  close: () => void;
}

interface SourceToken {
  name: string;
  address: string;
  image: any;
}

const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const SLIPPAGE_BPS = 100; // 1%

const SOURCE_TOKENS: SourceToken[] = [
  { name: 'ATTACK', address: TOKEN_ADDRESS.ATTACK, image: attackPotionImg },
  { name: 'REVIVE', address: TOKEN_ADDRESS.REVIVE, image: revivePotionImg },
  { name: 'EXTRA LIFE', address: TOKEN_ADDRESS.EXTRA_LIFE, image: lifePotionImg },
  { name: 'POISON', address: TOKEN_ADDRESS.POISON, image: poisonPotionImg },
  { name: 'SKULL', address: TOKEN_ADDRESS.SKULL, image: killTokenImg },
  { name: 'CORPSE', address: TOKEN_ADDRESS.CORPSE, image: corpseTokenImg },
];

export default function TopUpStrkModal({ open, close }: TopUpStrkModalProps) {
  const { currentNetworkConfig: _currentNetworkConfig } = useDynamicConnector();
  const { tokenBalances, setTokenBalances, fetchPaymentTokenBalances } = useController();
  const { provider } = useProvider();
  const { address: _accountAddress } = useAccount();
  const { executeAction } = useSystemCalls();

  const [selectedToken, setSelectedToken] = useState<string>('ATTACK');
  const [amount, setAmount] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [swapInProgress, setSwapInProgress] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string>('');
  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add TEST USD from paymentTokens
  const testUsdToken = useMemo(() => {
    const network = NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS];
    const testUsd = (network as any)?.paymentTokens?.find((t: any) => t.name === 'TEST USD');
    if (testUsd) {
      return { name: 'TEST USD', address: testUsd.address, image: null };
    }
    return null;
  }, []);

  const allSourceTokens = useMemo(() => {
    return testUsdToken ? [...SOURCE_TOKENS, testUsdToken] : SOURCE_TOKENS;
  }, [testUsdToken]);

  const routerContract = useMemo(
    () =>
      new Contract({
        abi: ROUTER_ABI,
        address: NETWORKS[import.meta.env.VITE_PUBLIC_CHAIN as keyof typeof NETWORKS].ekuboRouter,
        providerOrAccount: provider,
      }),
    [provider]
  );

  const selectedTokenData = allSourceTokens.find(t => t.name === selectedToken);
  const balance = tokenBalances[selectedToken] || 0;
  const numericAmount = parseFloat(amount) || 0;
  const hasInsufficientBalance = numericAmount > balance;
  const estimatedStrk = quote ? Math.abs(quote.total) / 1e18 : 0;

  useEffect(() => {
    if (open) {
      fetchPaymentTokenBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchQuote = useCallback(async (tokenName: string, qty: number) => {
    if (qty <= 0) {
      setQuote(null);
      setQuoteError('');
      return;
    }

    const tokenData = allSourceTokens.find(t => t.name === tokenName);
    if (!tokenData) return;

    setQuoteLoading(true);
    setQuoteError('');

    try {
      const amountInWei = BigInt(Math.floor(qty)) * 10n ** 18n;
      const result = await getSwapQuote(amountInWei, tokenData.address, STRK_ADDRESS);
      if (result && result.total !== 0) {
        setQuote(result);
      } else {
        setQuote(null);
        setQuoteError('No route found');
      }
    } catch (err: any) {
      console.error('Quote error:', err);
      setQuote(null);
      setQuoteError(err.message || 'Failed to get quote');
    } finally {
      setQuoteLoading(false);
    }
  }, [allSourceTokens]);

  // Debounced quote fetching
  useEffect(() => {
    if (quoteTimerRef.current) {
      clearTimeout(quoteTimerRef.current);
    }

    const qty = parseFloat(amount) || 0;
    if (qty <= 0) {
      setQuote(null);
      setQuoteError('');
      return;
    }

    quoteTimerRef.current = setTimeout(() => {
      fetchQuote(selectedToken, qty);
    }, 500);

    return () => {
      if (quoteTimerRef.current) {
        clearTimeout(quoteTimerRef.current);
      }
    };
  }, [amount, selectedToken, fetchQuote]);

  const handleSwap = async () => {
    if (!selectedTokenData || numericAmount <= 0 || !quote || hasInsufficientBalance) return;
    setSwapInProgress(true);

    try {
      const amountInWei = BigInt(Math.floor(numericAmount)) * 10n ** 18n;

      // Re-fetch quote for freshness
      const freshQuote = await getSwapQuote(amountInWei, selectedTokenData.address, STRK_ADDRESS);

      if (!freshQuote || freshQuote.total === 0) {
        setQuoteError('No route found');
        return;
      }

      const swapCalls = generateSwapCalls(
        routerContract,
        selectedTokenData.address,
        {
          tokenAddress: STRK_ADDRESS,
          minimumAmount: numericAmount,
          quote: freshQuote,
        },
        SLIPPAGE_BPS
      );

      if (swapCalls.length > 0) {
        const result = await executeAction(swapCalls, () => { });

        if (result) {
          // Optimistic balance update using functional update to avoid stale closure
          setTokenBalances((prev: Record<string, number>) => {
            const updated = { ...prev };
            updated[selectedToken] = Math.max(0, (updated[selectedToken] || 0) - numericAmount);
            updated['STRK'] = (updated['STRK'] || 0) + estimatedStrk;
            return updated;
          });
          close();
        }
      }
    } catch (error) {
      console.error('Error swapping to STRK:', error);
    } finally {
      setSwapInProgress(false);
    }
  };

  const handleMaxClick = () => {
    if (balance > 0) {
      setAmount(Math.floor(balance).toString());
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  const getTokenIcon = (token: SourceToken) => {
    if (token.image) {
      return <img src={token.image} alt={token.name} style={{ width: '20px', height: '20px' }} />;
    }
    return <AttachMoneyIcon sx={{ fontSize: '20px', color: gameColors.yellow }} />;
  };

  const getButtonText = () => {
    if (swapInProgress) return 'SWAPPING...';
    if (hasInsufficientBalance) return 'INSUFFICIENT BALANCE';
    if (numericAmount <= 0) return 'ENTER AMOUNT';
    if (quoteLoading) return 'FETCHING QUOTE...';
    if (!quote) return 'SWAP TO STRK';
    return 'SWAP TO STRK';
  };

  const canSwap = !swapInProgress && !hasInsufficientBalance && numericAmount > 0 && quote && !quoteLoading;

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth={false}
      PaperProps={{
        sx: styles.dialog,
      }}
    >
      {/* Header */}
      <Box sx={styles.header}>
        <Box sx={styles.headerLeft}>
          <Box component="img" src={starkImg} alt="STRK" sx={{ width: '20px', height: '20px' }} />
          <Typography sx={styles.headerTitle}>TOP UP STRK</Typography>
        </Box>
        <IconButton size="small" onClick={close} sx={styles.closeButton}>
          <CloseIcon sx={{ fontSize: '18px' }} />
        </IconButton>
      </Box>

      {/* Source token selector */}
      <Box sx={styles.section}>
        <Typography sx={styles.sectionLabel}>SELL</Typography>
        <Box sx={styles.tokenRow}>
          <Button
            sx={styles.tokenSelector}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {selectedTokenData && getTokenIcon(selectedTokenData)}
            <Typography sx={styles.tokenName}>{selectedToken}</Typography>
            <Typography sx={styles.dropdownArrow}>▼</Typography>
          </Button>
          <Box sx={styles.balanceText}>
            Balance: {Math.floor(balance).toLocaleString()}
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: styles.menu }}
        >
          {allSourceTokens.map((token) => (
            <MenuItem
              key={token.name}
              onClick={() => {
                setSelectedToken(token.name);
                setAnchorEl(null);
                setQuote(null);
              }}
              sx={styles.menuItem}
            >
              {getTokenIcon(token)}
              <Typography sx={styles.menuTokenName}>{token.name}</Typography>
              <Typography sx={styles.menuBalance}>
                {Math.floor(tokenBalances[token.name] || 0).toLocaleString()}
              </Typography>
            </MenuItem>
          ))}
        </Menu>

        {/* Amount input */}
        <Box sx={styles.amountRow}>
          <InputBase
            value={amount}
            onChange={handleAmountChange}
            placeholder="0"
            sx={styles.amountInput}
            inputProps={{ inputMode: 'decimal' }}
          />
          <Button
            size="small"
            onClick={handleMaxClick}
            sx={styles.maxButton}
          >
            MAX
          </Button>
        </Box>
      </Box>

      {/* Arrow divider */}
      <Box sx={styles.arrowDivider}>
        <SwapVertIcon sx={{ fontSize: '20px', color: gameColors.brightGreen }} />
      </Box>

      {/* Receive section */}
      <Box sx={styles.section}>
        <Typography sx={styles.sectionLabel}>RECEIVE</Typography>
        <Box sx={styles.receiveRow}>
          <Box sx={styles.receiveToken}>
            <Box component="img" src={starkImg} alt="STRK" sx={{ width: '20px', height: '20px' }} />
            <Typography sx={styles.tokenName}>STRK</Typography>
          </Box>
          <Box sx={styles.quoteDisplay}>
            {quoteLoading ? (
              <CircularProgress size={16} sx={{ color: gameColors.brightGreen }} />
            ) : quote ? (
              <Typography sx={styles.quoteValue}>
                ~{estimatedStrk.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </Typography>
            ) : quoteError ? (
              <Typography sx={styles.quoteError}>{quoteError}</Typography>
            ) : (
              <Typography sx={styles.quotePlaceholder}>—</Typography>
            )}
          </Box>
        </Box>
        {quote && quote.price_impact !== undefined && (
          <Typography sx={[styles.impactText, Math.abs(quote.price_impact) >= 0.1 && { color: '#ff9800' }]}>
            Price impact: {(Math.abs(quote.price_impact) * 100).toFixed(1)}%
          </Typography>
        )}
      </Box>

      {/* Swap button */}
      <Button
        fullWidth
        onClick={handleSwap}
        disabled={!canSwap}
        sx={styles.swapButton}
      >
        <Typography sx={styles.swapButtonText}>
          {getButtonText()}
        </Typography>
      </Button>
    </Dialog>
  );
}

const styles = {
  dialog: {
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, #0a1f0a 100%)`,
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '12px',
    width: '360px',
    maxWidth: '95vw',
    p: 2,
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px ${gameColors.brightGreen}20`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '1px',
  },
  closeButton: {
    color: '#ffedbb',
    opacity: 0.7,
    '&:hover': { opacity: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  },
  section: {
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '8px',
    p: 1.5,
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.gameYellow,
    letterSpacing: '0.5px',
    mb: 0.5,
  },
  tokenRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 1,
  },
  tokenSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.mediumGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    px: 1,
    py: 0.5,
    textTransform: 'none',
    '&:hover': {
      background: `${gameColors.mediumGreen}`,
      border: `1px solid ${gameColors.brightGreen}`,
    },
  },
  tokenName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#ffedbb',
  },
  dropdownArrow: {
    fontSize: '10px',
    color: '#ffedbb',
    opacity: 0.6,
    ml: 0.5,
  },
  balanceText: {
    fontSize: '11px',
    color: '#bbb',
  },
  menu: {
    background: gameColors.darkGreen,
    border: `1px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    '&:hover': { background: `${gameColors.mediumGreen}40` },
  },
  menuTokenName: {
    fontSize: '13px',
    color: '#ffedbb',
    flex: 1,
  },
  menuBalance: {
    fontSize: '12px',
    color: '#bbb',
  },
  amountRow: {
    display: 'flex',
    alignItems: 'center',
    background: `${gameColors.mediumGreen}40`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}20`,
    px: 1,
  },
  amountInput: {
    flex: 1,
    '& input': {
      color: '#FFD700',
      fontSize: '18px',
      fontWeight: 'bold',
      padding: '8px 0',
    },
    '& input::placeholder': {
      color: '#FFD70040',
    },
  },
  maxButton: {
    color: gameColors.brightGreen,
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: 'auto',
    px: 1,
    '&:hover': { background: `${gameColors.mediumGreen}40` },
  },
  arrowDivider: {
    display: 'flex',
    justifyContent: 'center',
    my: 0.5,
  },
  receiveRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiveToken: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  quoteDisplay: {
    display: 'flex',
    alignItems: 'center',
  },
  quoteValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  quoteError: {
    fontSize: '12px',
    color: '#ff6b6b',
  },
  quotePlaceholder: {
    fontSize: '16px',
    color: '#ffedbb40',
  },
  impactText: {
    fontSize: '11px',
    color: '#bbb',
    mt: 0.5,
    textAlign: 'right' as const,
  },
  swapButton: {
    mt: 2,
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '8px',
    height: '44px',
    border: `2px solid ${gameColors.brightGreen}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `0 0 20px ${gameColors.brightGreen}40`,
    },
    '&.Mui-disabled': {
      background: `${gameColors.mediumGreen}60`,
      border: `2px solid ${gameColors.accentGreen}30`,
    },
  },
  swapButtonText: {
    color: '#ffedbb',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
};
