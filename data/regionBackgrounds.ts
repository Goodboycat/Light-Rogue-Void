export interface RegionBackgroundConfig {
  imageUrl: string;
  loadImage: () => Promise<string>;
  nextRegionId?: string;
  overlayColor: string; // Tailwind/CSS color or RGBA
  filter: string; // CSS filter for unique visual identity
  accentColor: string;
  particleStyle: 'embers' | 'spores' | 'crystals' | 'sparks' | 'void' | 'rift';
}

// Keep only region_1 eager for instant first frame (< 6 MB initial load);
// lazy-load all other 14 region backgrounds on demand when selected or preloaded via requestIdleCallback.
import bgOriginFields from '../src/assets/images/bg_origin_fields_1785023230481.jpg';

const LAZY_BG_LOADERS: Record<string, () => Promise<{ default: string }>> = {
  region_1: () => Promise.resolve({ default: bgOriginFields }),
  region_2: () => import('../src/assets/images/bg_whispering_grove_1785023241097.jpg'),
  region_3: () => import('../src/assets/images/bg_crystal_depths_1785023252317.jpg'),
  region_4: () => import('../src/assets/images/bg_abandoned_machinery_1785023264065.jpg'),
  region_5: () => import('../src/assets/images/bg_void_wastes_1785289901582.jpg'),
  region_6: () => import('../src/assets/images/bg_seam_void_1785289914444.jpg'),
  region_7: () => import('../src/assets/images/bg_shattered_core_1785023274622.jpg'),
  region_8: () => import('../src/assets/images/bg_echoing_cavern_1785289927810.jpg'),
  region_9: () => import('../src/assets/images/bg_broken_sanctuary_1785289938243.jpg'),
  region_10: () => import('../src/assets/images/bg_the_rift_1785289951454.jpg'),
  region_secret_1: () => import('../src/assets/images/bg_forgotten_vault_1785289963870.jpg'),
  region_secret_2: () => import('../src/assets/images/bg_hidden_garden_1785289887021.jpg'),
  region_secret_3: () => import('../src/assets/images/bg_radiant_bastion_1785289975288.jpg'),
  region_secret_4: () => import('../src/assets/images/bg_momentum_shrine_1785289987065.jpg'),
  region_treasure: () => import('../src/assets/images/bg_essence_cache_1785289998851.jpg'),
};

// Keep only ONE decoded HTMLImageElement alive at a time to minimize GPU/RAM footprint
let activeBgRegionId: string | null = null;
let activeBgElement: HTMLImageElement | null = null;
let activeBgUrl: string = bgOriginFields;

/**
 * Lazily loads a region's background URL, decodes it off-thread with `img.decode()`,
 * and releases any previous region's decoded image so only one background stays alive at a time.
 */
export async function loadAndDecodeRegionBackground(
  regionId = 'region_1',
  onProgress?: (pct: number) => void
): Promise<string> {
  const key = REGION_BACKGROUNDS[regionId] ? regionId : 'region_1';
  if (activeBgRegionId === key && activeBgUrl) {
    if (onProgress) onProgress(100);
    return activeBgUrl;
  }

  if (onProgress) onProgress(25);
  const loader = LAZY_BG_LOADERS[key] || LAZY_BG_LOADERS.region_1;
  const mod = await loader();
  let url = mod.default;
  if (onProgress) onProgress(65);

  // Release previous decoded image reference before decoding the new one
  if (activeBgElement && activeBgRegionId !== key) {
    try {
      activeBgElement.src = '';
    } catch {}
    activeBgElement = null;
  }

  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    if (typeof img.decode === 'function') {
      await img.decode();
    }
    activeBgElement = img;

    // Pre-bake tint & radial vignette once onto a cached offscreen canvas so the DOM <img> needs no mix-blend-screen, filter, or overlay layers
    if (typeof document !== 'undefined' && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const bw = Math.max(1, Math.round(img.naturalWidth * scale));
      const bh = Math.max(1, Math.round(img.naturalHeight * scale));
      const offscreen = document.createElement('canvas');
      offscreen.width = bw;
      offscreen.height = bh;
      const octx = offscreen.getContext('2d', { alpha: false });
      if (octx) {
        octx.fillStyle = '#020617';
        octx.fillRect(0, 0, bw, bh);
        octx.globalAlpha = 0.42;
        octx.drawImage(img, 0, 0, bw, bh);
        octx.globalAlpha = 1;

        // Apply region overlay tint
        const cfg = REGION_BACKGROUNDS[key];
        if (cfg?.overlayColor) {
          octx.fillStyle = cfg.overlayColor;
          octx.fillRect(0, 0, bw, bh);
        }

        // Pre-bake radial vignette
        const cx = bw * 0.5;
        const cy = bh * 0.5;
        const maxR = Math.hypot(cx, cy);
        const vig = octx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR);
        vig.addColorStop(0, 'rgba(2, 6, 23, 0)');
        vig.addColorStop(0.7, 'rgba(2, 6, 23, 0.6)');
        vig.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
        octx.fillStyle = vig;
        octx.fillRect(0, 0, bw, bh);

        const bakedUrl = offscreen.toDataURL('image/jpeg', 0.82);
        if (bakedUrl && bakedUrl.startsWith('data:image')) {
          url = bakedUrl;
        }
      }
    }
  } catch {
    // Fallback if decode fails or is unsupported
  }

  activeBgRegionId = key;
  activeBgUrl = url;
  REGION_BACKGROUNDS[key].imageUrl = url;
  if (onProgress) onProgress(100);

  // Preload the next likely region chunk during browser idle time
  const nextId = REGION_BACKGROUNDS[key].nextRegionId;
  if (nextId && LAZY_BG_LOADERS[nextId]) {
    const scheduleIdle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as any).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 400);
    scheduleIdle(() => {
      LAZY_BG_LOADERS[nextId]().catch(() => {});
    });
  }

  return url;
}

