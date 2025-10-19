// Generate simple SVG-based PNG icons for PWA
// This creates placeholder icons - replace with proper logo later

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  // Create SVG with JKUAT branding
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.2}"/>

  <!-- Icon content - "JK" text -->
  <text
    x="50%"
    y="50%"
    font-family="Arial, sans-serif"
    font-size="${size * 0.4}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central">
    JK
  </text>

  <!-- Book icon outline at bottom -->
  <rect
    x="${size * 0.3}"
    y="${size * 0.7}"
    width="${size * 0.4}"
    height="${size * 0.2}"
    fill="none"
    stroke="white"
    stroke-width="${size * 0.04}"/>
  <line
    x1="${size * 0.5}"
    y1="${size * 0.7}"
    x2="${size * 0.5}"
    y2="${size * 0.9}"
    stroke="white"
    stroke-width="${size * 0.04}"/>
</svg>`;

  // Write SVG file (browsers will render it)
  const filename = `icon-${size}x${size}.png.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✓ Created ${filename}`);
});

// Also create a favicon.ico placeholder (SVG)
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#2563eb" rx="6"/>
  <text
    x="50%"
    y="50%"
    font-family="Arial, sans-serif"
    font-size="16"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central">
    JK
  </text>
</svg>`;

fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), faviconSvg);
console.log('✓ Created favicon.svg');

console.log('\n✨ Icon generation complete!');
console.log('📝 Note: These are placeholder icons. Replace with actual logo PNGs later.');
