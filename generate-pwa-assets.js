import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  const publicDir = path.resolve('public');
  const svgPath = path.join(publicDir, 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating 192x192 and 512x512 PNG icons...');

  // 1. Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192x192.png'));

  // 2. Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512x512.png'));

  // 3. Generate 192x192 Maskable PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192x192-maskable.png'));

  // 4. Generate 512x512 Maskable PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512x512-maskable.png'));

  console.log('Generating PWA screenshots...');

  // 5. Mobile Screenshot (720x1280)
  const mobileSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
    <rect width="720" height="1280" fill="#12060c"/>
    <rect x="0" y="0" width="720" height="80" fill="#1e0714"/>
    <text x="50" y="52" fill="#ffa8bf" font-family="sans-serif" font-size="28" font-weight="bold">Wakey Wakey</text>
    <rect x="40" y="120" width="640" height="180" rx="20" fill="#220a18" stroke="#3b122b" stroke-width="2"/>
    <text x="70" y="170" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="bold">Downtown Central Station</text>
    <text x="70" y="210" fill="#ffa8bf" font-family="monospace" font-size="16">0.8 km away &#8226; ETA 4 mins</text>
    <rect x="520" y="160" width="120" height="50" rx="25" fill="#e85d7f"/>
    <text x="580" y="192" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">ACTIVE</text>
    
    <rect x="40" y="330" width="640" height="500" rx="24" fill="#180510" stroke="#3b122b" stroke-width="2"/>
    <circle cx="360" cy="560" r="160" fill="none" stroke="#ffa8bf" stroke-width="2" stroke-dasharray="8 8" opacity="0.4"/>
    <circle cx="360" cy="560" r="90" fill="none" stroke="#e85d7f" stroke-width="3" opacity="0.6"/>
    <circle cx="360" cy="560" r="16" fill="#e85d7f"/>
    <text x="360" y="630" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">Location Radar Tracking</text>
    <text x="360" y="660" fill="#b88c9f" font-family="monospace" font-size="14" text-anchor="middle">GPS Background Geo-fence Enabled</text>

    <rect x="40" y="860" width="640" height="140" rx="20" fill="#220a18" stroke="#3b122b" stroke-width="2"/>
    <text x="70" y="910" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold">Airport Terminal 2</text>
    <text x="70" y="945" fill="#ffa8bf" font-family="monospace" font-size="16">14.2 km away • Ring buffer: 1.5km</text>
  </svg>`;

  await sharp(Buffer.from(mobileSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));

  // 6. Wide / Desktop Screenshot (1280x720)
  const wideSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <rect width="1280" height="720" fill="#12060c"/>
    <rect x="0" y="0" width="1280" height="70" fill="#1e0714"/>
    <text x="60" y="45" fill="#ffa8bf" font-family="sans-serif" font-size="28" font-weight="bold">Wakey Wakey - Location-Based Transit Alarm</text>
    
    <!-- Left Column Alarms -->
    <rect x="60" y="110" width="480" height="160" rx="20" fill="#220a18" stroke="#3b122b" stroke-width="2"/>
    <text x="90" y="160" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold">Downtown Central Station</text>
    <text x="90" y="195" fill="#ffa8bf" font-family="monospace" font-size="15">0.8 km remaining • Geofence 500m</text>
    
    <rect x="60" y="295" width="480" height="160" rx="20" fill="#220a18" stroke="#3b122b" stroke-width="2"/>
    <text x="90" y="345" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold">Airport Express Terminal</text>
    <text x="90" y="380" fill="#ffa8bf" font-family="monospace" font-size="15">14.2 km remaining • Geofence 1.5km</text>

    <rect x="60" y="480" width="480" height="160" rx="20" fill="#220a18" stroke="#3b122b" stroke-width="2"/>
    <text x="90" y="530" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold">University Main Gate</text>
    <text x="90" y="565" fill="#ffa8bf" font-family="monospace" font-size="15">3.1 km remaining • Geofence 800m</text>

    <!-- Right Column Map Radar -->
    <rect x="570" y="110" width="650" height="530" rx="24" fill="#180510" stroke="#3b122b" stroke-width="2"/>
    <circle cx="895" cy="360" r="180" fill="none" stroke="#ffa8bf" stroke-width="2" stroke-dasharray="8 8" opacity="0.4"/>
    <circle cx="895" cy="360" r="110" fill="none" stroke="#e85d7f" stroke-width="3" opacity="0.6"/>
    <circle cx="895" cy="360" r="18" fill="#e85d7f"/>
    <text x="895" y="440" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">Live GPS Destination Radar</text>
    <text x="895" y="475" fill="#ffa8bf" font-family="monospace" font-size="16" text-anchor="middle">Real-Time Distance &amp; Background Wake Alerts</text>
  </svg>`;

  await sharp(Buffer.from(wideSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-wide.png'));

  console.log('All PWA icons and screenshots generated successfully!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
