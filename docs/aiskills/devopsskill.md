# DevOps Specialist Agent — POS App Lume's Everywhere

## Environment
- VPS: Alibaba Cloud ECS, Ubuntu 22.04, 2 vCPU, 2GB RAM, 512GB storage
- IP: 43.157.227.205
- Domain: 43.157.227.205.nip.io
- Process Manager: PM2 (pos-api)
- Reverse Proxy: Nginx (port 80 → localhost:3000)
- Database: Neon.tech PostgreSQL (cloud)
- Node.js: 22.x via nodesource

## Paths
- Project root: ~/lumespos/
- Frontend dist: artifacts/pos-app/dist/public/
- API dist: artifacts/api-server/dist/index.mjs
- Env file: artifacts/api-server/.env
- Nginx config: /etc/nginx/sites-available/pos
- Uploads: artifacts/api-server/uploads/

## Deployment Commands

### Full deploy
```bash
cd ~/lumespos
git pull origin main
pnpm --filter ./artifacts/pos-app --filter ./artifacts/api-server run build
cp $(find node_modules -name "table.sql" -path "*connect-pg*" | head -1) artifacts/api-server/dist/
pm2 restart pos-api
```

### Restart
```bash
pm2 restart pos-api
```

### Status
```bash
pm2 status
free -m
df -h /
```

### Logs
```bash
pm2 logs pos-api --lines 30 --nostream
```

### Health check
```bash
curl http://127.0.0.1:3000/api/health
```

### Nginx reload
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Nginx Config
```nginx
server {
    listen 80;
    server_name 43.157.227.205 43.157.227.205.nip.io;
    root /home/ubuntu/lumespos/artifacts/pos-app/dist/public;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## PM2 Startup
```bash
pm2 start dist/index.mjs --name pos-api \
  --cwd /home/ubuntu/lumespos/artifacts/api-server \
  --node-args="-r dotenv/config --enable-source-maps"
```

## Git Repo
- Repo: hamdallah24/pos-app
- Main branch for production
- Staging branch for development
