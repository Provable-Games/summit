import * as torii from "@dojoengine/torii-client";
import { useAccount } from "@starknet-react/core";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dojoConfig } from "../../dojoConfig";
import { getSwapQuote } from "../api/ekubo";
import { fetchAdventurerData, fetchBeastLiveData, fetchDeadBeastCount, fetchSummitBeastTokenId, fetchSummitHistory, queryLeaderboard } from "../api/indexer";
import { getAdventurers, getBeastDetails, getBeastHolders, getBeasts, getERC20Balances, getTotalBeasts } from "../api/starknet";
import { calculateBattleResult } from "../helpers/beasts";
import { DojoContext } from "./dojoContext";

export const GameContext = createContext()

const EMPTY_SUMMIT = { id: 0, level: 1, current_health: 0, health: 0, tier: 1 }

export const GameProvider = ({ children }) => {
  const dojo = useContext(DojoContext)

  const [toriiClient, setToriiClient] = useState(null);
  const [summit, setSummit] = useState({ ...EMPTY_SUMMIT, loading: true })
  const [leaderboard, setLeaderboard] = useState([])
  const [showFeedingGround, setShowFeedingGround] = useState(false)

  const [attackInProgress, setAttackInProgress] = useState(false)

  const [adventurerCollection, setAdventurerCollection] = useState([])
  const [loadingAdventurers, setLoadingAdventurers] = useState(false)
  const [feedingInProgress, setFeedingInProgress] = useState(false)

  const [deadBeastCount, setDeadBeastCount] = useState(0)
  const [totalSupply, setTotalSupply] = useState(0)

  const [ownedBeasts, setOwnedBeasts] = useState([])
  const [liveBeastStats, setLiveBeastStats] = useState(null)
  const [userRanks, setUserRanks] = useState({ beastRank: undefined, adventurerRank: undefined })

  const [collection, setCollection] = useState([])
  const [loadingCollection, setLoadingCollection] = useState(false)

  const [selected, setSelected] = useState([])
  const [adventurersSelected, setAdventurersSelected] = useState([])

  const [selectedItem, setSelectedItem] = useState()

  const [totalDamage, setTotalDamage] = useState(0)

  const [attackAnimations, setAttackAnimations] = useState([])
  const [summitAnimations, setSummitAnimations] = useState([])
  const [feedAnimations, setFeedAnimations] = useState([])

  const [totalReward, setTotalReward] = useState(100)

  const [walletBalances, setWalletBalances] = useState({
    revivePotions: 0,
    attackPotions: 0,
    extraLifePotions: 0,
    savage: 0
  })

  const [potionPrices, setPotionPrices] = useState({
    revive: 0,
    attack: 0,
    extraLife: 0
  })

  const { address } = useAccount()

  const resetState = () => {
    setShowFeedingGround(false)
    setOwnedBeasts([])
    setCollection([])
    setLiveBeastStats(null)
    setSelected([])
    setAdventurersSelected([])
    setTotalDamage(0)
    setAdventurerCollection([])
  }

  const syncGameData = async () => {
    fetchLeaderboard()
    // fetchPotionPrices()
    setTotalSupply(await getTotalBeasts() ?? 0)
    setDeadBeastCount(await fetchDeadBeastCount() ?? 0)

    let summitBeastId = await fetchSummitBeastTokenId()

    updateSummit(summitBeastId);
  }

  const updateSummit = async (summitBeastId, animate) => {
    let summitBeast = null

    if (!summitBeastId) {
      summitBeast = { ...EMPTY_SUMMIT }
    } else {
      let summitBeastDetails = await getBeastDetails(summitBeastId)
      let summitLiveStats = (await fetchBeastLiveData([summitBeastId]))[0]
      let summitHistory = await fetchSummitHistory(summitBeastId)

      let takenAt = parseInt((summitHistory?.taken_at || 0), 16);
      summitBeast = { ...summitBeastDetails, ...summitLiveStats, current_health: summitLiveStats?.current_health || summitBeastDetails.health, takenAt }
    }

    if (ownedBeasts.some(beast => beast.id === summit.id)) {
      setCollection(prev => prev.map(beast => ({
        ...beast,
        current_health: beast.id === summit.id ? 0 : beast.current_health,
        extra_lives: beast.id === summit.id ? 0 : beast.extra_lives
      })))
    }

    if (animate) {
      setSummitAnimations(prev => [...prev, { type: 'capture', beast: summitBeast }])
    } else {
      setSummit(summitBeast)
    }
  }

  const setupToriiClient = async () => {
    const client = await torii.createClient({
      rpcUrl: dojoConfig.rpcUrl,
      toriiUrl: dojoConfig.toriiUrl,
      relayUrl: "",
      worldAddress: dojoConfig.manifest.world.address || "",
    });

    setToriiClient(client);
  };

  const setBeastCollection = () => {
    let beasts = [...ownedBeasts].map((beast) => {
      let liveStat = liveBeastStats?.find(s => s.id === beast.id) ?? {}

      beast.originalHealth = beast.health
      beast.health += liveStat?.bonus_health ?? 0

      if (liveStat.isDead) {
        liveStat.current_health = 0
      } else {
        liveStat.current_health = liveStat?.current_health > 0 ? liveStat?.current_health : beast.health
      }

      beast.originalLevel = beast.level
      beast.current_health = liveStat.current_health

      let totalXp = Math.pow(beast.level, 2) + (liveStat?.bonus_xp || 0)
      beast.level = Math.floor(Math.sqrt(totalXp))
      beast.totalXp = totalXp

      return {
        ...beast,
        ...calculateBattleResult(beast, summit, liveStat?.attack_potions || 0),
        ...liveStat
      }
    }).sort((a, b) => {
      if (a.id === summit.id) {
        return -1
      } else if (b.id === summit.id) {
        return 1
      } else if (a.capture && !b.capture) {
        return -1;
      } else if (b.capture && !a.capture) {
        return 1;
      } else if (a.capture && b.capture) {
        if (a.healthLeft !== b.healthLeft) {
          return b.healthLeft - a.healthLeft
        } else {
          return b.power - a.power
        }
      } else if (a.damage !== b.damage) {
        return b.damage - a.damage
      } else {
        return b.power - a.power
      }
    })

    setCollection(beasts)
  }

  const fetchLeaderboard = async () => {
    let beasts = await queryLeaderboard();

    beasts = await Promise.all(
      beasts.map(async beast => ({
        ...beast,
        ...await getBeastDetails(beast.beast_token_id)
      }))
    )

    setLeaderboard(beasts)
  }

  const fetchPotionPrices = async () => {
    const prices = await Promise.all([
      await getSwapQuote(-1e18, import.meta.env.VITE_PUBLIC_REVIVE_ERC20_ADDRESS, 'USDC'),
      await getSwapQuote(-1e18, import.meta.env.VITE_PUBLIC_ATTACK_ERC20_ADDRESS, 'USDC'),
      await getSwapQuote(-1e18, import.meta.env.VITE_PUBLIC_EXTRA_LIFE_ERC20_ADDRESS, 'USDC'),
    ])

    setPotionPrices({
      revive: (prices[0].total * -1 / 1e6).toFixed(2),
      attack: (prices[1].total * -1 / 1e6).toFixed(2),
      extraLife: (prices[2].total * -1 / 1e6).toFixed(2)
    })
  }

  const fetchERC20Balances = async () => {
    let balances = await getERC20Balances(address)
    setWalletBalances(balances)
  }

  const fetchRankings = async () => {
    let holders = await getBeastHolders()
    let userRank = holders.findIndex(holder => holder.walletAddress === address || holder.walletAddress === address.replace('0x', '0x0'))

    setUserRanks(prev => ({ ...prev, beastRank: userRank + 1 }))
  }

  const fetchAdventurers = async () => {
    setLoadingAdventurers(true)

    let adventurers = await getAdventurers(address);
    let adventurerDetails = await fetchAdventurerData(adventurers)

    adventurers = adventurers.filter(adventurer => !adventurerDetails.includes(adventurer.id))
    adventurers = adventurers.filter(a => a.health < 1 && a.rank === 0)

    setAdventurerCollection(adventurers.sort((a, b) => {
      return b.level - a.level
    }))

    setLoadingAdventurers(false)
  }

  const fetchBeasts = async () => {
    setLoadingCollection(true)

    let beastData = await getBeasts(address);
    await fetchLiveStats(beastData);

    setOwnedBeasts(beastData);
    setLoadingCollection(false)
  }

  const fetchLiveStats = async (beastData) => {
    let liveStats = await fetchBeastLiveData((beastData || ownedBeasts).map(beast => beast.id))
    setLiveBeastStats(liveStats)
  }

  useEffect(() => {
    let totalDamage = 0

    selected.map(id => {
      let beast = collection.find(beast => beast.id === id);
      totalDamage += beast.capture ? summit.current_health : beast.damage
    })

    setTotalDamage(totalDamage)
  }, [selected, collection, summit])

  useEffect(() => {
    if (address) {
      fetchBeasts()
      fetchAdventurers()
      fetchRankings()
      fetchERC20Balances()
    }
  }, [address])

  useEffect(() => {
    if (ownedBeasts.length > 0 && liveBeastStats !== null) {
      setBeastCollection()
    }
  }, [liveBeastStats, ownedBeasts])

  useEffect(() => {
    fetchLiveStats()
    fetchLeaderboard()
  }, [summit.id])


  useEffect(() => {
    if (selectedItem === 'deadAdventurer' && selected.length > 0) {
      setShowFeedingGround(true)
      setSelectedItem(null)
    }
  }, [selectedItem, selected])

  useEffect(() => {
    setupToriiClient();
    syncGameData();
  }, []);

  const setupEntitySync = useCallback(async () => {
    try {
      return await toriiClient?.onEntityUpdated(
        [],
        (_, data) => {
          if (Boolean(data["savage_summit-Summit"])) {
            let beastId = data["savage_summit-Summit"]["beast_token_id"].value
            if (beastId !== summit.id) {
              updateSummit(beastId, true);
            }
          }

          else if (Boolean(data["savage_summit-LiveBeastStats"])) {
            let beastId = data["savage_summit-LiveBeastStats"]["token_id"].value
            let current_health = data["savage_summit-LiveBeastStats"]["current_health"].value
            let extra_lives = data["savage_summit-LiveBeastStats"]["extra_lives"].value

            if (beastId === summit.id) {
              if (current_health > 0) {
                setSummitAnimations(prev => [...prev, { type: 'update', updates: { current_health: current_health, extra_lives } }])
              }

              if (ownedBeasts.find(beast => beast.id === beastId)) {
                setCollection(prev => prev.map(beast => ({
                  ...beast,
                  current_health: beast.id === beastId ? current_health : beast.current_health,
                  extra_lives: beast.id === beastId ? extra_lives : beast.extra_lives
                })))
              }
            }
          }
        }
      );
    } catch (error) {
      console.log(error)
      throw error;
    }
  }, [toriiClient, summit]);

  useEffect(() => {
    let unsubscribe = undefined;

    setupEntitySync().then((sync) => {
      unsubscribe = sync;
    }).catch((error) => {
      console.error("Error setting up entity sync:", error);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe.cancel();
      }
    };
  }, [setupEntitySync]);

  const attackSummit = async () => {
    setAttackInProgress(true)

    try {
      setCollection(prev => prev.map(beast => ({
        ...beast,
        totalXp: selected.includes(beast.id) ? beast.totalXp + 10 + (beast.attack_streak || 0) : beast.totalXp,
        attack_streak: selected.includes(beast.id) ? (beast.attack_streak || 0) + 1 : beast.attack_streak
      })))

      const success = await dojo.executeTx([
        {
          contractName: "summit_systems",
          entrypoint: "attack",
          calldata: [summit.id, selected]
        }
      ])

      if (success) {
        let attackingBeasts = collection.filter(beast => selected.includes(beast.id))
        setAttackAnimations(attackingBeasts)
        setSelected([])
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setAttackInProgress(false)
    }
  }

  const feedBeast = async () => {
    setFeedingInProgress(true)

    try {
      const success = await dojo.executeTx([
        {
          contractName: "summit_systems",
          entrypoint: "feed",
          calldata: [selected[0], adventurersSelected.map(adventurer => adventurer.id)]
        }
      ])

      if (success) {
        setFeedAnimations(adventurersSelected)

        setAdventurerCollection(prev => prev.filter(adventurer => !adventurersSelected.some(selected => selected.id === adventurer.id)))
        setAdventurersSelected([])
      }
    } catch (ex) {
      setFeedingInProgress(false)
    }
  }

  return (
    <GameContext.Provider
      value={{
        actions: {
          attack: attackSummit,
          feed: feedBeast,
          fetchLiveStats,
          resetState,
        },

        setState: {
          beasts: setCollection,
          summit: setSummit,
          selectedBeasts: setSelected,
          selectedAdventurers: setAdventurersSelected,
          summitAnimations: setSummitAnimations,
          feedAnimations: setFeedAnimations,
          totalReward: setTotalReward,
          showFeedingGround: setShowFeedingGround,
          attackAnimations: setAttackAnimations,
          beastStats: setLiveBeastStats,
          attackInProgress: setAttackInProgress,
          feedInProgress: setFeedingInProgress,
          selectedItem: setSelectedItem,
          walletBalances: setWalletBalances
        },

        getState: {
          toriiClient,
          walletBalances,
          potionPrices,
          totalSupply,
          deadBeastCount,
          collection,
          summit,
          selectedBeasts: selected,
          selectedAdventurers: adventurersSelected,
          attackAnimations,
          summitAnimations,
          feedAnimations,
          loadingCollection,
          totalDamage,
          totalReward,
          adventurerCollection,
          loadingAdventurers,
          showFeedingGround,
          attackInProgress,
          ownedBeasts,
          feedingInProgress,
          userRanks,
          selectedItem,
          leaderboard,
        }
      }}
    >
      {children}
    </GameContext.Provider>
  );
};