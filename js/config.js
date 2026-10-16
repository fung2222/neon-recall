// NEON RECALL 霓虹記憶 — every tuning constant lives here.
export const GAME_ID = 'neon-recall';

// Level layouts: [long side, short side]. Portrait screens use short side as columns.
export const LAYOUTS = [[4, 2], [4, 3], [4, 4], [5, 4], [6, 4]];
// Endless: authored layouts end at level 5 (6×4). From ENDLESS_BIG_FROM every 3rd level is a 6×5 "overclock" grid (15 pairs, max).
export const ENDLESS_BIG_FROM = 12;
export const layoutFor = (level) => (level >= ENDLESS_BIG_FROM && level % 3 === 0) ? [6, 5] : LAYOUTS[Math.min(level, LAYOUTS.length) - 1];
export const previewFor = (level) => Math.max(0.7, 2.2 - (level - 1) * 0.18);   // seconds all cards are shown at level start
export const GLITCH_FROM_LEVEL = 7;      // from this level a miss may "glitch-swap" two hidden cards
export const GLITCH_CHANCE = 0.35;
export const glitchChanceFor = (level) => level < GLITCH_FROM_LEVEL ? 0 : Math.min(0.6, GLITCH_CHANCE + (level - GLITCH_FROM_LEVEL) * 0.01);   // endless ramp, capped
export const MILESTONE_EVERY = 10;      // every 10 cleared levels: bonus score + peeks + district theme shift
export const milestoneReward = (level) => ({ pts: 1000 * (level / MILESTONE_EVERY), peeks: 2 });

// Scoring (no fail, no timer pressure)
export const MATCH_POINTS = 100;         // x combo multiplier (1, 2, 3 … capped)
export const COMBO_CAP = 5;
export const STAR_BONUS = 150;           // per star at level clear
// stars: 3 if misses <= pairs*STAR3, 2 if misses <= pairs*STAR2, else 1
export const STAR3 = 0.5, STAR2 = 1.25;

// Peek (reveal all hidden cards briefly)
export const PEEK_START = 1;             // charges at start of a run
export const PEEK_EVERY = 3;             // +1 charge every N levels cleared
export const PEEK_REWARD = 2;            // charges per rewarded ad (web: free claim)
export const PEEK_TIME = 1.4;
export const OVERLOAD_PEEK_TIME = 2.2;   // longer reveal for OVERLOAD peek
export const OVERLOAD_MATCHES = 2;       // next N matches score ×2; miss voids remaining
export const OVERLOAD_HOLD_MS = 420;     // hold Peek button this long to OVERLOAD

// Level modifiers (from MOD_FROM): cycle twin → drift → wild → surge. Distinct endless DNA, no timer/lives.
export const MOD_FROM = 6;
export const MOD_CYCLE = ['twin', 'drift', 'wild', 'surge'];
export const modifierFor = (level) => (level < MOD_FROM ? null : MOD_CYCLE[(level - MOD_FROM) % MOD_CYCLE.length]);
export const WILD_ICON = 16;             // neon wild pair icon index (icons.js)
export const WILD_BONUS = 200;           // flat pts for matching the wild pair
export const WILD_REVEAL = 1.2;          // free full-board reveal after wild match (s)
export const SURGE_MULT = 1.5;           // match-score multiplier on surge levels
export const SURGE_PEEK_BONUS = 1;       // +peeks at surge level start
export const TWIN_GLOW = 0.6;            // twin-signal back glow duration (s)
export const ECHO_FADE = 0.85;           // echo-hint residual glow after miss (s)

// Timings (s)
export const T_FLIP = 0.3, T_MISS_HOLD = 0.7, T_MATCH = 0.6;
export const AI_STEP = 0.55;             // ?demo=1 seconds between flips
export const AI_FORGET = 0.12;           // chance the demo AI "forgets" a seen card

// 3D layout
export const CARD_W = 1.0, CARD_D = 1.3, CARD_T = 0.07, GAP = 0.2;
export const BOARD_Y = 3.6;

export const ADS = {
  interstitialCooldownSec: 180, breaksBetweenInterstitials: 3, graceSec: 150,  // ≈ every 3 levels, never at start
  units: { android: { /* interstitial: 'ca-app-pub-…', rewarded: 'ca-app-pub-…' */ } },
};
