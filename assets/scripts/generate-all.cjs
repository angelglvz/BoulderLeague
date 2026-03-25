/**
 * Regenera todos los assets PNG desde los SVGs oficiales
 * Uso: node assets/scripts/generate-all.cjs
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ASSETS = path.join(__dirname, '..')

const iconSVG = fs.readFileSync(path.join(ASSETS, 'icon.svg'), 'utf8')
const logoLightSVG = fs.readFileSync(path.join(ASSETS, 'logo-climbify-light.svg'), 'utf8')
const logoDarkSVG = fs.readFileSync(path.join(ASSETS, 'logo-climbify-dark.svg'), 'utf8')

async function generate() {
  console.log('🎨 Generando assets PNG...\n')

  // ── Icono app ─────────────────────────────────────────────────────────────

  // icon.png 1024x1024
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon.png'))
  console.log('✅ icon.png (1024x1024)')

  // splash-icon.png 1024x1024
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'))
  console.log('✅ splash-icon.png (1024x1024)')

  // favicon.png 64x64
  await sharp(Buffer.from(iconSVG))
    .resize(64, 64)
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'))
  console.log('✅ favicon.png (64x64)')

  // android-icon-foreground.png (solo la forma, sin fondo)
  const foregroundSVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M180 340 C140 260, 200 160, 300 150 C380 140, 420 220, 360 300 C320 350, 240 380, 180 340 Z"
          fill="white"/>
    <circle cx="300" cy="220" r="14" fill="#7B61FF"/>
  </svg>`
  await sharp(Buffer.from(foregroundSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'android-icon-foreground.png'))
  console.log('✅ android-icon-foreground.png (1024x1024)')

  // android-icon-background.png
  const bgSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7B61FF"/>
        <stop offset="100%" stop-color="#5A3FD6"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
  </svg>`
  await sharp(Buffer.from(bgSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'android-icon-background.png'))
  console.log('✅ android-icon-background.png (1024x1024)')

  // android-icon-monochrome.png
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .grayscale()
    .png()
    .toFile(path.join(ASSETS, 'android-icon-monochrome.png'))
  console.log('✅ android-icon-monochrome.png (1024x1024)')

  // ── Logos ─────────────────────────────────────────────────────────────────

  // logo claro (para tema light)
  await sharp(Buffer.from(logoLightSVG))
    .resize(900, 220)
    .png()
    .toFile(path.join(ASSETS, 'logo-climbify-light.png'))
  console.log('✅ logo-climbify-light.png (900x220)')

  // logo oscuro (para tema dark)
  await sharp(Buffer.from(logoDarkSVG))
    .resize(900, 220)
    .png()
    .toFile(path.join(ASSETS, 'logo-climbify.png'))
  console.log('✅ logo-climbify.png (900x220) — versión dark')

  console.log('\n🎉 Todos los assets generados correctamente.')
}

generate().catch(console.error)

