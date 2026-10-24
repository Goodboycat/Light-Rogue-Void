export type PerformanceMode = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityProfile {
    mode: PerformanceMode;
    particleScale: number;      // 0.4 / 0.7 / 1
    maxParticles: number;       // 150 / 300 / 500
    glow: boolean;              // false in LOW, true in MEDIUM/HIGH
    resolutionScale: number;    // 0.7 / 0.85 / 1
    enemyCap: number;           // 45 / 70 / 110
}

export const QUALITY_PROFILES: Record<PerformanceMode, QualityProfile> = {
    LOW: {
        mode: 'LOW',
        particleScale: 0.4,
        maxParticles: 150,
        glow: false,
        resolutionScale: 0.7,
        enemyCap: 45,
    },
    MEDIUM: {
        mode: 'MEDIUM',
        particleScale: 0.7,
        maxParticles: 300,
        glow: true,
        resolutionScale: 0.85,
        enemyCap: 70,
    },
    HIGH: {
        mode: 'HIGH',
        particleScale: 1.0,
        maxParticles: 500,
        glow: true,
        resolutionScale: 1.0,
        enemyCap: 110,
    },
};

export function getQuality(performanceMode: PerformanceMode = 'HIGH'): QualityProfile {
    return QUALITY_PROFILES[performanceMode] || QUALITY_PROFILES.HIGH;
}

export function stepQualityDown(mode: PerformanceMode): PerformanceMode {
    if (mode === 'HIGH') return 'MEDIUM';
    if (mode === 'MEDIUM') return 'LOW';
    return 'LOW';
}

export function stepQualityUp(mode: PerformanceMode): PerformanceMode {
    if (mode === 'LOW') return 'MEDIUM';
    if (mode === 'MEDIUM') return 'HIGH';
    return 'HIGH';
}
