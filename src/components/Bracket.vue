<script setup>
import { computed, ref } from "vue";
import matchData from '@/assets/matches.json'

const props = defineProps({
    roundOrder: { type: Array, default: () => ["Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"] },
    boxWidth: { type: Number, default: 220 },
    boxHeight: { type: Number, default: 100 },
    colGap: { type: Number, default: 60 },
    baseVGap: { type: Number, default: 20 },
});

// Layout-Konstanten
const BW = props.boxWidth;
const BH = props.boxHeight;
const CG = props.colGap;
const VG = props.baseVGap;

// State for revealed guesses
const revealed = ref(new Set());

function toggleReveal(gameId, playerIdx) {
    const key = `${gameId}-${playerIdx}`;
    if (revealed.value.has(key)) {
        revealed.value.delete(key);
    } else {
        revealed.value.add(key);
    }
}

function isRevealed(gameId, playerIdx) {
    return revealed.value.has(`${gameId}-${playerIdx}`);
}

// Sortiere Matches nach Runde & Spielnummer
const rounds = computed(() => {
    return props.roundOrder.map((rName) => {
        const roundData = matchData.rounds.find(r => r.name === rName);
        if (!roundData) return [];
        return roundData.matches.sort((a, b) => a.game - b.game);
    });
});

// Positionen berechnen
const positions = computed(() => {
    const cols = [];
    const r0 = rounds.value[0] ?? [];

    // Erste Runde gleichmäßig platzieren
    const col0 = r0.map((_, i) => {
        const yTop = i * (BH + VG);
        return {
            cx: BW / 2,
            cy: yTop + BH / 2,
            topLeftX: 0,
            topLeftY: yTop,
        };
    });
    cols.push(col0);

    // Nachfolgende Runden mitteln zwischen vorherigen Paaren
    for (let r = 1; r < rounds.value.length; r++) {
        const prev = cols[r - 1];
        const curr = [];
        const currentRoundMatches = rounds.value[r];
        
        for (let i = 0; i < currentRoundMatches.length; i++) {
            // Parent matches in previous round are at indices 2*i and 2*i+1
            if (2 * i + 1 < prev.length) {
                const a = prev[2 * i];
                const b = prev[2 * i + 1];
                const cy = (a.cy + b.cy) / 2;
                const cx = r * (BW + CG) + BW / 2;
                curr.push({
                    cx,
                    cy,
                    topLeftX: r * (BW + CG),
                    topLeftY: cy - BH / 2,
                });
            } else {
                 curr.push({
                    cx: r * (BW + CG) + BW / 2,
                    cy: 0,
                    topLeftX: r * (BW + CG),
                    topLeftY: 0,
                });
            }
        }
        cols.push(curr);
    }

    return cols;
});

// SVG-Bereich
const totalWidth = computed(
    () => rounds.value.length * BW + (rounds.value.length - 1) * CG + 50
);
const totalHeight = computed(() => {
    const all = positions.value.flat();
    if (all.length === 0) return 600;
    const max = Math.max(...all.map((p) => p.cy + BH / 2), BH);
    return max + 50;
});

// Linien berechnen
const segments = computed(() => {
    const segs = [];
    for (let r = 0; r < positions.value.length - 1; r++) {
        const left = positions.value[r];
        const right = positions.value[r + 1];
        
        for (let i = 0; i < right.length; i++) {
            if (2 * i + 1 < left.length) {
                const a = left[2 * i];
                const b = left[2 * i + 1];
                const c = right[i];
                
                const x1 = a.topLeftX + BW;
                const y1 = a.cy;
                const x1b = b.topLeftX + BW;
                const y1b = b.cy;
                const x2 = c.topLeftX;
                const y2 = c.cy;
                const mx = (x1 + x2) / 2;
                
                segs.push({ x1, y1, x2: mx, y2: y1 }); 
                segs.push({ x1: x1b, y1: y1b, x2: mx, y2: y1b }); 
                segs.push({ x1: mx, y1: y1, x2: mx, y2: y1b }); 
                segs.push({ x1: mx, y1: y2, x2: x2, y2: y2 }); 
            }
        }
    }
    return segs;
});
</script>

