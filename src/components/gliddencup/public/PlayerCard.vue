<template>
  <div class="pc-card" :class="{ 'is-back': side === 'back' }" :style="{ '--player-color': playerColorCss(player) }">
    <div class="pc-flipper">
      <div class="pc-face pc-front">
        <div class="pennant" />
        <div class="plate">
          <div class="name">{{ player.user }}</div>
          <div class="elo">{{ player.elo }} ({{ player.maxElo }})</div>
        </div>

        <div class="stats-container">
          <div class="hint">{{ spotlightText(player) }}</div>
          <hr class="divider">
          <div class="fact"><span class="fact-label">Map</span> {{ player.map?.trim() || '???' }}</div>
          <hr class="divider">
          <div class="fact"><span class="fact-label">Angstgegner</span> {{ player.angstgegner || '???' }}</div>

          <div class="meta">
            <template v-for="m in metaItems(player)" :key="m.kind">
              <v-tooltip v-if="m.src" :text="m.text" location="bottom" content-class="pc-tooltip">
                <template #activator="{ props }">
                  <span v-if="m.badge" v-bind="props" class="badged">
                    <img :src="m.src" :alt="m.text">
                    <span class="badge">{{ m.badge }}</span>
                  </span>
                  <img v-else v-bind="props" :src="m.src" :alt="m.text">
                </template>
              </v-tooltip>
              <span v-else>{{ m.text }}</span>
            </template>
          </div>

          <div class="stats">
            <div v-for="s in statList(player)" :key="s.label" class="stat">
              <span class="label">{{ s.label }}</span>
              <div class="bar">
                <div class="bar-mask" :style="{ width: `${100 - (s.value || 0) * 10}%` }" />
              </div>
              <div class="value">{{ s.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="pc-face pc-back">
        <div class="pennant" />
        <div class="plate">
          <div class="name">{{ player.user }}</div>
          <div class="elo">{{ player.elo }} ({{ player.maxElo }})</div>
        </div>

        <div class="extra">
          <strong>Charakter</strong>
          <ul class="item-list">
            <li v-for="(hint, idx) in player.hints" :key="idx">{{ hint }}</li>
          </ul>
          <strong>Zitate (nicht wirklich)</strong>
          <ul class="item-list">
            <li v-for="(q, idx) in player.quotes" :key="idx">„{{ q }}“</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Außerhalb des Flippers, damit Buttons beim Umdrehen nicht mitrotieren. -->
    <slot />
  </div>
</template>

<script setup>
import { metaItems, playerColorCss, spotlightText, statList } from '@/components/gliddencup/public/playerCards'

/**
 * Eine Teilnehmerkarte in fester Größe (CARD_W × CARD_H aus playerCards.js). Ein Wechsel von
 * `side` dreht die Karte animiert um. Der Default-Slot liegt über der Karte,
 * z. B. für Buttons; skaliert wird von außen.
 */
defineProps({
  player: { type: Object, required: true },
  side: { type: String, default: 'front' }, // 'front' = Werte, 'back' = Charakter und Zitate
})
</script>

<style src="@/components/gliddencup/public/playerCards.css"></style>

<style scoped>
/*
 * Die Karte ist Spielgrafik mit dunklem Hintergrundbild; Schrift und Buttons
 * darauf bleiben deshalb in beiden Themes hell.
 */
.pc-card {
  position: relative;
  width: 220px;
  height: 350px;
  color: #fff;
  font-family: 'Marcellus SC', serif;
  border-radius: 12px;
  perspective: 1200px;
}

.pc-flipper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.7s ease-in-out; /* symmetrisch: 90° genau nach der halben Zeit */
}

.pc-card.is-back .pc-flipper {
  transform: rotateY(180deg);
}

.pc-face {
  position: absolute;
  inset: 0;
  padding: 12px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-image: url('/gliddencup/card.webp');
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 25%);
  backface-visibility: hidden;
  /* Die Hälfte der Drehdauer: Die Seiten wechseln, wenn die Karte hochkant steht. */
  transition: box-shadow 0.25s ease, visibility 0s linear 0.35s;
}

