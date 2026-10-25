// (2C) Draws persistent boss hazards (logic/enemies/BossHazards.ts). World space, under enemies.
import { MutableGameState } from '../types';
import { Hazard } from '../logic/enemies/BossHazards';

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const drawHazards = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    const list = state.hazards;
    if (!list || !list.length) return;
    const f = state.frame;
    ctx.save();
    ctx.shadowBlur = 0;
    for (let i = 0; i < list.length; i++) {
        const h: Hazard = list[i];
        const age = f - h.born;
        const breathe = 0.85 + 0.15 * Math.sin((f + i * 23) * 0.08);
        const landing = h.pulse; // 1 → 0 right after it lands
        switch (h.kind) {
            case 'beam': {
                const horizontal = (h.angle ?? 0) === 0;
                const L = 2400;
                ctx.save();
                ctx.translate(h.x, h.y);
                if (!horizontal) ctx.rotate(Math.PI / 2);
                const w = h.radius * 2 * breathe;
                const g = ctx.createLinearGradient(0, -w, 0, w);
                g.addColorStop(0, hexA(h.color, 0)); g.addColorStop(0.5, hexA(h.color, 0.55 + landing * 0.4)); g.addColorStop(1, hexA(h.color, 0));
                ctx.fillStyle = g; ctx.fillRect(-L / 2, -w, L, w * 2);
                ctx.fillStyle = `rgba(255,255,255,${0.75 + landing * 0.25})`; ctx.fillRect(-L / 2, -2, L, 4);
                ctx.restore();
                break;
            }
            case 'rubble': {
                ctx.fillStyle = hexA('#312e81', 0.55);
                ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = hexA('#818cf8', 0.5 + landing * 0.5); ctx.lineWidth = 3; ctx.stroke();
                // cracked rock lumps
                ctx.fillStyle = hexA('#1e1b4b', 0.9);
                for (let k = 0; k < 5; k++) {
                    const a = (k / 5) * Math.PI * 2 + i, r = h.radius * 0.45;
                    ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, h.radius * 0.22, 0, Math.PI * 2); ctx.fill();
                }
                break;
            }
            case 'rock': { // (2D) Titan slam debris: a solid grey boulder cluster, cracks as it nears expiry
                const fade = h.ttl !== undefined && h.ttl < 60 ? h.ttl / 60 : 1;
                ctx.fillStyle = hexA('#525252', 0.9 * fade);
                ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = hexA('#d4d4d4', (0.6 + landing * 0.4) * fade); ctx.lineWidth = 4; ctx.stroke();
                ctx.fillStyle = hexA('#737373', 0.95 * fade);
                for (let k = 0; k < 4; k++) {
                    const a = (k / 4) * Math.PI * 2 + i * 1.3, r = h.radius * 0.4;
                    ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, h.radius * 0.3, 0, Math.PI * 2); ctx.fill();
                }
                ctx.strokeStyle = hexA('#171717', 0.8 * fade); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(h.x - h.radius * 0.5, h.y - h.radius * 0.2); ctx.lineTo(h.x + h.radius * 0.1, h.y + h.radius * 0.1); ctx.lineTo(h.x + h.radius * 0.5, h.y - h.radius * 0.4); ctx.stroke();
                break;
            }
            case 'void': {
                const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
                g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.7, 'rgba(30,27,75,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(255,255,255,${0.35 * breathe + landing * 0.5})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.6 * breathe, 0, Math.PI * 2); ctx.stroke();
                break;
            }
            case 'flare': {
                const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
                g.addColorStop(0, hexA('#fef3c7', 0.85)); g.addColorStop(0.4, hexA('#fbbf24', 0.6)); g.addColorStop(1, hexA('#7f1d1d', 0.05));
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * breathe, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = hexA('#ef4444', 0.6 + landing * 0.4); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
                ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
                break;
            }
            case 'nebula': {
                for (let k = 0; k < 3; k++) {
                    const a = (f * 0.01 + k * 2.1 + i), r = h.radius * 0.35;
                    const cx = h.x + Math.cos(a) * r, cy = h.y + Math.sin(a) * r;
                    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, h.radius * 0.75);
                    g.addColorStop(0, hexA('#10b981', 0.35)); g.addColorStop(1, hexA('#064e3b', 0));
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, h.radius * 0.75, 0, Math.PI * 2); ctx.fill();
                }
                ctx.strokeStyle = hexA('#6ee7b7', 0.3 + landing * 0.6); ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.stroke();
                break;
            }
            default: { // acid
                const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
                g.addColorStop(0, hexA('#a3e635', 0.55)); g.addColorStop(0.8, hexA('#65a30d', 0.4)); g.addColorStop(1, hexA('#365314', 0.05));
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
                // bubbles
                ctx.fillStyle = hexA('#d9f99d', 0.6);
                for (let k = 0; k < 4; k++) {
                    const t = ((age * 0.02) + k * 0.25) % 1;
                    const a = k * 1.7 + i, r = h.radius * 0.6 * (1 - t * 0.3);
                    ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 3 + 4 * (1 - t), 0, Math.PI * 2); ctx.fill();
                }
                ctx.strokeStyle = hexA('#bef264', 0.5 + landing * 0.5); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }
    ctx.restore();
};
