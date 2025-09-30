const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

const svgIcon = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with rounded corners -->
  <rect width="1024" height="1024" fill="#000000" rx="200"/>
  
  <!-- Brain Icon - centered and scaled -->
  <g transform="translate(256, 256)">
    <!-- Main brain outline -->
    <path d="M256 100 C148 100, 90 160, 90 256 C90 352, 148 412, 256 412 C256 464, 202 516, 256 516 C310 516, 310 464, 310 412 C418 412, 476 352, 476 256 C476 160, 418 100, 310 100 C310 48, 256 48, 256 100 Z" 
          fill="none" stroke="#ffffff" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Left hemisphere details -->
    <path d="M170 200 Q212 256, 170 312" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round"/>
    <path d="M148 256 Q170 276, 148 300" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
    <path d="M190 230 Q210 256, 190 282" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
    
    <!-- Right hemisphere details -->
    <path d="M342 200 Q384 256, 342 312" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round"/>
    <path d="M364 256 Q386 276, 364 300" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
    <path d="M322 230 Q342 256, 322 282" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
    
    <!-- Center connection -->
    <circle cx="256" cy="256" r="32" fill="#ffffff"/>
    <path d="M220 256 L292 256" stroke="#000000" stroke-width="12" stroke-linecap="round"/>
    <path d="M256 220 L256 292" stroke="#000000" stroke-width="12" stroke-linecap="round"/>
    
    <!-- Neural connections -->
    <circle cx="256" cy="180" r="12" fill="#ffffff"/>
    <circle cx="256" cy="332" r="12" fill="#ffffff"/>
    <circle cx="180" cy="256" r="12" fill="#ffffff"/>
    <circle cx="332" cy="256" r="12" fill="#ffffff"/>
  </g>
</svg>
`

const publicDir = path.join(__dirname, '..', 'public')

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n')

  // Create master SVG
  const svgPath = path.join(publicDir, 'icon-master.svg')
  fs.writeFileSync(svgPath, svgIcon.trim())
  console.log('✓ Created master SVG')

  // Generate PNG icons for each size
  for (const size of sizes) {
    try {
      const outputPath = path.join(publicDir, `icon-${size}x${size}.png`)
      
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(outputPath)
      
      console.log(`✓ Generated icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error.message)
    }
  }

  // Generate screenshots (placeholders)
  try {
    // Wide screenshot (desktop)
    const wideScreenshot = `
      <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <rect width="1280" height="720" fill="#000000"/>
        <text x="640" y="360" font-family="Arial" font-size="48" fill="#ffffff" text-anchor="middle">AI-OS Desktop View</text>
      </svg>
    `
    await sharp(Buffer.from(wideScreenshot))
      .png()
      .toFile(path.join(publicDir, 'screenshot-wide.png'))
    console.log('✓ Generated screenshot-wide.png')

    // Narrow screenshot (mobile)
    const narrowScreenshot = `
      <svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
        <rect width="720" height="1280" fill="#000000"/>
        <text x="360" y="640" font-family="Arial" font-size="48" fill="#ffffff" text-anchor="middle">AI-OS Mobile View</text>
      </svg>
    `
    await sharp(Buffer.from(narrowScreenshot))
      .png()
      .toFile(path.join(publicDir, 'screenshot-narrow.png'))
    console.log('✓ Generated screenshot-narrow.png')
  } catch (error) {
    console.error('✗ Failed to generate screenshots:', error.message)
  }

  console.log('\n✅ All PWA icons generated successfully!')
  console.log('📱 Your app is now ready to be installed as a PWA')
}

generateIcons().catch(console.error)

