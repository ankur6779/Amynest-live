import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { SplashScene } from './video_scenes/SplashScene';

const SCENE_DURATIONS = {
  splash: 6000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div
      className="relative overflow-hidden bg-[#050510]"
      style={{ aspectRatio: '9/16', maxHeight: '100vh', margin: '0 auto' }}
    >
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <SplashScene key="splash" />}
      </AnimatePresence>
    </div>
  );
}
