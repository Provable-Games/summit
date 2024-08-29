import * as torii from "@dojoengine/torii-client";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { getBeasts } from "../api/starknet";
import { dojoConfig } from "../../dojoConfig";
import { addBeastStats, calculateBattleResult } from "../helpers/beasts";
import { useContext } from "react";
import { Dojo } from "./dojoContext";

export const GameContext = createContext()

export const GameProvider = ({ children }) => {
  const dojo = useContext(Dojo)

  const [toriiClient, setToriiClient] = useState(null);
  const [summit, setSummit] = useState({ name: 'Kraken', fullName: "Reckless Apocalypse Kraken", level: 92, health: 402, maxHealth: 511, tier: 1, type: "Brute" })

  const [collection, setCollection] = useState([])
  const [loadingCollection, setLoadingCollection] = useState(false)

  const [allBeastStats, setAllBeastStats] = useState([])

  const [selected, setSelected] = useState([])
  const [totalDamage, setTotalDamage] = useState(0)

  const [attackAnimations, setAttackAnimations] = useState([])
  const [summitAnimations, setSummitAnimations] = useState([])

  const { address } = useAccount()

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
    let beasts = data.map(beast => ({
      ...beast,
      ...calculateBattleResult(beast, summit),
      ...addBeastStats(allBeastStats.find(stats => stats.id === beast.id))
    }))

    setCollection(
      beasts.sort((a, b) => {
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
    )
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
    setBeastCollection(collection)
  }, [allBeastStats, summit])

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
    const res = await dojo.executeTx("summit_systems", "attack", [game.selected])
  }

  return (
    <GameContext.Provider
      value={{
        toriiClient,
        collection,

        summit,
        setSummit,

        selected,
        setSelected,

        attackAnimations,
        setAttackAnimations,

        summitAnimations,
        setSummitAnimations,

        loadingCollection,
        setLoadingCollection,

        totalDamage
      }}
    >
      {children}
    </GameContext.Provider>
  );
};