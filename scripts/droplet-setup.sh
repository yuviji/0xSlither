#!/bin/bash
# ============================================
# 0xSlither - DigitalOcean Droplet Setup
# Run this after SSHing into your new Droplet
# ============================================

set -e  # Exit on error

echo "🐍 0xSlither Server Setup"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Update system
echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
echo -e "${YELLOW}[2/7] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install pnpm
echo -e "${YELLOW}[3/7] Installing pnpm...${NC}"
sudo npm install -g pnpm

# 4. Install PM2 for process management
echo -e "${YELLOW}[4/7] Installing PM2...${NC}"
sudo npm install -g pm2

# 5. Create app directory
echo -e "${YELLOW}[5/7] Setting up application directory...${NC}"
sudo mkdir -p /opt
cd /opt

# 6. Clone from GitHub
echo -e "${YELLOW}[6/7] Cloning repository...${NC}"
git clone https://github.com/yuviji/0xSlither.git

# Set ownership
sudo chown -R $USER:$USER /opt/0xSlither
cd /opt/0xSlither

# 7. Create server/.env file
echo -e "${YELLOW}[7/7] Setting up environment variables...${NC}"
cat > /opt/0xSlither/server/.env << 'ENVEOF'
USE_BASE_MAINNET=true
PORT=8080
SERVER_PRIVATE_KEY=YOUR_SERVER_PRIVATE_KEY_HERE
BASE_STAKE_ARENA_ADDRESS=0x276A6A0589A2D64EaD0E8F878cBE9F9C81642634
BASE_RPC_URL=https://mainnet.base.org
BASE_EXPLORER_URL=https://basescan.org
BASE_CHAIN_ID=8453
BASE_SEPOLIA_STAKE_ARENA_ADDRESS=0xD8C23A3BCE3c9608aB437FB720e8b63eD321fBd3
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_EXPLORER_URL=https://sepolia.basescan.org
BASE_SEPOLIA_CHAIN_ID=84532
ENVEOF

echo ""
echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ⚠️  IMPORTANT: You MUST add your SERVER_PRIVATE_KEY!       ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Run: nano /opt/0xSlither/server/.env"
echo "Replace: YOUR_SERVER_PRIVATE_KEY_HERE"
echo ""
read -p "Press Enter after you've added your private key..."

# Create client/.env for production build
echo -e "${YELLOW}Creating client environment...${NC}"
cat > /opt/0xSlither/client/.env << 'ENVEOF'
VITE_WSS_URL=wss://0xslither.yuvrajlakhotia.me/ws
VITE_USE_BASE_MAINNET=true
VITE_BASE_STAKE_ARENA_ADDRESS=0x276A6A0589A2D64EaD0E8F878cBE9F9C81642634
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_BASE_EXPLORER_URL=https://basescan.org
VITE_BASE_CHAIN_ID=8453
VITE_BASE_SEPOLIA_STAKE_ARENA_ADDRESS=0xD8C23A3BCE3c9608aB437FB720e8b63eD321fBd3
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_BASE_SEPOLIA_EXPLORER_URL=https://sepolia.basescan.org
VITE_BASE_SEPOLIA_CHAIN_ID=84532
ENVEOF

# Install dependencies and build
echo -e "${YELLOW}Installing dependencies...${NC}"
cd /opt/0xSlither
pnpm install

echo -e "${YELLOW}Building shared package...${NC}"
pnpm build:shared

echo -e "${YELLOW}Building server...${NC}"
pnpm build:server

echo -e "${YELLOW}Building client...${NC}"
pnpm build:client

# Setup PM2
echo -e "${YELLOW}Configuring PM2...${NC}"
cat > /opt/0xSlither/ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'slither-server',
    cwd: '/opt/0xSlither/server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/opt/0xSlither/logs/error.log',
    out_file: '/opt/0xSlither/logs/out.log',
    merge_logs: true,
    time: true,
  }]
};
PM2EOF

# Create logs directory
mkdir -p /opt/0xSlither/logs

# Start the server
echo -e "${YELLOW}Starting server with PM2...${NC}"
cd /opt/0xSlither
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | sudo bash

# Setup firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8080/tcp  # WebSocket
sudo ufw --force enable

echo ""
echo -e "${GREEN}✅ Backend Setup Complete!${NC}"
echo ""
echo "Game server running on port 8080"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check server status"
echo "  pm2 logs slither-server - View logs"
echo "  pm2 restart slither-server - Restart server"
echo ""
echo -e "${YELLOW}Next step: Setup SSL + Nginx to serve frontend${NC}"
echo "  cd /opt/0xSlither && ./scripts/setup-ssl.sh"
echo ""
echo "After SSL setup, your game will be live at:"
echo "  https://0xslither.yuvrajlakhotia.me"

