<script setup>
import { computed, ref, onMounted } from "vue";
import axios from 'axios';
// import matchData from '@/assets/matches.json' // Removed local import

const props = defineProps({
    roundOrder: { type: Array, default: () => ["Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"] },
    boxWidth: { type: Number, default: 220 },
    boxHeight: { type: Number, default: 100 },
    colGap: { type: Number, default: 140 },
    baseVGap: { type: Number, default: 20 },
});

// Layout-Konstanten
const BW = props.boxWidth;
const BH = props.boxHeight;
const CG = props.colGap;
const VG = props.baseVGap;

// State
const matchData = ref({ rounds: [] });
const tipsRevealed = ref(new Set()); // Local state for showing tips of revealed matches
const globalTipsReveal = ref(false); // Global toggle for tips

// Fetch matches on mount
onMounted(async () => {
    await fetchMatches();
    initPlayers();
});

const players = ref([]);
const draggingPlayer = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
let nextId = 1; // Counter for unique IDs

function initPlayers() {
    // 1. Extract players from first round
    const firstRound = matchData.value.rounds.find(r => r.name === props.roundOrder[0]);
    if (!firstRound) return;

    let playerNames = [];
    // Default order from matches - using 'player' field
    firstRound.matches.sort((a, b) => a.game - b.game).forEach(m => {
        playerNames.push(m.player1.player);
        playerNames.push(m.player2.player);
    });

    // 2. Check localStorage for saved positions
    const savedPositions = localStorage.getItem('gliddencup_bracket_positions');
    if (savedPositions) {
        try {
            const saved = JSON.parse(savedPositions);
            // Use saved positions if available
            players.value = saved;
            
            // Update nextId to be higher than any existing ID
            const maxId = Math.max(...saved.map(p => p.id || 0), 0);
            nextId = maxId + 1;
            
            // Add any new players that aren't in saved data (check by name only, not ID)
            const existingNames = new Set(saved.map(p => p.name));
            let yOffset = 90;
            playerNames.forEach(name => {
                // Only add if no instance of this name exists yet
                const hasOriginal = saved.some(p => p.name === name && !p.isDuplicate);
                if (!hasOriginal) {
                    players.value.push({ id: nextId++, name: name, x: 50, y: yOffset, isDuplicate: false });
                    yOffset += 45;
                }
            });
        } catch (e) {
            console.error("Failed to parse saved positions", e);
            setDefaultPositions(playerNames);
        }
    } else {
        setDefaultPositions(playerNames);
    }
}

function setDefaultPositions(playerNames) {
    players.value = playerNames.map((name, index) => ({
        id: nextId++,
        name: name,
        x: 50,
        y: 90 + index * 45,
        isDuplicate: false
    }));
}

function onMouseDown(event, player) {
    // Don't start dragging if clicking on action buttons
    if (event.target.classList.contains('player-action-btn') || 
        event.target.closest('.player-action-btn')) {
        return;
    }
    
    draggingPlayer.value = player;
    
    // Get the draggable-player element, not the child element that was clicked
    const playerElement = event.target.closest('.draggable-player');
    const rect = playerElement.getBoundingClientRect();
    const container = playerElement.closest('.bracket-view');
    const containerRect = container.getBoundingClientRect();
    
    dragOffset.value = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
    
    event.preventDefault();
}

function onMouseMove(event) {
    if (!draggingPlayer.value) return;
    
    const container = document.querySelector('.bracket-view');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    draggingPlayer.value.x = event.clientX - containerRect.left - dragOffset.value.x;
    draggingPlayer.value.y = event.clientY - containerRect.top - dragOffset.value.y;
}

function onMouseUp() {
    if (draggingPlayer.value) {
        draggingPlayer.value = null;
        savePositions();
    }
}

function savePositions() {
    localStorage.setItem('gliddencup_bracket_positions', JSON.stringify(players.value));
}

function duplicatePlayer(player) {
    const newPlayer = {
        id: nextId++,
        name: player.name,
        x: player.x + 20, // Offset slightly
        y: player.y + 20,
        isDuplicate: true
    };
    players.value.push(newPlayer);
    savePositions();
}

