# ==============================================================================
# deploy-local.ps1
# Script tự động triển khai CD trên máy Local: Docker Hub -> Local Docker Engine
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Product API - Local CD Automated Deployment" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Load file .env nếu có
if (Test-Path ".env") {
    Write-Host "[1/4] Loading environment configuration from .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

$dockerUser = [System.Environment]::GetEnvironmentVariable("DOCKERHUB_USERNAME")
if (-not $dockerUser -or $dockerUser -eq "your-dockerhub-username") {
    Write-Host "[WARNING] DOCKERHUB_USERNAME chưa được cấu hình cụ thể trong .env" -ForegroundColor Yellow
    Write-Host "Đang dùng giá trị mặc định hoặc nhập từ bàn phím nếu cần."
}

# 2. Pull image mới nhất từ Docker Hub
Write-Host "`n[2/4] Pulling latest image from Docker Hub..." -ForegroundColor Yellow
docker compose -f docker-compose-prod.yaml pull product-api

# 3. Khởi động lại stack với image mới
Write-Host "`n[3/4] Re-launching production containers with latest image..." -ForegroundColor Yellow
docker compose -f docker-compose-prod.yaml up -d --remove-orphans

# 4. Kiểm tra Healthcheck
Write-Host "`n[4/4] Verifying Deployment Healthcheck (http://localhost:3000/health)..." -ForegroundColor Yellow
$healthy = $false
for ($i = 1; $i -le 12; $i++) {
    Start-Sleep -Seconds 5
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
        if ($res.status -eq "OK") {
            Write-Host "`n==========================================================" -ForegroundColor Green
            Write-Host "  DEPLOYMENT THÀNH CÔNG RỰC RỠ!" -ForegroundColor Green
            Write-Host "  Status:   $($res.status)" -ForegroundColor Green
            Write-Host "  Service:  $($res.service)" -ForegroundColor Green
            Write-Host "  Database: $($res.database)" -ForegroundColor Green
            Write-Host "  Uptime:   $($res.uptime)s" -ForegroundColor Green
            Write-Host "==========================================================" -ForegroundColor Green
            $healthy = $true
            break
        }
    } catch {
        Write-Host "  Lần $i: Container đang khởi động... ($($_.Exception.Message))" -ForegroundColor DarkGray
    }
}

if (-not $healthy) {
    Write-Host "`n[ERROR] Healthcheck chưa đạt trạng thái OK sau 60 giây!" -ForegroundColor Red
    Write-Host "Xem logs ứng dụng:" -ForegroundColor Yellow
    docker compose -f docker-compose-prod.yaml logs --tail 20 product-api
}
