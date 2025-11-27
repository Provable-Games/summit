import ROUTER_ABI from '@/abi/router-abi.json';
import { generateSwapCalls, getSwapQuote } from '@/api/ekubo';
import attackPotionImg from '@/assets/images/attack-potion.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import poisonPotionImg from '@/assets/images/poison-potion.png';
import revivePotionImg from '@/assets/images/revive-potion.png';
import killTokenImg from '@/assets/images/kill-token.png';
import corpseTokenImg from '@/assets/images/corpse-token.png';
import { useController } from '@/contexts/controller';
import { NETWORKS } from '@/utils/networkConfig';
import { gameColors } from '@/utils/themes';
import { formatAmount } from '@/utils/utils';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Box, Button, Dialog, IconButton, InputBase, Menu, MenuItem, Tab, Tabs, Typography } from '@mui/material';
import { useProvider } from '@starknet-react/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'starknet';

interface PotionShopModalProps {
  open: boolean;
  close: () => void;
}

interface Potion {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  color: string;
}

const POTIONS: Potion[] = [
  {
    id: 'attack',
    name: 'Attack Potion',
    image: attackPotionImg,
    price: 0.10, // USD price
    description: 'Increase attack power',
    color: '#ff6b6b'
  },
  {
    id: 'health',
    name: 'Extra Life',
    image: lifePotionImg,
    price: 0.15, // USD price
    description: 'Grants an extra life when holding the summit',
    color: '#ff4757'
  },
  {
    id: 'poison',
    name: 'Poison Potion',
    image: poisonPotionImg,
    price: 0.20, // USD price
    description: 'Poison the beast on the summit',
    color: '#a29bfe'
  },
  {
    id: 'revive',
    name: 'Revive Potion',
    image: revivePotionImg,
    price: 0.25, // USD price
    description: 'Instantly revives fallen beasts',
    color: '#00d2d3'
  },
  {
    id: 'kill',
    name: 'Kill Token',
    image: killTokenImg,
    price: 0.30, // USD price
    description: 'Claim kills for rewards',
    color: '#e74c3c'
  },
  {
    id: 'corpse',
    name: 'Corpse Token',
    image: corpseTokenImg,
    price: 0.35, // USD price
    description: 'Collect corpses for benefits',
    color: '#95a5a6'
  }
];

// Dummy potion contract addresses (replace with actual addresses)
const POTION_ADDRESSES = {
  attack: '0x123...', // Replace with actual attack potion contract
  health: '0x456...', // Replace with actual health potion contract  
  poison: '0x789...', // Replace with actual poison potion contract
  revive: '0xabc...', // Replace with actual revive potion contract
  kill: '0x02beaf101300efd433877bf358005d29c32e048e314529ac1fdbe4ac024c17cd', // Kill token contract
  corpse: '0x0195685bd2bce86e4ebe4ea5ef44d9dc00c4e7c6e362d428abdb618b4739c25c', // Corpse token contract
};

