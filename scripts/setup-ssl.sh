#!/bin/bash
# ============================================
# Setup Nginx + SSL for 0xSlither
# Run this AFTER droplet-setup.sh
# ============================================

set -e

DOMAIN="0xslither.yuvrajlakhotia.me"

echo "🔒 Setting up Nginx + SSL for $DOMAIN"
echo "======================================"

# Install Nginx and Certbot
echo "Installing Nginx and Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Create initial HTTP-only Nginx config
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/slither << NGINXEOF
# HTTP server - will be auto-configured by Certbot for HTTPS
server {
    listen 80;
    server_name $DOMAIN;

    # Serve frontend static files
    root /opt/0xSlither/client/dist;
    index index.html;

    # WebSocket endpoint
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Frontend routes (SPA fallback)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/slither /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test HTTP config
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate (this will auto-add HTTPS config)
echo ""
echo "Getting SSL certificate from Let's Encrypt..."
echo "Certbot will automatically configure HTTPS and add redirect from HTTP."
echo ""
read -p "Enter your email for SSL certificate notifications: " EMAIL
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Update firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

echo ""
echo "✅ Setup Complete!"
echo ""
echo "🎮 Your game is now live at:"
echo "   https://$DOMAIN"
echo ""
echo "To deploy updates, run from your local machine:"
echo "   ./scripts/deploy.sh"