export const REGION_BACKGROUNDS: Record<string, RegionBackgroundConfig> = {
  region_1: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_1'),
    nextRegionId: 'region_2',
    overlayColor: 'rgba(6, 182, 212, 0.15)', // Cyan tint
    filter: 'none',
    accentColor: '#06b6d4',
    particleStyle: 'embers'
  },
  region_2: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_2'),
    nextRegionId: 'region_3',
    overlayColor: 'rgba(168, 85, 247, 0.18)', // Purple tint
    filter: 'none',
    accentColor: '#a855f7',
    particleStyle: 'spores'
  },
  region_3: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_3'),
    nextRegionId: 'region_4',
    overlayColor: 'rgba(14, 165, 233, 0.18)', // Sky blue
    filter: 'none',
    accentColor: '#0ea5e9',
    particleStyle: 'crystals'
  },
  region_4: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_4'),
    nextRegionId: 'region_5',
    overlayColor: 'rgba(245, 158, 11, 0.15)', // Amber / Copper
    filter: 'none',
    accentColor: '#f59e0b',
    particleStyle: 'sparks'
  },
  region_5: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_5'),
    nextRegionId: 'region_6',
    overlayColor: 'rgba(79, 70, 229, 0.2)', // Deep Indigo / Void
    filter: 'none',
    accentColor: '#6366f1',
    particleStyle: 'void'
  },
  region_6: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_6'),
    overlayColor: 'rgba(217, 70, 239, 0.22)', // Fuchsia / Void Seam
    filter: 'none',
    accentColor: '#d946ef',
    particleStyle: 'rift'
  },
  region_7: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_7'),
    nextRegionId: 'region_2',
    overlayColor: 'rgba(239, 68, 68, 0.22)', // Crimson Shattered Core
    filter: 'none',
    accentColor: '#ef4444',
    particleStyle: 'rift'
  },
  region_8: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_8'),
    nextRegionId: 'region_4',
    overlayColor: 'rgba(139, 92, 246, 0.2)', // Violet Cavern
    filter: 'none',
    accentColor: '#8b5cf6',
    particleStyle: 'crystals'
  },
  region_9: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_9'),
    nextRegionId: 'region_5',
    overlayColor: 'rgba(20, 184, 166, 0.18)', // Teal Ruined Sanctuary
    filter: 'none',
    accentColor: '#14b8a6',
    particleStyle: 'sparks'
  },
  region_10: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_10'),
    nextRegionId: 'region_6',
    overlayColor: 'rgba(244, 114, 182, 0.25)', // The Rift (Magenta / White)
    filter: 'none',
    accentColor: '#f472b6',
    particleStyle: 'rift'
  },
  region_secret_1: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_secret_1'),
    overlayColor: 'rgba(234, 179, 8, 0.2)', // Golden Vault
    filter: 'none',
    accentColor: '#eab308',
    particleStyle: 'sparks'
  },
  region_secret_2: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_secret_2'),
    overlayColor: 'rgba(34, 197, 94, 0.2)', // Emerald Hidden Garden
    filter: 'none',
    accentColor: '#22c55e',
    particleStyle: 'spores'
  },
  region_secret_3: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_secret_3'),
    overlayColor: 'rgba(250, 204, 21, 0.2)', // Radiant Bastion
    filter: 'none',
    accentColor: '#facc15',
    particleStyle: 'embers'
  },
  region_secret_4: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_secret_4'),
    overlayColor: 'rgba(56, 189, 248, 0.2)', // Momentum Sapphire Shrine
    filter: 'none',
    accentColor: '#38bdf8',
    particleStyle: 'crystals'
  },
  region_treasure: {
    imageUrl: bgOriginFields,
    loadImage: () => loadAndDecodeRegionBackground('region_treasure'),
    overlayColor: 'rgba(192, 132, 252, 0.25)', // Pocket Essence
    filter: 'none',
    accentColor: '#c084fc',
    particleStyle: 'embers'
  }
};

export function getRegionBackground(regionId?: string): RegionBackgroundConfig {
  if (regionId && REGION_BACKGROUNDS[regionId]) {
    return REGION_BACKGROUNDS[regionId];
  }
  return REGION_BACKGROUNDS.region_1;
}
