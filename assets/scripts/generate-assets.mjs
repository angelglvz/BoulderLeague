/**
 * Script para generar los assets de Climbify a partir de SVG
 * Requiere: npm install sharp --legacy-peer-deps
 * Uso: node assets/scripts/generate-assets.mjs
 */
import { createWriteStream, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const ASSETS = join(ROOT, 'assets')

// Asegura que la carpeta assets existe
mkdirSync(ASSETS, { recursive: true })

// SVG del icono (cara mono en cuadrado redondeado, fondo degradado azul-morado)
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6B5CE7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B8FE8;stop-opacity:1" />
    </linearGradient>
    <clipPath id="rounded">
      <rect width="1024" height="1024" rx="220" ry="220"/>
    </clipPath>
  </defs>
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#bg)"/>

  <!-- Cara del mono - fondo blanco ovalado -->
  <ellipse cx="512" cy="530" rx="280" ry="300" fill="white"/>

  <!-- Orejas del mono -->
  <ellipse cx="232" cy="480" rx="80" ry="80" fill="white"/>
  <ellipse cx="232" cy="480" rx="55" ry="55" fill="#4A3F8F"/>
  <ellipse cx="792" cy="480" rx="80" ry="80" fill="white"/>
  <ellipse cx="792" cy="480" rx="55" ry="55" fill="#4A3F8F"/>

  <!-- Cabeza oscura del mono -->
  <ellipse cx="512" cy="460" rx="260" ry="270" fill="#2E2060"/>

  <!-- Cara interior (más clara) -->
  <ellipse cx="512" cy="560" rx="200" ry="210" fill="#F5F0FF"/>

  <!-- Morro -->
  <ellipse cx="512" cy="640" rx="110" ry="80" fill="white"/>

  <!-- Ojos -->
  <ellipse cx="440" cy="490" rx="45" ry="50" fill="white"/>
  <ellipse cx="584" cy="490" rx="45" ry="50" fill="white"/>
  <circle cx="448" cy="495" r="28" fill="#2E2060"/>
  <circle cx="592" cy="495" r="28" fill="#2E2060"/>
  <!-- Brillos en ojos -->
  <circle cx="458" cy="483" r="9" fill="white"/>
  <circle cx="602" cy="483" r="9" fill="white"/>

  <!-- Nariz -->
  <ellipse cx="512" cy="580" rx="28" ry="20" fill="#2E2060"/>
  <!-- Fosas nasales -->
  <ellipse cx="500" cy="581" rx="9" ry="7" fill="#1a1040"/>
  <ellipse cx="524" cy="581" rx="9" ry="7" fill="#1a1040"/>

  <!-- Boca / sonrisa -->
  <path d="M 448 620 Q 512 680 576 620" stroke="#2E2060" stroke-width="10" fill="none" stroke-linecap="round"/>

  <!-- Flequillo / pelo arriba -->
  <path d="M 300 370 Q 350 280 440 310 Q 460 250 512 260 Q 564 250 580 310 Q 670 280 720 370" fill="#2E2060"/>
  <!-- Pelo extra arriba -->
  <path d="M 420 280 Q 440 230 480 260" stroke="#2E2060" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M 510 255 Q 512 200 520 240" stroke="#2E2060" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M 560 270 Q 590 220 600 260" stroke="#2E2060" stroke-width="18" fill="none" stroke-linecap="round"/>
</svg>`

// SVG del logo horizontal (cara + CLIMBIFY)
const logoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6B5CE7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B8FE8;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fondo del banner -->
  <path d="M 0 80 Q 20 0 120 0 L 1150 0 Q 1200 0 1200 50 L 1200 350 Q 1200 400 1150 400 L 120 400 Q 0 400 0 320 Z" fill="url(#bannerBg)"/>

  <!-- Círculo de la cara -->
  <circle cx="210" cy="200" r="170" fill="#2E2060" opacity="0.3"/>
  <circle cx="210" cy="200" r="155" fill="white"/>

  <!-- Orejas del mono -->
  <ellipse cx="68" cy="175" rx="42" ry="42" fill="white"/>
  <ellipse cx="68" cy="175" rx="28" ry="28" fill="#2E2060"/>
  <ellipse cx="352" cy="175" rx="42" ry="42" fill="white"/>
  <ellipse cx="352" cy="175" rx="28" ry="28" fill="#2E2060"/>

  <!-- Cabeza oscura -->
  <ellipse cx="210" cy="185" rx="140" ry="145" fill="#2E2060"/>

  <!-- Cara interior -->
  <ellipse cx="210" cy="235" rx="105" ry="108" fill="#F5F0FF"/>

  <!-- Morro -->
  <ellipse cx="210" cy="272" rx="58" ry="42" fill="white"/>

  <!-- Ojos -->
  <ellipse cx="174" cy="195" rx="24" ry="26" fill="white"/>
  <ellipse cx="246" cy="195" rx="24" ry="26" fill="white"/>
  <circle cx="178" cy="197" r="15" fill="#2E2060"/>
  <circle cx="250" cy="197" r="15" fill="#2E2060"/>
  <circle cx="183" cy="191" r="5" fill="white"/>
  <circle cx="255" cy="191" r="5" fill="white"/>

  <!-- Nariz -->
  <ellipse cx="210" cy="238" rx="15" ry="10" fill="#2E2060"/>
  <ellipse cx="203" cy="239" rx="5" ry="4" fill="#1a1040"/>
  <ellipse cx="217" cy="239" rx="5" ry="4" fill="#1a1040"/>

  <!-- Sonrisa -->
  <path d="M 178 260 Q 210 288 242 260" stroke="#2E2060" stroke-width="5" fill="none" stroke-linecap="round"/>

  <!-- Pelo -->
  <path d="M 100 145 Q 120 90 175 110 Q 190 75 210 78 Q 230 75 245 110 Q 300 90 320 145" fill="#2E2060"/>
  <path d="M 178 92 Q 185 62 196 82" stroke="#2E2060" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M 210 75 Q 212 48 216 68" stroke="#2E2060" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M 240 88 Q 250 60 255 82" stroke="#2E2060" stroke-width="9" fill="none" stroke-linecap="round"/>

  <!-- Texto CLIMBI -->
  <text x="400" y="262" font-family="Arial Black, Arial, sans-serif" font-size="168" font-weight="900" fill="white" letter-spacing="-4">CLIMBI</text>

  <!-- Texto FY en color teal/cyan -->
  <text x="960" y="262" font-family="Arial Black, Arial, sans-serif" font-size="168" font-weight="900" fill="#00C2A8" letter-spacing="-4">FY</text>
</svg>`

// Guardar SVGs
import { writeFileSync } from 'fs'

writeFileSync(join(ASSETS, 'icon.svg'), iconSVG, 'utf8')
writeFileSync(join(ASSETS, 'logo-climbify.svg'), logoSVG, 'utf8')

console.log('✅ SVGs generados en assets/')
console.log('   - assets/icon.svg (icono app)')
console.log('   - assets/logo-climbify.svg (logo pantalla principal)')
console.log('')
console.log('ℹ️  Para generar PNGs necesitas instalar sharp:')
console.log('   npm install sharp --legacy-peer-deps')
console.log('   node assets/scripts/generate-assets.mjs --png')

