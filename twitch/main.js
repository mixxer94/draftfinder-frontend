/** Einstieg der Twitch-Extension (video_overlay.html), siehe vite.twitch.config.mjs. */
import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
// SVG-Icons statt des MDI-Fonts der Website: Der Font allein wären über 3 MB im ZIP.
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import TwitchOverlay from './TwitchOverlay.vue'

createApp(TwitchOverlay)
  .use(createVuetify({
    theme: { defaultTheme: 'dark' },
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  }))
  .mount('#app')
