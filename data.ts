
import { AbilityNodeData, AbilityType, PlayerStats } from './types';
import { POWERS, PowerDefinition } from './abilityConfig';

// --- CONFIGURATION ---
// Restored from the pre-patch build so the constellation keeps its original
// branching layout and node spacing.
const MIN_NODE_DISTANCE = 80;

// --- HELPER FUNCTIONS ---
const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Seeded PRNG for deterministic tree generation (matches original build)
const createPRNG = (seed: number) => {
    return () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// --- TREE GENERATION ---
// Reproduces the "Constellation of Virtues" layout from the original build:
//   * 3 main arcs (Offense / Defense / Utility), each grown as a chain of 60 spine
//     nodes radiating outward from THE SPARK.
//   * Skill (power) nodes are placed on the spine every 4 steps (offset 2), so the
//     player finds a major unlock every few hops along each arm.
//   * Each spine node has an 80% chance to sprout 1-2 minor branch nodes at wide
//     side angles — this is what gives the tree its constellation shape rather
//     than the tight single-line spiral of the intermediate patched build.
const generateTree = (): AbilityNodeData[] => {
    const random = createPRNG(42); // Seeded random for determinism
    const nodes: AbilityNodeData[] = [];
    let idCounter = 0;

    // 1. ORIGIN (Root)
    const origin: AbilityNodeData = {
        id: 'root',
        title: 'THE SPARK',
        description: 'A faint glimmer in the infinite dark.',
        cost: 0,
        position: { x: 0, y: 0 },
        parentIds: [],
        type: AbilityType.CORE,
        icon: 'Sun',
        statBoostDisplay: 'Base Stats',
        statEffect: { moveSpeed: 0.05, maxHealth: 0 },
        isMajor: true
    };
    nodes.push(origin);

    const isValidPosition = (x: number, y: number, excludeParentId: string) => {
        return !nodes.some(n => {
            if (n.id === excludeParentId) return false;
            return getDistance(n.position, {x, y}) < MIN_NODE_DISTANCE;
        });
    };

    const findSpot = (px: number, py: number, angle: number, dist: number, spread: number): {x: number, y: number} | null => {
        const attempts = 15;
        for(let i=0; i<attempts; i++) {
            const a = angle + (random() - 0.5) * spread;
            const d = dist + (random() * 40);
            const x = px + Math.cos(a) * d;
            const y = py + Math.sin(a) * d;
            if (isValidPosition(x, y, '')) return { x, y };
        }
        return null;
    };

    const createNode = (
        parent: AbilityNodeData,
        pos: {x: number, y: number},
        type: AbilityType,
        depth: number,
        isSkill: boolean = false,
        forcedParams?: any
    ): AbilityNodeData => {
        idCounter++;
        // isMajor is ONLY true for the explicit skill (power-unlock) nodes.
        const isMajor = isSkill;

        let statEffect: Partial<PlayerStats> = {};
        let title = "Minor Node";
        let desc = "Slight improvement.";
        let display = "";
        let icon = "Circle";

        // --- COST CALCULATION ---
        // Base exponential curve
        let cost = Math.floor(20 * Math.pow(1.11, depth));

        // Tier Jumps (Wave Simulation)
        let tierMultiplier = 1;
        if (depth >= 10 && depth < 20) tierMultiplier = 2.5;  // Wave 11-20 Difficulty Spike
        if (depth >= 20 && depth < 30) tierMultiplier = 6.0;  // Wave 21-30
        if (depth >= 30 && depth < 40) tierMultiplier = 15.0; // Wave 31-40
        if (depth >= 40 && depth < 50) tierMultiplier = 40.0; // Wave 41-50
        if (depth >= 50) tierMultiplier = 100.0;              // Wave 51+

        cost = Math.floor(cost * tierMultiplier);

        if (forcedParams) {
            title = forcedParams.title;
            desc = forcedParams.desc;
            display = forcedParams.display;
            icon = forcedParams.icon;
            statEffect = forcedParams.statEffect;
            if (isSkill) cost = Math.floor(cost * 3);
        } else if (type === AbilityType.OFFENSE) {
            const r = random();
            if (r < 0.4) {
                title = "Radiance"; statEffect = { damageAura: 0.25 }; display = "+0.25 Aura Dmg"; icon = "Target";
            } else if (r < 0.7) {
                title = "Fervor"; statEffect = { attackSpeed: 0.05 }; display = "+5% Atk Spd"; icon = "Sword";
            } else {
                title = "Expansion"; statEffect = { projectileCount: 0.25 }; display = "+0.25 Projectile"; icon = "Copy";
            }
        } else if (type === AbilityType.DEFENSE) {
            const r = random();
            if (r < 0.4) {
                title = "Fortitude"; statEffect = { maxHealth: 0.2 }; display = "+0.2 Max HP"; icon = "PlusSquare";
            } else if (r < 0.7) {
                title = "Mending"; statEffect = { healthRegen: 0.05 }; display = "+0.05 Regen/s"; icon = "Heart";
            } else {
                title = "Willpower"; statEffect = { maxHealth: 0.1 }; display = "+0.1 Max HP"; icon = "Activity";
            }
        } else if (type === AbilityType.UTILITY) {
             const r = random();
             if (r < 0.5) {
                 title = "Influence"; statEffect = { pickupRange: 10 }; display = "+10 Range"; icon = "Magnet";
             } else if (r < 0.8) {
                 title = "Celerity"; statEffect = { moveSpeed: 0.03 }; display = "+3% Speed"; icon = "ChevronsRight";
             } else {
                 title = "Insight"; statEffect = { essenceMultiplier: 0.15 }; display = "+15% Essence"; icon = "Gem";
             }
        }

        return {
            id: forcedParams?.id || `node_${idCounter}`,
            title,
            description: desc,
            cost,
            position: pos,
            parentIds: [parent.id],
            type,
            icon,
            statEffect,
            statBoostDisplay: display,
            isMajor
        };
    };

    // Split the powers by type for the three arcs.
    const offensePowers = POWERS.filter(p => p.type === AbilityType.OFFENSE);
    const defensePowers = POWERS.filter(p => p.type === AbilityType.DEFENSE);
    const utilityPowers = POWERS.filter(p => p.type === AbilityType.UTILITY);

    // Cycle helper: skill slots repeat through the arc's power list so long arcs
    // still fill up (some powers appear more than once = upgrade tiers).
    const pickPower = (type: AbilityType, counter: number): PowerDefinition => {
        let list = utilityPowers;
        if (type === AbilityType.OFFENSE) list = offensePowers;
        else if (type === AbilityType.DEFENSE) list = defensePowers;
        return list[counter % list.length];
    };

    const ARCS: { type: AbilityType; angle: number }[] = [
        { type: AbilityType.OFFENSE, angle: -Math.PI / 2 },
        { type: AbilityType.DEFENSE, angle: Math.PI / 6 },
        { type: AbilityType.UTILITY, angle: (Math.PI * 5) / 6 }
    ];

    ARCS.forEach((arc) => {
        let currentParent = origin;
        let currentAngle = arc.angle;
        let powerCounter = 0;

        // 60 spine nodes per arm — matches the original layout.
        for (let step = 0; step < 60; step++) {
            currentAngle += (random() - 0.5) * 0.3;
            const dist = 100 + step * 5;
            const spot = findSpot(currentParent.position.x, currentParent.position.y, currentAngle, dist, 0.6);

            if (spot) {
                // Skill nodes: every 4th spine step, offset by 2. Produces roughly
                // 15 major unlock nodes per arm (indices 2, 6, 10, ...).
                const isSkill = step % 4 === 2;

                let forcedParams: any = undefined;
                if (isSkill) {
                    const power = pickPower(arc.type, powerCounter);
                    const skillStat: Partial<PlayerStats> = {};
                    (skillStat as any)[power.propName] = 1;

                    forcedParams = {
                        id: `${power.id}_node_${step}`,
                        title: `${power.name}`,
                        desc: power.description,
                        display: "UNLOCK / UPGRADE",
                        icon: power.icon,
                        statEffect: skillStat
                    };
                    powerCounter++;
                }

                const node = createNode(currentParent, spot, arc.type, step, isSkill, forcedParams);
                nodes.push(node);
                currentParent = node;

                // Side branches: 80% chance to sprout 1-2 minor nodes off to the side,
                // giving the tree its constellation-like silhouette.
                if (random() < 0.8) {
                    const branchCount = Math.floor(random() * 2) + 1;
                    for (let b = 0; b < branchCount; b++) {
                        const sideSign = random() > 0.5 ? 1 : -1;
                        const branchAngle = currentAngle + sideSign * (Math.PI / 3 + random() * 0.5);
                        const branchSpot = findSpot(node.position.x, node.position.y, branchAngle, 80, 0.5);
                        if (branchSpot) {
                            nodes.push(createNode(node, branchSpot, arc.type, step + 1));
                        }
                    }
                }
            }
        }
    });

    return nodes;
};

export const ABILITY_TREE_DATA = generateTree();

export const getNodeParentChain = (targetId: string): string[] => {
    const chain: string[] = [];
    let current = ABILITY_TREE_DATA.find(n => n.id === targetId);
    
    while (current && current.id !== 'root') {
        chain.unshift(current.id);
        const parentId = current.parentIds[0];
        current = ABILITY_TREE_DATA.find(n => n.id === parentId);
    }
    return chain;
};
