import * as torii from "@dojoengine/torii-client";
import { useAccount } from "@starknet-react/core";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dojoConfig } from "../../dojoConfig";
import { getBeasts } from "../api/starknet";
import { addBeastStats, calculateBattleResult } from "../helpers/beasts";
import { DojoContext } from "./dojoContext";

export const GameContext = createContext()

export const GameProvider = ({ children }) => {
  const dojo = useContext(DojoContext)

  const [toriiClient, setToriiClient] = useState(null);
  const [summit, setSummit] = useState({ name: 'Kraken', prefix: "Sorrow", suffix: "Shout", level: 92, healthLeft: 402, health: 511, tier: 1, type: "Brute" })

  const [showFeedingGround, setShowFeedingGround] = useState(false)
  const [throws, setThrows] = useState(false)

  const [adventurerCollection, setAdventurerCollection] = useState([
    { id: 1, name: 'Await', level: 23, health: 190, healthLeft: 180, damage: 102, weapon: 'book' },
    { id: 2, name: 'Await', level: 12, health: 150, healthLeft: 100, damage: 24, weapon: 'club' },
    { id: 3, name: 'Await', level: 11, health: 130, healthLeft: 10, damage: 22, weapon: 'club' },
    { id: 4, name: 'Await', level: 9, health: 120, healthLeft: 120, damage: 18 },
    { id: 5, name: 'Await', level: 8, health: 110, healthLeft: 110, damage: 12 },
    { id: 6, name: 'Await', level: 5, health: 100, healthLeft: 100, damage: 8 }
  ])

  const [collection, setCollection] = useState([])
  const [loadingCollection, setLoadingCollection] = useState(false)

  const [allBeastStats, setAllBeastStats] = useState([])

  const [adventurersSelected, setAdventurersSelected] = useState([])
  const [selected, setSelected] = useState([])
  const [potions, setPotions] = useState(0)

  const [totalDamage, setTotalDamage] = useState(0)

  const [attackAnimations, setAttackAnimations] = useState([])
  const [summitAnimations, setSummitAnimations] = useState([])

  const [totalReward, setTotalReward] = useState(100)
  const [beastReward, setBeastReward] = useState(0)

  const { address } = useAccount()

  const resetState = () => {
    setCollection([])
    setSelected([])
    setTotalDamage(0)
    setAdventurerCollection([])
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

  const setBeastCollection = (data) => {
    let beasts = data.map((beast, index) => ({
      ...beast,
      ...calculateBattleResult(beast, summit),
      ...addBeastStats(allBeastStats.find(stats => stats.id === beast.id)),
    })).sort((a, b) => {
      if (a.capture && !b.capture) {
        return -1;
      } else if (b.capture && !a.capture) {
        return 1;
      } else if (a.capture && b.capture) {
        return b.healthLeft - a.healthLeft
      } else {
        return b.damage - a.damage
      }
    })

    setCollection(beasts)
  }

  const fetchBeasts = async () => {
    setLoadingCollection(true)

    let data = await getBeasts(address);

    setBeastCollection(data)
    setLoadingCollection(false)
  }

  useEffect(() => {
    let totalDamage = 0

    selected.map(id => {
      let beast = collection.find(beast => beast.id === id);
      totalDamage += beast.capture ? summit.health : beast.damage
    })

    setTotalDamage(totalDamage)
  }, [selected])

  useEffect(() => {
    if (address) {
      fetchBeasts()
    }
  }, [address])

  useEffect(() => {
    if (collection.length > 0) {
      setBeastCollection(collection)
    }
  }, [allBeastStats, summit])

  useEffect(() => {
    setInterval(() => {
      setBeastReward(prev => Number((prev + 0.01).toFixed(2)))
      setTotalReward(prev => Number((prev - 0.01).toFixed(2)))
    }, 1000)
  }, [])

  useEffect(() => {
    // setupToriiClient();
  }, []);

  const setupSync = useCallback(async () => {
    try {
      return await toriiClient?.onEntityUpdated(
        ['savage_summit-Summit', 'savage_summit-BeastStats'], // Empty array to listen for all entity updates
        (fetchedEntities, data) => {

        }
      );
    } catch (error) {
      throw error;
    }
  }, [toriiClient]);

  const fetchData = useCallback(async () => {
    let summit = await toriiClient?.getEntities({ clause: ['savage_summit-Summit'], limit: 1 });
    let beasts = await toriiClient?.getEntities({ clause: ['savage_summit-BeastStats'], limit: 0 });

    console.log(summit)
    console.log(beasts)
  }, [toriiClient]);

  // useEffect(() => {
  //   let unsubscribe = undefined;

  //   fetchData();

  //   setupSync()
  //     .then((sync) => {
  //       unsubscribe = sync;
  //     })
  //     .catch((error) => {
  //       console.error("Error setting up entity sync:", error);
  //     });

  //   return () => {
  //     if (unsubscribe) {
  //       unsubscribe.cancel();
  //       console.log("Sync unsubscribed");
  //     }
  //   };
  // }, [setupSync]);

  const attackSummit = async () => {
    let attackingBeast = collection.find(beast => beast.id === selected[0])
    setAttackAnimations(prev => [...prev, attackingBeast])
    setSelected([])
    // const res = await dojo.executeTx("summit_systems", "attack", [0, selected[0], []])
  }

  return (
    <GameContext.Provider
      value={{
        actions: {
          attack: attackSummit,
          resetState
        },

        setState: {
          summit: setSummit,
          selectedBeasts: setSelected,
          selectedAdventurers: setAdventurersSelected,
          summitAnimations: setSummitAnimations,
          potions: setPotions,
          beastReward: setBeastReward,
          totalReward: setTotalReward,
          showFeedingGround: setShowFeedingGround,
          isThrowing: setThrows
        },

        getState: {
          toriiClient,
          collection,
          summit,
          selectedBeasts: selected,
          selectedAdventurers: adventurersSelected,
          attackAnimations,
          summitAnimations,
          loadingCollection,
          totalDamage,
          potions,
          beastReward,
          totalReward,
          adventurerCollection,
          showFeedingGround,
          isThrowing: throws
        }
      }}
    >
      {children}
    </GameContext.Provider>
  );
};