// (M0) Scene registry. One file per cinematic; every scene id is stable (MOVIE.md §0 table).
// Add a scene: create `scenes/<id>.ts`, export its SceneDef, register it here. `?cinematic=<id>` reads this map.
import type { SceneDef } from '../Engine';
import { title_seam } from './title_seam';
import { opener_1 } from './opener_1';
import { opener_2 } from './opener_2';
import { opener_3 } from './opener_3';
import { opener_4 } from './opener_4';
import { opener_5 } from './opener_5';
import { menu_loop } from './menu_loop';

export const SCENES: Record<string, SceneDef> = {
  title_seam,
  menu_loop,
  opener_1,
  opener_2,
  opener_3,
  opener_4,
  opener_5,
};
export const sceneIds = () => Object.keys(SCENES);
export const getScene = (id: string): SceneDef | undefined => SCENES[id];
