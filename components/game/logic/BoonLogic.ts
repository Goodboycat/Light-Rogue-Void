import { MutableGameState, Enemy, ParticleType } from '../types';
import { RunMods } from '../../../data/boons';
import { createParticle } from '../Particles';
import { VFX } from '../Emitters';
import { audio } from '../audio';
import { acquireProjectile } from '../ObjectPools';

export const BOON_LOGIC_CONFIG = {
    chainReactionChance: 0.12,
    chainReactionDamage: 60,
    chainReactionRadius: 90,
    vampiricKillsRequired: 25,
    staticChargeKillsRequired: 5,
    staticChargeWindowFrames: 180, // 3.0 s
    staticChargeDamage: 95,
    frostTrailDurationFrames: 90,   // 1.5 s
    frostTrailRadius: 85,
    lightningDashTargets: 3,
    lightningDashRange: 260,
    lightningDashDamage: 85,
    timeRiftSlowFrames: 150,        // 2.5 s
    supernovaIntervalFrames: 720,   // 12.0 s
    supernovaDamage: 110
};

// Module-level zero-allocation state counters for run boon procs
let killCounterVampiric = 0;
let recentKillCount = 0;
let recentKillTimer = 0;
let phoenixUsedThisRun = false;

export function resetBoonWaveState(): void {
    recentKillCount = 0;
    recentKillTimer = 0;
}

export function resetBoonRunState(): void {
    phoenixUsedThisRun = false;
    killCounterVampiric = 0;
    recentKillCount = 0;
    recentKillTimer = 0;
}

/**
 * 1. onKill(enemy): Called once per enemy death in EnemyLogic.ts
 */
export function onKill(
    state: MutableGameState,
    enemy: Enemy,
    mods: RunMods | undefined,
    healPlayer?: (amount: number) => void
): void {
    const hasDailyEcho = !!state.activeDailyMod?.killsExplode;
    if (!mods && !hasDailyEcho) return;

    // Chain Reaction: 12% on kill = 60 dmg blast r90 (or Daily Void Echo Detonation)
    if (((mods?.chainReactionCount || 0) > 0 && Math.random() < BOON_LOGIC_CONFIG.chainReactionChance * (mods?.chainReactionCount || 1)) || (hasDailyEcho && Math.random() < 0.35)) {
        const radius = BOON_LOGIC_CONFIG.chainReactionRadius * (1 + (mods?.aoeRadiusMult || 0));
        const dmg = BOON_LOGIC_CONFIG.chainReactionDamage * (mods?.damageMult || 1);
        state.projectiles.push(acquireProjectile({
            x: enemy.x,
            y: enemy.y,
            vx: 0,
            vy: 0,
            size: radius,
            color: '#f97316',
            damage: dmg,
            isEnemy: false,
            life: 12,
            visualType: 'EXPLOSION_AREA'
        }));
        for (let k = 0; k < 8; k++) {
            createParticle(state, enemy.x, enemy.y, ParticleType.FIRE, '#f97316', { speed: 5, life: 30, size: 4 });
        }
    }

    if (!mods) return;

    // Vampiric Light: heal 1 per 25 kills
    if (mods.vampiricLightCount > 0 && healPlayer) {
        killCounterVampiric++;
        const threshold = Math.max(10, Math.floor(BOON_LOGIC_CONFIG.vampiricKillsRequired / mods.vampiricLightCount));
        if (killCounterVampiric >= threshold) {
            killCounterVampiric = 0;
            healPlayer(1);
            for (let k = 0; k < 8; k++) {
                createParticle(state, state.player.x, state.player.y, ParticleType.HEAL, '#4ade80', { speed: 3, life: 25, size: 4 });
            }
        }
    }

    // Static Charge: 5 kills in 3 s = thunder chain
    if (mods.staticChargeCount > 0) {
        if (state.frame - recentKillTimer > BOON_LOGIC_CONFIG.staticChargeWindowFrames) {
            recentKillCount = 0;
        }
        recentKillTimer = state.frame;
        recentKillCount++;
        if (recentKillCount >= BOON_LOGIC_CONFIG.staticChargeKillsRequired) {
            recentKillCount = 0;
            const dmg = BOON_LOGIC_CONFIG.staticChargeDamage * mods.staticChargeCount * (mods.damageMult || 1);
            let hits = 0;
            for (let i = 0; i < state.enemies.length; i++) {
                const e = state.enemies[i];
                if (e.hp <= 0 || e === enemy) continue;
                const dx = e.x - enemy.x;
                const dy = e.y - enemy.y;
                if (dx * dx + dy * dy <= 300 * 300) {
                    e.hp -= dmg;
                    e.paralyzedTimer = e.isBoss ? 60 : 100;
                    VFX.spark(state, e.x, e.y, '#38bdf8', 5);
                    hits++;
                    if (hits >= 4) break;
                }
            }
            if (hits > 0) audio.playHit();
        }
    }
}

