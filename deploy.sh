#!/bin/bash
set -e

echo "============================================"
echo "  🚀 Deploy Lume's Everywhere POS"
echo "  IP: 43.157.227.205"
echo "============================================"
echo ""

# 1. Update system
echo "[1/8] 📦 Updating system..."
export DEBIAN_FRONTEND=noninteractive
sudo apt update -y && sudo apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# 2. Install Node.js 22.x
echo "[2/8] 📦 Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "   Node.js $(node -v) | npm $(npm -v)"

# 3. Enable pnpm via corepack
echo "[3/8] 📦 Installing pnpm..."
sudo corepack enable
corepack prepare pnpm@latest --activate
echo "   pnpm $(pnpm -v)"

# 4. Install PM2
echo "[4/8] 📦 Installing PM2..."
sudo npm install -g pm2

# 5. Install nginx
echo "[5/9] 📦 Installing nginx..."
sudo apt install nginx -y

# 6. Navigate to project
echo "[6/9] 📁 Installing dependencies..."
cd ~/lumespos
pnpm install

# 7. Build only what's needed
echo "[7/9] 🔨 Building API server..."
pnpm --filter ./artifacts/api-server run build
cp $(find node_modules -name "table.sql" -path "*connect-pg*" | head -1) artifacts/api-server/dist/ 2>/dev/null || true
echo "🔨 Building frontend..."
pnpm --filter ./artifacts/pos-app run build
echo "   Build complete!"

# 8. Setup nginx
echo "[8/9] 🌐 Configuring nginx..."
sudo chmod o+x /home/ubuntu
sudo tee /etc/nginx/sites-available/pos > /dev/null << 'NGINX'
server {
    listen 80;
    server_name 43.157.227.205 43.157.227.205.nip.io;

    root /home/ubuntu/lumespos/artifacts/pos-app/dist/public;
    index index.html;

    # Force Chrome Android to re-validate index.html every load
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Cache assets forever (content-hash in filename)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Access-Control-Allow-Origin "*" always;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
echo "   nginx configured!"

# 9. Install dotenv + Start API with PM2
echo "[9/9] 🚀 Starting API server..."
pnpm add -w dotenv
pm2 delete pos-api 2>/dev/null || true
pm2 start dist/index.mjs --name pos-api \
  --cwd /home/ubuntu/lumespos/artifacts/api-server \
  --node-args="-r dotenv/config --enable-source-maps"
pm2 save
pm2 startup

echo ""
echo "============================================"
echo "  ✅ Deploy Complete!"
echo "============================================"
echo ""
echo "  🌐 http://43.157.227.205"
echo ""
echo "  📋 Next steps:"
echo "  1. Update Google OAuth redirect URI:"
echo "     http://43.157.227.205/auth/google/callback"
echo ""
echo "  2. Buka browser ke http://43.157.227.205"
echo "============================================"
