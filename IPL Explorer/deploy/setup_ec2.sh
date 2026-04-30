#!/usr/bin/env bash
# setup_ec2.sh
# ============
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance.
# It installs all system dependencies, sets up the project
# directory structure, and configures Nginx + systemd.
#
# Usage (from your laptop):
#   ssh -i your-key.pem ubuntu@<EC2_IP> "bash -s" < deploy/setup_ec2.sh
#
# Or copy it to the instance and run directly:
#   chmod +x setup_ec2.sh && ./setup_ec2.sh

set -e
echo "======================================"
echo "  IPL Explorer — EC2 Setup"
echo "======================================"

# ── 1. System packages ────────────────────────────────────────────────────────
echo ""
echo "Step 1/7 — Installing system packages..."
sudo apt-get update -q
sudo apt-get install -y -q \
    python3.11 \
    python3.11-venv \
    python3-pip \
    nginx \
    git \
    curl \
    unzip \
    htop

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
echo ""
echo "Step 2/7 — Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -q
sudo apt-get install -y -q nodejs
node --version
npm --version

# ── 3. Project directory ──────────────────────────────────────────────────────
echo ""
echo "Step 3/7 — Creating project directory..."
sudo mkdir -p /opt/ipl-explorer
sudo chown ubuntu:ubuntu /opt/ipl-explorer
mkdir -p /opt/ipl-explorer/{data/raw,data/processed,backend,frontend,pipeline,deploy,tests}
echo "  Project root: /opt/ipl-explorer"

# ── 4. Python virtual environment ─────────────────────────────────────────────
echo ""
echo "Step 4/7 — Creating Python virtual environment..."
python3.11 -m venv /opt/ipl-explorer/.venv
echo "  Venv: /opt/ipl-explorer/.venv"

# ── 5. Nginx configuration ────────────────────────────────────────────────────
echo ""
echo "Step 5/7 — Configuring Nginx..."
sudo tee /etc/nginx/sites-available/ipl-explorer > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    # ── React frontend (static files) ─────────────────────────────────────
    root /opt/ipl-explorer/frontend/dist;
    index index.html;

    # Serve static assets with long cache headers
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ── FastAPI backend (proxy) ────────────────────────────────────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Timeouts — chatbot responses can take a few seconds
        proxy_read_timeout  120s;
        proxy_send_timeout  120s;
        proxy_connect_timeout 10s;
    }

    # Health check endpoint (no auth needed)
    location /health {
        proxy_pass http://127.0.0.1:8000;
    }

    # ── SPA fallback — all other routes serve index.html ──────────────────
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
NGINX_CONF

# Enable site
sudo ln -sf /etc/nginx/sites-available/ipl-explorer /etc/nginx/sites-enabled/ipl-explorer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "  Nginx configured and started"

# ── 6. systemd service ────────────────────────────────────────────────────────
echo ""
echo "Step 6/7 — Creating systemd service..."
sudo tee /etc/systemd/system/ipl-backend.service > /dev/null << 'SYSTEMD_UNIT'
[Unit]
Description=IPL Explorer FastAPI Backend
After=network.target
Wants=network.target

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/ipl-explorer/backend

# Load environment variables from .env file
EnvironmentFile=/opt/ipl-explorer/backend/.env

# Gunicorn with 4 Uvicorn workers
# t3.medium has 2 vCPUs — (2*2)+1 = 5 workers max, use 4 for safety
ExecStart=/opt/ipl-explorer/.venv/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile /var/log/ipl-backend-access.log \
    --error-logfile /var/log/ipl-backend-error.log

# Restart policy
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SYSTEMD_UNIT

# Create log files with correct permissions
sudo touch /var/log/ipl-backend-access.log /var/log/ipl-backend-error.log
sudo chown ubuntu:ubuntu /var/log/ipl-backend-access.log /var/log/ipl-backend-error.log

sudo systemctl daemon-reload
sudo systemctl enable ipl-backend
echo "  systemd service created and enabled"

# ── 7. Firewall ───────────────────────────────────────────────────────────────
echo ""
echo "Step 7/7 — Configuring UFW firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (future)
sudo ufw --force enable
echo "  Firewall: ports 22, 80, 443 open"

echo ""
echo "======================================"
echo "  Setup complete!"
echo ""
echo "  Next: run deploy.sh from your laptop"
echo "  to push the code and start the app."
echo "======================================"