/**
 * 2. onDamageTaken(amount): Called once when player takes damage in SurvivalGame.tsx
 */
export function onDamageTaken(
    state: MutableGameState,
    amount: number,
    mods: RunMods | undefined,
    currentHpAfterHit: number,
    healPlayer?: (heal: number) => void
): boolean {
    if (!mods) return false;

    // Time Rift: Taking damage slows all enemies 60% for 2.5 s
    if (mods.timeRiftCount > 0) {
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            e.frozenTimer = Math.max(e.frozenTimer || 0, BOON_LOGIC_CONFIG.timeRiftSlowFrames);
            e.speed = (e.spawnSpeed || e.def.baseSpeed) * 0.4;
        }
        VFX.castShockwave(state, state.player.x, state.player.y, '#38bdf8');
    }

    // Phoenix Spark: Once per run, fatal hit revives at 50% HP + shockwave
    if (mods.phoenixSparkCount > 0 && currentHpAfterHit <= 0 && !phoenixUsedThisRun) {
        phoenixUsedThisRun = true;
        if (healPlayer) healPlayer(-1); // -1 signals 50% max HP revive
        state.player.invulnTimer = 90;
        state.projectiles.push(acquireProjectile({
            x: state.player.x,
            y: state.player.y,
            vx: 0,
            vy: 0,
            size: 240,
            color: '#fbbf24',
            damage: 250 * (mods.damageMult || 1),
            isEnemy: false,
            life: 20,
            visualType: 'EXPLOSION_AREA'
        }));
        VFX.castShockwave(state, state.player.x, state.player.y, '#fbbf24');
        audio.playKill(5);
        return true; // Saved by Phoenix Spark
    }

    return false;
}

/**
 * 3. onWaveClear(wave): Called once per wave clear in SurvivalGame.tsx
 */
export function onWaveClear(state: MutableGameState, wave: number, mods: RunMods | undefined): void {
    resetBoonWaveState();
    if (!mods) return;
    if (mods.supernovaCoreCount > 0) {
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (!e.isBoss) {
                e.hp -= BOON_LOGIC_CONFIG.supernovaDamage * mods.supernovaCoreCount;
            }
        }
    }
}

/**
 * 4. onDash(): Called once when player initiates a dash in PlayerLogic.ts
 */
export function onDash(state: MutableGameState, mods: RunMods | undefined): void {
    state.dashesUsedInWave = (state.dashesUsedInWave || 0) + 1;
    if (!mods) return;

    // Frost Trail: dash leaves a slow field 1.5 s
    if (mods.frostTrailCount > 0) {
        const radius = BOON_LOGIC_CONFIG.frostTrailRadius * (1 + (mods.aoeRadiusMult || 0));
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            const dx = e.x - state.player.x;
            const dy = e.y - state.player.y;
            if (dx * dx + dy * dy <= radius * radius * 2.2) {
                e.frozenTimer = Math.max(e.frozenTimer || 0, BOON_LOGIC_CONFIG.frostTrailDurationFrames);
                e.speed = (e.spawnSpeed || e.def.baseSpeed) * 0.45;
            }
        }
        for (let k = 0; k < 8; k++) {
            createParticle(state, state.player.x, state.player.y, ParticleType.ICE, '#38bdf8', { speed: 3, life: 35, size: 4 });
        }
    }

    // Lightning Dash: dashing zaps 3 nearest enemies
    if (mods.lightningDashCount > 0) {
        const maxTargets = BOON_LOGIC_CONFIG.lightningDashTargets;
        const rangeSq = BOON_LOGIC_CONFIG.lightningDashRange * BOON_LOGIC_CONFIG.lightningDashRange;
        const dmg = BOON_LOGIC_CONFIG.lightningDashDamage * mods.lightningDashCount * (mods.damageMult || 1);
        let zapped = 0;
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e.hp <= 0) continue;
            const dx = e.x - state.player.x;
            const dy = e.y - state.player.y;
            if (dx * dx + dy * dy <= rangeSq) {
                e.hp -= dmg;
                e.paralyzedTimer = e.isBoss ? 45 : 75;
                VFX.spark(state, e.x, e.y, '#38bdf8', 5);
                zapped++;
                if (zapped >= maxTargets) break;
            }
        }
        if (zapped > 0) audio.playHit();
    }
}
