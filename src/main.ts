import { createApp } from 'vue'
import App from './App.vue'
import './styles/app.css'
// The live page preview renders the real print layout, so the editor needs the
// print stylesheet too. Every rule in it is scoped under `.print-view` (plus an
// `@page` box that only applies when actually printing), so it can't reach the
// editing surface.
import './print/print.css'

createApp(App).mount('#app')
