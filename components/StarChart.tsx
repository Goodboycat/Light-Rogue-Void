import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Star, Sparkles, X, AlertCircle, Play, Compass, HelpCircle, Skull, HeartPulse, Flame, Gem, Key } from 'lucide-react';
import { RunNode, REGION_POOL, getTreasureEssenceReward } from '../data/mapNodes';
import { getRegionBackground } from '../data/regionBackgrounds';
import { audio } from './game/audio';

import { Settings } from '../types';
import { t } from '../translate';
export interface StarChartProps {
    settings?: Settings;
    onUpdateSettings?: (newSettings: Settings) => void;
    runPath: RunNode[];
    visitedNodeIds: string[];
    completedSpecialMissions?: string[];
    playedCinematicNodeIds?: string[];
    specialMissionKeys?: number;
    discoveredSecretIds?: string[];
    map1SideMissionCompleted?: boolean;
    map1EventCompleted?: boolean;
    onDiscoverSecret?: (id: string) => void;
    onUpdateSpecialMissionKeys?: (keys: number) => void;
    onSelectMap: (id: string, wave: number) => void;
    onClose: () => void;
    maxWaveReached: number;
    currentMapId: string;
    onTravelToNode: (id: string) => void;
    /** Awards `essence` to the player and marks the treasure node as visited. */
    onCollectTreasure?: (nodeId: string, essence: number) => void;
    onCinematicPlayed?: (nodeId: string) => void;
    highlightRecommended?: boolean;
}

// -----------------------------------------------------------------------------
// Treasure Minigame — “Essence Harvest”
// -----------------------------------------------------------------------------
// Lightweight click-the-mote minigame. Motes spawn at random positions for a fixed
// duration; each hit contributes to the payout, which is capped at the node’s wave-
// scaled max (see getTreasureEssenceReward). Missed motes fade harmlessly.
// This is intentionally self-contained so future chats can swap it for a richer
// minigame without touching StarChart wiring.
interface TreasureMoteData { id: number; x: number; y: number; born: number; life: number; }

const TREASURE_DURATION_MS = 12000;   // total minigame length
const TREASURE_MOTE_LIFE_MS = 1500;   // how long a mote stays clickable
const TREASURE_SPAWN_INTERVAL_MS = 550;

