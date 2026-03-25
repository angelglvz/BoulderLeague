/**
 * Genera variante del logo para tema claro (sin fondo degradado)
 */
const sharp = require('sharp')
const path = require('path')

const ASSETS = path.join(__dirname, '..')

// Logo versión "dark text" para tema claro (sin banner azul, texto en morado)
const logoLightSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280">

  <!-- Cara del mono con fondo degradado pequeño -->
  <circle cx="140" cy="140" r="125" fill="#6B5CE7"/>

  <!-- Orejas -->
  <ellipse cx="25" cy="122" rx="34" ry="34" fill="#6B5CE7"/>
  <ellipse cx="25" cy="122" rx="22" ry="22" fill="#4A3AAF"/>
  <ellipse cx="255" cy="122" rx="34" ry="34" fill="#6B5CE7"/>
  <ellipse cx="255" cy="122" rx="22" ry="22" fill="#4A3AAF"/>

  <!-- Cabeza -->
  <ellipse cx="140" cy="126" rx="108" ry="112" fill="#2E2060"/>

  <!-- Cara interior -->
  <ellipse cx="140" cy="168" rx="80" ry="82" fill="#EDE8FF"/>

  <!-- Morro -->
  <ellipse cx="140" cy="193" rx="46" ry="33" fill="white"/>

  <!-- Ojos blancos -->
  <ellipse cx="112" cy="140" rx="20" ry="22" fill="white"/>
  <ellipse cx="168" cy="140" rx="20" ry="22" fill="white"/>
  <!-- Pupilas -->
  <circle cx="115" cy="143" r="12" fill="#2E2060"/>
  <circle cx="171" cy="143" r="12" fill="#2E2060"/>
  <!-- Brillos -->
  <circle cx="119" cy="137" r="4" fill="white"/>
  <circle cx="175" cy="137" r="4" fill="white"/>

  <!-- Nariz -->
  <ellipse cx="140" cy="175" rx="12" ry="8" fill="#2E2060"/>
  <ellipse cx="134" cy="176" rx="4" ry="3" fill="#1a1040"/>
  <ellipse cx="146" cy="176" rx="4" ry="3" fill="#1a1040"/>

  <!-- Sonrisa -->
  <path d="M 116 187 Q 140 206 164 187" stroke="#2E2060" stroke-width="5" fill="none" stroke-linecap="round"/>

  <!-- Pelo -->
  <path d="M 62 95 Q 78 58 122 75 Q 131 46 140 48 Q 149 46 158 75 Q 202 58 218 95" fill="#2E2060"/>
  <path d="M 120 56 Q 126 36 133 54" stroke="#2E2060" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M 138 46 Q 140 28 144 44" stroke="#2E2060" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M 156 52 Q 165 34 170 52" stroke="#2E2060" stroke-width="8" fill="none" stroke-linecap="round"/>

  <!-- TEXTO: CLIMBI en morado oscuro -->
  <text x="295" y="188"
    font-family="Arial Black, Impact, sans-serif"
    font-size="128"
    font-weight="900"
    fill="#2E2060"
    letter-spacing="-2">CLIMBI</text>

  <!-- TEXTO: FY en teal -->
  <text x="727" y="188"
    font-family="Arial Black, Impact, sans-serif"
    font-size="128"
    font-weight="900"
    fill="#00C2A8"
    letter-spacing="-2">FY</text>
</svg>`

async function generate() {
  await sharp(Buffer.from(logoLightSVG))
    .resize(900, 280)
    .png()
    .toFile(path.join(ASSETS, 'logo-climbify-light.png'))
  console.log('✅ logo-climbify-light.png (para tema claro)')
}

generate().catch(console.error)

