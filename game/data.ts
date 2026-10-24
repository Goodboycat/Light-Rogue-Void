
import { AbilityNodeData, AbilityType, PlayerStats } from './types';
import { POWERS, PowerDefinition } from './abilityConfig';
import { mulberry32 } from './utils/rng';
import { CHAPTERS } from './components/game/Constants';

// =====================================================================
//  LIGHT skill tree (1B) — deterministic constellation.
//  Seed "LIGH" = 0x4C494748. Same tree on every device, every build.
//  Node ids are stable: `${arc}_${depth}_${index}`; power nodes use
//  `${power.id}_node_${depth}`; constellation nodes `const_${bossId}_${n}`.
//  This is the ONLY source of permanent power (roguelite, no in-run picks).
// =====================================================================

export const TREE_SEED = 0x4c494748;
const MIN_NODE_DISTANCE = 80;
const ARC_LENGTH = 60;          // nodes along each spine
const ARC_NAMES: Record<AbilityType, string> = {
  [AbilityType.CORE]: 'core',
  [AbilityType.OFFENSE]: 'off',
  [AbilityType.DEFENSE]: 'def',
  [AbilityType.UTILITY]: 'uti',
} as Record<AbilityType, string>;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Cost curve: exponential base + tier jumps that mirror chapter difficulty. */
export const nodeCost = (depth: number, isSkill: boolean): number => {
  let cost = Math.floor(20 * Math.pow(1.11, depth));
  let tier = 1;
  if (depth >= 10 && depth < 20) tier = 2.5;
  if (depth >= 20 && depth < 30) tier = 6.0;
  if (depth >= 30 && depth < 40) tier = 15.0;
  if (depth >= 40 && depth < 50) tier = 40.0;
  if (depth >= 50) tier = 100.0;
  cost = Math.floor(cost * tier);
  return isSkill ? Math.floor(cost * 3) : cost;
};

interface MinorDef { title: string; stat: Partial<PlayerStats>; display: string; icon: string; w: number }
const MINORS: Record<string, MinorDef[]> = {
  off: [
    { title: 'Radiance',  stat: { damageAura: 0.25 },      display: '+0.25 Aura Dmg',   icon: 'Target', w: 4 },
    { title: 'Fervor',    stat: { attackSpeed: 0.05 },     display: '+5% Atk Spd',      icon: 'Sword',  w: 3 },
    { title: 'Expansion', stat: { projectileCount: 0.25 }, display: '+0.25 Projectile', icon: 'Copy',   w: 3 },
  ],
  def: [
    { title: 'Fortitude', stat: { maxHealth: 0.2 },    display: '+0.2 Max HP',    icon: 'PlusSquare', w: 4 },
    { title: 'Mending',   stat: { healthRegen: 0.05 }, display: '+0.05 Regen/s',  icon: 'Heart',      w: 3 },
    { title: 'Willpower', stat: { maxHealth: 0.1 },    display: '+0.1 Max HP',    icon: 'Activity',   w: 3 },
  ],
  uti: [
    { title: 'Influence', stat: { pickupRange: 10 },         display: '+10 Range',   icon: 'Magnet',        w: 5 },
    { title: 'Celerity',  stat: { moveSpeed: 0.03 },         display: '+3% Speed',   icon: 'ChevronsRight', w: 3 },
    { title: 'Insight',   stat: { essenceMultiplier: 0.15 }, display: '+15% Essence',icon: 'Gem',           w: 2 },
  ],
};

const weightedPick = (rng: () => number, defs: MinorDef[]): MinorDef => {
  const total = defs.reduce((s, d) => s + d.w, 0);
  let r = rng() * total;
  for (const d of defs) { r -= d.w; if (r <= 0) return d; }
  return defs[defs.length - 1];
};

