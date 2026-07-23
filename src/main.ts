import { createApp } from 'vue'
import App from './App.vue'
// Bundled, self-hosted (see --ls-font in app.css for why not system-ui).
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import './styles/app.css'
// The live page preview renders the real print layout, so the editor needs the
// print stylesheet too. Every rule in it is scoped under `.print-view` (plus an
// `@page` box that only applies when actually printing), so it can't reach the
// editing surface.
import './print/print.css'

createApp(App).mount('#app')
