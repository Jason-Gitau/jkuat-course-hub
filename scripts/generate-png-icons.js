/**
 * Generate PNG icons for PWA
 * This creates proper PNG images instead of SVG for better browser support
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Colors
const bgColor = '#2563eb'; // blue-600
const textColor = '#ffffff';

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PNG icons...\n');

// Try to use canvas (works in Node.js without native deps)
let Canvas;
try {
  Canvas = require('canvas');
  console.log('✓ Using canvas library\n');
} catch (e) {
  console.log('⚠️  canvas not installed. Installing...\n');
  const { execSync } = require('child_process');
  try {
    execSync('npm install canvas', { stdio: 'inherit' });
    Canvas = require('canvas');
    console.log('\n✓ canvas installed successfully\n');
  } catch (installError) {
    console.error('❌ Failed to install canvas');
    console.error('Run manually: npm install canvas');
    process.exit(1);
  }
}

const { createCanvas } = Canvas;

sizes.forEach(size => {
  try {
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background with rounded corners
    const radius = size * 0.2; // 20% radius for rounded corners
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();

    // Add "JK" text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JK', size / 2, size / 2 - size * 0.05);

    // Add book icon at bottom
    const bookWidth = size * 0.4;
    const bookHeight = size * 0.2;
    const bookX = (size - bookWidth) / 2;
    const bookY = size * 0.7;
    const lineWidth = size * 0.04;

    ctx.strokeStyle = textColor;
    ctx.lineWidth = lineWidth;

    // Book outline
    ctx.strokeRect(bookX, bookY, bookWidth, bookHeight);

    // Book spine
    ctx.beginPath();
    ctx.moveTo(size / 2, bookY);
    ctx.lineTo(size / 2, bookY + bookHeight);
    ctx.stroke();

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon-${size}x${size}.png`);
    fs.writeFileSync(filename, buffer);

    console.log(`✓ Generated icon-${size}x${size}.png`);
  } catch (error) {
    console.error(`❌ Error generating ${size}x${size} icon:`, error.message);
  }
});

// Also create favicon.ico-sized PNG (for fallback)
try {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const radius = size * 0.2;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.5}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JK', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(__dirname, '..', 'public', 'favicon.png');
  fs.writeFileSync(filename, buffer);

  console.log(`✓ Generated favicon.png (32x32)`);
} catch (error) {
  console.error(`❌ Error generating favicon.png:`, error.message);
}

console.log('\n✅ All PNG icons generated successfully!');
console.log(`📁 Location: ${iconsDir}`);
