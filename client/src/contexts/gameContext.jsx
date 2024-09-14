import * as torii from "@dojoengine/torii-client";
import { useAccount } from "@starknet-react/core";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dojoConfig } from "../../dojoConfig";
import { fetchAdventurerData, fetchBeastLiveData, fetchDeadBeastCount, fetchSummitBeastTokenId } from "../api/indexer";
import { getAdventurers, getBeastDetails, getBeasts, getTotalBeasts } from "../api/starknet";
import { calculateBattleResult } from "../helpers/beasts";
import { DojoContext } from "./dojoContext";

export const GameContext = createContext()

const EMPTY_SUMMIT = { id: 0, level: 1, currentHealth: 0, health: 0, tier: 1 }

export const GameProvider = ({ children }) => {
  const dojo = useContext(DojoContext)

  const [toriiClient, setToriiClient] = useState(null);
  const [summit, setSummit] = useState({ ...EMPTY_SUMMIT, loading: true })
  const [eventLog, setEventLog] = useState([])

  const [attackInProgress, setAttackInProgress] = useState(false)

  const [showFeedingGround, setShowFeedingGround] = useState(false)

  const [adventurerCollection, setAdventurerCollection] = useState([])
  const [loadingAdventurers, setLoadingAdventurers] = useState(false)
  const [feedingInProgress, setFeedingInProgress] = useState(false)

  const [deadBeastCount, setDeadBeastCount] = useState()
  const [totalSupply, setTotalSupply] = useState()

  const [ownedBeasts, setOwnedBeasts] = useState([])
  const [liveBeastStats, setLiveBeastStats] = useState(null)

  const [collection, setCollection] = useState([])
  const [loadingCollection, setLoadingCollection] = useState(false)

  const [adventurersSelected, setAdventurersSelected] = useState([])
  const [selected, setSelected] = useState([])
  const [potions, setPotions] = useState(0)

  const [totalDamage, setTotalDamage] = useState(0)

  const [attackAnimations, setAttackAnimations] = useState([])
  const [summitAnimations, setSummitAnimations] = useState([])
  const [feedAnimations, setFeedAnimations] = useState([])

  const [totalReward, setTotalReward] = useState(100)
  const [beastReward, setBeastReward] = useState(0)

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
      summitBeast = { ...summitBeastDetails, currentHealth: summitLiveStats?.current_health || summitBeastDetails.health }
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
      beast.health += liveStat?.bonus_health ?? 0

      if (liveStat.isDead) {
        beast.currentHealth = 0
      } else {
        beast.currentHealth = liveStat?.current_health > 0 ? liveStat?.current_health : beast.health
      }

      return {
        ...beast,
        ...calculateBattleResult(beast, summit),
        ...liveStat
      }
    }).sort((a, b) => {
      if (a.capture && !b.capture) {
        return -1;
      } else if (b.capture && !a.capture) {
        return 1;
      } else if (a.capture && b.capture) {
        return b.healthLeft - a.healthLeft
      } else if (a.damage !== b.damage) {
        return b.damage - a.damage
      } else {
        return ((6 - b.tier) * b.level) - ((6 - a.tier) * a.level)
      }
    })

    setCollection(beasts)
  }

  const fetchAdventurers = async () => {
    setLoadingAdventurers(true)

    let adventurers = await getAdventurers(address);
    let adventurerDetails = await fetchAdventurerData(adventurers)

    adventurers = adventurers.filter(adventurer => !adventurerDetails.includes(adventurer.id))
    adventurers = adventurers.filter(a => a.health < 1)

    setAdventurerCollection(adventurers.sort((a, b) => {
      return a.health - b.health
    }))

    setLoadingAdventurers(false)
  }

  const fetchBeasts = async () => {
    setLoadingCollection(true)

    let beastData = await getBeasts(address);
    let liveData = await fetchBeastLiveData(beastData.map(beast => beast.id));

    setOwnedBeasts(beastData);
    setLiveBeastStats(liveData);

    setLoadingCollection(false)
  }

  useEffect(() => {
    let totalDamage = 0

    selected.map(id => {
      let beast = collection.find(beast => beast.id === id);
      totalDamage += beast.capture ? summit.currentHealth : beast.damage
    })

    setTotalDamage(totalDamage)
  }, [selected])

  useEffect(() => {
    async function fetchWalletNfts() {
      await fetchBeasts()
      fetchAdventurers()
    }

    if (address) {
      fetchWalletNfts()
    }
  }, [address])

  useEffect(() => {
    if (ownedBeasts.length > 0 && liveBeastStats !== null) {
      setBeastCollection()
    }
  }, [summit.id, liveBeastStats, ownedBeasts])

  useEffect(() => {
    setInterval(() => {
      setBeastReward(prev => Number((prev + 0.01).toFixed(2)))
      setTotalReward(prev => Number((prev - 0.01).toFixed(2)))
    }, 1000)
  }, [])

  useEffect(() => {
    setupToriiClient();
    syncGameData();
  }, []);

  const setupMessageSync = useCallback(async () => {
    try {
      return await toriiClient?.onEventMessageUpdated(
        [],
        (fetchedEvents, data) => {
          console.log("New event message", fetchedEvents, data)
        }
      );
    } catch (error) {
      throw error;
    }
  }, [toriiClient]);

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

            if (beastId === summit.id) {
              if (current_health > 0) {
                setSummitAnimations(prev => [...prev, { type: 'update', current_health }])
              }

              if (ownedBeasts.find(beast => beast.id === beastId)) {
                setCollection(prev => prev.map(beast => ({
                  ...beast,
                  currentHealth: beast.id === beastId ? current_health : beast.currentHealth
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

  useEffect(() => {
    let unsubscribe = undefined;

    setupMessageSync().then((sync) => {
      unsubscribe = sync;
    }).catch((error) => {
      console.error("Error setting up message sync:", error);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe.cancel();
      }
    };
  }, [setupMessageSync]);

  const attackSummit = async () => {
    setAttackInProgress(true)
    try {
      const success = await dojo.executeTx("summit_systems", "attack", [summit.id, selected])

      if (success) {
        let attackingBeasts = collection.filter(beast => selected.includes(beast.id))
        setAttackAnimations(attackingBeasts)
        setSelected([])
      }
    } catch (ex) {
      setAttackInProgress(false)
    }
  }

  const feedBeast = async () => {
    setFeedingInProgress(true)
    try {
      const success = await dojo.executeTx("summit_systems", "feed", [selected[0], adventurersSelected])

      if (success) {
        setFeedAnimations(adventurersSelected)
        setAdventurerCollection(prev => prev.filter(adventurer => !adventurersSelected.includes(adventurer.id)))
        setAdventurersSelected([])
      }
    } catch (ex) {
      setFeedingInProgress(false)
    }
  }

  const publishChatMessage = async (message) => {
    // const data = generateMessageTypedData(address, message, new Date().valueOf());
    // const signature = await account.signMessage(data);

    // toriiClient.publishMessage(JSON.stringify(data), [
    //   `0x${signature.r.toString(16)}`,
    //   `0x${signature.s.toString(16)}`,
    // ])
  }

  return (
    <GameContext.Provider
      value={{
        actions: {
          attack: attackSummit,
          feed: feedBeast,
          publishChatMessage,
          resetState,
        },

        setState: {
          beasts: setCollection,
          summit: setSummit,
          selectedBeasts: setSelected,
          selectedAdventurers: setAdventurersSelected,
          summitAnimations: setSummitAnimations,
          feedAnimations: setFeedAnimations,
          potions: setPotions,
          beastReward: setBeastReward,
          totalReward: setTotalReward,
          showFeedingGround: setShowFeedingGround,
          attackAnimations: setAttackAnimations,
          beastStats: setLiveBeastStats,
          attackInProgress: setAttackInProgress,
          feedInProgress: setFeedingInProgress
        },

        getState: {
          toriiClient,
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
          potions,
          beastReward,
          totalReward,
          adventurerCollection,
          loadingAdventurers,
          showFeedingGround,
          attackInProgress,
          ownedBeasts,
          eventLog,
          feedingInProgress
        }
      }}
    >
      {children}
    </GameContext.Provider>
  );
};