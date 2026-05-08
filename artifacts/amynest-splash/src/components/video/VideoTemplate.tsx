import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS: Record<string, number> = {
  hero: 3500,
  ask: 3500,
  routines: 3500,
  nutrition: 3000,
  insights: 3000,
  outro: 3500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Scene1,
  ask: Scene2,
  routines: Scene3,
  nutrition: Scene4,
  insights: Scene5,
  outro: Scene6,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ aspectRatio: '16/9', background: 'var(--color-bg)' }}
    >
      {/* Background layer */}
      <div className="absolute inset-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/purple-particle-bg.png`} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-30" 
        />
      </div>

      {/* Floating orbs that drift across all scenes */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] rounded-full opacity-40 blur-3xl pointer-events-none mix-blend-screen"
        style={{ background: 'var(--color-primary)' }}
        animate={{ 
          x: ['-20vw', '60vw', '20vw', '-20vw'],
          y: ['-10vh', '40vh', '80vh', '-10vh'],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="absolute w-[30vw] h-[30vw] rounded-full opacity-30 blur-3xl pointer-events-none mix-blend-screen"
        style={{ background: 'var(--color-secondary)' }}
        animate={{ 
          x: ['70vw', '10vw', '50vw', '70vw'],
          y: ['60vh', '10vh', '-10vh', '60vh'],
          scale: [0.8, 1.3, 1, 0.8]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
