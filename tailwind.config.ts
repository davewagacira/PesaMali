import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./**/*.{ts,tsx}', '!./node_modules/**'],
  theme: { extend: {} },
  plugins: [],
}
export default config
