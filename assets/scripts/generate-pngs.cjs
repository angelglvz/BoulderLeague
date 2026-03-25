/**
 * Genera todos los assets PNG de Climbify desde SVG
 * Uso: node assets/scripts/generate-pngs.cjs
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ASSETS = path.join(__dirname, '..')

// ── SVGs ────────────────────────────────────────────────────────────────────

const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6B5CE7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B8FE8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#bg)"/>

  <!-- Orejas del mono -->
  <ellipse cx="232" cy="490" rx="85" ry="85" fill="white"/>
  <ellipse cx="232" cy="490" rx="58" ry="58" fill="#3D2F8F"/>
  <ellipse cx="792" cy="490" rx="85" ry="85" fill="white"/>
  <ellipse cx="792" cy="490" rx="58" ry="58" fill="#3D2F8F"/>

  <!-- Cabeza oscura del mono -->
  <ellipse cx="512" cy="460" rx="265" ry="275" fill="#2E2060"/>

  <!-- Cara interior (más clara) -->
  <ellipse cx="512" cy="565" rx="205" ry="215" fill="#F0ECFF"/>

  <!-- Morro -->
  <ellipse cx="512" cy="645" rx="115" ry="83" fill="white"/>

  <!-- Ojos blancos -->
  <ellipse cx="440" cy="495" rx="48" ry="52" fill="white"/>
  <ellipse cx="584" cy="495" rx="48" ry="52" fill="white"/>
  <!-- Pupilas -->
  <circle cx="448" cy="500" r="30" fill="#2E2060"/>
  <circle cx="592" cy="500" r="30" fill="#2E2060"/>
  <!-- Brillos en ojos -->
  <circle cx="459" cy="487" r="10" fill="white"/>
  <circle cx="603" cy="487" r="10" fill="white"/>

  <!-- Nariz -->
  <ellipse cx="512" cy="585" rx="30" ry="21" fill="#2E2060"/>
  <ellipse cx="499" cy="586" rx="10" ry="8" fill="#1a1040"/>
  <ellipse cx="525" cy="586" rx="10" ry="8" fill="#1a1040"/>

  <!-- Sonrisa -->
  <path d="M 445 622 Q 512 682 579 622" stroke="#2E2060" stroke-width="11" fill="none" stroke-linecap="round"/>

  <!-- Pelo / flequillo -->
  <path d="M 295 375 Q 340 285 440 315 Q 458 255 512 262 Q 566 255 584 315 Q 684 285 729 375" fill="#2E2060"/>
  <path d="M 418 282 Q 438 228 478 260" stroke="#2E2060" stroke-width="20" fill="none" stroke-linecap="round"/>
  <path d="M 508 258 Q 510 200 520 242" stroke="#2E2060" stroke-width="20" fill="none" stroke-linecap="round"/>
  <path d="M 558 272 Q 588 220 602 258" stroke="#2E2060" stroke-width="20" fill="none" stroke-linecap="round"/>
</svg>`

// Logo horizontal: cara + CLIMBIFY
const logoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="380" viewBox="0 0 1200 380">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#5B4CD7;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#6B5CE7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2B82E0;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fondo del banner (forma de escudo/banner) -->
  <path d="M 60 0 L 1200 0 L 1200 380 L 60 380 Q 0 380 0 310 L 0 70 Q 0 0 60 0 Z" fill="url(#bannerBg)"/>

  <!-- Cara del mono - borde exterior blanco -->
  <circle cx="195" cy="190" r="162" fill="white"/>

  <!-- Orejas del mono -->
  <ellipse cx="45" cy="168" rx="46" ry="46" fill="white"/>
  <ellipse cx="45" cy="168" rx="30" ry="30" fill="#2E2060"/>
  <ellipse cx="345" cy="168" rx="46" ry="46" fill="white"/>
  <ellipse cx="345" cy="168" rx="30" ry="30" fill="#2E2060"/>

  <!-- Cabeza oscura -->
  <ellipse cx="195" cy="172" rx="145" ry="150" fill="#2E2060"/>

  <!-- Cara interior -->
  <ellipse cx="195" cy="225" rx="108" ry="112" fill="#F0ECFF"/>

  <!-- Morro -->
  <ellipse cx="195" cy="261" rx="62" ry="45" fill="white"/>

  <!-- Ojos blancos -->
  <ellipse cx="158" cy="192" rx="26" ry="28" fill="white"/>
  <ellipse cx="232" cy="192" rx="26" ry="28" fill="white"/>
  <!-- Pupilas -->
  <circle cx="162" cy="195" r="16" fill="#2E2060"/>
  <circle cx="236" cy="195" r="16" fill="#2E2060"/>
  <!-- Brillos -->
  <circle cx="167" cy="188" r="6" fill="white"/>
  <circle cx="241" cy="188" r="6" fill="white"/>

  <!-- Nariz -->
  <ellipse cx="195" cy="234" rx="16" ry="11" fill="#2E2060"/>
  <ellipse cx="188" cy="235" rx="5" ry="4" fill="#1a1040"/>
  <ellipse cx="202" cy="235" rx="5" ry="4" fill="#1a1040"/>

  <!-- Sonrisa -->
  <path d="M 163 252 Q 195 278 227 252" stroke="#2E2060" stroke-width="6" fill="none" stroke-linecap="round"/>

  <!-- Pelo -->
  <path d="M 88 130 Q 108 78 162 100 Q 175 65 195 68 Q 215 65 228 100 Q 282 78 302 130" fill="#2E2060"/>
  <path d="M 162 78 Q 170 50 180 72" stroke="#2E2060" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M 193 65 Q 196 40 200 62" stroke="#2E2060" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M 222 74 Q 232 48 238 70" stroke="#2E2060" stroke-width="10" fill="none" stroke-linecap="round"/>

  <!-- TEXTO: CLIMBI en blanco -->
  <text x="390" y="258"
    font-family="Arial Black, Impact, sans-serif"
    font-size="172"
    font-weight="900"
    fill="white"
    letter-spacing="-3">CLIMBI</text>

  <!-- TEXTO: FY en teal -->
  <text x="970" y="258"
    font-family="Arial Black, Impact, sans-serif"
    font-size="172"
    font-weight="900"
    fill="#00C2A8"
    letter-spacing="-3">FY</text>
</svg>`

// ── Generar PNGs ────────────────────────────────────────────────────────────

async function generate() {
  console.log('🎨 Generando assets de Climbify...\n')

  // 1. icon.png (1024x1024) — icono de la app
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon.png'))
  console.log('✅ icon.png (1024x1024)')

  // 2. splash-icon.png (1024x1024) — splash screen
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'))
  console.log('✅ splash-icon.png (1024x1024)')

  // 3. favicon.png (64x64)
  await sharp(Buffer.from(iconSVG))
    .resize(64, 64)
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'))
  console.log('✅ favicon.png (64x64)')

  // 4. android-icon-foreground.png (1024x1024, sin fondo)
  // Para el icono adaptativo de Android, usamos la cara sin fondo
  const monoIconSVG = iconSVG.replace(
    'fill="url(#bg)"',
    'fill="transparent"'
  )
  await sharp(Buffer.from(monoIconSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'android-icon-foreground.png'))
  console.log('✅ android-icon-foreground.png (1024x1024)')

  // 5. android-icon-background.png — fondo sólido del degradado
  const bgSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <defs>
      <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6B5CE7"/>
        <stop offset="100%" style="stop-color:#3B8FE8"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg2)"/>
  </svg>`
  await sharp(Buffer.from(bgSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'android-icon-background.png'))
  console.log('✅ android-icon-background.png (1024x1024)')

  // 6. android-icon-monochrome.png — versión monocromo
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .grayscale()
    .png()
    .toFile(path.join(ASSETS, 'android-icon-monochrome.png'))
  console.log('✅ android-icon-monochrome.png (1024x1024)')

  // 7. logo-climbify.png (1200x380) — logo para pantalla principal
  await sharp(Buffer.from(logoSVG))
    .resize(1200, 380)
    .png()
    .toFile(path.join(ASSETS, 'logo-climbify.png'))
  console.log('✅ logo-climbify.png (1200x380)')

  // 8. logo-climbify-dark.png (versión oscura para tema claro)
  const logoDarkSVG = logoSVG
    .replace(/fill="white"/g, 'fill="#2E2060"')
    .replace('fill="url(#bannerBg)"', 'fill="transparent"')
    .replace('fill="#F0ECFF"', 'fill="#EEE8FF"')
    .replace(/fill="#2E2060"/g, 'fill="#3D2F8F"')

  // Logo sobre fondo claro: texto en primario
  const logoLightBgSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="380" viewBox="0 0 1200 380">
    <rect width="1200" height="380" fill="transparent"/>
    ${logoSVG.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </svg>`

  console.log('\n🎉 Todos los assets generados en /assets/')
  console.log('\n📋 Archivos creados:')
  console.log('   icon.png, splash-icon.png, favicon.png')
  console.log('   android-icon-foreground.png, android-icon-background.png, android-icon-monochrome.png')
  console.log('   logo-climbify.png')
}

generate().catch(console.error)

