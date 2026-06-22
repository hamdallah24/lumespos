#!/bin/bash
set -e

echo "============================================"
echo "  🚀 Deploy Lume's Everywhere POS"
echo "  IP: 43.157.227.205"
echo "============================================"
echo ""

# 1. Update system
echo "[1/9] 📦 Updating system..."
sudo apt update -y && sudo apt upgrade -y

# 2. Install Node.js 20.x
echo "[2/9] 📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "   Node.js $(node -v) | npm $(npm -v)"

# 3. Enable pnpm via corepack
echo "[3/9] 📦 Installing pnpm..."
sudo corepack enable
corepack prepare pnpm@latest --activate
echo "   pnpm $(pnpm -v)"

# 4. Install PM2
echo "[4/9] 📦 Installing PM2..."
sudo npm install -g pm2

# 5. Install nginx
echo "[5/9] 📦 Installing nginx..."
sudo apt install nginx -y

# 6. Navigate to project
echo "[6/9] 📁 Installing dependencies..."
cd ~/Point-Of-Sale
pnpm install

# 7. Build everything
echo "[7/9] 🔨 Building project (libs → api → frontend)..."
pnpm run build
echo "   Build complete!"

# 8. Setup nginx
echo "[8/9] 🌐 Configuring nginx..."
sudo tee /etc/nginx/sites-available/pos > /dev/null << 'NGINX'
server {
    listen 80;
    server_name 43.157.227.205;

    # Frontend static files
    root /home/ubuntu/Point-Of-Sale/artifacts/pos-app/dist;
    index index.html;

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

# 9. Start API with PM2
echo "[9/9] 🚀 Starting API server..."
pm2 delete pos-api 2>/dev/null || true
pm2 start artifacts/api-server/dist/index.mjs --name pos-api \
  --cwd /home/ubuntu/Point-Of-Sale \
  --node-opt="--enable-source-maps"
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
