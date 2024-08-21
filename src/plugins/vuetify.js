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
  },
}

const dark = {
  dark: true,
  colors: {
    'app-bar': '#06357a',
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