.pc-back {
  transform: rotateY(180deg);
}

/*
 * Safari und OBS halten sich bei positionierten Kindern mit z-index (Name,
 * Elo, Wimpel) nicht an backface-visibility; die abgewandte Seite würde
 * gespiegelt durchscheinen. visibility blendet sie zuverlässig aus.
 */
.pc-card:not(.is-back) .pc-back,
.pc-card.is-back .pc-front {
  visibility: hidden;
}

.pc-card:hover .pc-face {
  box-shadow: 0 8px 20px rgb(0 0 0 / 35%);
}

.pennant {
  position: absolute;
  top: 0;
  left: 14px;
  z-index: 1;
  width: 30px;
  height: 52px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--player-color) 75%, black),
    var(--player-color) 45%,
    color-mix(in srgb, var(--player-color) 80%, black));
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%);
}

/* Ohne flex-shrink: 0 drückt eine lange, scrollende Rückseite den Namen weg (overflow: hidden erlaubt Höhe 0). */
.plate {
  --plate: rgb(0 0 0 / 45%);
  position: relative;
  flex-shrink: 0;
  margin: 8px -14px 0;
  padding: 3px 0 4px;
  background: linear-gradient(90deg, transparent, var(--plate) 18%, var(--plate) 82%, transparent);
  text-shadow: 0 1px 2px #000;
}

.plate::before,
.plate::after {
  content: '';
  position: absolute;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 45%), transparent);
}

.plate::before {
  top: 0;
}

.plate::after {
  bottom: 0;
}

.name,
.elo {
  position: relative;
  z-index: 2;
}

.name {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.elo {
  flex-shrink: 0;
  font-size: 12px;
  text-align: center;
}

.stats-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.hint {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1.3;
  color: #bbb;
  margin-top: 5px;
  text-align: center;
  font-style: italic;
}

.meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  justify-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.2;
  font-weight: bold;
  text-align: center;
  color: #ddd;
  overflow-wrap: anywhere;
}

.meta img {
  width: 100%;
  height: 38px;
  object-fit: contain;
}

.badged {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.badged img {
  width: auto;
}

.badge {
  position: absolute;
  left: -5px;
  bottom: -5px;
  padding: 2px;
  border-radius: 50px;
  background-color: #00a91b;
  font-size: 13px;
  line-height: 1;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 2px #000, 1px 1px 1px #000;
}

.divider {
  flex-shrink: 0;
  width: 10%;
  margin: 3px 45%;
  border-color: rgb(255 255 255 / 40%);
}

.fact {
  font-size: 13px;
  line-height: 1.2;
  text-align: center;
  color: #ddd;
}

.fact-label {
  font-size: 11px;
  color: #aaa;
}

.stats {
  font-size: 15px;
  line-height: 1.3;
}

.stat {
  display: flex;
  align-items: center;
  margin: 1px 0;
}

.label {
  width: 64px;
}

.value {
  width: 26px;
  text-align: right;
  font-weight: bold;
}

/* Farbverlauf ist die Skala der Werte 1–10; die Maske deckt den Rest ab. */
.bar {
  position: relative;
  flex-grow: 1;
  height: 8px;
  margin: 0 2px;
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(90deg, #620c03, #f1c40f, #00ff6c);
}

.bar-mask {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background: #000;
}

.extra {
  flex: 1 1 0;
  min-height: 0;
  font-size: 15px;
  margin: 8px 0 12px;
  padding: 6px 8px;
  overflow-y: auto;
  color: #ddd;
  background: rgb(17 17 17 / 63%);
  border-radius: 6px;
}

.extra strong {
  color: #fff;
}

.item-list {
  padding-left: 15px;
  margin-bottom: 6px;
}
</style>
