/**
 * Summit REST API Client
 */

import { useDynamicConnector } from "@/contexts/starknet";
import { Beast } from "@/types/game";

/**
 * API response type matching the /beasts/:owner endpoint
 */

export const useSummitApi = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  /**
   * Get all beasts owned by a player
   */
  const getBeastsByOwner = async (owner: string): Promise<Beast[]> => {
    const response = await fetch(`${currentNetworkConfig.apiUrl}/beasts/${owner}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch beasts for owner ${owner}: ${response.status}`);
    }
    return response.json();
  };

  return {
    getBeastsByOwner,
  };
};
