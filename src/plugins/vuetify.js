import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'

const light = {
  dark: false,
  colors: {
    background: '#f6f7e9',
    surface: '#ebebd1',
    // 'surface-bright': '#f2ecd0',
    secondary: '#216967',
    'app-bar': '#094bad',
    // Statusfarben dunkler als Vuetifys Standard, damit Text, Chips und Flächen
    // auf background und surface WCAG AA (4,5:1) erreichen; der Standard liegt bei 2–3:1.
    warning: '#8a4b00',
    success: '#2e6b30',
    info: '#0d5aa7',
  },
}

const dark = {
  dark: true,
  colors: {
    'app-bar': '#06357a',
    // Dunkle Schrift auf den hellen Standardfarben; weiß erreicht dort nur 2–3:1.
    'on-secondary': '#0b2322',
    'on-warning': '#1f1300',
    'on-success': '#0b1f0c',
    'on-error': '#1f0a0e',
    'on-info': '#04192a',
  }
}
const  defaultDarkTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: defaultDarkTheme ? 'dark' : 'light',
    themes: {
      light,
      dark
    },
  },
})