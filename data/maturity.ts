
export interface MaturityLevel {
  title: string;
  color: string;
  scale: number;
}

// Total Levels: 80
// Target Max Scale: 3.0
// Start Scale: 1.0
// Increment per level: ~0.025

export const MATURITY_LEVELS: MaturityLevel[] = [
  // Phase I: The Flicker (1-12)
  { title: "Burning Mote", color: "#451a03", scale: 1.00 },
  { title: "Dying Ember", color: "#78350f", scale: 1.02 },
  { title: "Faint Glint", color: "#92400e", scale: 1.05 },
  { title: "Ash-Bound Spark", color: "#b45309", scale: 1.07 },
  { title: "Drifting Kindle", color: "#d97706", scale: 1.10 },
  { title: "Wisp", color: "#f59e0b", scale: 1.12 },
  { title: "Smoldering Coal", color: "#fbbf24", scale: 1.15 },
  { title: "Candle-Stub", color: "#fcd34d", scale: 1.17 },
  { title: "Flicker-Soul", color: "#fde68a", scale: 1.20 },
  { title: "Tinder-Thirst", color: "#fef3c7", scale: 1.22 },
  { title: "Glimmer-Born", color: "#fff7ed", scale: 1.25 },
  { title: "Pilot Light", color: "#ffedd5", scale: 1.27 },

  // Phase II: The Flame (13-24)
  { title: "Torch-Bearer", color: "#fed7aa", scale: 1.30 },
  { title: "Steady Lantern", color: "#fdba74", scale: 1.32 },
  { title: "Hearth-Heart", color: "#fb923c", scale: 1.35 },
  { title: "Signal Flare", color: "#f97316", scale: 1.37 },
  { title: "Searing Singe", color: "#ea580c", scale: 1.40 },
  { title: "Brazen Ignite", color: "#c2410c", scale: 1.42 },
  { title: "Living Flame", color: "#9a3412", scale: 1.45 },
  { title: "Scorched Sentinel", color: "#7c2d12", scale: 1.47 },
  { title: "Rising Blaze", color: "#ef4444", scale: 1.50 },
  { title: "Wildfire Seed", color: "#dc2626", scale: 1.52 },
  { title: "Brazier Lord", color: "#b91c1c", scale: 1.55 },
  { title: "Cauterizer", color: "#991b1b", scale: 1.57 },

  // Phase III: The Inferno (25-36)
  { title: "Great Pyre", color: "#f87171", scale: 1.60 },
  { title: "Raging Inferno", color: "#ef4444", scale: 1.62 },
  { title: "Roaring Furnace", color: "#dc2626", scale: 1.65 },
  { title: "World-Burner", color: "#b91c1c", scale: 1.67 },
  { title: "White-Hot Core", color: "#fca5a5", scale: 1.70 },
  { title: "Blinding Beacon", color: "#fecaca", scale: 1.72 },
  { title: "Radiant Pillar", color: "#fee2e2", scale: 1.75 },
  { title: "Incinerator", color: "#ffcdd2", scale: 1.77 },
  { title: "Conflagration King", color: "#e53935", scale: 1.80 },
  { title: "Sun-Spoke", color: "#d32f2f", scale: 1.82 },
  { title: "Molten Maw", color: "#c62828", scale: 1.85 },
  { title: "Zenith Heat", color: "#b71c1c", scale: 1.87 },

  // Phase IV: The Solar (37-48)
  { title: "Sol-Child", color: "#fdba74", scale: 1.90 },
  { title: "Solar Prominence", color: "#fb923c", scale: 1.92 },
  { title: "Corona Crest", color: "#f97316", scale: 1.95 },
  { title: "Helios Aspect", color: "#ea580c", scale: 1.97 },
  { title: "Stellar Remnant", color: "#c2410c", scale: 2.00 },
  { title: "Protostar", color: "#ffedd5", scale: 2.02 },
  { title: "Binary Flare", color: "#fed7aa", scale: 2.05 },
  { title: "White Dwarf", color: "#e0f2fe", scale: 2.07 },
  { title: "Red Giant", color: "#ef4444", scale: 2.10 },
  { title: "Nova Pulse", color: "#f43f5e", scale: 2.12 },
  { title: "Supernova Shell", color: "#e11d48", scale: 2.15 },
  { title: "Hypernova", color: "#be123c", scale: 2.17 },

  // Phase V: The Cosmic Fire (49-60)
  { title: "Plasma Nebula", color: "#881337", scale: 2.20 },
  { title: "Quasar Flame", color: "#4c0519", scale: 2.22 },
  { title: "Event Horizon Torch", color: "#fff0f5", scale: 2.25 },
  { title: "Singularity Spark", color: "#fdf2f8", scale: 2.27 },
  { title: "Galaxy Burner", color: "#fce7f3", scale: 2.30 },
  { title: "Universal Kiln", color: "#fbcfe8", scale: 2.32 },
  { title: "The Eternal Flame", color: "#f9a8d4", scale: 2.35 },
  { title: "Entropy Eater", color: "#f472b6", scale: 2.37 },
  { title: "Big Bang Ignition", color: "#ec4899", scale: 2.40 },
  { title: "Omni-Fire", color: "#db2777", scale: 2.42 },
  { title: "The Unquenchable", color: "#be185d", scale: 2.45 },
  { title: "New Beginning", color: "#ffffff", scale: 2.47 },

  // Phase VI: The Ethereal (61-72)
  { title: "Aetheric Filament", color: "#f5d0fe", scale: 2.50 },
  { title: "Prism-Walker", color: "#f0abfc", scale: 2.52 },
  { title: "Aurora Weaver", color: "#e879f9", scale: 2.55 },
  { title: "Spectral Architect", color: "#d946ef", scale: 2.57 },
  { title: "Dimensional Flare", color: "#c026d3", scale: 2.60 },
  { title: "Void-Piercer", color: "#a21caf", scale: 2.62 },
  { title: "Reality-Bender", color: "#86198f", scale: 2.65 },
  { title: "Astral Beacon", color: "#701a75", scale: 2.67 },
  { title: "Chronos Flame", color: "#4a044e", scale: 2.70 },
  { title: "The First Photon", color: "#faf5ff", scale: 2.72 },
  { title: "Monolith of Noon", color: "#f3e8ff", scale: 2.75 },
  { title: "The Great Silence", color: "#e9d5ff", scale: 2.77 },

  // Phase VII: The Absolute (73-80)
  { title: "Aeon Shard", color: "#ddd6fe", scale: 2.80 },
  { title: "Truth-Bringer", color: "#c4b5fd", scale: 2.82 },
  { title: "Genesis Pulse", color: "#a78bfa", scale: 2.85 },
  { title: "Infinity’s Wick", color: "#8b5cf6", scale: 2.87 },
  { title: "Existence-Igniter", color: "#fcd34d", scale: 2.90 },
  { title: "The Prime Ray", color: "#fbbf24", scale: 2.92 },
  { title: "Finality’s Glow", color: "#f59e0b", scale: 2.95 },
  { title: "The Omega Sun", color: "#ffffff", scale: 3.00 },
];
