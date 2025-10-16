<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import AppBar from '../components/AppBar.vue'
import PlayerCharacteristics from '../components/PlayerCharacteristics.vue'

// --- API base ---
const API = '/api/gliddencup';

// Auth state
const tokenKey = 'gliddencup_token';
const usernameKey = 'gliddencup_username';
const token = ref(localStorage.getItem(tokenKey) || '');
const me = ref(localStorage.getItem(usernameKey) || '');

const auth = reactive({
    username: '',
    password: '',
    loading: false,
    error: ''
})


// helper functions
function setSession(t, user) {
    token.value = t
    me.value = user?.username || ''
    if (t) {
        localStorage.setItem(tokenKey, t);
    } else {
        localStorage.removeItem(tokenKey)
    }

    if (me.value) {
        localStorage.setItem(usernameKey, me.value);
    }
    else {
        localStorage.removeItem(usernameKey)
    }
}

const duplicateNames = computed(() => {
    const seen = new Map() // key = normalized name -> { name, count, picks[] }
    for (const p of picks.value) {
        const raw = (p.playerName || '').trim()
        if (!raw) continue
        const key = normName(raw)
        if (!seen.has(key)) seen.set(key, { name: raw, count: 0, picks: [] })
        const entry = seen.get(key)
        entry.count++
        entry.picks.push(p.profileId)
    }
    return [...seen.values()].filter(e => e.count > 1).sort()
})

function normName(s) { return (s || '').trim().toLowerCase() }


// computed values
const hasDuplicates = computed(() => duplicateNames.value.length > 0)
const showResults = computed(() => (me.value || '').trim() === 'silvuur')
const playerOptions = computed(() => profiles.value.map(p => p.player).sort())

// ---------------------------
// Analytics: State & Helpers
// ---------------------------
const analyticsView = ref('most-correct') // 'most-correct' | 'chameleons' | 'obvious' | 'controversial' | 'distribution'

// Hilfszugriffe
const profilesById = computed(() => {
    const m = new Map();
    for (const p of profiles.value) m.set(p.playerId, p);
    return m;
});

function actualPlayerName(profileId) {
    return profilesById.value.get(profileId)?.player || '';
}
function profileLabel(profileId) {
    return profilesById.value.get(profileId)?.label || `#${profileId}`;
}
const totalProfilesCount = computed(() => profiles.value.length);

// ---------------------------
// 1) User-Statistiken (Most correct guesses)
// ---------------------------
const userStats = computed(() => {
    const total = totalProfilesCount.value || 1;
    return users.value.map(u => {
        const picks = allTips.value[u.username] || [];
        let correct = 0;
        for (const pick of picks) {
            if (!pick) continue;
            const truth = actualPlayerName(pick.profileId);
            if (truth && pick.playerName && truth === pick.playerName) correct++;
        }
        const pct = (correct / total) * 100;
        return { username: u.username, correct, total, pct };
    }).sort((a, b) => (b.correct - a.correct) || (b.pct - a.pct) || a.username.localeCompare(b.username));
});

// ---------------------------
// 2) Spieler-Statistiken (pro Profile)
//    - correct gesamt, %
//    - guessesMap: { name -> count }
//    - diversityCount (verschiedene guesses)
// ---------------------------
const playerStats = computed(() => {
    const result = [];
    const totalUsers = users.value.length || 1;

    for (const prof of profiles.value) {
        const guessesMap = new Map(); // name -> count
        let correct = 0;

        for (const u of users.value) {
            const picks = allTips.value[u.username] || [];
            const pick = picks.find(x => x.profileId === prof.playerId);
            const guessed = (pick?.playerName || '').trim();
            const truth = prof.player;

            if (guessed) {
                guessesMap.set(guessed, (guessesMap.get(guessed) || 0) + 1);
                if (guessed === truth) correct++;
            } else {
                // Optional: leere Tipps mitzählen?
                // guessesMap.set('—', (guessesMap.get('—') || 0) + 1);
            }
        }

        const pct = (correct / totalUsers) * 100;
        result.push({
            profileId: prof.playerId,
            label: prof.label,
            truth: prof.player,
            correct,
            totalUsers,
            pct,
            diversityCount: guessesMap.size,
            guesses: [...guessesMap.entries()] // [ [name, count], ... ]
                .sort((a, b) => b[1] - a[1])
        });
    }

    return result;
});

