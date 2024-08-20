import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'

const light = {
  dark: false,
  colors: {
    background: '#f2ecd0',
    surface: '#f2ecd0',
    'surface-bright': '#f2ecd0',
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

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      light,
      dark
    },
  },
})