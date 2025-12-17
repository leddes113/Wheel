# PowerShell скрипт для безопасного обновления приложения (Windows)

param(
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== Vibe Wheel Update Script ===" -ForegroundColor Cyan
Write-Host "Starting update at $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Проверка что мы в правильной директории
if (-not (Test-Path "package.json") -or -not (Test-Path "docker-compose.yml")) {
    Write-Host "Error: This script must be run from the vibe-wheel root directory" -ForegroundColor Red
    exit 1
}

# Шаг 1: Создание бэкапа
if (-not $SkipBackup) {
    Write-Host "Step 1: Creating backup..." -ForegroundColor Yellow
    if (Test-Path ".\scripts\backup.ps1") {
        & .\scripts\backup.ps1
        Write-Host "✓ Backup created" -ForegroundColor Green
    } else {
        Write-Host "Warning: backup.ps1 not found" -ForegroundColor Red
        $continue = Read-Host "Continue without backup? (yes/no)"
        if ($continue -ne "yes") {
            Write-Host "Update cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host "Step 1: Skipping backup (--SkipBackup flag)" -ForegroundColor Yellow
}

Write-Host ""

# Шаг 2: Сохранение текущей версии
Write-Host "Step 2: Saving current version..." -ForegroundColor Yellow
$currentCommit = git rev-parse HEAD
Write-Host "Current commit: $currentCommit" -ForegroundColor Gray
$currentCommit | Out-File -FilePath ".last-known-good-commit" -Encoding utf8
Write-Host "✓ Version saved" -ForegroundColor Green

Write-Host ""

# Шаг 3: Получение обновлений
Write-Host "Step 3: Fetching updates..." -ForegroundColor Yellow
git fetch origin

Write-Host "Changes to be applied:" -ForegroundColor Gray
git log HEAD..origin/main --oneline --graph

Write-Host ""
$confirm = Read-Host "Continue with update? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Update cancelled." -ForegroundColor Yellow
    exit 0
}

git pull origin main
Write-Host "✓ Code updated" -ForegroundColor Green

Write-Host ""

# Шаг 4: Пересборка Docker образа
Write-Host "Step 4: Rebuilding Docker image..." -ForegroundColor Yellow
docker-compose down
docker-compose build --no-cache
Write-Host "✓ Image rebuilt" -ForegroundColor Green

Write-Host ""

# Шаг 5: Запуск обновлённого приложения
Write-Host "Step 5: Starting updated application..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "✓ Application started" -ForegroundColor Green

Write-Host "Waiting for application to start..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host ""

# Шаг 6: Проверка работоспособности
Write-Host "Step 6: Health check..." -ForegroundColor Yellow
$maxAttempts = 6
$attempt = 1
$healthy = $false

while ($attempt -le $maxAttempts) {
    Write-Host "Health check attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Application is healthy!" -ForegroundColor Green
            $healthy = $true
            break
        }
    } catch {
        Write-Host "Not healthy yet, waiting..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
        $attempt++
    }
}

Write-Host ""

# Проверяем результат
if ($healthy) {
    Write-Host "=== Update completed successfully! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "New commit: $(git rev-parse HEAD)" -ForegroundColor Gray
    Write-Host "Previous commit saved to .last-known-good-commit" -ForegroundColor Gray
    Write-Host ""
    docker-compose logs --tail=20
    exit 0
} else {
    Write-Host "=== Update failed! Application is not healthy ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Rolling back to previous version..." -ForegroundColor Yellow
    
    # Rollback
    git reset --hard $currentCommit
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    Write-Host "Rolled back to commit: $currentCommit" -ForegroundColor Yellow
    Write-Host "Please check logs: docker-compose logs" -ForegroundColor Gray
    
    exit 1
}
