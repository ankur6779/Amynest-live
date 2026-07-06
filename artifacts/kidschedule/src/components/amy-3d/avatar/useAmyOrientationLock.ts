import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCK_BONE_NAMES = new Set(["root", "hip", "pelvis", "armature"]);

/**
 * After the mixer runs, reset root-chain bone rotation to bind pose so clips
 * cannot rotate Amy into a side profile.
 */
export function useAmyOrientationLock(
  scene: THREE.Object3D,
  active: boolean,
): void {
  const bonesRef = useRef<THREE.Object3D[]>([]);
  const bindQuatRef = useRef<Map<string, THREE.Quaternion>>(new Map());

  useEffect(() => {
    bonesRef.current = [];
    bindQuatRef.current.clear();
    scene.traverse((o) => {
      const n = o.name?.toLowerCase() ?? "";
      if (LOCK_BONE_NAMES.has(n)) {
        bonesRef.current.push(o);
        bindQuatRef.current.set(o.name, o.quaternion.clone());
      }
    });
  }, [scene]);

  // Priority 1 — after AnimationMixer updates (priority 0).
  useFrame(() => {
    if (!active) return;
    for (const bone of bonesRef.current) {
      const bind = bindQuatRef.current.get(bone.name);
      if (bind) bone.quaternion.copy(bind);
    }
  }, 1);
}
