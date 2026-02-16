import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import type { Group } from 'three';

interface BeastModel3DProps {
  beastName: string;
  opacity?: number;
}

const DRACO_DECODER_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

function BeastScene({ beastName }: { beastName: string }) {
  const groupRef = useRef<Group>(null);
  const { scene, animations } = useGLTF(`/models/Pegasus.glb`, DRACO_DECODER_URL);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const first = Object.values(actions)[0];
    if (first) {
      first.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

export default function BeastModel3D({ beastName, opacity = 1 }: BeastModel3DProps) {
  return (
    <Canvas
      gl={{ alpha: true }}
      camera={{ position: [0, 0, 2.5], fov: 45 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'auto',
        opacity,
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
      <BeastScene beastName={beastName} />
    </Canvas>
  );
}
