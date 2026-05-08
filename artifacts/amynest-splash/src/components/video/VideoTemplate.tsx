import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { SplashScene } from './video_scenes/SplashScene';

export const SCENE_DURATIONS: Record<string, number> = {
  splash: 6000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  splash: SplashScene,
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
      className="relative overflow-hidden bg-[#06061C]"
      style={{ width: '100%', maxWidth: 'calc(100vh * 9 / 16)', aspectRatio: '9/16', maxHeight: '100vh', margin: '0 auto' }}
    >
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
