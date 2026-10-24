
import { AbilityNodeData, AbilityType, PlayerStats } from './types';
import { POWERS, PowerDefinition } from './abilityConfig';

// --- CONFIGURATION ---
const MIN_NODE_DISTANCE = 80;

// --- HELPER FUNCTIONS ---
const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// --- TREE GENERATION ---
const generateTree = (): AbilityNodeData[] => {
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
            const a = angle + (Math.random() - 0.5) * spread;
            const d = dist + (Math.random() * 40);
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
        // Modified: isMajor is ONLY true if it is explicitly a skill node. No random chance.
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
            const r = Math.random();
            // BUFFED VALUES & NEW UNIQUE ICONS
            if (r < 0.4) { 
                title = "Radiance"; statEffect = { damageAura: 0.25 }; display = "+0.25 Aura Dmg"; icon = "Target"; 
            } else if (r < 0.7) { 
                title = "Fervor"; statEffect = { attackSpeed: 0.05 }; display = "+5% Atk Spd"; icon = "Sword"; 
            } else { 
                title = "Expansion"; statEffect = { projectileCount: 0.25 }; display = "+0.25 Projectile"; icon = "Copy"; 
            }
        } else if (type === AbilityType.DEFENSE) {
            const r = Math.random();
            // Health/Regen kept same. New Icons.
            if (r < 0.4) { 
                title = "Fortitude"; statEffect = { maxHealth: 0.2 }; display = "+0.2 Max HP"; icon = "PlusSquare"; 
            } else if (r < 0.7) { 
                title = "Mending"; statEffect = { healthRegen: 0.05 }; display = "+0.05 Regen/s"; icon = "Heart"; 
            } else { 
                title = "Willpower"; statEffect = { maxHealth: 0.1 }; display = "+0.1 Max HP"; icon = "Activity"; 
            }
        } else if (type === AbilityType.UTILITY) {
             const r = Math.random();
             // BUFFED VALUES & NEW ICONS
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

    // Distribute Powers roughly by type
    const offensePowers = POWERS.filter(p => p.type === AbilityType.OFFENSE);
    const defensePowers = POWERS.filter(p => p.type === AbilityType.DEFENSE);
    const utilityPowers = POWERS.filter(p => p.type === AbilityType.UTILITY);

    const getPower = (type: AbilityType, level: number): PowerDefinition => {
        let pool = utilityPowers;
        if (type === AbilityType.OFFENSE) pool = offensePowers;
        if (type === AbilityType.DEFENSE) pool = defensePowers;
        return pool[level % pool.length];
    };

    const ARCS = [
        { type: AbilityType.OFFENSE, angle: -Math.PI / 2 },
        { type: AbilityType.DEFENSE, angle: Math.PI / 6 },
        { type: AbilityType.UTILITY, angle: (Math.PI * 5) / 6 }
    ];

    ARCS.forEach(arc => {
        let currentParent = origin;
        let currentAngle = arc.angle;
        let powerCounter = 0; 

        for (let i = 0; i < 60; i++) {
            currentAngle += (Math.random() - 0.5) * 0.3;
            const dist = 100 + (i * 5); 
            const spot = findSpot(currentParent.position.x, currentParent.position.y, currentAngle, dist, 0.6);
            
            if (spot) {
                const isSkill = i % 4 === 2; 
                let forcedParams = undefined;
                
                if (isSkill) {
                    const power = getPower(arc.type, powerCounter);
                    const skillStat: Partial<PlayerStats> = {};
                    (skillStat as any)[power.propName] = 1;
                    
                    forcedParams = {
                        id: `${power.id}_node_${i}`,
                        title: `${power.name}`,
                        desc: power.description,
                        display: "UNLOCK / UPGRADE",
                        icon: power.icon,
                        statEffect: skillStat
                    };
                    powerCounter++;
                }

                const node = createNode(currentParent, spot, arc.type, i, isSkill, forcedParams);
                nodes.push(node);
                currentParent = node;

                const clusterChance = 0.8;
                if (Math.random() < clusterChance) {
                    const clusterSize = Math.floor(Math.random() * 2) + 1;
                    for(let k=0; k<clusterSize; k++) {
                        const cAngle = currentAngle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI/3 + Math.random() * 0.5);
                        const cSpot = findSpot(node.position.x, node.position.y, cAngle, 80, 0.5);
                        if (cSpot) {
                            nodes.push(createNode(node, cSpot, arc.type, i + 1));
                        }
                    }
                }
            }
        }
    });

    return nodes;
};

export const ABILITY_TREE_DATA = generateTree();
