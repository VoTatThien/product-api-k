#!/usr/bin/env bash
# ==============================================================================
# deploy-local.sh
# Script tự động triển khai CD trên máy Local: Docker Hub -> Local Docker Engine
# ==============================================================================

set -e

echo "=========================================================="
echo "  Product API - Local CD Automated Deployment"
echo "=========================================================="

# 1. Load .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 2. Pull latest image from Docker Hub
echo -e "\n[1/3] Pulling latest image from Docker Hub..."
docker compose -f docker-compose-prod.yaml pull product-api

# 3. Recreate containers with new image
echo -e "\n[2/3] Restarting production stack..."
docker compose -f docker-compose-prod.yaml up -d --remove-orphans

# 4. Check Healthcheck
echo -e "\n[3/3] Verifying Healthcheck (http://localhost:3000/health)..."
HEALTHY=0
for i in {1..12}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || true)
  if [ "$STATUS" = "200" ]; then
    echo -e "\n✅ DEPLOYMENT THÀNH CÔNG RỰC RỠ!"
    curl -s http://localhost:3000/health
    echo ""
    HEALTHY=1
    break
  fi
  echo "  Attempt $i: waiting for container health... (HTTP $STATUS)"
  sleep 5
done

if [ "$HEALTHY" -ne 1 ]; then
  echo -e "\n❌ Deployment healthcheck failed!"
  docker compose -f docker-compose-prod.yaml logs --tail 20 product-api
  exit 1
fi
