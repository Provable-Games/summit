import { useGameStore } from '@/stores/gameStore';
import { useEffect, useState } from 'react';
import ClaimCorpseReward from './dialogs/ClaimCorpseReward';
import ClaimSkullReward from './dialogs/ClaimSkullReward';
import ClaimStarterPack from './dialogs/ClaimStarterPack';

type OnboardingStep = 'starter_pack' | 'skull_reward' | 'corpse_reward' | 'complete';

function Onboarding() {
  const { collection, adventurerCollection, setOnboarding } = useGameStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('starter_pack');

  const unclaimedStarterPacks = collection.filter(beast => !beast.has_claimed_potions);
  const unclaimedSkullBeasts = collection.filter(
    beast => (beast.adventurers_killed || 0) > (beast.kills_claimed || 0),
  );
  const hasAdventurers = adventurerCollection.length > 0;

  // Determine which step to show
  useEffect(() => {
    if (unclaimedStarterPacks.length > 0) {
      setCurrentStep('starter_pack');
    } else if (unclaimedSkullBeasts.length > 0) {
      setCurrentStep('skull_reward');
    } else if (hasAdventurers) {
      setCurrentStep('corpse_reward');
    } else {
      setCurrentStep('complete');
      setOnboarding(false);
    }
  }, [unclaimedStarterPacks.length, unclaimedSkullBeasts.length, hasAdventurers]);

  if (currentStep === 'complete') {
    return null;
  }

  return (
    <>
      {currentStep === 'starter_pack' && (
        <ClaimStarterPack
          open={true}
          close={() => { }}
          isOnboarding={true}
        />
      )}
      {currentStep === 'skull_reward' && (
        <ClaimSkullReward
          open={true}
          close={() => { }}
          isOnboarding={true}
        />
      )}
      {currentStep === 'corpse_reward' && (
        <ClaimCorpseReward
          open={true}
          close={() => { setOnboarding(false) }}
          isOnboarding={true}
        />
      )}
    </>
  );
}

export default Onboarding;
