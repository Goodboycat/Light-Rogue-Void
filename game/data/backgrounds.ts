export type BackgroundFeature = 'NONE' | 'NEBULA' | 'BINARY_STAR' | 'GALAXY_CORE' | 'DIVINE_GALAXY' | 'QUASAR';

export interface BackgroundConfig {
  primaryColor: string; // HSL Hue
  secondaryColor: string; // HSL Hue
  starDensity: number;
  speedMultiplier: number;
  feature: BackgroundFeature;
  fogIntensity: number;
}

const generateBackgrounds = (): BackgroundConfig[] => {
    const bgs: BackgroundConfig[] = [];
    for(let i=0; i<50; i++) {
        const progress = i / 50;
        
        // Evolve colors: Blue -> Purple -> Pink -> Gold -> White/Prismatic
        let primary = 240 - (progress * 100); 
        if (i > 30) primary = 300 + ((i-30) * 5); // Pink/Red shift
        if (i > 40) primary = 40 + ((i-40) * 10); // Gold shift
        
        let secondary = 280 + (progress * 60); 
        
        // Features appear at certain intervals
        let feature: BackgroundFeature = 'NONE';
        if (i >= 5 && i < 15) feature = 'BINARY_STAR';
        if (i >= 15 && i < 25) feature = 'NEBULA';
        if (i >= 25 && i < 35) feature = 'QUASAR';
        if (i >= 35 && i < 45) feature = 'GALAXY_CORE';
        if (i >= 45) feature = 'DIVINE_GALAXY'; // The new beautiful ending

        bgs.push({
            primaryColor: primary.toString(),
            secondaryColor: secondary.toString(),
            starDensity: 50 + i * 8, // More stars
            speedMultiplier: 1 + i * 0.05,
            feature,
            fogIntensity: i * 0.02
        });
    }
    return bgs;
};

export const BACKGROUNDS = generateBackgrounds();