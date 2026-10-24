// Master configuration and helper logic for Boss Victory ceremonies, rewards, trophies, and sharing

export const BOSS_VICTORY_CONFIG = {
    slowMoFrames: 36,        // 0.6 s slow motion on boss kill
    hitPauseFrames: 21,      // 0.35 s hit pause freeze
    cameraZoomPercent: 0.06, // 6% camera zoom
    cameraZoomFrames: 60,    // 1.0 s camera zoom ease back
    maxEssenceDrops: 60,     // Max total drop sprites on screen
    essenceRainCount: 35,    // Drops spawned on boss kill
    guaranteeHeart: true,    // Always spawn 1 heart on boss death
    bossMatterRewards: { hive_mind: 150, void_warden: 200, crimson_eclipse: 250, neutron_star: 300, entropy_titan: 350, darkness: 500 } as Record<string, number>,
};

export interface BossVictoryCeremonyData {
    bossId: string;
    bossName: string;
    fightTimeSeconds: number;
    damageTaken: number;
    attempts: number;
    matterEarned: number;
    archiveUnlocked?: boolean;
}

export interface BossTrophy {
    bossId: string;
    bossName: string;
    fightTimeSec: number;
    damageTaken: number;
    attempts: number;
    date: string;
}

export function formatShareResult(bossName: string, fightTimeSec: number, attempts: number, lang: 'en' | 'es' = 'en'): string {
    const bossUpper = bossName.toUpperCase();
    if (lang === 'es') {
        return `Derroté a ${bossUpper} en ${fightTimeSec} s (intento ${attempts}) - Light Rogue Void`;
    }
    return `I defeated THE ${bossUpper} in ${fightTimeSec} s (attempt ${attempts}) - Light Rogue Void`;
}

export async function copyShareResultToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (e) {
        // Fallback for restricted frame/iframe
    }
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (e) {
        return false;
    }
}
