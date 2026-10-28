// (6B) One-line SFX helpers for gameplay logic. Keep logic files free of AudioManager details.
// `sfxAt` attenuates by distance from the player (listener) and pans by screen x (step 5).
import { Audio } from './AudioManager';
import type { SfxId } from './sfxIds';

type Listener = { player: { x: number; y: number } };

/** Non-positional SFX (UI, player, global events). */
export const sfx = (id: SfxId, vol?: number, pitchVar = 0.08) => Audio.play(id, { vol, pitchVar });

/** World-positioned SFX: quieter with distance from the player, panned left/right. */
export const sfxAt = (state: Listener, id: SfxId, x: number, y: number, vol?: number, pitchVar = 0.08) =>
  Audio.play(id, { vol, pitchVar, pos: { x, y }, listener: state.player });
