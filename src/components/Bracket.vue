<script setup>
import { computed } from "vue";
import matchData from '@/assets/matches.json'


const props = defineProps({
    roundOrder: { type: Array, default: () => ["Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"] },
    boxWidth: { type: Number, default: 220 },
    boxHeight: { type: Number, default: 70 },
    colGap: { type: Number, default: 120 },
    baseVGap: { type: Number, default: 28 },
});

// Layout-Konstanten
const BW = props.boxWidth;
const BH = props.boxHeight;
const CG = props.colGap;
const VG = props.baseVGap;

// Sortiere Matches nach Runde & Spielnummer
const rounds = computed(() =>
    props.roundOrder.map((r) =>
        matchData.matches
            .filter((m) => m.round === r)
            .sort((a, b) => a.game - b.game)
    )
);

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
        for (let i = 0; i < rounds.value[r].length; i++) {
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
        }
        cols.push(curr);
    }

    return cols;
});

// SVG-Bereich
const totalWidth = computed(
    () => rounds.value.length * BW + (rounds.value.length - 1) * CG
);
const totalHeight = computed(() => {
    const all = positions.value.flat();
    const max = Math.max(...all.map((p) => p.cy + BH / 2), BH);
    return max + 100;
});

// Linien berechnen
const segments = computed(() => {
    const segs = [];
    for (let r = 0; r < positions.value.length - 1; r++) {
        const left = positions.value[r];
        const right = positions.value[r + 1];
        for (let i = 0; i < right.length; i++) {
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
            segs.push({ x1, y1, x2, y2, mx });
            segs.push({ x1: x1b, y1: y1b, x2, y2, mx });
        }
    }
    return segs;
});
</script>

<template>
    <div class="bracket-container" :style="{ height: totalHeight + 'px' }">
        <!-- SVG-Linien -->
        <svg class="bracket-lines" :width="totalWidth" :height="totalHeight">
            <template v-for="(s, i) in segments" :key="i">
                <line :x1="s.x1" :y1="s.y1" :x2="s.mx" :y2="s.y1" class="line" />
                <line :x1="s.mx" :y1="s.y1" :x2="s.mx" :y2="s.y2" class="line" />
                <line :x1="s.mx" :y1="s.y2" :x2="s.x2" :y2="s.y2" class="line" />
            </template>
        </svg>

        <!-- Match-Boxen -->
        <div v-for="(col, ci) in positions" :key="ci" class="bracket-column"
            :style="{ left: ci * (BW + CG) + 'px', width: BW + 'px' }">
            <div v-for="(pos, mi) in col" :key="mi" class="match-box"
                :style="{ top: pos.topLeftY + 'px', height: BH + 'px' }">
                <div class="match-header">
                    Spiel {{ rounds[ci][mi]?.game }}
                </div>

                <div class="match-body">
                    <div class="row">
                        <span class="player-profile">{{ rounds[ci][mi]?.player1.profile }}</span>
                        <span class="player-name">{{ rounds[ci][mi]?.player1.name }}</span>
                        <span class="score">{{ rounds[ci][mi]?.score?.split('-')[0] ?? '' }}</span>
                    </div>
                    <div class="row">
                        <span class="player-profile">{{ rounds[ci][mi]?.player2.profile }}</span>
                        <span class="player-name">{{ rounds[ci][mi]?.player2.name }}</span>
                        <span class="score">{{ rounds[ci][mi]?.score?.split('-')[1] ?? '' }}</span>
                    </div>
                    <!-- <div class="winner">
                        Sieger: {{ rounds[ci][mi]?.winner }}
                    </div> -->
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Layout Container */
.bracket-container {
    position: relative;
    overflow: auto;
    border-radius: 12px;
}

/* SVG Linien */
.bracket-lines {
    position: absolute;
    top: 8px;
    left: 4px;
    pointer-events: none;
}

.line {
    stroke: #b0b8c2;
    stroke-width: 2;
}

/* Spalten */
.bracket-column {
    position: absolute;
    top: 8px;
    margin-left:4px;
}

/* Match-Box */
.match-box {
    position: absolute;
    width: 100%;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    padding: 6px 10px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
}

/* Text-Layout */
.match-header {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 4px;
}

.match-body .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
}

.player-name {
    font-weight: 500;
    display: none;
}

.player-profile {
    color: #555;
}

.score {
    font-weight: bold;
    min-width: 18px;
    text-align: right;
    color: #555;
    font-weight: bold;
}

.winner {
    font-size: 11px;
    color: #097969;
    margin-top: 3px;
}
</style>
