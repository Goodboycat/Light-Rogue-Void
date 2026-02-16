
import { AbilityType, PlayerStats } from './types';

export interface PowerDefinition {
    id: string; // e.g., 'fireBlast'
    name: string;
    propName: keyof PlayerStats;
    type: AbilityType;
    icon: string;
    description: string;
    cooldownBase: number; // Frames
    cooldownScaling: number; // Reduction per level
    damageBase: number;
    damageScaling: number;
}

export const POWERS: PowerDefinition[] = [
    // --- OFFENSE ---
    {
        id: 'fire_blast', name: 'Fire Blast', propName: 'fireBlastLevel', type: AbilityType.OFFENSE, icon: 'Flame',
        description: 'Fires a concentrated blast of solar energy.',
        cooldownBase: 45, cooldownScaling: 5, damageBase: 50, damageScaling: 15
    },
    {
        id: 'fireflies', name: 'Fireflies', propName: 'fireflyLevel', type: AbilityType.OFFENSE, icon: 'Sparkles', 
        description: 'Summons loyal lights that orbit you and intercept enemies.',
        cooldownBase: 60, cooldownScaling: 5, damageBase: 20, damageScaling: 5
    },
    {
        id: 'super_dash', name: 'Super Dash', propName: 'superDashLevel', type: AbilityType.OFFENSE, icon: 'FastForward',
        description: 'Dash creates a massive white explosion at the start point.',
        cooldownBase: 0, cooldownScaling: 0, damageBase: 100, damageScaling: 33 
    },
    {
        id: 'homing_missile', name: 'Seeking Spirit', propName: 'homingMissileLevel', type: AbilityType.OFFENSE, icon: 'Crosshair',
        description: 'Manifests a tracking spirit that pursues enemies.',
        cooldownBase: 120, cooldownScaling: 10, damageBase: 60, damageScaling: 20
    },
    {
        id: 'plasma_whip', name: 'Luminous Lash', propName: 'plasmaWhipLevel', type: AbilityType.OFFENSE, icon: 'Zap',
        description: 'Strikes nearby enemies with a whip of pure golden light.',
        cooldownBase: 50, cooldownScaling: 2, damageBase: 40, damageScaling: 10
    },
    {
        id: 'white_hole', name: 'White Hole', propName: 'whiteHoleLevel', type: AbilityType.OFFENSE, icon: 'CircleDot', // ULTIMATE
        description: 'Stand still to charge a massive Big Bang explosion.',
        cooldownBase: 300, cooldownScaling: 0, damageBase: 1500, damageScaling: 500
    },

    // --- DEFENSE ---
    {
        id: 'ice_nova', name: 'Ice Nova', propName: 'iceNovaLevel', type: AbilityType.DEFENSE, icon: 'Snowflake',
        description: 'Freezes enemies in a wide radius.',
        cooldownBase: 120, cooldownScaling: 10, damageBase: 10, damageScaling: 3
    },
    {
        id: 'titan_shield', name: 'Guardian Aegis', propName: 'titanShieldLevel', type: AbilityType.DEFENSE, icon: 'Shield',
        description: 'Creates a temporary barrier of light that repels darkness.',
        cooldownBase: 300, cooldownScaling: 20, damageBase: 0, damageScaling: 0
    },
    {
        id: 'solar_flare', name: 'Solar Flare', propName: 'solarFlareLevel', type: AbilityType.DEFENSE, icon: 'Sun',
        description: 'Spawns a stationary sun that burns nearby enemies.',
        cooldownBase: 200, cooldownScaling: 20, damageBase: 15, damageScaling: 5
    },
    {
        id: 'lux_blades', name: 'Lux Blades', propName: 'luxBladesLevel', type: AbilityType.DEFENSE, icon: 'Aperture',
        description: 'Throws boomerang blades of light that spiral out and return.',
        cooldownBase: 90, cooldownScaling: 5, damageBase: 25, damageScaling: 10
    },

    // --- UTILITY ---
    {
        id: 'thunder_chain', name: 'Thunder Chain', propName: 'thunderChainLevel', type: AbilityType.UTILITY, icon: 'Zap',
        description: 'Lightning that arcs between multiple enemies.',
        cooldownBase: 70, cooldownScaling: 5, damageBase: 15, damageScaling: 5
    },
    {
        id: 'nebula_trail', name: 'Stardust Trail', propName: 'nebulaTrailLevel', type: AbilityType.UTILITY, icon: 'Wind',
        description: 'Leave a trail of cosmic dust as you move.',
        cooldownBase: 20, cooldownScaling: 1, damageBase: 15, damageScaling: 5
    },
    {
        id: 'singularity', name: 'Singularity', propName: 'singularityLevel', type: AbilityType.UTILITY, icon: 'Atom',
        description: 'Drops a black hole mine that pulls enemies in, then explodes.',
        cooldownBase: 240, cooldownScaling: 20, damageBase: 60, damageScaling: 20
    },
    {
        id: 'repulsion_field', name: 'Repulsion Field', propName: 'repulsionFieldLevel', type: AbilityType.UTILITY, icon: 'Wifi',
        description: 'Releases a gravitational wave that pushes enemies back violently (11s Cooldown).',
        cooldownBase: 660, cooldownScaling: 20, damageBase: 10, damageScaling: 5
    }
];

export const getPowerByProp = (prop: string) => POWERS.find(p => p.propName === prop);