// ---------------------------------------------------------------------
//  Constellations: one 7-node cluster per chapter, revealed by its boss.
// ---------------------------------------------------------------------
interface ConstNode { title: string; stat: Partial<PlayerStats>; display: string; icon: string; desc: string }
const CONSTELLATIONS: Record<string, { name: string; nodes: ConstNode[] }> = {
  hive_mind: { name: 'The Swarm', nodes: [
    { title: 'Drone Memory',   stat: { fireflyLevel: 1 },        display: '+1 Fireflies',      icon: 'Sparkles', desc: 'The hive remembers how to multiply.' },
    { title: 'Many Mouths',    stat: { projectileCount: 0.5 },   display: '+0.5 Projectile',   icon: 'Copy',     desc: 'Light splits like a swarm.' },
    { title: 'Acid Lesson',    stat: { damageAura: 0.5 },        display: '+0.5 Aura Dmg',     icon: 'Target',   desc: 'You learned to burn what touches you.' },
    { title: 'Spawner Scar',   stat: { attackSpeed: 0.1 },       display: '+10% Atk Spd',      icon: 'Sword',    desc: 'Kill the source first.' },
    { title: 'Hive Hum',       stat: { fireflyLevel: 1 },        display: '+1 Fireflies',      icon: 'Sparkles', desc: 'A chorus of small lights.' },
    { title: 'Carapace',       stat: { maxHealth: 0.5 },         display: '+0.5 Max HP',       icon: 'Shield',   desc: 'Borrowed armour.' },
    { title: 'Queen\'s Echo',  stat: { projectileCount: 1 },     display: '+1 Projectile',     icon: 'Crown',    desc: 'The Hive Mind is silent. You are not.' },
  ]},
  void_warden: { name: 'The Warden', nodes: [
    { title: 'Ricochet Reading', stat: { superDashLevel: 1 },   display: '+1 Super Dash',     icon: 'FastForward', desc: 'Dash through the line, not away.' },
    { title: 'Quick Step',       stat: { dashCooldown: -0.1 },  display: '-0.1s Dash CD',     icon: 'Wind',        desc: 'Less waiting between escapes.' },
    { title: 'Long Stride',      stat: { dashDuration: 0.05 },  display: '+0.05s Dash',       icon: 'ChevronsRight', desc: 'A little further each time.' },
    { title: 'Nebula Lungs',     stat: { healthRegen: 0.1 },    display: '+0.1 Regen/s',      icon: 'Heart',       desc: 'You can breathe in the toxin now.' },
    { title: 'Warden\'s Gait',   stat: { moveSpeed: 0.05 },     display: '+5% Speed',         icon: 'ChevronsRight', desc: 'Patrol routes memorised.' },
    { title: 'Phase Blink',      stat: { superDashLevel: 1 },   display: '+1 Super Dash',     icon: 'FastForward', desc: 'The dash leaves a mark.' },
    { title: 'Key to the Grove', stat: { dashCooldown: -0.2 },  display: '-0.2s Dash CD',     icon: 'Key',         desc: 'The Warden kept the gate. Now you do.' },
  ]},
  crimson_eclipse: { name: 'The Eclipse', nodes: [
    { title: 'Safe Wedge',      stat: { maxHealth: 0.3 },     display: '+0.3 Max HP',   icon: 'PlusSquare', desc: 'You know where the laser is not.' },
    { title: 'Corona',          stat: { damageAura: 0.5 },    display: '+0.5 Aura Dmg', icon: 'Sun',        desc: 'Your light has an edge.' },
    { title: 'Ember Blast',     stat: { fireBlastLevel: 1 },  display: '+1 Fire Blast', icon: 'Flame',      desc: 'Stolen fire.' },
    { title: 'Afterimage',      stat: { attackSpeed: 0.1 },   display: '+10% Atk Spd',  icon: 'Sword',      desc: 'Faster than the sweep.' },
    { title: 'Red Shift',       stat: { damageAura: 0.5 },    display: '+0.5 Aura Dmg', icon: 'Target',     desc: 'Burn hotter, closer.' },
    { title: 'Flare Memory',    stat: { solarFlareLevel: 1 }, display: '+1 Solar Flare',icon: 'Sun',        desc: 'The eclipse ended. You remember the flash.' },
    { title: 'Crown of Crimson',stat: { fireBlastLevel: 1 },  display: '+1 Fire Blast', icon: 'Crown',      desc: 'The Eclipse is broken. Its heat is yours.' },
  ]},
  neutron_star: { name: 'The Collapse', nodes: [
    { title: 'Gravity Sense',  stat: { pickupRange: 25 },          display: '+25 Range',     icon: 'Magnet', desc: 'Pull what falls toward you.' },
    { title: 'Orbit Reading',  stat: { repulsionForce: 0.1 },      display: '+10% Repulsion',icon: 'Wifi',   desc: 'Push the rings back.' },
    { title: 'Dense Core',     stat: { maxHealth: 0.4 },           display: '+0.4 Max HP',   icon: 'Shield', desc: 'Heavier. Harder.' },
    { title: 'Pulse Timing',   stat: { repulsionFieldLevel: 1 },   display: '+1 Repulsion',  icon: 'Wifi',   desc: 'Answer every pulse.' },
    { title: 'Event Horizon',  stat: { pickupRange: 25 },          display: '+25 Range',     icon: 'Magnet', desc: 'Nothing escapes you either.' },
    { title: 'Collapse Lesson',stat: { essenceMultiplier: 0.2 },   display: '+20% Essence',  icon: 'Gem',    desc: 'Matter condenses.' },
    { title: 'Singular Will',  stat: { singularityLevel: 1 },      display: '+1 Singularity',icon: 'Atom',   desc: 'The star fell in. You stood.' },
  ]},
  entropy_titan: { name: 'The Titan', nodes: [
    { title: 'Brace',          stat: { maxHealth: 0.5 },      display: '+0.5 Max HP',    icon: 'PlusSquare', desc: 'Stand through the slam.' },
    { title: 'Shock Reading',  stat: { healthRegen: 0.1 },    display: '+0.1 Regen/s',   icon: 'Heart',      desc: 'The wave passes. You heal.' },
    { title: 'Aegis Memory',   stat: { titanShieldLevel: 1 }, display: '+1 Guardian Aegis', icon: 'Shield',  desc: 'A shield that remembers.' },
    { title: 'Shrinking Arena',stat: { moveSpeed: 0.04 },     display: '+4% Speed',      icon: 'ChevronsRight', desc: 'Less room, more precision.' },
    { title: 'Titan Bone',     stat: { maxHealth: 0.5 },      display: '+0.5 Max HP',    icon: 'Activity',   desc: 'Grafted endurance.' },
    { title: 'Entropy Reversal',stat: { healthRegen: 0.15 },  display: '+0.15 Regen/s',  icon: 'Heart',      desc: 'Order, briefly.' },
    { title: 'Unbroken',       stat: { titanShieldLevel: 1 }, display: '+1 Guardian Aegis', icon: 'Crown',   desc: 'The Titan fell. The wastes are quiet.' },
  ]},
  darkness: { name: 'The Seam', nodes: [
    { title: 'Mirror Light',   stat: { essenceMultiplier: 0.25 }, display: '+25% Essence', icon: 'Gem',    desc: 'It copied you. You learned from the copy.' },
    { title: 'Void Patience',  stat: { attackSpeed: 0.1 },        display: '+10% Atk Spd', icon: 'Sword',  desc: 'Wait, then strike.' },
    { title: 'Seam Walker',    stat: { moveSpeed: 0.05 },         display: '+5% Speed',    icon: 'ChevronsRight', desc: 'Between light and not-light.' },
    { title: 'Twin Spark',     stat: { projectileCount: 1 },      display: '+1 Projectile',icon: 'Copy',   desc: 'There were always two of you.' },
    { title: 'Last Essence',   stat: { essenceMultiplier: 0.25 }, display: '+25% Essence', icon: 'Gem',    desc: 'Everything the void owed you.' },
    { title: 'Dawn Aura',      stat: { damageAura: 1 },           display: '+1 Aura Dmg',  icon: 'Sun',    desc: 'The first light after the last dark.' },
    { title: 'White Memory',   stat: { whiteHoleLevel: 1 },       display: '+1 White Hole',icon: 'CircleDot', desc: 'Darkness is undone. Begin again, brighter.' },
  ]},
};