const TreasureMinigame: React.FC<{
    settings?: Settings;
    node: RunNode;
    onClose: () => void;
    onComplete: (essenceAwarded: number) => void;
}> = ({ node, onClose, onComplete, settings }) => {
const lang = settings?.language || 'en';
    const waveTier = node.waveRange[0] || 1;
    const maxReward = getTreasureEssenceReward(waveTier);

    const [phase, setPhase] = useState<'INTRO' | 'PLAYING' | 'RESULTS'>('INTRO');
    const [motes, setMotes] = useState<TreasureMoteData[]>([]);
    const [hits, setHits] = useState(0);
    const [spawned, setSpawned] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TREASURE_DURATION_MS);
    const moteIdRef = useRef(0);
    const startRef = useRef(0);

    // Kick off the play phase after a brief intro animation so the player sees the goal.
    useEffect(() => {
        if (phase !== 'INTRO') return;
        const t = setTimeout(() => {
            startRef.current = performance.now();
            setPhase('PLAYING');
        }, 900);
        return () => clearTimeout(t);
    }, [phase]);

    // Play loop: spawn motes on an interval, tick down the timer, purge expired motes.
    useEffect(() => {
        if (phase !== 'PLAYING') return;

        const spawnTimer = window.setInterval(() => {
            setMotes(prev => {
                moteIdRef.current += 1;
                return [
                    ...prev,
                    {
                        id: moteIdRef.current,
                        x: 8 + Math.random() * 84,
                        y: 12 + Math.random() * 76,
                        born: performance.now(),
                        life: TREASURE_MOTE_LIFE_MS
                    }
                ];
            });
            setSpawned(s => s + 1);
        }, TREASURE_SPAWN_INTERVAL_MS);

        const tickTimer = window.setInterval(() => {
            const elapsed = performance.now() - startRef.current;
            const remaining = Math.max(0, TREASURE_DURATION_MS - elapsed);
            setTimeLeft(remaining);
            setMotes(prev => prev.filter(m => performance.now() - m.born < m.life));
            if (remaining <= 0) {
                setPhase('RESULTS');
            }
        }, 100);

        return () => {
            window.clearInterval(spawnTimer);
            window.clearInterval(tickTimer);
        };
    }, [phase]);

    // Compute payout: guarantee at least 40% of maxReward for showing up, scale up to 100%
    // based on hit-rate. This keeps the node worthwhile even on a bad run.
    const totalSpawned = Math.max(1, spawned);
    const hitRate = Math.min(1, hits / totalSpawned);
    const awarded = Math.max(1, Math.round(maxReward * (0.4 + 0.6 * hitRate)));

    const handleMoteClick = (id: number) => {
        setMotes(prev => prev.filter(m => m.id !== id));
        setHits(h => h + 1);
    };

    const progressPct = phase === 'PLAYING' ? (1 - timeLeft / TREASURE_DURATION_MS) * 100 : (phase === 'RESULTS' ? 100 : 0);

    return (
        <motion.div
            {...({
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 }
            } as any)}
            className="fixed inset-0 z-[80] bg-[#02020a]/95 backdrop-blur-md flex items-center justify-center p-4"
        >
            <div className="relative w-full max-w-2xl aspect-[4/3] rounded-2xl border border-amber-500/30 bg-slate-950/80 overflow-hidden shadow-[0_0_60px_rgba(251,191,36,0.15)]">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                        <Gem size={16} className="text-amber-300" />
                        <div>
                            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-amber-400/80">{t("Essence Cache", lang)}</p>
                            <p className="text-xs font-bold text-amber-100 tracking-widest">{t("HARVEST — Wave Tier", lang)} {waveTier}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{t("Max Reward", lang)}</p>
                            <p className="text-sm font-tech font-bold text-amber-300 tabular-nums">{maxReward} ✦</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                            title="Abandon minigame"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="absolute top-[60px] left-0 right-0 h-0.5 bg-slate-900">
                    <div
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-[width] duration-100 ease-linear"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                {/* Playfield */}
                <div className="absolute inset-0 pt-[62px] overflow-hidden select-none">
                    {/* Ambient starfield */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(217,119,6,0.06),transparent_55%)] pointer-events-none" />

                    {phase === 'INTRO' && (
                        <motion.div
                            {...({
                                initial: { opacity: 0, y: 8 },
                                animate: { opacity: 1, y: 0 },
                                exit: { opacity: 0 }
                            } as any)}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
                        >
                            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-amber-400/70">{t("Instructions", lang)}</p>
                            <h2 className="text-2xl md:text-3xl font-tech font-extrabold text-amber-200 tracking-widest">{t("CLICK THE MOTES", lang)}</h2>
                            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                                Motes of raw essence will bloom across the cache. Strike each one before it fades — the more you gather, the greater your reward.
                            </p>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mt-2">{t("Beginning harvest…", lang)}</p>
                        </motion.div>
                    )}

                    {phase === 'PLAYING' && motes.map(m => {
                        const age = performance.now() - m.born;
                        const t = Math.min(1, age / m.life);
                        // Scale-in then decay. Also fade opacity toward the end of life.
                        const scale = t < 0.2 ? 0.4 + t * 3 : 1 - Math.max(0, (t - 0.7)) * 1.2;
                        const opacity = 1 - Math.max(0, (t - 0.6) / 0.4);
                        return (
                            <button
                                key={m.id}
                                onClick={() => handleMoteClick(m.id)}
                                className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/70 bg-amber-400/25 shadow-[0_0_18px_rgba(251,191,36,0.75)] hover:bg-amber-300/40 active:scale-90 transition-transform"
                                style={{
                                    left: `${m.x}%`,
                                    top: `${m.y}%`,
                                    transform: `translate(-50%,-50%) scale(${scale})`,
                                    opacity
                                }}
                                aria-label="Essence mote"
                            >
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={14} className="text-amber-100" />
                                </span>
                            </button>
                        );
                    })}

                    {phase === 'PLAYING' && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-8 text-center pointer-events-none">
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{t("Hits", lang)}</p>
                                <p className="text-sm font-tech font-bold text-amber-300 tabular-nums">{hits}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{t("Time", lang)}</p>
                                <p className="text-sm font-tech font-bold text-amber-200 tabular-nums">{(timeLeft / 1000).toFixed(1)}s</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{t("Accuracy", lang)}</p>
                                <p className="text-sm font-tech font-bold text-amber-200 tabular-nums">{Math.round(hitRate * 100)}%</p>
                            </div>
                        </div>
                    )}

                    {phase === 'RESULTS' && (
                        <motion.div
                            {...({
                                initial: { opacity: 0, scale: 0.94 },
                                animate: { opacity: 1, scale: 1 }
                            } as any)}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
                        >
                            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-amber-400/70">{t("Harvest Complete", lang)}</p>
                            <h2 className="text-3xl md:text-4xl font-tech font-extrabold text-amber-200 tracking-widest">
                                +{awarded} <span className="text-amber-300/80">✦</span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                {hits} motes gathered — {Math.round(hitRate * 100)}% resonance.
                            </p>
                            <button
                                onClick={() => onComplete(awarded)}
                                className="mt-4 px-8 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-tech font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                            >
                                Collect Essence
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const REGIONS = [
  { id: 'region_1', name: 'ORIGIN FIELDS', desc: 'The place where Light appeared.', x: 18, y: 18, color: 'text-slate-300', glow: 'rgba(255, 255, 255, 0.08)' },
  { id: 'region_2', name: 'WHISPERING GROVE', desc: 'Echoes of forgotten existence.', x: 40, y: 18, color: 'text-emerald-400', glow: 'rgba(16, 185, 129, 0.08)' },
  { id: 'region_3', name: 'CRYSTAL DEPTHS', desc: 'Beautiful, but hides danger.', x: 62, y: 18, color: 'text-cyan-400', glow: 'rgba(6, 182, 212, 0.08)' },
  { id: 'region_4', name: 'ABANDONED MACHINERY', desc: 'Lost technological wonders.', x: 84, y: 18, color: 'text-orange-400', glow: 'rgba(249, 115, 22, 0.08)' },
  { id: 'region_5', name: 'VOID WASTES', desc: 'The Darkness leaks here.', x: 18, y: 48, color: 'text-purple-400', glow: 'rgba(139, 92, 246, 0.08)' },
  { id: 'region_6', name: 'SEAM OF THE VOID', desc: 'A tear in the cosmic fabric.', x: 45, y: 48, color: 'text-indigo-400', glow: 'rgba(99, 102, 241, 0.08)' },
  { id: 'region_7', name: 'THE SHATTERED CORE', desc: 'The heart cracked by conflict.', x: 72, y: 48, color: 'text-rose-400', glow: 'rgba(239, 68, 68, 0.08)' },
  { id: 'region_8', name: 'ECHOING CAVERN', desc: 'Your voice is not your own.', x: 92, y: 48, color: 'text-teal-400', glow: 'rgba(20, 184, 166, 0.08)' },
  { id: 'region_9', name: 'BROKEN SANCTUARY', desc: 'A ruined safe haven.', x: 30, y: 78, color: 'text-blue-400', glow: 'rgba(59, 130, 246, 0.08)' },
  { id: 'region_10', name: 'THE RIFT', desc: 'The final destination.', x: 70, y: 78, color: 'text-pink-400', glow: 'rgba(236, 72, 153, 0.08)' },
  { id: 'region_secret_1', name: 'FORGOTTEN VAULT', desc: 'A hidden cache of explosive potential.', x: 30, y: 35, color: 'text-fuchsia-400', glow: 'rgba(232, 121, 249, 0.08)' },
  { id: 'region_secret_2', name: 'HIDDEN GARDEN', desc: 'A loop in time, holding secrets.', x: 75, y: 32, color: 'text-pink-400', glow: 'rgba(244, 114, 182, 0.08)' },
  { id: 'region_secret_3', name: 'RADIANT BASTION', desc: 'Where light itself becomes a weapon.', x: 50, y: 8, color: 'text-yellow-300', glow: 'rgba(253, 224, 71, 0.10)' },
  { id: 'region_secret_4', name: 'MOMENTUM SHRINE', desc: 'Inherit the momentum of the fallen.', x: 65, y: 90, color: 'text-sky-300', glow: 'rgba(56, 189, 248, 0.10)' },
  { id: 'region_treasure', name: 'TREASURE', desc: 'A shimmering pocket of raw void-essence.', x: 50, y: 60, color: 'text-amber-300', glow: 'rgba(251, 191, 36, 0.10)' }
];

const REGION_COLORS: Record<string, { ring: string, glow: string, text: string, primary: string, rgb: string }> = {
  region_1: { ring: 'rgba(148, 163, 184, 0.4)', glow: 'rgba(148, 163, 184, 0.15)', text: 'text-slate-300', primary: '#cbd5e1', rgb: '203, 213, 225' }, // Origin Fields
  region_2: { ring: 'rgba(16, 185, 129, 0.4)', glow: 'rgba(16, 185, 129, 0.15)', text: 'text-emerald-400', primary: '#10b981', rgb: '16, 185, 129' }, // Whispering Grove
  region_3: { ring: 'rgba(6, 182, 212, 0.4)', glow: 'rgba(6, 182, 212, 0.15)', text: 'text-cyan-400', primary: '#06b6d4', rgb: '6, 182, 212' }, // Crystal Depths
  region_4: { ring: 'rgba(249, 115, 22, 0.4)', glow: 'rgba(249, 115, 22, 0.15)', text: 'text-orange-400', primary: '#f97316', rgb: '249, 115, 22' }, // Abandoned Machinery
  region_5: { ring: 'rgba(139, 92, 246, 0.4)', glow: 'rgba(139, 92, 246, 0.15)', text: 'text-purple-400', primary: '#8b5cf6', rgb: '139, 92, 246' }, // Void Wastes
  region_6: { ring: 'rgba(168, 85, 247, 0.4)', glow: 'rgba(168, 85, 247, 0.15)', text: 'text-purple-400', primary: '#a855f7', rgb: '168, 85, 247' }, // Seam of the Void (Purple)
  region_7: { ring: 'rgba(244, 63, 94, 0.4)', glow: 'rgba(244, 63, 94, 0.15)', text: 'text-rose-400', primary: '#f43f5e', rgb: '244, 63, 94' }, // Shattered Core
  region_8: { ring: 'rgba(16, 185, 129, 0.4)', glow: 'rgba(16, 185, 129, 0.15)', text: 'text-emerald-400', primary: '#10b981', rgb: '16, 185, 129' }, // Echoing Cavern (Green)
  region_9: { ring: 'rgba(59, 130, 246, 0.4)', glow: 'rgba(59, 130, 246, 0.15)', text: 'text-blue-400', primary: '#3b82f6', rgb: '59, 130, 246' }, // Broken Sanctuary
  region_10: { ring: 'rgba(236, 72, 153, 0.4)', glow: 'rgba(236, 72, 153, 0.15)', text: 'text-pink-400', primary: '#ec4899', rgb: '236, 72, 153' }, // The Rift
  region_11: { ring: 'rgba(234, 179, 8, 0.4)', glow: 'rgba(234, 179, 8, 0.15)', text: 'text-yellow-400', primary: '#eab308', rgb: '234, 179, 8' }, // Divine Nexus
  region_secret_1: { ring: 'rgba(168, 85, 247, 0.5)', glow: 'rgba(168, 85, 247, 0.25)', text: 'text-purple-400', primary: '#a855f7', rgb: '168, 85, 247' }, // Forgotten Vault
  region_secret_2: { ring: 'rgba(16, 185, 129, 0.5)', glow: 'rgba(16, 185, 129, 0.25)', text: 'text-emerald-400', primary: '#10b981', rgb: '16, 185, 129' }, // Hidden Garden
  region_secret_3: { ring: 'rgba(253, 224, 71, 0.55)', glow: 'rgba(253, 224, 71, 0.28)', text: 'text-yellow-300', primary: '#fde047', rgb: '253, 224, 71' }, // Radiant Bastion (Light Purge)
  region_secret_4: { ring: 'rgba(56, 189, 248, 0.55)', glow: 'rgba(56, 189, 248, 0.28)', text: 'text-sky-300', primary: '#38bdf8', rgb: '56, 189, 248' }, // Momentum Shrine (Dash on Kill)
  region_treasure: { ring: 'rgba(251, 191, 36, 0.55)', glow: 'rgba(251, 191, 36, 0.28)', text: 'text-amber-300', primary: '#fbbf24', rgb: '251, 191, 36' } // Essence Cache (Treasure minigame)
};

const StarChart: React.FC<StarChartProps> = ({
    settings,
    onUpdateSettings,
    runPath = [],
    visitedNodeIds = [],
    completedSpecialMissions = [],
    playedCinematicNodeIds = [],
    specialMissionKeys = 0,
    discoveredSecretIds = [],
    map1SideMissionCompleted = false,
    map1EventCompleted = false,
    onDiscoverSecret,
    onUpdateSpecialMissionKeys,
    onSelectMap,
    onClose,
    maxWaveReached,
    currentMapId,
    onTravelToNode,
    onCollectTreasure,
    onCinematicPlayed
}) => {
    const lang = settings?.language || 'en';
    const [selectedNode, setSelectedNode] = useState<RunNode | null>(null);
    const [showWaveSelector, setShowWaveSelector] = useState(false);
    const [localSelectedWave, setLocalSelectedWave] = useState(1);

    // ---- Treasure minigame state ----
    // Node currently being played (null = closed). When set, the minigame overlay opens.
    const [treasureNode, setTreasureNode] = useState<RunNode | null>(null);

    const getWaveRangeForNode = (node: RunNode) => {
        if (node.type === 'EVENT' || node.type === 'SECRET' || node.waveRange[0] >= 100) {
            return { min: node.waveRange[0], max: node.waveRange[0] };
        }
        return { min: node.waveRange[0], max: node.waveRange[1] };
    };

    const getIsNodeCompleted = (node: RunNode, visitedIdsArray: string[], completedSpecials: string[]) => {
        if (node.type === 'EVENT' || node.type === 'SECRET') {
            const rewardId = node.mission?.rewardId;
            return !!rewardId && completedSpecials.includes(rewardId);
        }
        if (node.type === 'TREASURE') {
            return visitedIdsArray.includes(node.id);
        }
        return node.state === 'VISITED' || visitedIdsArray.includes(node.id);
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draggable / Scrollable map container state
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState<number>(0.85);
    const [panX, setPanX] = useState<number>(0);
    const [panY, setPanY] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const clampPan = (x: number, y: number, currentZoom: number) => {
        if (!mapContainerRef.current) return { x, y };
        const w = mapContainerRef.current.clientWidth || 800;
        const h = mapContainerRef.current.clientHeight || 600;
        const mW = 2000 * currentZoom;
        const mH = 1300 * currentZoom;

        // Minimum visible overlap on screen (at least 200px or 25% of viewport width/height)
        const minOverlapX = Math.min(200, w * 0.25);
        const minOverlapY = Math.min(200, h * 0.25);

        const minX = minOverlapX - mW;
        const maxX = w - minOverlapX;
        const minY = minOverlapY - mH;
        const maxY = h - minOverlapY;

        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y))
        };
    };

    const updatePan = (newX: number, newY: number, checkZoom: number = zoom) => {
        const clamped = clampPan(newX, newY, checkZoom);
        setPanX(clamped.x);
        setPanY(clamped.y);
    };

    const [showZoomPercent, setShowZoomPercent] = useState(false);
    const zoomTimeoutRef = useRef<any>(null);

    const triggerZoomIndicator = () => {
        setShowZoomPercent(true);
        if (zoomTimeoutRef.current) {
            clearTimeout(zoomTimeoutRef.current);
        }
        zoomTimeoutRef.current = setTimeout(() => {
            setShowZoomPercent(false);
        }, 1200);
    };

    useEffect(() => {
        return () => {
            if (zoomTimeoutRef.current) {
                clearTimeout(zoomTimeoutRef.current);
            }
        };
    }, []);

    // Refs for mobile touch interactions
    const touchStartRef = useRef<{ dist: number; zoom: number; panX: number; panY: number } | null>(null);
    const touchPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

    // Cinematic Bezier Travel Spark Animation State
    const [isTravelling, setIsTravelling] = useState(false);
    const [travelFrom, setTravelFrom] = useState<RunNode | null>(null);
    const [travelTo, setTravelTo] = useState<RunNode | null>(null);
    const [playerSparkPos, setPlayerSparkPos] = useState<{ x: number, y: number } | null>(null);
    const playerSparkRef = useRef<HTMLDivElement>(null);

    const runPathRef = useRef<RunNode[]>(runPath);
    useEffect(() => {
        runPathRef.current = runPath;
    }, [runPath]);

    const [cinematicNode, setCinematicNode] = useState<RunNode | null>(null);
    const [cinematicProgress, setCinematicProgress] = useState<number>(0);

    const visitedNodeIdsRef = useRef<string[]>(visitedNodeIds);
    useEffect(() => {
        visitedNodeIdsRef.current = visitedNodeIds;
    }, [visitedNodeIds]);

    const completedSpecialMissionsRef = useRef<string[]>(completedSpecialMissions);
    useEffect(() => {
        completedSpecialMissionsRef.current = completedSpecialMissions;
    }, [completedSpecialMissions]);

    const cinematicNodeRef = useRef<RunNode | null>(null);
    useEffect(() => {
        cinematicNodeRef.current = cinematicNode;
    }, [cinematicNode]);

    const cinematicProgressRef = useRef<number>(0);
    useEffect(() => {
        cinematicProgressRef.current = cinematicProgress;
    }, [cinematicProgress]);

    // Ref and helper to execute action when cinematic finishes
    const cinematicCallbackRef = useRef<(() => void) | null>(null);

    const playCinematic = (node: RunNode, callback?: () => void) => {
        setCinematicNode(node);
        setCinematicProgress(0);
        cinematicCallbackRef.current = callback || null;
        if (audio && typeof audio.playLevelUp === 'function') {
            audio.playLevelUp();
        }
    };

    // Cinematic trigger on mount for the starting node if it has never been touched
    useEffect(() => {
        if (runPath.length === 0) return;
        const initialNode = runPath.find(n => n.id === currentMapId) || runPath.find(n => n.state === 'CURRENT') || runPath[0];
        if (initialNode) {
            const alreadyPlayed = (playedCinematicNodeIds || []).includes(initialNode.id);
            const isVisited = initialNode.state === 'VISITED' || visitedNodeIds.includes(initialNode.id);
            
            // Only play if it's the absolute first starting node of the entire game (e.g. map_1 on the very first start)
            // and has not played its cinematic yet.
            if (!alreadyPlayed && !isVisited && initialNode.id === 'map_1') {
                if (onCinematicPlayed) {
                    onCinematicPlayed(initialNode.id);
                }
                
                // Delay slightly to let StarChart entry transition play out beautifully
                const timer = setTimeout(() => {
                    playCinematic(initialNode);
                }, 600);
                return () => clearTimeout(timer);
            }
        }
    }, [runPath, currentMapId, playedCinematicNodeIds, visitedNodeIds, onCinematicPlayed]);

    // Handle viewport pan and zoom in the cinematic
    useEffect(() => {
        if (!cinematicNode) return;
        
        const mapWidth = 2000;
        const mapHeight = 1300;
        const startZoom = zoom;
        const startPanX = panX;
        const startPanY = panY;
        
        let containerWidth = 800;
        let containerHeight = 600;
        if (mapContainerRef.current) {
            containerWidth = mapContainerRef.current.clientWidth || 800;
            containerHeight = mapContainerRef.current.clientHeight || 600;
        }
        
        const targetZoom = 1.15;
        const cx = (cinematicNode.x / 100) * mapWidth;
        const cy = (cinematicNode.y / 100) * mapHeight;
        const targetPanX = containerWidth / 2 - cx * targetZoom;
        const targetPanY = containerHeight / 2 - cy * targetZoom;
        
        let animStartTime: number | null = null;
        const totalDuration = 4500;
        
        const animateCinematic = (timestamp: number) => {
            if (!animStartTime) animStartTime = timestamp;
            const elapsed = timestamp - animStartTime;
            const p = Math.min(elapsed / totalDuration, 1.0);
            
            const easeProgress = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            setCinematicProgress(p);
            
            const currentZoom = startZoom + (targetZoom - startZoom) * easeProgress;
            const currentPanX = startPanX + (targetPanX - startPanX) * easeProgress;
            const currentPanY = startPanY + (targetPanY - startPanY) * easeProgress;
            
            setZoom(currentZoom);
            setPanX(currentPanX);
            setPanY(currentPanY);
            
            if (p < 1.0) {
                requestAnimationFrame(animateCinematic);
            } else {
                setTimeout(() => {
                    setCinematicNode(null);
                    setCinematicProgress(0);
                    if (cinematicCallbackRef.current) {
                        cinematicCallbackRef.current();
                        cinematicCallbackRef.current = null;
                    }
                }, 1000);
            }
        };
        
        const requestID = requestAnimationFrame(animateCinematic);
        return () => cancelAnimationFrame(requestID);
    }, [cinematicNode]);

    const currentNode = runPath.find(n => n.id === currentMapId) || runPath.find(n => n.state === 'CURRENT') || runPath[0];
    const isCurrentNode = selectedNode ? selectedNode.id === (currentMapId || (currentNode ? currentNode.id : '')) : false;

    // Initialize player visual position on the active node and center camera
    useEffect(() => {
        const currentNode = runPath.find(n => n.id === currentMapId) || runPath.find(n => n.state === 'CURRENT') || runPath[0];
        if (currentNode) {
            setSelectedNode(currentNode);
            setPlayerSparkPos({ x: currentNode.x, y: currentNode.y });

            // Center viewport on current node coordinates using transform pan
            const timer = setTimeout(() => {
                if (mapContainerRef.current) {
                    const mapWidth = 2000;
                    const mapHeight = 1300;
                    const containerWidth = mapContainerRef.current.clientWidth || 800;
                    const containerHeight = mapContainerRef.current.clientHeight || 600;

                    const cx = (currentNode.x / 100) * mapWidth;
                    const cy = (currentNode.y / 100) * mapHeight;

                    const targetZoom = 0.85;
                    const targetX = containerWidth / 2 - cx * targetZoom;
                    const targetY = containerHeight / 2 - cy * targetZoom;

                    setZoom(targetZoom);
                    updatePan(targetX, targetY, targetZoom);
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [runPath, currentMapId]);

    // Canvas procedural background initialization
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 2000;
        canvas.height = 1300;

        // Stars are now drawn locally around each active node inside the spider-web constellation rendering.

        // Nebula coordinates corresponding to regional layout clusters
        const nebulae = [
            { x: 440, y: 300, r: 240, color: 'rgba(16, 185, 129, 0.07)' },   // Whispering Grove (green)
            { x: 1240, y: 240, r: 350, color: 'rgba(6, 182, 212, 0.07)' },   // Crystal Depths (cyan)
            { x: 1600, y: 450, r: 280, color: 'rgba(249, 115, 22, 0.07)' },   // Abandoned Machinery (orange)
            { x: 440, y: 600, r: 280, color: 'rgba(139, 92, 246, 0.07)' },   // Void Wastes (purple)
            { x: 1300, y: 580, r: 300, color: 'rgba(244, 63, 94, 0.08)' },   // Shattered Core (rose)
            { x: 1400, y: 1080, r: 380, color: 'rgba(234, 179, 8, 0.08)' },  // Divine Nexus (yellow/gold)
            { x: 1060, y: 870, r: 320, color: 'rgba(236, 72, 153, 0.07)' },  // The Rift (pink)
            { x: 580, y: 860, r: 340, color: 'rgba(59, 130, 246, 0.07)' }    // Broken Sanctuary (blue)
        ];

        // Create an offscreen canvas for pre-rendering static background
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (offscreenCtx) {
            // Background fill
            offscreenCtx.fillStyle = '#020208';
            offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

            // Draw nebula clouds
            nebulae.forEach(neb => {
                const grad = offscreenCtx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
                grad.addColorStop(0, neb.color);
                grad.addColorStop(0.5, neb.color.replace('0.07', '0.02').replace('0.08', '0.02'));
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                offscreenCtx.fillStyle = grad;
                offscreenCtx.beginPath();
                offscreenCtx.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
                offscreenCtx.fill();
            });

            // Scifi space grid overlay
            offscreenCtx.strokeStyle = 'rgba(71, 85, 105, 0.04)';
            offscreenCtx.lineWidth = 1;
            const gridSpacing = 80;
            for (let x = 0; x < offscreenCanvas.width; x += gridSpacing) {
                offscreenCtx.beginPath();
                offscreenCtx.moveTo(x, 0);
                offscreenCtx.lineTo(x, offscreenCanvas.height);
                offscreenCtx.stroke();
            }
            for (let y = 0; y < offscreenCanvas.height; y += gridSpacing) {
                offscreenCtx.beginPath();
                offscreenCtx.moveTo(0, y);
                offscreenCtx.lineTo(offscreenCanvas.width, y);
                offscreenCtx.stroke();
            }
        }

        // --- OPTIMIZATION LAYER: Cached Constellation & Glow Assets ---
        const constellationStaticCanvas = document.createElement('canvas');
        constellationStaticCanvas.width = canvas.width;
        constellationStaticCanvas.height = canvas.height;
        const constellationStaticCtx = constellationStaticCanvas.getContext('2d');

        // Pre-render a single high-quality radial gradient mask for Fog of War carve-outs (Avoids radial gradient builds in loop)
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = 512;
        maskCanvas.height = 512;
        const mCtx = maskCanvas.getContext('2d');
        if (mCtx) {
            const grad = mCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.92)');
            grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            mCtx.fillStyle = grad;
            mCtx.beginPath();
            mCtx.arc(256, 256, 256, 0, Math.PI * 2);
            mCtx.fill();
        }

        // Cache for region glow asset canvases (Created lazily)
        const regionGlowCanvases: Record<string, HTMLCanvasElement> = {};
        const getGlowCanvas = (regionId: string, rgb: string) => {
            if (regionGlowCanvases[regionId]) return regionGlowCanvases[regionId];
            const gCanvas = document.createElement('canvas');
            gCanvas.width = 64;
            gCanvas.height = 64;
            const gCtx = gCanvas.getContext('2d');
            if (gCtx) {
                const grad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
                grad.addColorStop(0, `rgba(${rgb}, 1.0)`);
                grad.addColorStop(0.3, `rgba(${rgb}, 0.4)`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                gCtx.fillStyle = grad;
                gCtx.beginPath();
                gCtx.arc(32, 32, 32, 0, Math.PI * 2);
                gCtx.fill();
            }
            regionGlowCanvases[regionId] = gCanvas;
            return gCanvas;
        };

        let lastRunPathSignature = "";

        const redrawConstellationStatic = () => {
            if (!constellationStaticCtx) return;
            constellationStaticCtx.clearRect(0, 0, constellationStaticCanvas.width, constellationStaticCanvas.height);
            
            // Draw standard space background onto static layer
            constellationStaticCtx.drawImage(offscreenCanvas, 0, 0);

            const currentNodesList = runPathRef.current || [];
            currentNodesList.forEach(node => {
                const isBeingRevealed = cinematicNodeRef.current?.id === node.id;
                // Leave currently animating/cinematic nodes off the static canvas to render them dynamically
                if (isBeingRevealed) return;

                const cx = (node.x / 100) * 2000;
                const cy = (node.y / 100) * 1300;
                const colors = REGION_COLORS[node.regionId] || REGION_COLORS.region_1;
                const isFogged = node.state === 'FOGGED';
                const opacityMultiplier = isFogged ? 0.08 : 1.0;
                
                const isVisited = getIsNodeCompleted(node, visitedNodeIdsRef.current || [], completedSpecialMissionsRef.current || []);
                const revealOpacity = isVisited ? 1.0 : 0.0;

                const sizeFactor = node.displayType === 'BOSS' ? 1.4 : node.displayType === 'ELITE' ? 1.2 : 1.0;
                const maxRadius = 180 * sizeFactor;
                const nebulaRadius = maxRadius * 2.8;

                // 1. Nebula Aura Gradient Glow
                if (!isFogged && revealOpacity > 0.02) {
                    const auraGrad = constellationStaticCtx.createRadialGradient(cx, cy, 0, cx, cy, nebulaRadius);
                    auraGrad.addColorStop(0, `rgba(${colors.rgb}, 0.45)`);
                    auraGrad.addColorStop(0.15, `rgba(${colors.rgb}, 0.25)`);
                    auraGrad.addColorStop(0.4, `rgba(${colors.rgb}, 0.08)`);
                    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    constellationStaticCtx.fillStyle = auraGrad;
                    constellationStaticCtx.beginPath();
                    constellationStaticCtx.arc(cx, cy, nebulaRadius, 0, Math.PI * 2);
                    constellationStaticCtx.fill();

                    // Pre-rendered Static Nebula Stars (Calculated once, painted once)
                    for (let i = 0; i < 150; i++) {
                        const seed1 = Math.sin(node.x * 12.9898 + node.y * 78.233 + i * 137.5453123);
                        const seed2 = Math.cos(node.x * 45.5432 + node.y * 23.456 + i * 213.3456345);
                        
                        const rand1 = Math.abs(seed1 - Math.floor(seed1));
                        const rand2 = Math.abs(seed2 - Math.floor(seed2));
                        const rand3 = Math.abs((seed1 * seed2) - Math.floor(seed1 * seed2));

                        const r = Math.pow(rand1, 0.75) * nebulaRadius; 
                        const angle = rand2 * Math.PI * 2;
                        const sx = cx + Math.cos(angle) * r;
                        const sy = cy + Math.sin(angle) * r;
                        
                        const opacity = rand3 * 0.5 + 0.45;
                        const starSize = rand1 * 0.9 + 0.6;
                        
                        if (rand3 > 0.45) {
                            constellationStaticCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                        } else {
                            constellationStaticCtx.fillStyle = `rgba(${colors.rgb}, ${opacity})`;
                        }
                        constellationStaticCtx.beginPath();
                        constellationStaticCtx.arc(sx, sy, starSize, 0, Math.PI * 2);
                        constellationStaticCtx.fill();
                    }
                } else {
                    const auraGrad = constellationStaticCtx.createRadialGradient(cx, cy, 0, cx, cy, nebulaRadius * 0.5);
                    auraGrad.addColorStop(0, `rgba(${colors.rgb}, 0.03)`);
                    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    constellationStaticCtx.fillStyle = auraGrad;
                    constellationStaticCtx.beginPath();
                    constellationStaticCtx.arc(cx, cy, nebulaRadius * 0.5, 0, Math.PI * 2);
                    constellationStaticCtx.fill();
                }

                // 2. Concentric spider-web circles (Thin, elegant, 2D)
                const radii = [35 * sizeFactor, 70 * sizeFactor, 105 * sizeFactor, 145 * sizeFactor, 180 * sizeFactor];
                radii.forEach((r, index) => {
                    constellationStaticCtx.strokeStyle = isFogged 
                        ? `rgba(${colors.rgb}, 0.04)` 
                        : `rgba(${colors.rgb}, ${(0.35 - index * 0.05) * opacityMultiplier * revealOpacity})`;
                    constellationStaticCtx.lineWidth = isFogged ? 0.35 : 0.55;
                    constellationStaticCtx.beginPath();
                    constellationStaticCtx.arc(cx, cy, r, 0, Math.PI * 2);
                    constellationStaticCtx.stroke();
                });

                // 3. Radial Grid Connectors (Spider Web Lines)
                const numRadials = 12;
                constellationStaticCtx.strokeStyle = isFogged 
                    ? `rgba(${colors.rgb}, 0.02)` 
                    : `rgba(${colors.rgb}, ${0.12 * opacityMultiplier * revealOpacity})`;
                constellationStaticCtx.lineWidth = isFogged ? 0.25 : 0.45;
                for (let i = 0; i < numRadials; i++) {
                    const angle = (i * Math.PI * 2) / numRadials;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    constellationStaticCtx.beginPath();
                    constellationStaticCtx.moveTo(cx + cos * (20 * sizeFactor), cy + sin * (20 * sizeFactor));
                    constellationStaticCtx.lineTo(cx + cos * maxRadius, cy + sin * maxRadius);
                    constellationStaticCtx.stroke();
                }

                // 4. Pre-rendered Static Scattered Stellar Dust (Highly efficient)
                if (!isFogged && revealOpacity > 0.02) {
                    for (let i = 0; i < 35; i++) {
                        const seed = Math.sin(node.x * 12.34 + i * 56.78 + 9.12);
                        const r = Math.abs(seed) * maxRadius;
                        const angle = (seed * 100) % (Math.PI * 2);
                        const sx = cx + Math.cos(angle) * r;
                        const sy = cy + Math.sin(angle) * r;
                        
                        const randOpacity = (Math.abs(seed * 412.32) % 1) * 0.4 + 0.15;
                        constellationStaticCtx.fillStyle = `rgba(255, 255, 255, ${randOpacity * revealOpacity})`;
                        constellationStaticCtx.beginPath();
                        constellationStaticCtx.arc(sx, sy, 0.45, 0, Math.PI * 2);
                        constellationStaticCtx.fill();
                    }
                }
            });
        };

        let animFrameId: number;
        // Create an offscreen canvas for dynamic fog of war calculation
        const fogCanvas = document.createElement('canvas');
        fogCanvas.width = canvas.width;
        fogCanvas.height = canvas.height;
        const fogCtx = fogCanvas.getContext('2d');

        const render = () => {
            const currentNodesList = runPathRef.current || [];
            const visitedIds = visitedNodeIdsRef.current || [];

            // Compute unique signature of states that would require redrawing static elements
            const runPathSig = currentNodesList.map(n => `${n.id}:${n.state}`).join(',');
            const visitedSig = visitedIds.join(',');
            const cinematicNodeId = cinematicNodeRef.current?.id || "";
            const currentSignature = `${runPathSig}|${visitedSig}|${cinematicNodeId}`;

            if (currentSignature !== lastRunPathSignature) {
                lastRunPathSignature = currentSignature;
                redrawConstellationStatic();
            }

            // 1. Copy cached static constellation layer to main canvas
            ctx.drawImage(constellationStaticCanvas, 0, 0);

            // 2. Render dynamic celestial components (e.g., twinkling stars, cinematic reveals)
            currentNodesList.forEach(node => {
                const cx = (node.x / 100) * 2000;
                const cy = (node.y / 100) * 1300;
                const colors = REGION_COLORS[node.regionId] || REGION_COLORS.region_1;
                const isFogged = node.state === 'FOGGED';
                const opacityMultiplier = isFogged ? 0.08 : 1.0;
                
                const isVisited = getIsNodeCompleted(node, visitedIds, completedSpecialMissionsRef.current || []);
                const isBeingRevealed = cinematicNodeRef.current?.id === node.id;
                
                const revealOpacity = isBeingRevealed ? cinematicProgressRef.current : (isVisited ? 1.0 : 0.0);
                const sizeFactor = node.displayType === 'BOSS' ? 1.4 : node.displayType === 'ELITE' ? 1.2 : 1.0;
                const maxRadius = 180 * sizeFactor;

                // Draw cinematic node static parts on the fly during reveal only (then baked on complete)
                if (isBeingRevealed && revealOpacity > 0.02) {
                    const nebulaRadius = maxRadius * 2.8;
                    const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nebulaRadius);
                    auraGrad.addColorStop(0, `rgba(${colors.rgb}, ${0.45 * revealOpacity})`);
                    auraGrad.addColorStop(0.15, `rgba(${colors.rgb}, ${0.25 * revealOpacity})`);
                    auraGrad.addColorStop(0.4, `rgba(${colors.rgb}, ${0.08 * revealOpacity})`);
                    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    ctx.fillStyle = auraGrad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, nebulaRadius, 0, Math.PI * 2);
                    ctx.fill();

                    const radii = [35 * sizeFactor, 70 * sizeFactor, 105 * sizeFactor, 145 * sizeFactor, 180 * sizeFactor];
                    radii.forEach((r, index) => {
                        ctx.strokeStyle = `rgba(${colors.rgb}, ${(0.35 - index * 0.05) * opacityMultiplier * revealOpacity})`;
                        ctx.lineWidth = 0.55;
                        ctx.beginPath();
                        ctx.arc(cx, cy, r, 0, Math.PI * 2);
                        ctx.stroke();
                    });

                    const numRadials = 12;
                    ctx.strokeStyle = `rgba(${colors.rgb}, ${0.12 * opacityMultiplier * revealOpacity})`;
                    ctx.lineWidth = 0.45;
                    for (let i = 0; i < numRadials; i++) {
                        const angle = (i * Math.PI * 2) / numRadials;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        ctx.beginPath();
                        ctx.moveTo(cx + cos * (20 * sizeFactor), cy + sin * (20 * sizeFactor));
                        ctx.lineTo(cx + cos * maxRadius, cy + sin * maxRadius);
                        ctx.stroke();
                    }
                }

                // 3. Render Twinkling Ring Stars with extreme performance (Using pre-rendered 2D sprite textures)
                if (!isFogged && revealOpacity > 0.02) {
                    const radii = [35 * sizeFactor, 70 * sizeFactor, 105 * sizeFactor, 145 * sizeFactor, 180 * sizeFactor];
                    const glowCanvas = getGlowCanvas(node.regionId, colors.rgb);

                    radii.forEach((r, rIdx) => {
                        const starsOnRing = rIdx === 0 ? 6 : rIdx === 1 ? 8 : 12;
                        
                        // Main intersection stars
                        for (let i = 0; i < starsOnRing; i++) {
                            const angle = (i * Math.PI * 2) / starsOnRing;
                            const sx = cx + Math.cos(angle) * r;
                            const sy = cy + Math.sin(angle) * r;
                            
                            const phase = (Date.now() * 0.0022 + sx * 0.05 + sy * 0.03) % (Math.PI * 2);
                            const twinkle = 0.82 + Math.sin(phase) * 0.18;
                            const baseSize = 1.6 + (rIdx * 0.25);
                            const dynamicSize = baseSize * twinkle;
                            
                            const glowRadius = dynamicSize * 2.8;
                            
                            // Highly efficient hardware-accelerated drawing of pre-rendered glow texture
                            ctx.globalAlpha = twinkle * 0.55 * revealOpacity;
                            ctx.drawImage(glowCanvas, sx - glowRadius, sy - glowRadius, glowRadius * 2, glowRadius * 2);
                            
                            // Bright solid core star
                            ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * revealOpacity})`;
                            ctx.globalAlpha = 1.0;
                            ctx.beginPath();
                            ctx.arc(sx, sy, dynamicSize, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // Extra twinkling stars on the rings
                        const extraStarsCount = 3;
                        for (let k = 0; k < extraStarsCount; k++) {
                            const seed = Math.sin(node.x * 23.45 + node.y * 67.89 + rIdx * 41.23 + k * 87.65);
                            const extraAngle = Math.abs(seed) * Math.PI * 2;
                            const sx = cx + Math.cos(extraAngle) * r;
                            const sy = cy + Math.sin(extraAngle) * r;

                            const phase = (Date.now() * 0.0020 + sx * 0.06 + sy * 0.04) % (Math.PI * 2);
                            const twinkle = 0.85 + Math.sin(phase) * 0.15;
                            const baseSize = 2.0 + (k * 0.3);
                            const dynamicSize = baseSize * twinkle;

                            const glowRadius = dynamicSize * 2.5;

                            ctx.globalAlpha = twinkle * 0.45 * revealOpacity;
                            ctx.drawImage(glowCanvas, sx - glowRadius, sy - glowRadius, glowRadius * 2, glowRadius * 2);

                            ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * revealOpacity})`;
                            ctx.globalAlpha = 1.0;
                            ctx.beginPath();
                            ctx.arc(sx, sy, dynamicSize, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });
                } else {
                    // Fast drawing of locked nodes subdued tiny dots (no glows, simple layout)
                    const radii = [35 * sizeFactor, 70 * sizeFactor, 105 * sizeFactor, 145 * sizeFactor, 180 * sizeFactor];
                    ctx.fillStyle = `rgba(${colors.rgb}, 0.04)`;
                    radii.forEach((r, rIdx) => {
                        const starsOnRing = rIdx === 0 ? 6 : rIdx === 1 ? 8 : 12;
                        for (let i = 0; i < starsOnRing; i++) {
                            const angle = (i * Math.PI * 2) / starsOnRing;
                            const sx = cx + Math.cos(angle) * r;
                            const sy = cy + Math.sin(angle) * r;
                            ctx.beginPath();
                            ctx.arc(sx, sy, 0.45, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });
                }

                // Render cinematic shockwave
                if (isBeingRevealed && revealOpacity > 0.05 && revealOpacity < 0.95) {
                    const shockProgress = (revealOpacity - 0.05) / 0.9;
                    const shockRadius = maxRadius * 3.5 * shockProgress;
                    const shockOpacity = Math.sin(shockProgress * Math.PI) * 0.8;
                    
                    ctx.strokeStyle = `rgba(${colors.rgb}, ${shockOpacity})`;
                    ctx.lineWidth = 4 * (1.0 - shockProgress);
                    
                    ctx.beginPath();
                    ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    
                    ctx.strokeStyle = `rgba(255, 255, 255, ${shockOpacity * 0.9})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(cx, cy, shockRadius * 0.95, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            // 4. Apply dynamic Fog of War overlay (Extremely optimized via pre-rendered canvas mask drawImage)
            if (fogCtx) {
                fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
                
                fogCtx.fillStyle = 'rgba(2, 2, 8, 0.96)';
                fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
                
                fogCtx.globalCompositeOperation = 'destination-out';
                
                currentNodesList.forEach(node => {
                    if (node.state !== 'FOGGED') {
                        const cx = (node.x / 100) * 2000;
                        const cy = (node.y / 100) * 1300;
                        
                        const isVisited = getIsNodeCompleted(node, visitedIds, completedSpecialMissionsRef.current || []);
                        const isBeingRevealed = cinematicNodeRef.current?.id === node.id;
                        
                        const pulse = Math.sin((Date.now() * 0.0012) + (node.x * 0.4)) * 12;
                        
                        let baseRadius = 185;
                        if (isBeingRevealed) {
                            baseRadius = 120 + (140 * cinematicProgressRef.current);
                        } else if (node.state === 'CURRENT') {
                            baseRadius = 260;
                        } else if (isVisited) {
                            baseRadius = 185;
                        } else {
                            baseRadius = 120;
                        }
                        const radius = baseRadius + pulse;
                        
                        // Instant alpha mask carve-out (Hardware accelerated via GPU vs. CPU RadialGradients)
                        fogCtx.drawImage(maskCanvas, cx - radius, cy - radius, radius * 2, radius * 2);
                    }
                });
                
                fogCtx.globalCompositeOperation = 'source-over';
                ctx.drawImage(fogCanvas, 0, 0);
            }

            animFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animFrameId);
    }, []);

    // Drag-to-Scroll Event Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!mapContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.clientX);
        setStartY(e.clientY);
        setScrollLeft(panX);
        setScrollTop(panY);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !mapContainerRef.current) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        updatePan(scrollLeft + dx, scrollTop + dy, zoom);
    };

    // Zoom on wheel scroll
    const handleWheel = (e: React.WheelEvent) => {
        if (!mapContainerRef.current) return;
        e.preventDefault();

        const rect = mapContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Coordinates of the cursor in map space before zoom
        const mapX = (mouseX - panX) / zoom;
        const mapY = (mouseY - panY) / zoom;

        // Change zoom factor
        const zoomFactor = 1.1;
        let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
        // Limit zoom between 0.4 and 3.0
        newZoom = Math.max(0.4, Math.min(3.0, newZoom));

        // Re-calculate pan coordinates so cursor points to the same map point
        const newPanX = mouseX - mapX * newZoom;
        const newPanY = mouseY - mapY * newZoom;

        if (newZoom !== zoom) {
            triggerZoomIndicator();
        }

        setZoom(newZoom);
        updatePan(newPanX, newPanY, newZoom);
    };

    // Touch event handlers for mobile panning & double touch pinch zoom
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!mapContainerRef.current) return;
        const rect = mapContainerRef.current.getBoundingClientRect();

        if (e.touches.length === 1) {
            const t = e.touches[0];
            touchPanStartRef.current = {
                x: t.clientX - rect.left,
                y: t.clientY - rect.top,
                panX: panX,
                panY: panY
            };
            touchStartRef.current = null;
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];

            const x1 = t1.clientX - rect.left;
            const y1 = t1.clientY - rect.top;
            const x2 = t2.clientX - rect.left;
            const y2 = t2.clientY - rect.top;

            const dist = Math.hypot(x2 - x1, y2 - y1);
            touchStartRef.current = {
                dist,
                zoom,
                panX,
                panY
            };
            touchPanStartRef.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!mapContainerRef.current) return;
        const rect = mapContainerRef.current.getBoundingClientRect();

        if (e.touches.length === 1 && touchPanStartRef.current) {
            const t = e.touches[0];
            const clientX = t.clientX - rect.left;
            const clientY = t.clientY - rect.top;

            const dx = clientX - touchPanStartRef.current.x;
            const dy = clientY - touchPanStartRef.current.y;

            updatePan(touchPanStartRef.current.panX + dx, touchPanStartRef.current.panY + dy, zoom);
        } else if (e.touches.length === 2 && touchStartRef.current) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];

            const x1 = t1.clientX - rect.left;
            const y1 = t1.clientY - rect.top;
            const x2 = t2.clientX - rect.left;
            const y2 = t2.clientY - rect.top;

            const currentDist = Math.hypot(x2 - x1, y2 - y1);
            if (touchStartRef.current.dist > 0) {
                const scale = currentDist / touchStartRef.current.dist;
                let newZoom = touchStartRef.current.zoom * scale;
                newZoom = Math.max(0.4, Math.min(3.0, newZoom));

                // Pinch center coordinates in container space
                const centerX = (x1 + x2) / 2;
                const centerY = (y1 + y2) / 2;

                // Map coordinate of center before scale
                const mapX = (centerX - touchStartRef.current.panX) / touchStartRef.current.zoom;
                const mapY = (centerY - touchStartRef.current.panY) / touchStartRef.current.zoom;

                // New pan offsets
                const newPanX = centerX - mapX * newZoom;
                const newPanY = centerY - mapY * newZoom;

                if (newZoom !== zoom) {
                    triggerZoomIndicator();
                }

                setZoom(newZoom);
                updatePan(newPanX, newPanY, newZoom);
            }
        }
    };

    const handleTouchEnd = () => {
        touchStartRef.current = null;
        touchPanStartRef.current = null;
    };

    // Calculate curved Bezier paths
    const getCurvedPath = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        // S-curve control points
        const cx1 = x1 + dx * 0.5;
        const cy1 = y1 + dy * 0.1;
        const cx2 = x1 + dx * 0.5;
        const cy2 = y1 + dy * 0.9;
        return {
            path: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
            cx1, cy1, cx2, cy2
        };
    };

    const findPath = (startNode: RunNode, endNode: RunNode): RunNode[] | null => {
        if (startNode.id === endNode.id) return [startNode];
        const adj = new Map<string, string[]>();
        runPath.forEach(n => {
            if (!adj.has(n.id)) adj.set(n.id, []);
            n.connectsTo.forEach(target => {
                if (!adj.has(target)) adj.set(target, []);
                adj.get(n.id)!.push(target);
                adj.get(target)!.push(n.id);
            });
        });

        const queue = [startNode.id];
        const visited = new Set([startNode.id]);
        const cameFrom = new Map<string, string>();

        while (queue.length > 0) {
            const curr = queue.shift()!;
            if (curr === endNode.id) break;
            
            const neighbors = adj.get(curr) || [];
            for (const next of neighbors) {
                const nextNode = runPath.find(n => n.id === next);
                if (!nextNode || nextNode.state === 'FOGGED') continue;
                if (!visited.has(next)) {
                    visited.add(next);
                    cameFrom.set(next, curr);
                    queue.push(next);
                }
            }
        }

        if (!cameFrom.has(endNode.id)) return null;

        const path: RunNode[] = [];
        let curr = endNode.id;
        while (curr !== startNode.id) {
            path.unshift(runPath.find(n => n.id === curr)!);
            curr = cameFrom.get(curr)!;
        }
        path.unshift(startNode);
        return path;
    };

    // Trigger travel cinematic spark animation along curves
    const triggerTravelAnimation = (pathNodes: RunNode[]) => {
        if (pathNodes.length < 2) return;
        setIsTravelling(true);
        audio.playLevelUp(); // Play nice celestial activation sound
        
        let currentSegment = 0;
        
        const playSegment = () => {
            if (currentSegment >= pathNodes.length - 1) {
                const finalNode = pathNodes[pathNodes.length - 1];
                setSelectedNode(finalNode);
                setPlayerSparkPos({ x: finalNode.x, y: finalNode.y });
                setIsTravelling(false);
                
                // Define the actions to execute upon landing
                const handleArrival = () => {
                    if (onTravelToNode) {
                        onTravelToNode(finalNode.id);
                    }
                    // Auto-open treasure minigame if unvisited
                    const isVisited = finalNode.state === 'VISITED' || visitedNodeIds.includes(finalNode.id);
                    if (finalNode.type === 'TREASURE' && !isVisited) {
                        setTreasureNode(finalNode);
                    }
                };

                // Check if this node has been touched (discovered)
                const alreadyPlayed = (playedCinematicNodeIds || []).includes(finalNode.id);
                const isVisited = finalNode.state === 'VISITED' || visitedNodeIds.includes(finalNode.id);
                if (!alreadyPlayed && !isVisited) {
                    if (onCinematicPlayed) {
                        onCinematicPlayed(finalNode.id);
                    }
                    playCinematic(finalNode, handleArrival);
                } else {
                    handleArrival();
                }
                return;
            }
            
            const fromNode = pathNodes[currentSegment];
            const toNode = pathNodes[currentSegment + 1];
            setTravelFrom(fromNode);
            setTravelTo(toNode);
            
            let startTime: number | null = null;
            // Faster per segment if there are multiple segments
            const duration = pathNodes.length > 2 ? 1000 : 2500;
            
            const step = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease in out curve
                const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
                const t = ease;
                const mt = 1 - t;
                
                const cx1 = fromNode.x + (toNode.x - fromNode.x) * 0.5;
                const cy1 = fromNode.y + (toNode.y - fromNode.y) * 0.1;
                const cx2 = fromNode.x + (toNode.x - fromNode.x) * 0.5;
                const cy2 = fromNode.y + (toNode.y - fromNode.y) * 0.9;

                const sparkX = mt * mt * mt * fromNode.x + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * toNode.x;
                const sparkY = mt * mt * mt * fromNode.y + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * toNode.y;

                setPlayerSparkPos({ x: sparkX, y: sparkY });

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    setPlayerSparkPos({ x: toNode.x, y: toNode.y });
                    currentSegment++;
                    playSegment();
                }
            };
            requestAnimationFrame(step);
        };
        
        playSegment();
    };

    // Calculate connections to draw (curved)
    const connectionsToDraw: { from: RunNode; to: RunNode; isVisible: boolean; pathD: string }[] = [];
    runPath.forEach(startNode => {
        startNode.connectsTo.forEach(targetId => {
            const endNode = runPath.find(n => n.id === targetId);
            if (!endNode) return;

            const fromVisible = startNode.state !== 'FOGGED';
            const toVisible = endNode.state !== 'FOGGED';

            const { path } = getCurvedPath(startNode.x, startNode.y, endNode.x, endNode.y);

            connectionsToDraw.push({
                from: startNode,
                to: endNode,
                isVisible: fromVisible || toVisible,
                pathD: path
            });
        });
    });

    const getRegionInfo = (regionId: string) => {
        return REGION_POOL.find(r => r.id === regionId) || REGION_POOL[0];
    };

    const getRegionColors = (regionId: string) => {
        return REGION_COLORS[regionId] || REGION_COLORS.region_1;
    };

    const getNodeVisuals = (node: RunNode) => {
        // If this node is being revealed in the cinematic, we determine its "visited" visual state dynamically based on the current cinematic progress!
        const isBeingRevealed = cinematicNode?.id === node.id;
        const isNodeCompleted = getIsNodeCompleted(node, visitedNodeIds, completedSpecialMissions);
        const isVisited = isNodeCompleted && (!isBeingRevealed || cinematicProgress > 0.6);
        const displayType = node.displayType;

        if (displayType === 'UNKNOWN') {
            return {
                colorClass: "border-purple-950/30 bg-purple-950/10 text-purple-400",
                glowClass: "shadow-[0_0_15px_rgba(168,85,247,0.1)]",
                icon: <HelpCircle size={14} className="text-purple-400 animate-pulse" />,
                hasRings: false
            };
        }

        switch (displayType) {
            case 'BOSS':
                return {
                    colorClass: isVisited 
                        ? "border-amber-500 bg-amber-950/20 text-amber-400" 
                        : "border-rose-600 bg-rose-950/30 text-rose-300 ring-2 ring-rose-500/10",
                    glowClass: isVisited
                        ? "shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse",
                    icon: isVisited 
                        ? <Skull size={15} className="text-amber-400 fill-amber-400/30" />
                        : <Skull size={15} className="text-rose-400 animate-pulse" />,
                    hasRings: true
                };
            case 'REST':
            case 'SHRINE':
                return {
                    colorClass: isVisited
                        ? "border-amber-500 bg-amber-950/20 text-amber-400"
                        : "border-cyan-500 bg-cyan-950/20 text-cyan-200",
                    glowClass: isVisited
                        ? "shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
                    icon: isVisited
                        ? <HeartPulse size={15} className="text-amber-400 fill-amber-400/30" />
                        : <HeartPulse size={15} className="text-cyan-400" />,
                    hasRings: true
                };
            case 'ELITE':
                return {
                    colorClass: isVisited
                        ? "border-amber-500 bg-amber-950/20 text-amber-400"
                        : "border-orange-500 bg-orange-950/20 text-orange-200",
                    glowClass: isVisited
                        ? "shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "shadow-[0_0_15px_rgba(249,115,22,0.3)]",
                    icon: isVisited
                        ? <Flame size={15} className="text-amber-400 fill-amber-400/35 animate-pulse" />
                        : <Flame size={15} className="text-orange-400" />,
                    hasRings: true
                };
            case 'EVENT':
            case 'SECRET':
                return {
                    colorClass: isVisited
                        ? "border-amber-500 bg-amber-950/20 text-amber-400"
                        : "border-purple-500 bg-purple-950/20 text-purple-200",
                    glowClass: isVisited
                        ? "shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
                    icon: isVisited 
                        ? <Sparkles size={15} className="text-amber-400 fill-amber-400" />
                        : <Lock size={12} className="text-purple-400/80" />,
                    hasRings: true
                };
            case 'TREASURE':
                return {
                    colorClass: isVisited
                        ? "border-amber-600 bg-amber-950/25 text-amber-500"
                        : "border-amber-400 bg-amber-950/20 text-amber-200",
                    glowClass: isVisited
                        ? "shadow-[0_0_15px_rgba(217,119,6,0.20)]"
                        : "shadow-[0_0_18px_rgba(251,191,36,0.45)]",
                    icon: isVisited
                        ? <Gem size={13} className="text-amber-600 fill-amber-600/40" />
                        : <Gem size={13} className="text-amber-300 animate-pulse" />,
                    hasRings: false
                };
            default: // COMBAT (Standard point node - NO RINGS)
                return {
                    colorClass: isVisited
                        ? "border-amber-500 bg-amber-950/20 text-amber-400"
                        : "border-indigo-500 bg-indigo-950/20 text-indigo-200",
                    glowClass: isVisited
                        ? "shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "shadow-[0_0_15px_rgba(99,102,241,0.2)]",
                    icon: isVisited 
                        ? <Star size={12} className="text-amber-400 fill-amber-400" />
                        : <Lock size={10} className="text-slate-500/80" />,
                    hasRings: false
                };
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#020208]/98 backdrop-blur-md flex flex-col font-sans text-slate-100 select-none overflow-hidden">
            {/* Soft global ambient background dust flows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[130px] pointer-events-none" />

            {/* Floating Title & Vault Keys (Top-Left) */}
            <div className="absolute top-5 left-6 z-20 select-none flex items-center gap-4">
                <h1 className="text-xl font-extrabold tracking-widest bg-gradient-to-r from-slate-200 via-slate-400 to-slate-600 bg-clip-text text-transparent uppercase font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    {t("Light's Journey", lang)}
                </h1>
                {specialMissionKeys > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/70 border border-amber-500/50 rounded-full text-amber-300 text-xs font-mono font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse">
                        <Key size={14} className="text-amber-400" />
                        <span>{t("Vault Keys:", lang)} {specialMissionKeys}</span>
                    </div>
                )}
            </div>

            {/* Floating Close Button (Top-Right) */}
            <div className="absolute top-5 right-6 z-20">
                <button
                    onClick={onClose}
                    className="p-2 rounded-full border border-slate-800 bg-slate-950/80 backdrop-blur-md text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95 shadow-2xl"
                    title="Close Star Chart"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Main Interactive Map Layout */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* COLUMN 1: LEFT SIDEBAR (Paths and Node Symbol Legends) */}
                <div className="hidden lg:flex flex-col w-72 bg-slate-950/80 border-r border-slate-900/60 p-5 overflow-y-auto font-mono text-xs text-slate-400 gap-6 select-none shrink-0 scrollbar-none">
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-900 pb-1">
                            Path Connections
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase text-slate-300">{t("Celestial Path", lang)}</span>
                                <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-[0_0_4px_#22d3ee]" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase text-slate-400 font-mono">{t("Uncharted Gap", lang)}</span>
                                <div className="w-16 h-0.5 border-t border-dashed border-slate-700" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase text-purple-400">{t("Secret Gateway", lang)}</span>
                                <div className="w-16 h-0.5 border-t border-dotted border-purple-500" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-900 pb-1">
                            Celestial Sector Symbols
                        </h3>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-950/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                                    <Star size={11} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-300 leading-none">{t("Combat Anomaly", lang)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase mt-0.5">{t("Defeat waves of void creatures", lang)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-rose-950/30 border border-rose-500/50 flex items-center justify-center text-rose-400">
                                    <Skull size={11} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-rose-400 leading-none">{t("Regional Threat", lang)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase mt-0.5">{t("Guardians and act bosses", lang)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-950/30 border border-purple-500/50 flex items-center justify-center text-purple-400">
                                    <Sparkles size={11} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-purple-400 leading-none font-mono font-bold">{t("Secret Area", lang)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase mt-0.5">{t("Special high-risk missions", lang)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-cyan-950/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                                    <HeartPulse size={11} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-cyan-400 leading-none">{t("Cosmic Shrine", lang)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase mt-0.5">{t("Secure essence and heal cores", lang)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-amber-950/30 border border-amber-400/60 flex items-center justify-center text-amber-300">
                                    <Gem size={11} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-amber-300 leading-none">{t("Essence Cache", lang)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase mt-0.5">{t("Minigame — harvest essence", lang)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-900 pb-1">
                            System Status
                        </h3>
                        <div className="space-y-2 font-mono text-[10px] text-slate-500 leading-relaxed uppercase">
                            <p>{t("Active Run:", lang)} <span className="text-cyan-400 font-bold">{t("In Progress", lang)}</span></p>
                            <p>{t("Completed:", lang)} <span className="text-amber-400 font-bold">{visitedNodeIds.length} / {runPath.length} {t("Sectors", lang)}</span></p>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: CENTRAL INTERACTIVE VIEWPORT (Procedural Canvas Starfield & Scrolling Viewport) */}
                <div className="flex-1 relative overflow-hidden bg-[#020208]">
                    <div 
                        ref={mapContainerRef}
                        className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Huge Workspace Map Grid */}
                        <div 
                            className="relative w-[2000px] h-[1300px] origin-top-left"
                            style={{
                                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                            }}
                        >
                            {/* Cinematic Procedural Starry Nebula Background Canvas */}
                            <canvas 
                                ref={canvasRef} 
                                className="absolute inset-0 w-full h-full pointer-events-none" 
                            />

                            {/* Note: region banners are now rendered directly above each active node to prevent duplication and layout clutter */}

                            {/* High-performance GPU-accelerated CSS animations for SVG path flows */}
                            <style>{`
                                @keyframes pathFlow {
                                    from {
                                        stroke-dashoffset: 0;
                                    }
                                    to {
                                        stroke-dashoffset: -28;
                                    }
                                }
                                .animate-path-flow {
                                    animation: pathFlow 1.5s linear infinite;
                                }
                            `}</style>

                            {/* SVG Beautiful Curved Connection Constellation Lines Layer */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="unlocked-path-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.75" />
                                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.75" />
                                    </linearGradient>
                                    <linearGradient id="secret-path-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
                                    </linearGradient>
                                </defs>

                                {connectionsToDraw.map((conn, idx) => {
                                    if (!conn.isVisible) return null;
                                    
                                    const isSecret = conn.from.id.includes('secret') || conn.to.id.includes('secret') || conn.from.regionId.includes('secret') || conn.to.regionId.includes('secret');
                                    const isLocked = conn.from.state === 'FOGGED' || conn.to.state === 'FOGGED';
                                    
                                    const colors = getRegionColors(conn.from.regionId);
                                    let strokeColor = `rgba(${colors.rgb}, 0.55)`;
                                    let strokeWidth = isLocked ? "1.5" : "2.5";
                                    let strokeDasharray = "none";
                                    let shadowClass = "";

                                    if (isLocked) {
                                        strokeColor = `rgba(${colors.rgb}, 0.25)`;
                                        strokeWidth = "1.5";
                                    }

                                    return (
                                        <g key={`curve-${idx}`}>
                                            <path
                                                d={conn.pathD}
                                                fill="none"
                                                stroke={strokeColor}
                                                strokeWidth={strokeWidth}
                                                strokeDasharray={strokeDasharray}
                                                vectorEffect="non-scaling-stroke"
                                                className={shadowClass}
                                                style={{
                                                    opacity: isLocked ? 0.45 : 1,
                                                    transition: 'opacity 1s ease',
                                                }}
                                            />
                                            {!isLocked && (
                                                <path
                                                    d={conn.pathD}
                                                    fill="none"
                                                    stroke="#ffffff"
                                                    strokeWidth="2.0"
                                                    strokeLinecap="round"
                                                    strokeDasharray="0.1 3.5"
                                                    vectorEffect="non-scaling-stroke"
                                                    opacity="0.9"
                                                    style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,1))" }}
                                                />
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Node Buttons Layer */}
                            {runPath.map((node) => {
                                const isFogged = node.state === 'FOGGED';
                                const isCurrent = node.state === 'CURRENT';
                                const isVisited = getIsNodeCompleted(node, visitedNodeIds, completedSpecialMissions);
                                const isBeingRevealed = cinematicNode?.id === node.id;
                                
                                const isSelected = selectedNode?.id === node.id;
                                const isRecommendedNext = !isVisited && !isFogged && !isCurrent && (selectedNode || currentNode)?.connectsTo?.includes(node.id);
                                const regionColors = getRegionColors(node.regionId);
                                const visuals = getNodeVisuals(node);

                                // Check if this node's actual visuals (taking cinematic into account) is evaluated as visited
                                const isVisuallyVisited = isVisited && (!isBeingRevealed || cinematicProgress > 0.6);

                                return (
                                    <div
                                        key={node.id}
                                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                                        style={{ 
                                            left: `${node.x}%`, 
                                            top: `${node.y}%`,
                                        }}
                                    >
                                        {isRecommendedNext && (
                                            <div className="absolute -top-9 left-0 -translate-x-1/2 pointer-events-none z-30">
                                                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-tech font-bold text-[8px] tracking-widest uppercase shadow-[0_0_12px_#fbbf24] animate-bounce whitespace-nowrap block">
                                                    ★ {t("NEXT", lang)}
                                                </span>
                                            </div>
                                        )}
                                        {/* Node Core Interactive Button Wrapper */}
                                        <div className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                                            <button
                                                onClick={() => {
                                                    if (isFogged && (node.type === 'SECRET' || node.type === 'EVENT') && !isTravelling) {
                                                        setSelectedNode(node);
                                                        const range = getWaveRangeForNode(node);
                                                        setLocalSelectedWave(range.min);
                                                        setShowWaveSelector(true);
                                                        return;
                                                    }
                                                    if (!isFogged && !isTravelling) {
                                                        // Treasure nodes: travel to it if we are not already on it.
                                                        // If we are already on it and it's unvisited, open the minigame.
                                                        if (node.type === 'TREASURE') {
                                                            const isCurrentlyAtThisNode = selectedNode ? selectedNode.id === node.id : currentMapId === node.id;
                                                            if (isCurrentlyAtThisNode) {
                                                                setSelectedNode(node);
                                                                const alreadyCompleted = isVisited || visitedNodeIds.includes(node.id);
                                                                if (!alreadyCompleted) {
                                                                    setTreasureNode(node);
                                                                }
                                                            } else {
                                                                const pathNodes = findPath(selectedNode || currentNode, node);
                                                                if (pathNodes && pathNodes.length > 1) {
                                                                    triggerTravelAnimation(pathNodes);
                                                                } else if (pathNodes && pathNodes.length === 1) {
                                                                    setSelectedNode(node);
                                                                }
                                                            }
                                                            return;
                                                        }
                                                        if (isCurrent) {
                                                            setSelectedNode(node);
                                                            const range = getWaveRangeForNode(node);
                                                            const maxSelectable = Math.max(range.min, Math.min(range.max, maxWaveReached));
                                                            setLocalSelectedWave(maxSelectable);
                                                            setShowWaveSelector(true);
                                                        } else {
                                                            const pathNodes = findPath(selectedNode || currentNode, node);
                                                            if (pathNodes && pathNodes.length > 1) {
                                                                triggerTravelAnimation(pathNodes);
                                                            } else if (pathNodes && pathNodes.length === 1) {
                                                                setSelectedNode(node);
                                                            }
                                                        }
                                                    }
                                                }}
                                                className={`w-9 h-9 md:w-10 md:h-10 rounded-full border flex items-center justify-center bg-[#03030c]/90 backdrop-blur-md transform transition-all duration-300 ${
                                                    !isFogged ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-default text-slate-800"
                                                } ${
                                                    isFogged 
                                                        ? "border-slate-900 bg-slate-950/25" 
                                                        : "border-white text-white"
                                                } ${
                                                    isSelected ? "ring-2 ring-white scale-110" : ""
                                                 } ${isCurrent ? "ring-1 ring-white" : ""}`}
                                                style={!isFogged ? {
                                                    boxShadow: isSelected 
                                                        ? `0 0 35px ${regionColors.primary}, 0 0 15px #ffffff, inset 0 0 15px ${regionColors.primary}`
                                                        : `0 0 25px ${regionColors.primary}, inset 0 0 10px ${regionColors.primary}`,
                                                    borderColor: isSelected ? '#ffffff' : regionColors.primary,
                                                    backgroundColor: isCurrent ? '#ffffff' : `rgba(${regionColors.rgb}, 0.35)`,
                                                    color: isCurrent ? '#020208' : '#ffffff',
                                                } : {}}
                                            >
                                                {!isFogged && (
                                                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                                        isCurrent 
                                                            ? "bg-slate-950 scale-110" 
                                                            : isVisited 
                                                                ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" 
                                                                : "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                                                    }`} />
                                                )}
                                            </button>
                                        </div>

                                        {/* Beautiful, Big, Colorful Floating Label directly on top of each node */}
                                        <div 
                                            className="absolute bottom-11 left-0 -translate-x-1/2 text-center pointer-events-none select-none z-25 transition-all duration-700 flex flex-col items-center"
                                            style={{
                                                opacity: isFogged ? 0.03 : 1,
                                                filter: isFogged ? 'blur(1px)' : 'none'
                                            }}
                                        >
                                            <h2 className={`text-xs md:text-sm font-black tracking-[0.24em] ${regionColors.text} uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,1)] font-sans whitespace-nowrap`}>
                                                {isFogged ? '???' : t(getRegionInfo(node.regionId).name, lang).toUpperCase()}
                                            </h2>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* DYNAMIC PLAYER LIGHT REPRESENTATION (MC Celestial Spark) */}
                            {playerSparkPos && (
                                <div
                                    ref={playerSparkRef}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center z-30 pointer-events-none"
                                    style={{ left: `${playerSparkPos.x}%`, top: `${playerSparkPos.y}%` }}
                                >
                                    {/* Multi-layered custom glowing visual trail effect */}
                                    <div className="absolute w-8 h-8 rounded-full bg-cyan-400/10 animate-ping" />
                                    <div className="absolute w-5 h-5 rounded-full bg-cyan-400/30 blur-[2px] animate-pulse" />
                                    <div className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_#22d3ee] ring-2 ring-cyan-300" />
                                    <div className="absolute w-1 h-1 rounded-full bg-cyan-100" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Floating Zoom Percentage overlay, only appears during active zoom interaction */}
                    {showZoomPercent && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 0.7, scale: 1.0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 select-none"
                        >
                            <span className="text-4xl md:text-5xl font-mono font-extrabold text-cyan-400 tracking-widest drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                                {Math.round(zoom * 100)}%
                            </span>
                        </motion.div>
                    )}

                    {/* Simple Drag & Scroll Guide in top right, cleanly integrated */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
                        <div className="hidden sm:flex bg-slate-950/80 border border-slate-900/80 px-2.5 py-1.5 rounded-lg text-[8px] font-mono text-slate-500 uppercase tracking-widest items-center gap-1.5 shadow-2xl">
                            <Compass size={11} className="text-cyan-400 animate-pulse" />
                            <span>{t("DRAG TO PAN | SCROLL / PINCH TO ZOOM", lang)}</span>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: RIGHT SIDEBAR (Threat Indicators & System Progress) */}
                <div className="hidden lg:flex flex-col w-72 bg-slate-950/80 border-l border-slate-900/60 p-5 overflow-y-auto font-mono text-xs text-slate-400 gap-6 select-none shrink-0 scrollbar-none">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-900 pb-1">
                            Anomalous Threats
                        </h3>
                        <div className="space-y-3">
                            <div className="bg-rose-950/10 border border-rose-950/25 p-2.5 rounded-lg space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-rose-400">
                                    <span>{t("THE HOLLOWWARDEN", lang)}</span>
                                    <Skull size={10} />
                                </div>
                                <p className="text-[8px] text-slate-500 uppercase tracking-wider">{t("4. Crystal Depths", lang)}</p>
                            </div>
                            <div className="bg-orange-950/10 border border-orange-950/25 p-2.5 rounded-lg space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-orange-400">
                                    <span>{t("THE COREBREAKER", lang)}</span>
                                    <Skull size={10} />
                                </div>
                                <p className="text-[8px] text-slate-500 uppercase tracking-wider">{t("6. The Shattered Core", lang)}</p>
                            </div>
                            <div className="bg-purple-950/10 border border-purple-950/25 p-2.5 rounded-lg space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-purple-400">
                                    <span>{t("THE VOIDBORN", lang)}</span>
                                    <Skull size={10} />
                                </div>
                                <p className="text-[8px] text-slate-500 uppercase tracking-wider">{t("9. The Rift", lang)}</p>
                            </div>
                            <div className="bg-slate-900/20 border border-slate-800 p-2.5 rounded-lg space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <span>{t("DARKNESS INCARNATE", lang)}</span>
                                    <Skull size={10} />
                                </div>
                                <p className="text-[8px] text-slate-500 uppercase tracking-wider">{t("Divine Center", lang)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-900 pb-1">
                            Exits Directory
                        </h3>
                        <div className="space-y-2">
                            <div className="bg-slate-900/20 border border-slate-900/60 p-2.5 rounded-lg flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 animate-pulse" />
                                <div>
                                    <p className="text-[9px] font-bold text-slate-300 uppercase">{t("To Deeper Realms", lang)}</p>
                                    <p className="text-[8px] text-slate-500 uppercase mt-0.5">{t("Defeat final boss to secure seals", lang)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Panel / Selected Node Detailed Information HUD Panel */}
            <div className="relative w-full bg-[#03030a] border-t border-slate-900/60 py-5 px-6 z-20 shadow-[0_-15px_30px_rgba(0,0,0,0.8)] overflow-hidden">
                {selectedNode && selectedNode.displayType !== 'UNKNOWN' && (() => {
                    const bgConfig = getRegionBackground(selectedNode.regionId);
                    return (
                        <div className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-700">
                            <img
                                src={bgConfig.imageUrl}
                                alt={selectedNode.regionId}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover mix-blend-screen scale-110"
                                style={{ filter: bgConfig.filter }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#03030a] via-[#03030a]/80 to-[#03030a]" />
                        </div>
                    );
                })()}

                <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <AnimatePresence mode="wait">
                        {selectedNode ? (
                            <motion.div
                                key={selectedNode.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex-1 space-y-2 text-center md:text-left"
                            >
                                <div className="flex items-center justify-center md:justify-start gap-2.5">
                                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
                                        {selectedNode.displayType === "UNKNOWN" ? t("UNDISCOVERED DOMAIN", lang) : t(selectedNode.displayType, lang)}
                                    </span>
                                    {(selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id)) && (
                                        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                            {t("Trial Completed", lang)}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-black font-sans text-white uppercase tracking-wider">
                                    {selectedNode.displayType === 'UNKNOWN' ? t("Undiscovered Star", lang) : t(getRegionInfo(selectedNode.regionId).name, lang)}
                                </h3>

                                <div className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                                    {selectedNode.displayType === 'UNKNOWN' 
                                        ? t("The coordinates of this space are dark. Initiate travel to lock-on scanners.", lang) 
                                        : t(getRegionInfo(selectedNode.regionId).loreText, lang)
                                    }
                                    
                                    {/* Waves Range and Custom Mission Objectives */}
                                    <div className="mt-2 text-[10px] uppercase font-mono font-bold tracking-widest flex flex-wrap gap-x-4 gap-y-1">
                                        {selectedNode.type === 'TREASURE' ? (
                                            <span className="text-amber-300 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                                ✦ Essence Minigame — Reward ≈ {getTreasureEssenceReward(selectedNode.waveRange[0] || 1)}
                                            </span>
                                        ) : (selectedNode.type === 'EVENT' || selectedNode.type === 'SECRET' || selectedNode.waveRange[0] >= 100) ? (
                                            <span className="text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                                {t("★ SPECIAL MISSION:", lang)} {
                                                    selectedNode.mission?.type === 'COLLECT_KEYS' ? `${t("Secure Stellar Fragments", lang)} ${selectedNode.mission.targetCount}` :
                                                    selectedNode.mission?.type === 'CAPTURE_ZONE' ? `${t("Capture Secure Zone", lang)} (${Math.floor(selectedNode.mission.targetCount / 60)}s)` :
                                                    selectedNode.mission?.type === 'DESTROY_MACHINES' ? `${t("Shatter Healing Pylons", lang)} ${selectedNode.mission.targetCount}` :
                                                    selectedNode.mission?.type === 'SURVIVE' ? `${t("Survive Void Tempest", lang)} (180 Secs)` :
                                                    `${t("Exterminate", lang)} ${selectedNode.mission?.targetCount} ${t("Void Generators", lang)}`
                                                }
                                            </span>
                                        ) : (
                                            <span className="text-indigo-400">
                                                {t("Expected Waves:", lang)} {selectedNode.waveRange[0]} {t("to", lang)} {selectedNode.waveRange[1]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 flex items-center justify-center md:justify-start gap-3 text-slate-500"
                            >
                                <AlertCircle size={18} />
                                <span className="text-xs font-mono uppercase tracking-widest font-bold">
                                    Select a visible star to engage navigation computers
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {selectedNode && isCurrentNode && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={isTravelling || (selectedNode.type === 'TREASURE' && (selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id))) ? {} : { scale: 1.03 }}
                            whileTap={isTravelling || (selectedNode.type === 'TREASURE' && (selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id))) ? {} : { scale: 0.97 }}
                            onClick={() => {
                                if (selectedNode.type === 'TREASURE' && (selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id))) {
                                    return; // Disallow entering already cleared treasure nodes!
                                }
                                const range = getWaveRangeForNode(selectedNode);
                                const maxSelectable = Math.max(range.min, Math.min(range.max, maxWaveReached));
                                setLocalSelectedWave(maxSelectable);
                                setShowWaveSelector(true);
                            }}
                            disabled={isTravelling || (selectedNode.type === 'TREASURE' && (selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id)))}
                            className={`px-8 py-3.5 rounded-xl font-sans font-extrabold tracking-widest text-xs flex items-center gap-2.5 transition-all shadow-lg active:scale-95 uppercase ${
                                !isTravelling && !(selectedNode.type === 'TREASURE' && (selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id)))
                                ? 'bg-white hover:bg-slate-100 text-black shadow-white/5' 
                                : 'bg-slate-950 text-slate-600 border border-slate-900/80 cursor-not-allowed opacity-30'
                            }`}
                        >
                            <Play size={13} fill="currentColor" />
                            {selectedNode.type === 'TREASURE' && (selectedNode.state === 'VISITED' || visitedNodeIds.includes(selectedNode.id)) ? t("CLEARED", lang) : t("ENGAGE", lang)}
                        </motion.button>
                    )}
                </div>
            </div>

            {/* WAVE SELECTION MODAL OVERLAY */}
            <AnimatePresence>
                {showWaveSelector && selectedNode && (() => {
                    const range = getWaveRangeForNode(selectedNode);
                    const maxSelectable = Math.max(range.min, Math.min(range.max, maxWaveReached));
                    const isSpecialMission = selectedNode.type === 'EVENT' || selectedNode.type === 'SECRET' || selectedNode.waveRange[0] >= 100;
                    
                    return (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                className={`bg-slate-950 border ${isSpecialMission ? 'border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.15)]' : 'border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.15)]'} p-8 rounded-2xl max-w-md w-full relative flex flex-col gap-6`}
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowWaveSelector(false)}
                                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* Header */}
                                <div className="text-center space-y-1.5 border-b border-slate-900 pb-4">
                                    <span className={`text-[10px] font-mono uppercase tracking-[0.3em] font-bold ${isSpecialMission ? 'text-yellow-400' : 'text-cyan-400'}`}>
                                        {isSpecialMission ? t("COSMIC CONVERGENCE INSIGHT", lang) : t("CELESTIAL ALIGNMENT", lang)}
                                    </span>
                                    <h3 className="text-xl font-tech font-bold text-white tracking-wider">
                                        {isSpecialMission ? (selectedNode.type === 'SECRET' ? t("SECRET COORD DETECTED", lang) : t("ANOMALY RECOVERY", lang)) : t(getRegionInfo(selectedNode.regionId).name, lang)}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {isSpecialMission ? t("Confirm manifestation within this anomalous cosmic rift.", lang) : t("Choose entry wave resonance for this celestial region.", lang)}
                                    </p>
                                </div>

                                {/* Node Details & Artwork Block */}
                                {(() => {
                                    const bgConfig = getRegionBackground(selectedNode.regionId);
                                    return (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 p-4">
                                            <img
                                                src={bgConfig.imageUrl}
                                                alt={selectedNode.regionId}
                                                referrerPolicy="no-referrer"
                                                className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-screen pointer-events-none"
                                                style={{ filter: bgConfig.filter }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />
                                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                                <div className="space-y-0.5">
                                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">{t("REGION", lang)}</span>
                                                    <span className="text-xs text-white font-bold block truncate">
                                                        {t(REGION_POOL.find(r => r.id === selectedNode.regionId)?.name || "STARRY ABYSS", lang)}
                                                    </span>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">{t("MISSION GOAL", lang)}</span>
                                                    <span className={`text-xs font-bold uppercase block truncate ${isSpecialMission ? 'text-yellow-400' : 'text-cyan-400'}`}>
                                                        {t(selectedNode.mission?.type.replace(/_/g, " ") || "SURVIVE", lang)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Main Parameter / Briefing Section */}
                                {isSpecialMission ? (
                                    <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900/80 space-y-3.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-mono uppercase tracking-wider">{t("THREAT LEVEL", lang)}</span>
                                            <span className="text-red-400 font-bold uppercase font-mono">
                                                {range.min <= 10 ? t("Class I (Minor Rift)", lang) :
                                                 range.min <= 25 ? t("Class II (Moderate Threat)", lang) :
                                                 range.min <= 40 ? t("Class III (Severe Distortion)", lang) :
                                                 t("Class IV (Extreme Void Rift)", lang)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-mono uppercase tracking-wider">{t("MISSION OBJECTIVE", lang)}</span>
                                            <span className="text-slate-200 font-semibold text-right">
                                                {selectedNode.mission?.type === 'COLLECT_KEYS' ? t("Secure Stellar Fragments", lang) :
                                                 selectedNode.mission?.type === 'CAPTURE_ZONE' ? t("Stabilize beacon zones", lang) :
                                                 selectedNode.mission?.type === 'DESTROY_MACHINES' ? t("Shatter healing pylons", lang) :
                                                 t("Survive cosmic tempests", lang)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-900/60">
                                            <span className="text-slate-500 font-mono uppercase tracking-wider">{t("EXPECTED REWARD", lang)}</span>
                                            <span className="text-fuchsia-400 font-bold tracking-wider">
                                                {selectedNode.type === 'SECRET' ? t("SECRET UPGRADE CORE", lang) : t("UNIQUE ABILITY UNLOCK", lang)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Slider Component */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                                                    Resonance Wave Range
                                                </label>
                                                <span className="text-[10px] font-mono text-cyan-500/70">
                                                    Available: {range.min} - {maxSelectable}
                                                </span>
                                            </div>

                                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-900 flex flex-col gap-4">
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono text-slate-500 text-xs w-6 text-right">{range.min}</span>
                                                    <input
                                                        type="range"
                                                        min={range.min}
                                                        max={maxSelectable}
                                                        value={localSelectedWave}
                                                        disabled={range.min === maxSelectable}
                                                        onChange={(e) => setLocalSelectedWave(parseInt(e.target.value))}
                                                        className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
                                                    />
                                                    <span className="font-mono text-slate-500 text-xs w-6">{maxSelectable}</span>
                                                </div>

                                                {/* Dynamic digital indicator */}
                                                <div className="text-center py-2">
                                                    <span className="text-[9px] font-mono text-slate-600 block uppercase tracking-widest mb-1">{t("TARGET ENTRY FREQUENCY", lang)}</span>
                                                    <motion.span 
                                                        key={localSelectedWave}
                                                        initial={{ scale: 0.9, opacity: 0.6 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="text-3xl font-tech font-extrabold text-cyan-400 tracking-tight block"
                                                        style={{ textShadow: '0 0 12px rgba(34,211,238,0.4)' }}
                                                    >
                                                        WAVE {localSelectedWave}
                                                    </motion.span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shortcuts */}
                                        {range.min < maxSelectable && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setLocalSelectedWave(range.min)}
                                                    className="flex-1 py-1.5 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-white border border-slate-900 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all"
                                                >
                                                    {t("MIN WAVE:", lang)} {range.min}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setLocalSelectedWave(maxSelectable)}
                                                    className="flex-1 py-1.5 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-white border border-slate-900 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all"
                                                >
                                                    {t("MAX WAVE:", lang)} {maxSelectable}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Start / Exit / Unlock buttons */}
                                {(selectedNode.type === 'SECRET' || selectedNode.type === 'EVENT') && selectedNode.state === 'FOGGED' ? (
                                    <div className="flex flex-col gap-2 pt-2">
                                        {(() => {
                                            const isSecret1 = selectedNode.id === 'secret_1';
                                            const keysRequired = isSecret1 ? 2 : 1;
                                            const map1RequirementsMet = !isSecret1 || (map1SideMissionCompleted && map1EventCompleted);
                                            const hasEnoughKeys = specialMissionKeys >= keysRequired;
                                            const canUnlock = hasEnoughKeys && map1RequirementsMet;

                                            return canUnlock ? (
                                                <button
                                                    onClick={() => {
                                                        if (onUpdateSpecialMissionKeys && onDiscoverSecret) {
                                                            onUpdateSpecialMissionKeys(specialMissionKeys - keysRequired);
                                                            onDiscoverSecret(selectedNode.id);
                                                            audio.playLevelUp();
                                                            selectedNode.state = 'VISIBLE';
                                                        }
                                                    }}
                                                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-tech font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-pulse cursor-pointer"
                                                >
                                                    <Key size={16} className="text-black" />
                                                    {keysRequired === 1 
                                                        ? t("UNLOCK VAULT (1 VAULT KEY)", lang)
                                                        : t("UNLOCK VAULT (2 VAULT KEYS)", lang)}
                                                </button>
                                            ) : (
                                                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-center space-y-1">
                                                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold block">
                                                        {t("VAULT LOCKED", lang)}
                                                    </span>
                                                    <p className="text-[11px] text-amber-200/80">
                                                        {isSecret1 && !map1RequirementsMet
                                                            ? t("Requires completing BOTH the Side Mission and Event in Sector 1 (map_1).", lang)
                                                            : isSecret1
                                                            ? t("2 Vault Keys required to unlock this Vault.", lang)
                                                            : t("Earn Vault Keys by completing Special Events and Missions on the map.", lang)}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                        <button
                                            onClick={() => setShowWaveSelector(false)}
                                            className="w-full py-2.5 bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-900 rounded-xl font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            CLOSE BRIEFING
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 pt-2">
                                        {settings && onUpdateSettings && (
                                            <div className="flex flex-col gap-1.5 bg-slate-900/50 p-3 rounded-xl border border-slate-900">
                                                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider">
                                                    <span className="text-slate-400 font-bold">{t("SELECT DIFFICULTY", lang)}</span>
                                                    <span className="text-cyan-400">
                                                        {settings.difficulty === 'chill'
                                                            ? t("0.7x HP • Max 1 Dmg/Hit • 0.8x Essence", lang)
                                                            : settings.difficulty === 'brutal'
                                                            ? t("1.3x HP • 1.1x Proj Speed • 1.5x Essence", lang)
                                                            : t("1.0x HP • Standard Challenge", lang)}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(['chill', 'normal', 'brutal'] as const).map(lvl => {
                                                        const currentDiff = settings.difficulty || 'normal';
                                                        const isSelected = currentDiff === lvl;
                                                        const isBrutalLocked = lvl === 'brutal' && maxWaveReached < 10;
                                                        return (
                                                            <button
                                                                key={lvl}
                                                                type="button"
                                                                disabled={isBrutalLocked}
                                                                onClick={() => onUpdateSettings({ ...settings, difficulty: lvl })}
                                                                className={`min-h-[40px] px-2 py-1.5 rounded-lg font-tech font-bold text-[10px] uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                                                    isSelected
                                                                        ? lvl === 'chill'
                                                                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                                                            : lvl === 'brutal'
                                                                            ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                                                                            : 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                                                                        : isBrutalLocked
                                                                        ? 'bg-slate-950 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed'
                                                                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
                                                                }`}
                                                            >
                                                                {isBrutalLocked ? `${t(lvl.toUpperCase(), lang)} (${t("Kill 1 Boss", lang)})` : t(lvl.toUpperCase(), lang)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowWaveSelector(false)}
                                                className="flex-1 py-3 bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-900 rounded-xl font-mono text-[10px] uppercase tracking-wider transition-all"
                                            >
                                                {t("SEVER ALIGNMENT", lang)}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowWaveSelector(false);
                                                    onSelectMap(selectedNode.id, isSpecialMission ? range.min : localSelectedWave);
                                                }}
                                                className={`flex-1 py-3 font-tech font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${isSpecialMission ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_15px_rgba(234,179,8,0.25)]' : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]'}`}
                                            >
                                                <Play size={11} fill="currentColor" />
                                                {isSpecialMission ? t("HARMONIZE RIFT", lang) : t("CELESTIAL ENTRY", lang)}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Treasure Minigame Overlay — “Essence Harvest”.
                Click glowing motes as they spawn. Reward is scaled to the node’s wave tier
                and multiplied by hit-rate. Closes after a short session and awards essence. */}
            <AnimatePresence>
                {treasureNode && (
                    <TreasureMinigame
                        node={treasureNode}
                        onClose={() => setTreasureNode(null)}
                        onComplete={(essence) => {
                            const nid = treasureNode.id;
                            setTreasureNode(null);
                            onCollectTreasure?.(nid, essence);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Epic Celestial Reveal Cinematic Overlay */}
            <AnimatePresence>
                {cinematicNode && (
                    <>
                        {/* Widescreen Cinematic Bars */}
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "11vh" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute top-0 left-0 right-0 bg-[#010105] border-b border-slate-900/50 z-50 flex items-center justify-center pointer-events-none"
                        />
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "11vh" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute bottom-0 left-0 right-0 bg-[#010105] border-t border-slate-900/50 z-50 flex flex-col items-center justify-center pointer-events-none"
                        >
                            <div className="text-[9px] text-slate-500 font-mono tracking-[0.45em] uppercase">{t("CELESTIAL REALIGNMENT IN PROGRESS", lang)}</div>
                        </motion.div>

                        {/* Central Epic Glowing Title */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50 px-6 text-center select-none"
                        >
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.6 }}
                                className="text-[10px] text-white/40 tracking-[0.6em] uppercase mb-4 font-mono"
                            >
                                {(() => {
                                    if (cinematicNode.type === 'TREASURE') return 'TREASURE DETECTED';
                                    if (cinematicNode.displayType === 'BOSS' || cinematicNode.type === 'BOSS') return 'ANOMALOUS BOSS RESONANCE';
                                    if (cinematicNode.displayType === 'ELITE' || cinematicNode.type === 'ELITE') return 'ELITE GRAVITATIONAL PULL';
                                    if (cinematicNode.type === 'SECRET') return 'SECRET VEIL PARTED';
                                    if (cinematicNode.type === 'EVENT') return 'SPECIAL MISSION COORDINATE';
                                    return 'CELESTIAL LANDMARK DISCOVERED';
                                })()}
                            </motion.div>
                            <motion.h1 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8, duration: 0.8 }}
                                className="text-3xl md:text-5xl font-extrabold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 uppercase select-none"
                                style={{ 
                                    textShadow: `0 0 40px rgba(${(REGION_COLORS[cinematicNode.regionId] || REGION_COLORS.region_1).rgb}, 0.75)`,
                                    WebkitTextStroke: "1px rgba(255, 255, 255, 0.1)"
                                }}
                            >
                                {(REGION_POOL.find(r => r.id === cinematicNode.regionId)?.name || 'STARRY ABYSS').replace(/^\d+\.\s*/, '').replace(/^S\.\s*/, '')}
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                transition={{ delay: 1.2, duration: 0.8 }}
                                className="mt-4 text-xs md:text-sm text-slate-400 tracking-widest max-w-md font-mono italic px-4"
                            >
                                "{REGION_POOL.find(r => r.id === cinematicNode.regionId)?.loreText || 'A hidden coordinate in the great void.'}"
                            </motion.p>

                            {/* Sparkling status indicator */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.6, duration: 0.6 }}
                                className="mt-8 flex items-center gap-3"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span className="text-[9px] font-mono tracking-[0.35em] text-white/50 uppercase">{t("REVEALING CELESTIAL COORDINATES...", lang)}</span>
                            </motion.div>
                        </motion.div>

                        {/* Cinematic screen flash overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.6, 0] }}
                            transition={{ duration: 1.4, times: [0, 0.15, 1], delay: 0.2 }}
                            className="absolute inset-0 bg-white pointer-events-none z-50 mix-blend-screen"
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StarChart;
