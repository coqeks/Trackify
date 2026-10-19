#!/usr/bin/env bash
# One-time setup for a fresh Oracle Cloud Ubuntu VM: installs Docker and opens ports 80/443.
set -euo pipefail

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# Oracle's Ubuntu images block everything except SSH in iptables, even when the
# VCN security list allows it. Open HTTP/HTTPS and persist the rules.
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "Done. Log out and back in so the docker group applies, then follow DEPLOY.md."
