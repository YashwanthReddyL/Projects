#!/usr/bin/env bash
# deploy.sh
# =========
# Run from your LAPTOP (not the EC2 instance) to deploy the full app.
# Builds the frontend, syncs all files to EC2, installs deps, restarts services.
#
# Usage:
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh --host <EC2_PUBLIC_IP> --key ~/.ssh/your-key.pem
#
# After first deploy, subsequent ones are faster (rsync only sends changes).

set -e

# ── Parse args ────────────────────────────────────────────────────────────────
EC2_HOST=""
SSH_KEY=""
EC2_USER="ubuntu"
REMOTE_DIR="/opt/ipl-explorer"
SKIP_FRONTEND=false
SKIP_PIPELINE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --host)    EC2_HOST="$2";    shift ;;
        --key)     SSH_KEY="$2";     shift ;;
        --user)    EC2_USER="$2";    shift ;;
        --skip-frontend) SKIP_FRONTEND=true ;;
        --skip-pipeline) SKIP_PIPELINE=true ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
    shift
done

if [[ -z "$EC2_HOST" || -z "$SSH_KEY" ]]; then
    echo "Usage: ./deploy/deploy.sh --host <EC2_IP> --key <path/to/key.pem>"
    echo ""
    echo "Options:"
    echo "  --skip-frontend   Skip npm build (use if only backend changed)"
    echo "  --skip-pipeline   Skip CSV regeneration (use if data unchanged)"
    exit 1
fi

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST"
RSYNC="rsync -az --progress -e \"ssh -i $SSH_KEY -o StrictHostKeyChecking=no\""

echo "======================================"
echo "  IPL Explorer — Deploy"
echo "  Target: $EC2_USER@$EC2_HOST"
echo "======================================"

# ── Step 1: Build frontend locally ────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
    echo ""
    echo "Step 1/5 — Building frontend..."
    cd frontend
    npm install --silent
    npm run build
    cd ..
    echo "  Build output: frontend/dist/"
else
    echo ""
    echo "Step 1/5 — Skipping frontend build (--skip-frontend)"
fi

# ── Step 2: Sync files to EC2 ─────────────────────────────────────────────────
echo ""
echo "Step 2/5 — Syncing files to EC2..."

# Backend
eval "$RSYNC \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    backend/ $EC2_USER@$EC2_HOST:$REMOTE_DIR/backend/"

# Frontend build output
if [ "$SKIP_FRONTEND" = false ]; then
    eval "$RSYNC \
        frontend/dist/ $EC2_USER@$EC2_HOST:$REMOTE_DIR/frontend/dist/"
fi

# Pipeline scripts
eval "$RSYNC \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    pipeline/ $EC2_USER@$EC2_HOST:$REMOTE_DIR/pipeline/"

# Tests
eval "$RSYNC \
    --exclude '__pycache__' \
    tests/ $EC2_USER@$EC2_HOST:$REMOTE_DIR/tests/"

# Data — raw YAMLs (large, only if needed)
if [ "$SKIP_PIPELINE" = false ]; then
    echo "  Syncing raw YAML files (this may take a while on first run)..."
    eval "$RSYNC \
        data/raw/ $EC2_USER@$EC2_HOST:$REMOTE_DIR/data/raw/"
fi

echo "  Files synced"

# ── Step 3: Remote setup ──────────────────────────────────────────────────────
echo ""
echo "Step 3/5 — Installing dependencies and running pipeline on EC2..."

$SSH << REMOTE_COMMANDS
set -e

cd $REMOTE_DIR

# Install Python dependencies
echo "  Installing Python packages..."
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r backend/requirements.txt gunicorn

# Run pipeline if raw data was synced
if [ "$(ls -A data/raw/ 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "  Running data pipeline..."
    .venv/bin/python pipeline/ipl_yaml_to_csv.py \
        --input data/raw \
        --output data/processed
    .venv/bin/python pipeline/build_indexes.py \
        --processed data/processed \
        --raw data/raw
    echo "  Pipeline complete"
else
    echo "  No raw data found — skipping pipeline"
fi

echo "  Remote setup done"
REMOTE_COMMANDS

# ── Step 4: Push .env file ────────────────────────────────────────────────────
echo ""
echo "Step 4/5 — Pushing .env to EC2..."

if [ -f "backend/.env" ]; then
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
        backend/.env \
        "$EC2_USER@$EC2_HOST:$REMOTE_DIR/backend/.env"
    echo "  .env pushed"
else
    echo "  WARNING: backend/.env not found locally."
    echo "  The chatbot will not work without ANTHROPIC_API_KEY."
    echo "  Create it and re-run deploy, or set it manually on EC2:"
    echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_HOST"
    echo "  nano /opt/ipl-explorer/backend/.env"
fi

# ── Step 5: Restart services ──────────────────────────────────────────────────
echo ""
echo "Step 5/5 — Restarting services..."

$SSH << RESTART_COMMANDS
set -e

# Restart backend
sudo systemctl restart ipl-backend
sleep 3

# Verify it started
if sudo systemctl is-active --quiet ipl-backend; then
    echo "  ipl-backend: running"
else
    echo "  ERROR: ipl-backend failed to start. Checking logs..."
    sudo journalctl -u ipl-backend --no-pager -n 30
    exit 1
fi

# Reload Nginx (picks up any config changes)
sudo systemctl reload nginx
echo "  nginx: reloaded"

# Health check
sleep 2
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
if [ "$STATUS" = "200" ]; then
    echo "  Health check: OK"
else
    echo "  WARNING: Health check returned HTTP $STATUS"
fi

RESTART_COMMANDS

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "  Deploy complete!"
echo ""
echo "  App running at: http://$EC2_HOST"
echo "  API docs:       http://$EC2_HOST/api/docs"  
echo "  Health:         http://$EC2_HOST/health"
echo ""
echo "  Monitor logs:"
echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_HOST"
echo "  sudo journalctl -u ipl-backend -f"
echo "======================================"
