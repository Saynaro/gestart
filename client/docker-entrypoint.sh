#!/bin/sh
set -e

if [ -f "/etc/letsencrypt/live/gestart.com/fullchain.pem" ]; then
    echo "🔒 SSL Certificates found for gestart.com — Activating HTTPS configuration..."
    cp /etc/nginx/templates/nginx-ssl.conf /etc/nginx/conf.d/default.conf
else
    echo "🌐 No SSL Certificates found yet — Starting in HTTP mode (ready for Certbot)..."
    cp /etc/nginx/templates/nginx-http.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"

