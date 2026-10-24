import { useState, useCallback, useMemo, useEffect } from 'react';
import { PlayerStats } from '../types';
import { BOONS_DATA, BOON_CONFIG, Boon, BoonRarity, RunMods } from '../data/boons';

const STORAGE_KEY_NODE_BOONS = 'lrv_active_node_boons_v1';
const STORAGE_KEY_FIRST_DRAFT_DONE = 'lrv_first_curated_draft_done_v1';

export function createEmptyRunMods(): RunMods {
    return {
        stats: {},
        damageMult: 1.0,
        aoeRadiusMult: 0,
        healImmediate: 0,
        shieldPipImmediate: 0,
        highestPowerBonus: 0,
        chainReactionCount: 0,
        vampiricLightCount: 0,
        staticChargeCount: 0,
        frostTrailCount: 0,
        overdriveCount: 0,
        phoenixSparkCount: 0,
        gravityWellCount: 0,
        echoCastCount: 0,
        lightningDashCount: 0,
        supernovaCount: 0,
        secondSunCount: 0,
        supernovaCoreCount: 0,
        timeRiftCount: 0,
        crownOfSparksCount: 0,
        voidHarvesterCount: 0
    };
}

export function computeRunMods(ownedIds: string[]): RunMods {
    const mods = createEmptyRunMods();
    for (let i = 0; i < ownedIds.length; i++) {
        const id = ownedIds[i];
        const boon = BOONS_DATA.find(b => b.id === id);
        if (boon) {
            boon.apply(mods);
        }
    }
    return mods;
}

const POWER_KEYS: (keyof PlayerStats)[] = [
    'fireBlastLevel',
    'iceNovaLevel',
    'thunderChainLevel',
    'homingMissileLevel',
    'fireflyLevel',
    'nebulaTrailLevel',
    'singularityLevel',
    'solarFlareLevel',
    'luxBladesLevel',
    'repulsionFieldLevel',
    'plasmaWhipLevel'
];

export function applyBoons(baseStats: PlayerStats, ownedIds: string[]): { effectiveStats: PlayerStats; runMods: RunMods } {
    const runMods = computeRunMods(ownedIds);
    const effective: PlayerStats = { ...baseStats };

    const d = runMods.stats;
    if (d.maxHealth) effective.maxHealth = Math.max(1, effective.maxHealth + d.maxHealth);
    if (d.healthRegen) effective.healthRegen += d.healthRegen;
    if (d.moveSpeed) effective.moveSpeed += d.moveSpeed;
    if (d.dashCooldown) effective.dashCooldown = Math.max(24, effective.dashCooldown + d.dashCooldown);
    if (d.pickupRange) effective.pickupRange += d.pickupRange;
    if (d.damageAura) effective.damageAura += d.damageAura;
    if (d.projectileCount) effective.projectileCount += d.projectileCount;
    if (d.attackSpeed) effective.attackSpeed += d.attackSpeed;
    if (d.essenceMultiplier) effective.essenceMultiplier += d.essenceMultiplier;
    if (d.superDashLevel) effective.superDashLevel += d.superDashLevel;
    if (d.titanShieldLevel) effective.titanShieldLevel += d.titanShieldLevel;
    if (d.solarFlareLevel) effective.solarFlareLevel += d.solarFlareLevel;
    if (d.special_iceNovaSize) effective.special_iceNovaSize = true;

    if (runMods.highestPowerBonus > 0) {
        let bestKey: keyof PlayerStats = 'fireBlastLevel';
        let bestVal = -1;
        for (let i = 0; i < POWER_KEYS.length; i++) {
            const k = POWER_KEYS[i];
            const val = (effective[k] as number) || 0;
            if (val > bestVal) {
                bestVal = val;
                bestKey = k;
            }
        }
        (effective[bestKey] as number) = ((effective[bestKey] as number) || 0) + runMods.highestPowerBonus;
    }

    return { effectiveStats: effective, runMods };
}

