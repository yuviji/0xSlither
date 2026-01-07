#!/bin/bash
# ============================================
# Deploy script for 0xSlither
# 
# Usage:
#   ./scripts/deploy.sh          # Pull from GitHub (default)
#   ./scripts/deploy.sh --local  # Push local files
# ============================================

set -e

SERVER="root@138.197.68.6"
REMOTE_DIR="/opt/0xSlither"

# Check for --local flag
if [ "$1" == "--local" ] || [ "$1" == "-l" ]; then
    echo "🚀 Deploying LOCAL files to $SERVER..."
    
    # Sync local code (excluding node_modules, dist, .env, contracts)
    echo "Syncing files..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '.env' \
        --exclude '.git' \
        --exclude 'contracts' \
        --exclude 'client/node_modules' \
        --exclude 'client/dist' \
        --exclude 'server/node_modules' \
        --exclude 'server/dist' \
        --exclude 'shared/node_modules' \
        --exclude 'shared/dist' \
        ./ $SERVER:$REMOTE_DIR/
else
    echo "🚀 Deploying from GitHub to $SERVER..."
    
    # Pull latest from GitHub
    ssh $SERVER "cd $REMOTE_DIR && git pull"
fi

# Build and restart on remote
echo "Building and restarting..."
ssh $SERVER << 'ENDSSH'
cd /opt/0xSlither
pnpm install
pnpm build:shared
pnpm build:server
pnpm build:client
pm2 restart slither-server
echo ""
echo "✅ Deploy complete!"
echo "🎮 Live at: https://0xslither.yuvrajlakhotia.me"
ENDSSH