export default function PotionShopModal(props: PotionShopModalProps) {
  const { open, close } = props;
  const { tokenBalances, executePotionPurchase } = useController();
  const { provider } = useProvider();
  const [activeTab, setActiveTab] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({
    attack: 0,
    health: 0,
    poison: 0,
    revive: 0,
    kill: 0,
    corpse: 0
  });
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({
    attack: 0,
    health: 0,
    poison: 0,
    revive: 0,
    kill: 0,
    corpse: 0
  });
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedReceiveToken, setSelectedReceiveToken] = useState<string>('');
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [sellInProgress, setSellInProgress] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [receiveAnchorEl, setReceiveAnchorEl] = useState<null | HTMLElement>(null);
  const [tokenQuotes, setTokenQuotes] = useState<Record<string, { amount: string; loading: boolean; error?: string }>>({
    attack: { amount: '', loading: false },
    health: { amount: '', loading: false },
    poison: { amount: '', loading: false },
    revive: { amount: '', loading: false },
    kill: { amount: '', loading: false },
    corpse: { amount: '', loading: false }
  });
  const [sellQuotes, setSellQuotes] = useState<Record<string, { amount: string; loading: boolean; error?: string }>>({
    attack: { amount: '', loading: false },
    health: { amount: '', loading: false },
    poison: { amount: '', loading: false },
    revive: { amount: '', loading: false },
    kill: { amount: '', loading: false },
    corpse: { amount: '', loading: false }
  });

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

  // Get payment tokens from network config
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
      .filter((token: any) =>
        token.symbol !== 'SURVIVOR' &&
        token.symbol !== 'DUNGEON_TICKET'
      );
  }, [paymentTokens, tokenBalances]);

  const selectedTokenData = userTokens.find(
    (t: any) => t.symbol === selectedToken
  );

  useEffect(() => {
    if (open) {
      setQuantities({
        attack: 0,
        health: 0,
        poison: 0,
        revive: 0,
        kill: 0,
        corpse: 0
      });
      setSellQuantities({
        attack: 0,
        health: 0,
        poison: 0,
        revive: 0,
        kill: 0,
        corpse: 0
      });
      // Set default tokens
      if (userTokens.length > 0) {
        if (!selectedToken) {
          setSelectedToken(userTokens[0].symbol);
        }
        if (!selectedReceiveToken) {
          setSelectedReceiveToken(userTokens[0].symbol);
        }
      }
    }
  }, [open, userTokens]);

  const totalCostUSD = POTIONS.reduce((sum, potion) => {
    return sum + (potion.price * quantities[potion.id]);
  }, 0);

  const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const hasItems = totalItems > 0;

  // Calculate total cost based on token quotes
  const totalTokenCost = useMemo(() => {
    let total = 0;
    POTIONS.forEach(potion => {
      const quantity = quantities[potion.id];
      if (quantity > 0 && tokenQuotes[potion.id].amount) {
        total += Number(tokenQuotes[potion.id].amount) * quantity;
      }
    });
    return total;
  }, [quantities, tokenQuotes]);

  const canAfford = selectedTokenData && totalTokenCost <= Number(selectedTokenData.rawBalance);

  const fetchPotionQuote = useCallback(
    async (potionId: string, tokenSymbol: string) => {
      const selectedTokenData = userTokens.find(
        (t: any) => t.symbol === tokenSymbol
      );

      if (!selectedTokenData?.address || !POTION_ADDRESSES[potionId as keyof typeof POTION_ADDRESSES]) {
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
        // For demo purposes, using dummy values. In reality, get quote for 1 potion
        const quote = await getSwapQuote(
          -1e18, // 1 potion
          POTION_ADDRESSES[potionId as keyof typeof POTION_ADDRESSES],
          selectedTokenData.address
        );

        if (quote) {
          const rawAmount = (quote.total * -1) / Math.pow(10, selectedTokenData.decimals || 18);
          if (rawAmount === 0) {
            setTokenQuotes(prev => ({
              ...prev,
              [potionId]: { amount: '', loading: false, error: 'No liquidity' }
            }));
          } else {
            const amount = formatAmount(rawAmount);
            setTokenQuotes(prev => ({
              ...prev,
              [potionId]: { amount, loading: false }
            }));
          }
        } else {
          setTokenQuotes(prev => ({
            ...prev,
            [potionId]: { amount: '', loading: false, error: 'No quote available' }
          }));
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        setTokenQuotes(prev => ({
          ...prev,
          [potionId]: { amount: '', loading: false, error: 'Failed to get quote' }
        }));
      }
    },
    [userTokens]
  );

  const adjustQuantity = (potionId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [potionId]: Math.max(0, Math.min(99, prev[potionId] + delta))
    }));
  };

  const onQuantityInputChange = (potionId: string, value: string) => {
    const raw = value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    setQuantities(prev => ({
      ...prev,
      [potionId]: Math.max(0, Math.min(99, isNaN(num) ? 0 : num))
    }));
  };

  const handleTokenClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTokenClose = () => {
    setAnchorEl(null);
  };

  const handleTokenSelect = (tokenSymbol: string) => {
    setSelectedToken(tokenSymbol);
    handleTokenClose();
    // Fetch quotes for all potions with new token
    POTIONS.forEach(potion => {
      fetchPotionQuote(potion.id, tokenSymbol);
    });
  };

  const handlePurchase = async () => {
    if (!canAfford || !hasItems || !selectedTokenData) return;
    setPurchaseInProgress(true);

    try {
      const calls: any[] = [];

      // Generate swap calls for each potion type
      for (const potion of POTIONS) {
        const quantity = quantities[potion.id];
        if (quantity > 0 && tokenQuotes[potion.id].amount) {
          const quote = await getSwapQuote(
            -quantity * 1e18, // quantity of potions
            POTION_ADDRESSES[potion.id as keyof typeof POTION_ADDRESSES],
            selectedTokenData.address
          );

          if (quote) {
            const swapCalls = generateSwapCalls(
              routerContract,
              selectedTokenData.address,
              {
                tokenAddress: POTION_ADDRESSES[potion.id as keyof typeof POTION_ADDRESSES],
                minimumAmount: quantity,
                quote: quote
              }
            );
            calls.push(...swapCalls);
          }
        }
      }

      if (calls.length > 0) {
        // Execute multicall for all potion purchases
        await executePotionPurchase(calls, quantities);
        close();
      }
    } catch (error) {
      console.error('Error purchasing potions:', error);
    } finally {
      setPurchaseInProgress(false);
    }
  };

  // Fetch quotes when selected token changes
  useEffect(() => {
    if (selectedToken) {
      POTIONS.forEach(potion => {
        fetchPotionQuote(potion.id, selectedToken);
      });
    }
  }, [selectedToken, fetchPotionQuote]);

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
            width: '600px',
            maxWidth: '95vw',
            position: 'relative',
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

        <Box sx={styles.header}>
          <StorefrontIcon sx={styles.headerIcon} />
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
                    <Typography sx={styles.priceText}>
                      {tokenQuotes[potion.id].loading
                        ? 'Loading...'
                        : tokenQuotes[potion.id].error
                          ? tokenQuotes[potion.id].error
                          : tokenQuotes[potion.id].amount
                            ? `${tokenQuotes[potion.id].amount} ${selectedToken}`
                            : `$${potion.price.toFixed(2)}`}
                    </Typography>
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
                    disabled={quantities[potion.id] >= 99}
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
              const balance = tokenBalances[potion.name.toUpperCase()] || 0;
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
                    <Typography sx={styles.potionName}>{potion.name}</Typography>
                    <Typography sx={styles.potionBalance}>
                      Balance: {formatAmount(balance)}
                    </Typography>
                    <Box sx={styles.potionPrice}>
                      <Typography sx={styles.priceText}>
                        {sellQuotes[potion.id].loading
                          ? 'Loading...'
                          : sellQuotes[potion.id].error
                            ? sellQuotes[potion.id].error
                            : sellQuotes[potion.id].amount
                              ? `${sellQuotes[potion.id].amount} ${selectedReceiveToken}`
                              : 'Select amount'}
                      </Typography>
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
          <Box sx={styles.summary}>
            <Box sx={styles.tokenSelector}>
              <Typography sx={styles.totalLabel}>Pay with</Typography>
              <Button
                variant="outlined"
                onClick={handleTokenClick}
                fullWidth
                sx={styles.mobileSelectButton}
              >
                <Box sx={{ fontSize: '0.6rem', color: 'white', pt: 0.5, display: 'flex', alignItems: 'center' }}>
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
                      maxHeight: 300,
                      background: `${gameColors.darkGreen}`,
                      border: `1px solid ${gameColors.accentGreen}40`,
                      boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
                      zIndex: 9999,
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
              <Box sx={styles.totalUSD}>
                <Typography sx={styles.totalUSDAmount}>${totalCostUSD.toFixed(2)}</Typography>
              </Box>
              {hasItems && selectedToken && (
                <Box sx={[styles.totalValue, !canAfford && styles.totalInsufficient]}>
                  <Typography sx={styles.totalAmount}>
                    {totalTokenCost.toFixed(4)} {selectedToken}
                  </Typography>
                </Box>
              )}
              {hasItems && (
                <Typography sx={styles.itemCount}>
                  {totalItems} item{totalItems > 1 ? 's' : ''}
                </Typography>
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
        </Box>
      </Box>
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
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
  divider: {
    width: '100%',
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${gameColors.yellow}, transparent)`,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    p: 2,
    pt: 1,
    maxHeight: 'calc(70vh - 200px)',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '8px',
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
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  quantityButton: {
    width: '28px',
    height: '28px',
    minWidth: '28px',
    background: `${gameColors.mediumGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    color: '#fff',
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
    gap: 2,
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