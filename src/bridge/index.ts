/**
 * The alias target for `@bridge-craftwork/bridge-components` (Contract 2).
 *
 * HandDisplay and AuctionTable are a SNAPSHOT of the real Bridge-Classroom
 * components (see vendor/README.md). HandsCompass, ResponseBox, and QuizSnapshot
 * don't exist upstream yet, so they remain lesson-studio placeholders until the
 * package is built.
 */
export { default as HandDisplay } from './vendor/components/HandDisplay.vue'
export { default as AuctionTable } from './vendor/components/AuctionTable.vue'
export { default as HandsCompass } from './HandsCompass.vue'
export { default as ResponseBox } from './ResponseBox.vue'
export { default as QuizSnapshot } from './QuizSnapshot.vue'