// "Verwandlungskünstler": am SELTENSTEN korrekt (aufsteigend nach %)
const chameleons = computed(() =>
    [...playerStats.value].sort((a, b) =>
        (a.pct - b.pct) || (a.correct - b.correct) || a.label.localeCompare(b.label)
    )
);

// "Schlechter Schauspieler": am HÄUFIGSTEN korrekt (absteigend nach %)
const obviousPlayers = computed(() =>
    [...playerStats.value].sort((a, b) =>
        (b.pct - a.pct) || (b.correct - a.correct) || a.label.localeCompare(b.label)
    )
);

// ---------------------------
// Konsens-Score (höchster gemeinsamer Tipp je Profil)
// ---------------------------
// ---------------------------
// Konsens-Score (Top 2 Tipps je Profil)
// ---------------------------
const consensusList = computed(() => {
    const out = [];
    for (const p of playerStats.value) {
        const total = p.totalUsers || 1;
        const topTwo = p.guesses.slice(0, 2); // nimm die ersten zwei häufigsten Tipps
        const [top1Name, top1Count] = topTwo[0] || ['', 0];
        const [top2Name, top2Count] = topTwo[1] || ['', 0];

        out.push({
            profileId: p.profileId,
            label: p.label,
            truth: p.truth,
            top1Name,
            top1Count,
            top1Pct: (top1Count / total) * 100,
            top2Name,
            top2Count,
            top2Pct: (top2Count / total) * 100,
            isTruthTop: top1Name === p.truth,
            totalUsers: total
        });
    }

    // sortiere nach stärkstem Konsens
    return out.sort(
        (a, b) =>
            b.top1Pct - a.top1Pct ||
            b.top1Count - a.top1Count ||
            a.label.localeCompare(b.label)
    );
});


// ---------------------------
// Top-Verwechslungen
// Global & je Profil
// ---------------------------
const perProfileConfusions = computed(() => {
    // Für jede Karte: sortierte Liste falscher Guesses
    return playerStats.value.map(p => {
        const wrong = p.guesses.filter(([name]) => name !== p.truth);
        const totalWrong = wrong.reduce((s, [, c]) => s + c, 0);
        const withPct = wrong.map(([name, count]) => ({
            name,
            count,
            pct: p.totalUsers ? (count / p.totalUsers) * 100 : 0
        }));
        return {
            profileId: p.profileId,
            label: p.label,
            truth: p.truth,
            totalUsers: p.totalUsers,
            totalWrong,
            wrong: withPct.sort((a, b) => b.count - a.count)
        };
    }).sort((a, b) => (b.totalWrong - a.totalWrong) || a.label.localeCompare(b.label));
});

const globalConfusions = computed(() => {
    // Aggregiert über alle Profile: (truth -> guess) Paare, nur falsche
    const map = new Map(); // key = `${truth}__${guess}` -> { truth, guess, count }
    for (const p of playerStats.value) {
        for (const [name, count] of p.guesses) {
            if (name === p.truth) continue;
            const key = `${p.truth}__${name}`;
            const cur = map.get(key) || { truth: p.truth, truthLabel: p.label, guess: name, count: 0, totalUsers: p.totalUsers };
            cur.count += count;
            map.set(key, cur);
        }
    }
    const list = [...map.values()].map(x => ({
        ...x,
        pct: x.totalUsers ? (x.count / x.totalUsers) * 100 : 0
    }));
    // Häufigste Verwechslungen zuerst
    return list.sort((a, b) => (b.count - a.count) || (b.pct - a.pct) || a.truthLabel.localeCompare(b.truthLabel));
});

// "Most controversial": die meisten verschiedenen guesses (hohe Vielfalt)
// Sortierung: diversityCount DESC, dann Anzahl guesses total DESC
const controversial = computed(() =>
    [...playerStats.value].sort((a, b) => {
        if (b.diversityCount !== a.diversityCount) return b.diversityCount - a.diversityCount;
        const totalA = a.guesses.reduce((s, [, c]) => s + c, 0);
        const totalB = b.guesses.reduce((s, [, c]) => s + c, 0);
        return totalB - totalA;
    })
);