function deletePlayer(player) {
    // Only allow deletion of duplicates
    if (player.isDuplicate) {
        const index = players.value.findIndex(p => p.id === player.id);
        if (index !== -1) {
            players.value.splice(index, 1);
            savePositions();
        }
    }
}
async function fetchMatches() {
    try {
        // Assuming API is proxied or at same host
        const response = await axios.get('/api/gliddencup/matches');
        matchData.value = response.data;
    } catch (e) {
        console.error("Failed to fetch matches", e);
    }
}

async function setRevealLevel(gameId, level) {
    // Find match to get current state
    let currentMatch = null;
    for (const r of matchData.value.rounds) {
        const m = r.matches.find(m => m.game === gameId);
        if (m) {
            currentMatch = m;
            break;
        }
    }
    if (!currentMatch) return;

    const oldLevel = currentMatch.revealLevel;

    try {
        // Optimistic update
        currentMatch.revealLevel = level;
        
        const token = localStorage.getItem('gliddencup_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        await axios.post(`/api/gliddencup/matches/${gameId}/reveal`, 
            { level },
            { headers }
        );
    } catch (e) {
        console.error("Failed to set reveal level", e);
        // Revert on error
        currentMatch.revealLevel = oldLevel;
    }
}

function getRevealLevel(gameId) {
    for (const r of matchData.value.rounds) {
        const m = r.matches.find(m => m.game === gameId);
        if (m && m.game === gameId) return m.revealLevel ?? (m.game <= 8 ? 1 : 0);
    }
    return 0;
}

function toggleTips(gameId) {
    if (tipsRevealed.value.has(gameId)) {
        tipsRevealed.value.delete(gameId);
    } else {
        tipsRevealed.value.add(gameId);
    }
}

function isTipsRevealed(gameId) {
    // Tips are visible if match is revealed (Level 2) AND (global toggle is ON OR local toggle is ON)
    if (getRevealLevel(gameId) < 2) return false;
    return globalTipsReveal.value || tipsRevealed.value.has(gameId);
}

function toggleGlobalTips() {
    globalTipsReveal.value = !globalTipsReveal.value;
}

