import { createApp } from 'vue'
import PrintView from './PrintView.vue'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import '../styles/app.css'
import './print.css'

createApp(PrintView).mount('#print')