// ---------------------------
// 3) Trefferverteilung insgesamt (Histogramm über User)
// ---------------------------
const distribution = computed(() => {
    const buckets = new Array((totalProfilesCount.value || 0) + 1).fill(0);
    for (const s of userStats.value) {
        buckets[s.correct] = (buckets[s.correct] || 0) + 1;
    }
    // Rückgabe als Array [{correct, users}]
    return buckets.map((usersCount, correct) => ({ correct, users: usersCount }));
});
const overallAvg = computed(() => {
    if (!userStats.value.length) return 0;
    const sum = userStats.value.reduce((s, u) => s + u.correct, 0);
    return sum / userStats.value.length;
});


function isCorrectPick(pick) {
    const profile = profiles.value.find(x => x.playerId === pick.profileId);
    if (!profile || !showSpoilers.value) return false;

    return profile.player === pick.playerName;
}


async function api(path, opts = {}) {
    const headers = opts.headers ? { ...opts.headers } : {}

    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'
    if (token.value) headers['Authorization'] = `Bearer ${token.value}`
    const res = await fetch(`${API}${path}`, {
        method: 'GET',
        ...opts,
        headers
    })

    if (!res.ok) {
        let msg = 'Request failed'
        try {
            const j = await res.json();
            msg = j?.error || msg
        } catch { }
        throw new Error(msg)
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
}

// Tabs – "public" zuerst
const tab = ref('mytips')
const showSpoilers = ref(false);

// Auth actions
async function doSignup() {
    auth.loading = true;
    auth.error = '';
    try {
        const data = await api('/signup', {
            method: 'POST',
            body: JSON.stringify({
                username: auth.username.trim(),
                password: auth.password
            })
        })
        setSession(data.token, data.user);
        tab.value = 'mytips';
        await loadMyTips();

        auth.username = ''
        auth.password = ''
    } catch (e) {
        auth.error = e.message
    } finally {
        auth.loading = false
    }
}
async function doLogin() {
    auth.loading = true;
    auth.error = '';
    try {
        const data = await api('/login', {
            method: 'POST',
            body: JSON.stringify({
                username: auth.username.trim(),
                password: auth.password
            })
        })

        setSession(data.token, data.user);
        tab.value = 'mytips';
        await loadMyTips()

        auth.username = ''
        auth.password = ''
    } catch (e) {
        auth.error = e.message
    } finally {
        auth.loading = false
    }
}

function logout() { setSession('', '') }

// Profiles & tips
const profiles = ref([]), picks = ref([])
const profilesLoading = ref(false), profilesError = ref('')
const tipsLoading = ref(false), tipsSaved = ref(false), tipsError = ref('')

function bestMatch(query) {
    const q = query.trim().toLowerCase()
    if (!q) return null

    // 1) exact (case-insensitive)
    const exact = playerOptions.value.find(n => n.toLowerCase() === q)
    if (exact) return exact

    // 2) prefix match
    const prefixes = playerOptions.value.filter(n => n.toLowerCase().startsWith(q))
    if (prefixes.length) return prefixes.sort((a, b) => a.length - b.length)[0]

    // 3) substring match
    const subs = playerOptions.value.filter(n => n.toLowerCase().includes(q))
    if (subs.length) return subs.sort((a, b) => a.length - b.length)[0]

    return null
}

function autoFill(p) {
    const q = (p.search || p.playerName || '').trim()
    if (!q) return
    const m = bestMatch(q)
    if (m) {
        p.playerName = m
    }
    p.search = ''
}

function buildPicksFromProfiles() {
    const existing = new Map(picks.value.map(p => [p.profileId, p.playerName]))
    picks.value = profiles.value.map(p => ({
        profileId: p.playerId,
        playerName: existing.get(p.playerId) || '',
        search: ''
    }))
}

async function loadMyTips() {
    if (!token.value || !profiles.value.length) return
    try {
        const res = await api('/tips/me')
        if (Array.isArray(res?.picks)) {
            const map = new Map(res.picks.map(p => [p.profileId, p.playerName]))
            picks.value = profiles.value.map(p => ({
                profileId: p.playerId,
                playerName: map.get(p.playerId) || '',
                search: ''
            }))
        }
    } catch { }
}
async function saveTips() {
    tipsLoading.value = true; tipsError.value = ''; tipsSaved.value = false
    try {
        await api('/tips', {
            method: 'POST',
            body: JSON.stringify({
                picks: picks.value.map(p => ({ profileId: p.profileId, playerName: (p.playerName || '').trim() }))
            })
        })
        tipsSaved.value = true
    } catch (e) { tipsError.value = e.message } finally { tipsLoading.value = false }
}

// Public users & tips
const users = ref([]), selectedUser = ref(''), selectedTips = ref([])
const publicLoading = ref(false), publicError = ref('')
const allTips = ref({}); // { [username]: Pick[] }

async function loadOverview() {
    try {
        const data = await api(`/overview?mode=${showResults.value ? 'private' : 'public'}`);
        profiles.value = Array.isArray(data?.profiles) ? data.profiles : [];
        users.value = Array.isArray(data?.users) ? data.users : [];
        allTips.value = data?.picksByUser || {};
        buildPicksFromProfiles(); // keep your editor state consistent
    } catch (e) {
        publicError.value = e.message || 'Fehler beim Laden';
    }
}


function selectUser(username) {
    selectedUser.value = username;
    selectedTips.value = allTips.value[username] || [];
}

onMounted(async () => {
    await loadOverview();
    if (token.value) await loadMyTips()
})
</script>

<template>
    <AppBar />

    <v-card class="pa-0">
        <!-- Tabs oben -->
        <v-tabs v-model="tab" bg-color="primary" color="white">
            <v-tab value="mytips">Tippen</v-tab>
            <v-tab value="characteristics">Teilnehmer</v-tab>
            <v-tab value="alltips" v-if="showResults">Tipps ansehen</v-tab>
            <v-tab value="analytics" v-if="showResults">Auswertungen</v-tab>
        </v-tabs>
        <v-divider />

        <v-window v-model="tab">

            <!-- TAB Tipps abgeben -->
            <v-window-item value="mytips">
                <div class="pa-4">
                    <v-row>
                        <!-- Spalte 1: Login/Signup -->
                        <v-col cols="12" md="3">
                            <h3 class="mb-4">Account</h3>
                            <v-card class="pa-4">
                                <div v-if="me" class="mb-3 d-flex align-center">
                                    <v-chip color="secondary" class="mr-2" label>{{ me }}</v-chip>
                                    <v-btn variant="outlined" color="error" @click="logout">Logout</v-btn>
                                </div>
                                <template v-else>
                                    <v-alert v-if="auth.error" type="error" variant="tonal" class="mb-3">
                                        {{ auth.error }}
                                    </v-alert>

                                    <v-text-field v-model="auth.username" label="Username" variant="outlined"
                                        density="comfortable" />
                                    <v-text-field v-model="auth.password" label="Passwort" type="password"
                                        variant="outlined" density="comfortable" />

                                    <div class="d-flex gap-2 mt-2">
                                        <v-btn :loading="auth.loading" color="primary" @click="doLogin">Anmelden</v-btn>
                                        <div class="mb-4">&nbsp;</div>
                                        <v-btn :loading="auth.loading" color="secondary"
                                            @click="doSignup">Registrieren</v-btn>
                                    </div>
                                </template>
                            </v-card>
                        </v-col>

                        <!-- Spalte 2: Formular -->
                        <v-col cols="12" md="9">
                            <h3 class="mb-4">Tipps abgeben / anpassen</h3>
                            <v-card class="pa-4">
                                <v-chip v-if="!token" color="warning" variant="tonal" class="mb-3">
                                    Bitte anmelden oder registrieren, um Tipps zu speichern
                                </v-chip>

                                <v-skeleton-loader v-if="profilesLoading" type="table" class="mb-4" />
                                <v-alert v-if="profilesError" type="error" variant="tonal" class="mb-3">{{
                                    profilesError
                                }}</v-alert>

                                <v-row v-if="profiles.length">
                                    <v-col cols="12" md="6" lg="3" v-for="p in picks" :key="p.profileId">
                                        <v-autocomplete :label="profiles.find(x => x.playerId === p.profileId)?.label"
                                            v-model="p.playerName" v-model:search="p.search" variant="outlined"
                                            persistent-placeholder density="comfortable" :items="playerOptions"
                                            @blur="autoFill(p)" :disabled="!token" />
                                    </v-col>
                                </v-row>

                                <v-alert v-if="tipsError" type="error" variant="tonal" class="mb-3">{{ tipsError
                                    }}</v-alert>
                                <v-alert v-if="tipsSaved" type="success" variant="tonal"
                                    class="mb-3">Gespeichert!</v-alert>

                                <v-alert v-if="hasDuplicates" type="warning" variant="tonal" class="mb-3"
                                    title="Du hast denselben Spielernamen mehrmals ausgewählt:">

                                    <div class="d-flex flex-wrap gap-2">
                                        <div v-for="d in duplicateNames" :key="d.name" class="mb-2">
                                            <v-chip class="mr-2" label>
                                                {{ d.name }} &times; {{ d.count }}
                                            </v-chip>
                                            <span class="text-caption text-medium-emphasis">
                                                ({{d.picks.map(id => profiles.find(x => x.playerId === id)?.label ||
                                                    id).join(', ')}})
                                            </span>
                                        </div>
                                    </div>
                                </v-alert>

                                <div class="d-flex justify-end" v-if="token">
                                    <v-btn color="primary" :loading="tipsLoading" :disabled="!token || !profiles.length"
                                        @click="saveTips">
                                        Speichern
                                    </v-btn>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </v-window-item>

            <!-- TAB Tipps ansehen  -->
            <v-window-item value="alltips" v-if="showResults">
                <div class="pa-4">
                    <v-row>
                        <v-col cols="12" md="3">
                            <h3 class="mb-4">Accounts</h3>
                            <v-card class="pa-0">
                                <v-list lines="one" density="comfortable" nav>
                                    <v-skeleton-loader v-if="!users.length" type="list-item-two-line" class="ma-2" />
                                    <v-list-item v-for="u in users" :key="u.username" :value="u.username"
                                        @click="selectUser(u.username)" :active="selectedUser === u.username">
                                        <v-list-item-title>{{ u.username }}</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-card>

                            <v-alert v-if="publicError" type="error" variant="tonal" class="mt-3">{{ publicError
                            }}</v-alert>
                        </v-col>

                        <!-- Spalte 2: Ergebnisse -->
                        <v-col cols="12" md="9">
                            <h3 class="mb-4">Tipps</h3>
                            <v-btn v-if="showResults" @click="showSpoilers = !showSpoilers" variant="outlined"
                                :color="showSpoilers ? 'success' : 'error'">
                                {{ showSpoilers ? 'Spoiler ausblenden' : 'Spoiler anzeigen' }}
                            </v-btn>

                            <v-card class="pa-4">
                                <div v-if="!selectedUser" class="text-body-2 mb-3">
                                    Wähle links einen Account, um die Tipps zu sehen.
                                </div>

                                <v-row v-if="selectedUser">
                                    <v-col cols="12" md="6" lg="3" v-for="p in selectedTips" :key="p.profileId">
                                        <v-card variant="tonal" class="pa-2"
                                            :class="{ 'correct-pick': isCorrectPick(p) }">
                                            <div class="text-caption text-medium-emphasis mb-1">
                                                {{profiles.find(x => x.playerId === p.profileId)?.label}}
                                            </div>
                                            <div class="text-subtitle-1">
                                                {{ p.playerName && p.playerName.trim() ? p.playerName : '---' }}
                                            </div>
                                        </v-card>
                                    </v-col>
                                </v-row>
                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </v-window-item>

            <!-- TAB 3: Auswertungen -->
            <v-window-item value="analytics" v-if="showResults">
                <div class="pa-4">
                    <v-row>
                        <!-- Linke Spalte: Auswahl -->
                        <v-col cols="12" md="3">
                            <h3 class="mb-4">Auswertungen</h3>
                            <v-card class="pa-0">
                                <v-list lines="one" density="comfortable" nav>
                                    <v-list-item :active="analyticsView === 'most-correct'"
                                        @click="analyticsView = 'most-correct'">
                                        <v-list-item-title>Rangliste richtige Treffer</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :active="analyticsView === 'chameleons'"
                                        @click="analyticsView = 'chameleons'">
                                        <v-list-item-title>Verwandlungskünstler</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :active="analyticsView === 'obvious'"
                                        @click="analyticsView = 'obvious'">
                                        <v-list-item-title>Schlechte Schauspieler</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :active="analyticsView === 'controversial'"
                                        @click="analyticsView = 'controversial'">
                                        <v-list-item-title>Kontrovers diskutiert</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :active="analyticsView === 'distribution'"
                                        @click="analyticsView = 'distribution'">
                                        <v-list-item-title>Trefferverteilung pro User</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :active="analyticsView === 'consensus'"
                                        @click="analyticsView = 'consensus'">
                                        <v-list-item-title>Konsens-Score</v-list-item-title>
                                    </v-list-item>

                                    <v-list-item :active="analyticsView === 'confusions'"
                                        @click="analyticsView = 'confusions'">
                                        <v-list-item-title>Top-Verwechslungen</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-card>
                        </v-col>

                        <!-- Rechte Spalte: Inhalt -->
                        <v-col cols="12" md="9">
                            <h3 class="mb-4">
                                {{ {
                                    'most-correct': 'Am meisten Richtige',
                                    'chameleons': 'Verwandlungskünstler',
                                    'obvious': 'Schlechter Schauspieler',
                                    'controversial': 'Kontrovers diskutiert',
                                    'distribution': 'Trefferverteilung',
                                    'consensus': 'Konsens-Score',
                                    'confusions': 'Top-Verwechslungen'
                                }[analyticsView] }}
                            </h3>

                            <v-card class="pa-4">

                                <!-- Most correct Guesses -->
                                <template v-if="analyticsView === 'most-correct'">
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th class="text-right">Korrekt</th>
                                                <th class="text-right">Gesamt</th>
                                                <th class="text-right">Quote</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="u in userStats" :key="u.username">
                                                <td>{{ u.username }}</td>
                                                <td class="text-right">{{ u.correct }}</td>
                                                <td class="text-right">{{ u.total }}</td>
                                                <td class="text-right">{{ u.pct.toFixed(1) }}%</td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>

                                <!-- Verwandlungskünstler -->
                                <template v-else-if="analyticsView === 'chameleons'">
                                    <div>Spieler, die am seltensten richtig geraten wurden.</div>
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>Profil</th>
                                                <th class="text-right">Korrekt erraten</th>
                                                <!-- <th class="text-right">Teilnehmer</th> -->
                                                <th class="text-right">Quote</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="p in chameleons" :key="p.profileId">
                                                <td>
                                                    {{ p.label }}
                                                    <div class="text-caption text-medium-emphasis"> {{ p.truth
                                                    }}</div>
                                                </td>
                                                <td class="text-right">{{ p.correct }}</td>
                                                <!-- <td class="text-right">{{ p.totalUsers }}</td> -->
                                                <td class="text-right">{{ p.pct.toFixed(1) }}%</td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>

                                <!-- Schlechter Schauspieler -->
                                <template v-else-if="analyticsView === 'obvious'">
                                    <div>Spieler, die am häufigsten richtig geraten wurden.</div>
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>Profil</th>
                                                <th class="text-right">Korrekt erraten</th>
                                                <!-- <th class="text-right">Teilnehmer</th> -->
                                                <th class="text-right">Quote</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="p in obviousPlayers" :key="p.profileId">
                                                <td>
                                                    {{ p.label }}
                                                    <div class="text-caption text-medium-emphasis"> {{ p.truth
                                                    }}</div>
                                                </td>
                                                <td class="text-right">{{ p.correct }}</td>
                                                <!-- <td class="text-right">{{ p.totalUsers }}</td> -->
                                                <td class="text-right">{{ p.pct.toFixed(1) }}%</td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>

                                <!-- Most controversial -->
                                <template v-else-if="analyticsView === 'controversial'">
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>Profil</th>
                                                <th class="text-right">Versch. Guesses</th>
                                                <th>Top Guesses (Name × Count)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="p in controversial" :key="p.profileId">
                                                <td>
                                                    <div class="font-weight-medium">{{ p.label }}</div>
                                                    <div class="text-caption text-medium-emphasis"> {{ p.truth
                                                    }}</div>
                                                </td>
                                                <td class="text-right">{{ p.diversityCount }}</td>
                                                <td>
                                                    <div class="d-flex flex-wrap gap-2">
                                                        <v-chip v-for="([name, count], idx) in p.guesses" :key="idx"
                                                            size="small" :variant="name === p.truth ? 'flat' : 'tonal'"
                                                            :color="name === p.truth ? 'success' : undefined"
                                                            class="ma-1" label>
                                                            {{ name }} × {{ count }}
                                                        </v-chip>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>

                                <!-- Trefferverteilung -->
                                <template v-else-if="analyticsView === 'distribution'">
                                    <div class="text-caption mb-2">
                                        Ø Schnitt: <b>{{ overallAvg.toFixed(2) }}</b> korrekte Tipps (von {{
                                            totalProfilesCount }})
                                    </div>
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>Korrekte Tipps</th>
                                                <th class="text-right">Anzahl User</th>
                                                <th>Bar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="row in distribution" :key="row.correct">
                                                <td>{{ row.correct }}</td>
                                                <td class="text-right">{{ row.users }}</td>
                                                <td>
                                                    <div class="bar" :style="{ width: (row.users * 12) + 'px' }"></div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>

                                <!-- Konsens-Score (Top 2 Tipps) -->
                                <template v-else-if="analyticsView === 'consensus'">
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>Profil</th>
                                                <th>Häufigster Tipp</th>
                                                <th>2.häufigster Tipp</th>
                                                <th class="text-right">Abgegebene Tipps</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="row in consensusList" :key="row.profileId">
                                                <td class="font-weight-medium">{{ row.label }}
                                                    <div class="text-caption text-medium-emphasis"> {{ row.truth }}</div>
                                                </td>
                                                <td>
                                                    <v-chip :color="row.isTruthTop ? 'success' : undefined"
                                                        :variant="row.isTruthTop ? 'flat' : 'tonal'" label size="small">
                                                        {{ row.top1Name || '—' }} × {{ row.top1Count }} ({{
                                                            row.top1Pct.toFixed(1) }}%)
                                                    </v-chip>
                                                </td>
                                                <td>
                                                    <v-chip v-if="row.top2Name" label size="small" variant="tonal"
                                                        class="ml-1">
                                                        {{ row.top2Name }} × {{ row.top2Count }} ({{
                                                            row.top2Pct.toFixed(1) }}%)
                                                    </v-chip>
                                                </td>
                                                <td class="text-right">{{ row.totalUsers }}</td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>


                                <template v-else-if="analyticsView === 'confusions'">
                                    <h4 class="mb-3">Global (häufigste falsche Paare)</h4>
                                    <v-table density="comfortable" class="mb-6">
                                        <thead>
                                            <tr>
                                                <th>Profil</th>
                                                <th>Falscher Tipp</th>
                                                <th class="text-right">Anzahl</th>
                                                <th class="text-right">Quote*</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="pair in globalConfusions.slice(0, 25)"
                                                :key="pair.truth + '→' + pair.guess">
                                                <td>
                                                    <div class="font-weight-medium">{{ pair.truthLabel }}</div>
                                                    <div class="text-caption text-medium-emphasis">{{
                                                        pair.truth }}</div>
                                                </td>
                                                <td>{{ pair.guess }}</td>
                                                <td class="text-right">{{ pair.count }}</td>
                                                <td class="text-right">{{ pair.pct.toFixed(1) }}%</td>
                                            </tr>
                                        </tbody>
                                    </v-table>

                                    <div class="text-caption text-medium-emphasis mb-4">
                                        *Quote bezogen auf die Anzahl Teilnehmer pro Profil.
                                    </div>

                                    <h4 class="mb-3">Je Profil (Top-Verwechslungen)</h4>
                                    <v-table density="comfortable">
                                        <thead>
                                            <tr>
                                                <th>Profil</th>
                                                <th>Top falsche Guesses (Name × Count)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="p in perProfileConfusions" :key="p.profileId">
                                                <td>
                                                    <div class="font-weight-medium">{{ p.label }}</div>
                                                    <div class="text-caption text-medium-emphasis">{{ p.truth
                                                        }}</div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-wrap">
                                                        <v-chip v-for="item in p.wrong.slice(0, 6)" :key="item.name"
                                                            class="ma-1" label size="small" variant="tonal">
                                                            {{ item.name }} × {{ item.count }} ({{ item.pct.toFixed(1)
                                                            }}%)
                                                        </v-chip>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </template>

                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </v-window-item>
            <v-window-item value="characteristics">
                <PlayerCharacteristics/>
            </v-window-item>
        </v-window>
    </v-card>
</template>

<style scoped>
.correct-pick {
    background-color: #06411d;
}

:global(.mb-6) {
    margin-bottom: 24px;
}


.bar {
    height: 8px;
    background: red;
    border-radius: 4px;
    opacity: 0.8;
}
</style>