// Sortiere Matches nach Runde & Spielnummer
const rounds = computed(() => {
    return props.roundOrder.map((rName) => {
        const roundData = matchData.value.rounds?.find(r => r.name === rName);
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
    <div class="bracket-view" @mousemove="onMouseMove" @mouseup="onMouseUp">
        <div class="bracket-scroll-container">
        <div class="controls">
            <button class="global-reveal-btn" @click="toggleGlobalTips">
                {{ globalTipsReveal ? 'Alle Tipps verbergen' : 'Alle Tipps anzeigen' }}
            </button>
        </div>
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
                        <!-- Header with Reveal Button -->
                        <div class="match-header-row">
                             <div class="match-number">{{ rounds[ci][mi]?.game }}</div>
                             <div class="header-actions">
                                 <!-- Tips Toggle (only if Level 2) -->
                                 <button v-if="getRevealLevel(rounds[ci][mi]?.game) >= 2" class="icon-btn" @click.stop="toggleTips(rounds[ci][mi]?.game)" title="Tipps anzeigen/verbergen">
                                     {{ isTipsRevealed(rounds[ci][mi]?.game) ? '🙈' : '👁️' }}
                                 </button>
                             </div>
                        </div>

                        <!-- Player 1 -->
                        <div class="player-row" :class="{ 'is-winner': getRevealLevel(rounds[ci][mi]?.game) >= 2 && rounds[ci][mi]?.winner === rounds[ci][mi]?.player1.user }">
                        
                            <div class="player-info">
                                <span class="player-name">
                                    <template v-if="getRevealLevel(rounds[ci][mi]?.game) >= 1">
                                        {{ rounds[ci][mi]?.player1.user }}
                                    </template>
                                    <template v-else>???</template>
                                </span>
                                <div class="guess-reveal" v-if="isTipsRevealed(rounds[ci][mi]?.game)">
                                    <span class="revealed-text">
                                        Tipp: <strong>{{ rounds[ci][mi]?.player1.guessedPlayer }}</strong>
                                    </span>
                                </div>
                            </div>
                            <div class="score">
                                <span v-if="getRevealLevel(rounds[ci][mi]?.game) >= 2">{{ rounds[ci][mi]?.score?.split('-')[0] ?? '0' }}</span>
                                <span v-else>?</span>
                            </div>
                        </div>
                        
                        <v-divider class="my-1 border-opacity-25"></v-divider>

                        <!-- Player 2 -->
                        <div class="player-row" :class="{ 'is-winner': getRevealLevel(rounds[ci][mi]?.game) >= 2 && rounds[ci][mi]?.winner === rounds[ci][mi]?.player2.user }">
                            <div class="player-info">
                                <span class="player-name">
                                    <template v-if="getRevealLevel(rounds[ci][mi]?.game) >= 1">
                                        {{ rounds[ci][mi]?.player2.user }}
                                    </template>
                                    <template v-else>???</template>
                                </span>
                                <div class="guess-reveal" v-if="isTipsRevealed(rounds[ci][mi]?.game)">
                                    <span class="revealed-text">
                                        Tipp: <strong>{{ rounds[ci][mi]?.player2.guessedPlayer }}</strong>
                                    </span>
                                </div>
                            </div>
                            <div class="score">
                                <span v-if="getRevealLevel(rounds[ci][mi]?.game) >= 2">{{ rounds[ci][mi]?.score?.split('-')[1] ?? '0' }}</span>
                                <span v-else>?</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
        
        <!-- Draggable player overlay -->
        <div class="player-overlay">
            <div 
                v-for="player in players" 
                :key="player.id"
                class="draggable-player"
                :style="{ left: player.x + 'px', top: player.y + 'px' }"
                @mousedown="onMouseDown($event, player)"
            >
                <span class="player-name-text">{{ player.name }}</span>
                <div class="player-actions">
                    <button 
                        class="player-action-btn duplicate-btn" 
                        @mousedown.stop
                        @click.stop="duplicatePlayer(player)"
                        title="Duplicate"
                    >
                        +
                    </button>
                    <button 
                        v-if="player.isDuplicate"
                        class="player-action-btn delete-btn" 
                        @mousedown.stop
                        @click.stop="deletePlayer(player)"
                        title="Delete"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bracket-view {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
}

.player-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
}

.draggable-player {
    position: absolute;
    background: rgba(51, 51, 51, 0.95);
    color: orange;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: grab;
    user-select: none;
    font-size: 0.9rem;
    pointer-events: auto;
    border: 1px solid #555;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
}

.player-name-text {
    flex: 1;
}

.player-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
}

.draggable-player:hover .player-actions {
    opacity: 1;
    pointer-events: auto;
}

.player-action-btn {
    background: rgba(68, 68, 68, 0.9);
    border: 1px solid #666;
    color: #eee;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.player-action-btn:hover {
    background: rgba(85, 85, 85, 0.9);
}

.duplicate-btn:hover {
    color: #4caf50;
}

.delete-btn:hover {
    color: #f44336;
}

.draggable-player:active {
    cursor: grabbing;
    background: rgba(68, 68, 68, 0.95);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.bracket-scroll-container {
    overflow: auto;
    padding: 30px 10px 30px 10px;
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

.match-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid #333;
}

.match-number {
    font-size: 12px;
    color: #9d9d9d;
}

.header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
}

.match-reveal-btn {
    background: none;
    border: none;
    color: #64b5f6;
    cursor: pointer;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 4px;
}

.match-reveal-btn:hover {
    background: rgba(100, 181, 246, 0.1);
}

.controls {
    margin-bottom: 20px;
    text-align: center;
}

.global-reveal-btn {
    background: #333;
    color: #fff;
    border: 1px solid #555;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}

.global-reveal-btn:hover {
    background: #444;
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
    padding-top:4px;
}

.player-info {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
}

.player-name {
    font-weight: 700;
    font-size:16px;
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
