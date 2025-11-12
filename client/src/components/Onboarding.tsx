import { useGameStore } from '@/stores/gameStore';
import { useEffect, useState } from 'react';
import ClaimCorpseReward from './dialogs/ClaimCorpseReward';
import ClaimStarterPack from './dialogs/ClaimStarterPack';

type OnboardingStep = 'starter_pack' | 'corpse_reward' | 'complete';

function Onboarding() {
  const { collection, adventurerCollection, setOnboarding } = useGameStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('starter_pack');

  const unclaimedBeasts = collection.filter(beast => !beast.has_claimed_potions);
  const hasAdventurers = adventurerCollection.length > 0;

  // Determine which step to show
  useEffect(() => {
    if (unclaimedBeasts.length > 0) {
      setCurrentStep('corpse_reward');
    } else if (hasAdventurers) {
      setCurrentStep('corpse_reward');
    } else {
      setCurrentStep('complete');
    }
  }, [unclaimedBeasts.length, hasAdventurers]);

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
