import { MutableGameState } from '../types';

export const updateCamera = (state: MutableGameState, canvasWidth: number, canvasHeight: number) => {
    const targetX = state.player.x - canvasWidth / 2;
    const targetY = state.player.y - canvasHeight / 2;
    
    // Smooth camera
    state.camera.x += (targetX - state.camera.x) * 0.1;
    state.camera.y += (targetY - state.camera.y) * 0.1;
};