export function useRunBoons(
    baseStats: PlayerStats,
    currentMapId: string,
    onSpendEssence?: (amount: number) => void
) {
    // Load persisted boons for the same map node if BOON_PERSIST === 'NODE'
    const [ownedBoonIds, setOwnedBoonIds] = useState<string[]>(() => {
        if (BOON_CONFIG.BOON_PERSIST === 'WAVE') return [];
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY_NODE_BOONS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.mapId === currentMapId && Array.isArray(parsed.boons)) {
                    return parsed.boons;
                }
            }
        } catch {
            // ignore
        }
        return [];
    });

    const [banishedIds, setBanishedIds] = useState<string[]>([]);
    const [banishesRemaining, setBanishesRemaining] = useState<number>(BOON_CONFIG.banishesPerRun);
    const [freeRerollsRemaining, setFreeRerollsRemaining] = useState<number>(BOON_CONFIG.freeRerollsPerWave);
    const [offeredBoons, setOfferedBoons] = useState<Boon[] | null>(null);
    const [guaranteedRareNext, setGuaranteedRareNext] = useState<boolean>(false);

    // Sync owned boons to sessionStorage keyed by currentMapId so respawns inside the same node restore boons,
    // while entering a new node clears them.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY_NODE_BOONS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.mapId !== currentMapId) {
                    setOwnedBoonIds([]);
                    sessionStorage.setItem(STORAGE_KEY_NODE_BOONS, JSON.stringify({ mapId: currentMapId, boons: [] }));
                    return;
                }
            }
            sessionStorage.setItem(STORAGE_KEY_NODE_BOONS, JSON.stringify({ mapId: currentMapId, boons: ownedBoonIds }));
        } catch {
            // ignore
        }
    }, [currentMapId, ownedBoonIds]);

    const canSelectBoon = useCallback((boon: Boon, currentOwned: string[], currentBanished: string[]) => {
        if (currentBanished.includes(boon.id)) return false;
        if (boon.stackable) return true;
        let count = 0;
        for (let i = 0; i < currentOwned.length; i++) {
            if (currentOwned[i] === boon.id) count++;
        }
        return count < BOON_CONFIG.maxDuplicates;
    }, []);

    const rollThreeBoons = useCallback((forceRarePlus: boolean, currentOwned: string[], currentBanished: string[]): Boon[] => {
        // Check if this is the very first draft of the save -> curated: 1 offense, 1 defense, 1 utility common
        try {
            const firstDone = localStorage.getItem(STORAGE_KEY_FIRST_DRAFT_DONE);
            if (!firstDone && !forceRarePlus && currentOwned.length === 0) {
                localStorage.setItem(STORAGE_KEY_FIRST_DRAFT_DONE, '1');
                const off = BOONS_DATA.find(b => b.curatedCategory === 'offense') || BOONS_DATA[0];
                const def = BOONS_DATA.find(b => b.curatedCategory === 'defense') || BOONS_DATA[1];
                const util = BOONS_DATA.find(b => b.curatedCategory === 'utility') || BOONS_DATA[2];
                return [off, def, util];
            }
        } catch {
            // ignore
        }

        const picked: Boon[] = [];
        for (let slot = 0; slot < 3; slot++) {
            const mustBeRarePlus = forceRarePlus && slot === 0;
            const eligible = BOONS_DATA.filter(b => {
                if (!canSelectBoon(b, currentOwned, currentBanished)) return false;
                if (picked.some(p => p.id === b.id)) return false;
                if (mustBeRarePlus && b.rarity !== 'rare' && b.rarity !== 'epic') return false;
                return true;
            });

            if (eligible.length === 0) break;

            let totalWeight = 0;
            for (let i = 0; i < eligible.length; i++) {
                totalWeight += BOON_CONFIG.weights[eligible[i].rarity];
            }
            let r = Math.random() * totalWeight;
            let chosen = eligible[0];
            for (let i = 0; i < eligible.length; i++) {
                r -= BOON_CONFIG.weights[eligible[i].rarity];
                if (r <= 0) {
                    chosen = eligible[i];
                    break;
                }
            }
            picked.push(chosen);
        }
        return picked;
    }, [canSelectBoon]);

    const offer = useCallback((options?: { guaranteedRarePlus?: boolean }) => {
        const rarePlus = !!(options?.guaranteedRarePlus || guaranteedRareNext);
        setGuaranteedRareNext(false);
        setFreeRerollsRemaining(BOON_CONFIG.freeRerollsPerWave);
        const cards = rollThreeBoons(rarePlus, ownedBoonIds, banishedIds);
        if (cards.length > 0) {
            setOfferedBoons(cards);
        }
    }, [guaranteedRareNext, ownedBoonIds, banishedIds, rollThreeBoons]);

    const pick = useCallback((boon: Boon, onImmediateEffects?: (heal: number, shieldPips: number) => void) => {
        setOwnedBoonIds(prev => [...prev, boon.id]);
        setOfferedBoons(null);
        if (onImmediateEffects) {
            const tempMods = createEmptyRunMods();
            boon.apply(tempMods);
            if (tempMods.healImmediate > 0 || tempMods.shieldPipImmediate > 0) {
                onImmediateEffects(tempMods.healImmediate, tempMods.shieldPipImmediate);
            }
        }
    }, []);

    const reroll = useCallback((currentMatter: number): boolean => {
        if (!offeredBoons) return false;
        if (freeRerollsRemaining > 0) {
            setFreeRerollsRemaining(r => r - 1);
            setOfferedBoons(rollThreeBoons(false, ownedBoonIds, banishedIds));
            return true;
        }
        if (currentMatter >= BOON_CONFIG.rerollCostEssence) {
            if (onSpendEssence) onSpendEssence(BOON_CONFIG.rerollCostEssence);
            setOfferedBoons(rollThreeBoons(false, ownedBoonIds, banishedIds));
            return true;
        }
        return false;
    }, [offeredBoons, freeRerollsRemaining, rollThreeBoons, ownedBoonIds, banishedIds, onSpendEssence]);

    const banish = useCallback((boonId: string) => {
        if (banishesRemaining <= 0 || !offeredBoons) return;
        const nextBanished = [...banishedIds, boonId];
        setBanishedIds(nextBanished);
        setBanishesRemaining(b => b - 1);
        const replacement = rollThreeBoons(false, ownedBoonIds, nextBanished).find(
            cand => !offeredBoons.some(o => o.id === cand.id)
        );
        if (replacement) {
            setOfferedBoons(offeredBoons.map(o => (o.id === boonId ? replacement : o)));
        } else {
            setOfferedBoons(offeredBoons.filter(o => o.id !== boonId));
        }
    }, [banishesRemaining, offeredBoons, banishedIds, rollThreeBoons, ownedBoonIds]);

    const { effectiveStats, runMods } = useMemo(
        () => applyBoons(baseStats, ownedBoonIds),
        [baseStats, ownedBoonIds]
    );

    return {
        ownedBoonIds,
        offeredBoons,
        effectiveStats,
        runMods,
        freeRerollsRemaining,
        banishesRemaining,
        offer,
        pick,
        reroll,
        banish,
        setGuaranteedRareNext
    };
}
