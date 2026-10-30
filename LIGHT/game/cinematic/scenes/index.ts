// (M0) Scene registry. One file per cinematic; every scene id is stable (MOVIE.md §0 table).
// Add a scene: create `scenes/<id>.ts`, export its SceneDef, register it here. `?cinematic=<id>` reads this map.
import type { SceneDef } from '../Engine';
import { title_seam } from './title_seam';
import { opener_1 } from './opener_1';
import { menu_loop } from './menu_loop';

export const SCENES: Record<string, SceneDef> = {
  title_seam,
  menu_loop,
  opener_1,
};
export const sceneIds = () => Object.keys(SCENES);
export const getScene = (id: string): SceneDef | undefined => SCENES[id];
