<script setup>
import { computed, ref, onMounted } from "vue";
import axios from 'axios';
// import matchData from '@/assets/matches.json' // Removed local import

const props = defineProps({
    roundOrder: { type: Array, default: () => ["Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"] },
    boxWidth: { type: Number, default: 220 },
    boxHeight: { type: Number, default: 140 },
    colGap: { type: Number, default: 160 },
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
    await fetchTabsVisible();
});

// Admin state
const currentUsername = ref(localStorage.getItem('gliddencup_username') || '');
const isAdmin = computed(() => currentUsername.value === 'silvuur');
const tabsVisible = ref(false);
const playerIdentityRevealed = ref(false);
const adminPanelExpanded = ref(true);


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
    
    // Sort alphabetically for initial display
    playerNames.sort();

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

// Admin functions
async function fetchTabsVisible() {
    try {
        const response = await axios.get('/api/gliddencup/settings');
        tabsVisible.value = response.data.tabsVisible ?? false;
        playerIdentityRevealed.value = response.data.playerIdentityRevealed ?? false;
    } catch (e) {
        console.error("Failed to fetch tabs visible state", e);
    }
}

async function toggleTabsVisibility() {
    const oldValue = tabsVisible.value;
    try {
        // Optimistic update
        tabsVisible.value = !tabsVisible.value;
        
        const token = localStorage.getItem('gliddencup_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.post('/api/gliddencup/settings/toggle-tabs', {}, { headers });
        tabsVisible.value = response.data.tabsVisible;
        playerIdentityRevealed.value = response.data.playerIdentityRevealed;
    } catch (e) {
        console.error("Failed to toggle tabs visibility", e);
        // Revert on error
        tabsVisible.value = oldValue;
        alert('Failed to toggle tabs visibility: ' + (e.response?.data?.error || e.message));
    }
}

async function togglePlayerIdentity() {
    const oldValue = playerIdentityRevealed.value;
    try {
        // Optimistic update
        playerIdentityRevealed.value = !playerIdentityRevealed.value;
        
        const token = localStorage.getItem('gliddencup_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.post('/api/gliddencup/settings/toggle-player-identity', {}, { headers });
        tabsVisible.value = response.data.tabsVisible;
        playerIdentityRevealed.value = response.data.playerIdentityRevealed;
    } catch (e) {
        console.error("Failed to toggle player identity", e);
        // Revert on error
        playerIdentityRevealed.value = oldValue;
        alert('Failed to toggle player identity: ' + (e.response?.data?.error || e.message));
    }
}

async function cycleMatchRevealLevel(gameId) {
    const currentLevel = getRevealLevel(gameId);
    const nextLevel = (currentLevel + 1) % 3; // Cycle 0 -> 1 -> 2 -> 0
    await setRevealLevel(gameId, nextLevel);
}

function getAllMatches() {
    const allMatches = [];
    matchData.value.rounds?.forEach(round => {
        round.matches?.forEach(match => {
            allMatches.push({
                game: match.game,
                roundName: round.name,
                player1: match.player1?.user || '???',
                player2: match.player2?.user || '???',
                revealLevel: match.revealLevel ?? 0
            });
        });
    });
    return allMatches.sort((a, b) => a.game - b.game);
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
        <!-- Controls and Admin Panel (outside scroll container) -->
        <div class="controls">
            <button class="global-reveal-btn" @click="toggleGlobalTips">
                {{ globalTipsReveal ? 'Alle Tipps verbergen' : 'Alle Tipps anzeigen' }}
            </button>
            <button class="reload-btn" @click="fetchMatches" title="Matches neu laden">
                🔄 Neu laden
            </button>
        </div>

        <!-- Admin Panel (only visible for silvuur) -->
        <div v-if="isAdmin" class="admin-panel">
            <div class="admin-header" @click="adminPanelExpanded = !adminPanelExpanded">
                <span class="admin-title">⚙️ Admin Tools</span>
                <span class="expand-icon">{{ adminPanelExpanded ? '▼' : '▶' }}</span>
            </div>
            
            <div v-if="adminPanelExpanded" class="admin-content">
                <!-- Tab Visibility Toggle -->
                <div class="admin-section">
                    <h4>Tab Sichtbarkeit</h4>
                    <div class="admin-control">
                        <button class="admin-btn" @click="toggleTabsVisibility">
                            {{ tabsVisible ? 'Tabs verbergen' : 'Tabs anzeigen' }}
                        </button>
                        <span class="status-indicator" :class="{ active: tabsVisible }">
                            {{ tabsVisible ? '✓ Sichtbar' : '✗ Versteckt' }}
                        </span>
                    </div>
                </div>

                <!-- Player Identity Toggle -->
                <div class="admin-section">
                    <h4>Spieler-Identität</h4>
                    <div class="admin-control">
                        <button class="admin-btn" @click="togglePlayerIdentity">
                            {{ playerIdentityRevealed ? 'Identität verbergen' : 'Identität anzeigen' }}
                        </button>
                        <span class="status-indicator" :class="{ active: playerIdentityRevealed }">
                            {{ playerIdentityRevealed ? '✓ Enthüllt' : '✗ Verborgen' }}
                        </span>
                    </div>
                </div>

                <!-- Match Reveal Controls -->
                <div class="admin-section">
                    <h4>Match Reveal Levels</h4>
                    <div class="matches-grid">
                        <div v-for="match in getAllMatches()" :key="match.game" class="match-control">
                            <div class="match-info">
                                <span class="match-number">Spiel {{ match.game }}</span>
                                <span class="match-round">{{ match.roundName }}</span>
                            </div>
                            <div class="match-actions">
                                <span class="reveal-status" :class="`level-${match.revealLevel}`">
                                    Level {{ match.revealLevel }}
                                </span>
                                <button class="cycle-btn" @click="cycleMatchRevealLevel(match.game)" title="Cycle reveal level">
                                    ⟳
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
                                        <template v-if="playerIdentityRevealed">
                                            <div>{{ rounds[ci][mi]?.player1.user }}</div>
                                            <div class="actual-player">{{ rounds[ci][mi]?.player1.player }}</div>
                                        </template>
                                        <template v-else>
                                            {{ rounds[ci][mi]?.player1.user }}
                                        </template>
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
                                        <template v-if="playerIdentityRevealed">
                                            <div>{{ rounds[ci][mi]?.player2.user }}</div>
                                            <div class="actual-player">{{ rounds[ci][mi]?.player2.player }}</div>
                                        </template>
                                        <template v-else>
                                            {{ rounds[ci][mi]?.player2.user }}
                                        </template>
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
    display: flex;
    flex-direction: column;
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
    flex: 1;
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
    margin: 20px 20px 16px 20px;
    text-align: center;
    display: flex;
    gap: 12px;
    justify-content: center;
    align-items: center;
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

.reload-btn {
    background: #333;
    color: #fff;
    border: 1px solid #555;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.reload-btn:hover {
    background: #444;
}

.reload-btn:active {
    transform: scale(0.95);
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

.actual-player {
    font-size: 12px;
    color: #ffa726;
    font-weight: 400;
    margin-top: 2px;
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
    font-size: 12px;
    margin-top: 1px;
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

/* Admin Panel Styles */
.admin-panel {
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 6px;
    margin: 0 20px 16px 20px;
    overflow: hidden;
}

.admin-header {
    background: #252525;
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    transition: background 0.2s;
}

.admin-header:hover {
    background: #2a2a2a;
}

.admin-title {
    font-weight: 600;
    color: #ffa726;
    font-size: 14px;
}

.expand-icon {
    color: #888;
    font-size: 12px;
}

.admin-content {
    padding: 16px;
}

.admin-section {
    margin-bottom: 20px;
}

.admin-section:last-child {
    margin-bottom: 0;
}

.admin-section h4 {
    color: #aaa;
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.admin-control {
    display: flex;
    gap: 12px;
    align-items: center;
}

.admin-btn {
    background: #333;
    color: #fff;
    border: 1px solid #555;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s;
}

.admin-btn:hover {
    background: #444;
}

.status-indicator {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background: #2a2a2a;
    color: #f44336;
    border: 1px solid #3a3a3a;
}

.status-indicator.active {
    color: #4caf50;
}

.matches-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
}

.match-control {
    background: #252525;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 0.2s;
}

.match-control:hover {
    background: #2a2a2a;
    border-color: #444;
}

.match-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.match-number {
    font-weight: 600;
    color: #eee;
    font-size: 12px;
}

.match-round {
    font-size: 10px;
    color: #888;
}

.match-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.reveal-status {
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid;
}

.reveal-status.level-0 {
    background: #3a1f1f;
    color: #f44336;
    border-color: #5a2f2f;
}

.reveal-status.level-1 {
    background: #3a3a1f;
    color: #ffa726;
    border-color: #5a5a2f;
}

.reveal-status.level-2 {
    background: #1f3a1f;
    color: #4caf50;
    border-color: #2f5a2f;
}

.cycle-btn {
    background: #333;
    border: 1px solid #555;
    color: #64b5f6;
    width: 24px;
    height: 24px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.cycle-btn:hover {
    background: #444;
    transform: rotate(90deg);
}

.cycle-btn:active {
    transform: rotate(90deg) scale(0.9);
}
</style>
