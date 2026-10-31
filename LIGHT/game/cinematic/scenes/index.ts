// (M0) Scene registry. One file per cinematic; every scene id is stable (MOVIE.md §0 table).
// Add a scene: create `scenes/<id>.ts`, export its SceneDef, register it here. `?cinematic=<id>` reads this map.
import type { SceneDef } from '../Engine';
import { title_seam } from './title_seam';
import { opener_1 } from './opener_1';
import { opener_2 } from './opener_2';
import { opener_3 } from './opener_3';
import { opener_4 } from './opener_4';
import { opener_5 } from './opener_5';
import { opener_6 } from './opener_6';
import { menu_loop } from './menu_loop';
// (M3) boss intros — ids are `boss_intro_<bossId>` (bosses.ts ids)
import { boss_intro_hive_mind } from './boss_intro_hive_mind';
import { boss_intro_void_warden } from './boss_intro_void_warden';
import { boss_intro_crimson_eclipse } from './boss_intro_crimson_eclipse';
import { boss_intro_neutron_star } from './boss_intro_neutron_star';
import { boss_intro_entropy_titan } from './boss_intro_entropy_titan';
import { boss_intro_darkness } from './boss_intro_darkness';
// (M4) boss outros — ids are `boss_outro_<bossId>`; shot 3 is the place reveal (replaces MapReveal.tsx)
import { boss_outro_hive_mind } from './boss_outro_hive_mind';
import { boss_outro_void_warden } from './boss_outro_void_warden';
import { boss_outro_crimson_eclipse } from './boss_outro_crimson_eclipse';
import { boss_outro_neutron_star } from './boss_outro_neutron_star';
import { boss_outro_entropy_titan } from './boss_outro_entropy_titan';
import { boss_outro_darkness } from './boss_outro_darkness';
// (M5) Darkness Interrupts — pool of six, picked by logic/DarknessInterrupt.ts; hard cut into a gameplay threat
import { interrupt_1 } from './interrupt_1';
import { interrupt_2 } from './interrupt_2';
import { interrupt_3 } from './interrupt_3';
import { interrupt_4 } from './interrupt_4';
import { interrupt_5 } from './interrupt_5';
import { interrupt_6 } from './interrupt_6';

export const SCENES: Record<string, SceneDef> = {
  title_seam,
  menu_loop,
  opener_1,
  opener_2,
  opener_3,
  opener_4,
  opener_5,
  opener_6,
  boss_intro_hive_mind,
  boss_intro_void_warden,
  boss_intro_crimson_eclipse,
  boss_intro_neutron_star,
  boss_intro_entropy_titan,
  boss_intro_darkness,
  boss_outro_hive_mind,
  boss_outro_void_warden,
  boss_outro_crimson_eclipse,
  boss_outro_neutron_star,
  boss_outro_entropy_titan,
  boss_outro_darkness,
  interrupt_1,
  interrupt_2,
  interrupt_3,
  interrupt_4,
  interrupt_5,
  interrupt_6,
};
export const sceneIds = () => Object.keys(SCENES);
export const getScene = (id: string): SceneDef | undefined => SCENES[id];
