// (4B) Special waves — filled in step 3. Stub so step 1 builds.
import { MutableGameState, Enemy } from './types';
export type WaveFlavorId = 'ELITE_RUSH' | 'GAUNTLET' | 'CURSE' | 'AEGIS_TRIAL';
export interface CurseMark { active: boolean; x: number; y: number; timer: number; maxTimer: number; dmgTick: number }
export const onFlavorKill = (_state: MutableGameState, _enemy: Enemy) => {};