export const BOSS_DISPLAY_NAMES: Record<string, string> = {
  hive_mind: 'The Hive Mind', void_warden: 'The Void Warden', crimson_eclipse: 'Crimson Eclipse',
  neutron_star: 'Collapsing Neutron', entropy_titan: 'Entropy Titan', darkness: 'Darkness',
};

// ---------------------------------------------------------------------
//  Generation
// ---------------------------------------------------------------------
const generateTree = (): AbilityNodeData[] => {
  const rng = mulberry32(TREE_SEED);
  const nodes: AbilityNodeData[] = [];

  const origin: AbilityNodeData = {
    id: 'root', title: 'THE SPARK', description: 'A faint glimmer in the infinite dark.',
    cost: 0, position: { x: 0, y: 0 }, parentIds: [], type: AbilityType.CORE, icon: 'Sun',
    statBoostDisplay: 'Base Stats', statEffect: { moveSpeed: 0.05, maxHealth: 0 }, isMajor: true,
  };
  nodes.push(origin);

  const isFree = (x: number, y: number) => !nodes.some(n => dist(n.position, { x, y }) < MIN_NODE_DISTANCE);

  const findSpot = (px: number, py: number, angle: number, d0: number, spread: number) => {
    for (let i = 0; i < 15; i++) {
      const a = angle + (rng() - 0.5) * spread;
      const d = d0 + rng() * 40;
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (isFree(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  };

  const minorNode = (id: string, parent: AbilityNodeData, pos: { x: number; y: number }, type: AbilityType, arc: string, depth: number): AbilityNodeData => {
    const m = weightedPick(rng, MINORS[arc]);
    return {
      id, title: m.title, description: 'Slight improvement.', cost: nodeCost(depth, false), position: pos,
      parentIds: [parent.id], type, icon: m.icon, statEffect: m.stat, statBoostDisplay: m.display, isMajor: false,
    };
  };

  const byType = (t: AbilityType) => POWERS.filter(p => p.type === t);
  const getPower = (type: AbilityType, n: number): PowerDefinition => { const pool = byType(type); return pool[n % pool.length]; };

  // Three spiral branches. Radius grows slowly so the tree reads as a galaxy.
  const ARCS = [
    { type: AbilityType.OFFENSE, angle: -Math.PI / 2 },
    { type: AbilityType.DEFENSE, angle: Math.PI / 6 },
    { type: AbilityType.UTILITY, angle: (Math.PI * 5) / 6 },
  ];

  ARCS.forEach(arc => {
    const arcName = ARC_NAMES[arc.type];
    let parent = origin;
    let angle = arc.angle;
    let powerCounter = 0;
    let clusterIndex = 0;

    for (let i = 0; i < ARC_LENGTH; i++) {
      angle += 0.035 + (rng() - 0.5) * 0.25;          // gentle spiral + wobble
      const d = 100 + i * 5;
      const spot = findSpot(parent.position.x, parent.position.y, angle, d, 0.6);
      if (!spot) continue;

      const isSkill = i % 4 === 2;
      let node: AbilityNodeData;
      if (isSkill) {
        const power = getPower(arc.type, powerCounter++);
        const stat: Partial<PlayerStats> = {}; (stat as any)[power.propName] = 1;
        node = {
          id: `${power.id}_node_${i}`, title: power.name, description: power.description,
          cost: nodeCost(i, true), position: spot, parentIds: [parent.id], type: arc.type,
          icon: power.icon, statEffect: stat, statBoostDisplay: 'UNLOCK / UPGRADE', isMajor: true,
        };
      } else {
        node = minorNode(`${arcName}_${i}_0`, parent, spot, arc.type, arcName, i);
      }
      nodes.push(node);
      parent = node;

      // Side clusters hang off the spine at ±60°.
      if (rng() < 0.8) {
        const size = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < size; k++) {
          const side = rng() > 0.5 ? 1 : -1;
          const ca = angle + side * (Math.PI / 3 + rng() * 0.5);
          const cs = findSpot(node.position.x, node.position.y, ca, 80, 0.5);
          if (cs) nodes.push(minorNode(`${arcName}_${i}_${++clusterIndex}`, node, cs, arc.type, arcName, i + 1));
        }
      }
    }
  });

  // Constellations on the outer rim, one per chapter, revealed by its boss.
  // Rim radius = furthest spine node + margin, so clusters never overlap the arcs.
  const rim = nodes.reduce((m, n) => Math.max(m, Math.hypot(n.position.x, n.position.y)), 0) * 0.72 + 600;
  CHAPTERS.forEach((ch, ci) => {
    const def = CONSTELLATIONS[ch.bossId];
    if (!def) return;
    const baseAngle = -Math.PI / 2 + (ci / CHAPTERS.length) * Math.PI * 2 + Math.PI / CHAPTERS.length;
    const cx = Math.cos(baseAngle) * rim, cy = Math.sin(baseAngle) * rim;
    // Attach the first node to the nearest spine node (so it draws a thin link to the tree).
    const anchor = nodes.filter(n => n.isMajor && n.id !== 'root' && !n.requiresBoss)
      .reduce((best, n) => (dist(n.position, { x: cx, y: cy }) < dist(best.position, { x: cx, y: cy }) ? n : best), nodes[1]);
    let prev: AbilityNodeData = anchor;
    def.nodes.forEach((cn, n) => {
      // Constellation shape: a loose heptagon with a jitter so each looks hand-placed.
      const a = baseAngle + (n / def.nodes.length) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const r = 220 + (rng() - 0.5) * 80;
      const pos = { x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r) };
      const depth = 10 * (ci + 1) + n;
      const node: AbilityNodeData = {
        id: `const_${ch.bossId}_${n}`, title: cn.title, description: cn.desc,
        cost: Math.floor(nodeCost(depth, false) * 1.5), position: pos,
        parentIds: [prev.id], type: AbilityType.CORE, icon: cn.icon, statEffect: cn.stat,
        statBoostDisplay: cn.display, isMajor: n === def.nodes.length - 1,
        requiresBoss: ch.bossId, constellation: def.name,
      };
      nodes.push(node);
      prev = node;
    });
  });

  return nodes;
};

export const ABILITY_TREE_DATA: AbilityNodeData[] = generateTree();

export const TREE_BOUNDS = ABILITY_TREE_DATA.reduce(
  (b, n) => ({
    minX: Math.min(b.minX, n.position.x), maxX: Math.max(b.maxX, n.position.x),
    minY: Math.min(b.minY, n.position.y), maxY: Math.max(b.maxY, n.position.y),
  }),
  { minX: 0, maxX: 0, minY: 0, maxY: 0 },
);

const NODE_BY_ID = new Map(ABILITY_TREE_DATA.map(n => [n.id, n]));
export const getNode = (id: string) => NODE_BY_ID.get(id);