<template>
    <div class="bracket-scroll-container">
        <div class="bracket-container" :style="{ width: totalWidth + 'px', height: totalHeight + 'px' }">
            <!-- SVG-Linien -->
            <svg class="bracket-lines" :width="totalWidth" :height="totalHeight">
                <template v-for="(s, i) in segments" :key="i">
                    <line :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" class="line" />
                </template>
            </svg>

            <!-- Match-Boxen -->
            <div v-for="(col, ci) in positions" :key="ci" class="bracket-column"
                :style="{ left: ci * (BW + CG) + 'px', width: BW + 'px' }">
                
                <!-- Round Header -->
                <div class="round-title" :style="{ top: '-25px', position: 'absolute', width: '100%', textAlign: 'center' }">
                    {{ props.roundOrder[ci] }}
                </div>

                <div v-for="(pos, mi) in col" :key="mi" class="match-box"
                    :style="{ top: pos.topLeftY + 'px', height: BH + 'px' }">
                    
                    <!--
                    <div class="match-header">^1
                        Spiel {{ rounds[ci][mi]?.game }}
                    </div>
                    -->

                    <div class="match-body">
                        <!-- Player 1 -->
                        <div class="match-header"> {{ rounds[ci][mi]?.game }} </div>
                        <div class="player-row" :class="{ 'is-winner': rounds[ci][mi]?.winner === rounds[ci][mi]?.player1.user }">
                        
                            <div class="player-info">
                                <span class="player-name">{{ rounds[ci][mi]?.player1.user }}</span>
                                <div class="guess-reveal">
                                    <button class="reveal-btn" @click.stop="toggleReveal(rounds[ci][mi]?.game, 1)">
                                        <span v-if="!isRevealed(rounds[ci][mi]?.game, 1)">👁️</span>
                                        <span v-else class="revealed-text">
                                            Tipp des Gegners: <strong>{{ rounds[ci][mi]?.player1.guessedPlayer }}</strong>
                                        </span>
                                    </button>
                                </div>
                                <!--
                                <div class="player-meta">
                                    <span class="user-name">{{ rounds[ci][mi]?.player1.player }}</span>
                                </div>
                                -->
                            </div>
                            <div class="score">{{ rounds[ci][mi]?.score?.split('-')[0] ?? '0' }}</div>
                        </div>
                        
                        <!-- Guess Reveal P1 -->

                        <v-divider class="my-1 border-opacity-25"></v-divider>

                        <!-- Player 2 -->
                        <div class="player-row" :class="{ 'is-winner': rounds[ci][mi]?.winner === rounds[ci][mi]?.player2.user }">
                            <div class="player-info">
                                <span class="player-name">{{ rounds[ci][mi]?.player2.user }}</span>
                                                         <!-- Guess Reveal P2 -->
                         <div class="guess-reveal">
                            <button class="reveal-btn" @click.stop="toggleReveal(rounds[ci][mi]?.game, 2)">
                                <span v-if="!isRevealed(rounds[ci][mi]?.game, 2)">👁️</span>
                                <span v-else class="revealed-text">
                                    Tipp des Gegners: <strong>{{ rounds[ci][mi]?.player2.guessedPlayer }}</strong>
                                </span>
                            </button>
                        </div>
                                <!--
                                <div class="player-meta">
                                    <span class="user-name">{{ rounds[ci][mi]?.player2.player }}</span>
                                </div>
                                -->
                            </div>
                            <div class="score">{{ rounds[ci][mi]?.score?.split('-')[1] ?? '0' }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bracket-scroll-container {
    overflow: auto;
    padding: 30px 10px;
    background: #121212; /* Dark background */
    border-radius: 8px;
    color: #e0e0e0;
}

.bracket-container {
    position: relative;
    margin: 0 auto;
}

.bracket-lines {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
}

.line {
    stroke: #555; /* Darker lines */
    stroke-width: 2;
}

.bracket-column {
    position: absolute;
    top: 0;
}

.round-title {
    font-weight: bold;
    color: #aaa;
    text-transform: uppercase;
    font-size: 0.8rem;
    margin-bottom: 8px;
}

.match-box {
    position: absolute;
    width: 100%;
    background: #1e1e1e; /* Dark card bg */
    border: 1px solid #333;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
}

.match-box:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    z-index: 10;
    border-color: #555;
}

.match-header {
    position: absolute;
    right: 4px;
    top: 4px;
    font-size: 12px;
    color: #9d9d9d;
}

.winner-tag {
    color: #4caf50; /* Green */
    font-weight: bold;
}

.player-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1px 0;
}

.player-row.is-winner .player-name {
    color: #4caf50;
    font-weight: 700;
    font-size:16px;
    padding-top:4px;
}

.player-info {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
}

.player-name {
    font-size: 13px;
    font-weight: 500;
    color: #eee;
}

.user-name {
    font-size: 10px;
    color: #888;
}

.score {
    font-weight: bold;
    font-size: 13px;
    color: #ccc;
    background: #333;
    padding: 1px 5px;
    border-radius: 3px;
}

.guess-reveal {
    font-size: 10px;
    margin-top: 1px;
    margin-bottom: 1px;
}

.reveal-btn {
    background: none;
    border: none;
    color: #64b5f6; /* Light blue */
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 4px;
}

.reveal-btn:hover {
    text-decoration: underline;
    color: #90caf9;
}

.revealed-text {
    color: #bbb;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
