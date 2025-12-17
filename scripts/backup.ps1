# PowerShell скрипт для создания резервной копии данных (Windows)

param(
    [string]$BackupDir = ".\backups",
    [string]$DataDir = ".\data",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

Write-Host "=== Vibe Wheel Backup Script ===" -ForegroundColor Cyan
Write-Host "Starting backup at $(Get-Date)" -ForegroundColor Gray

# Создаём директорию для бэкапов если её нет
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Создаём имя файла с timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "vibe-wheel-backup-$timestamp.zip"
$backupPath = Join-Path $BackupDir $backupName

# Создаём архив
Write-Host "Creating backup archive: $backupName" -ForegroundColor Yellow
Compress-Archive -Path $DataDir -DestinationPath $backupPath -CompressionLevel Optimal

# Проверяем что архив создан
if (Test-Path $backupPath) {
    $size = (Get-Item $backupPath).Length / 1MB
    Write-Host "✓ Backup created successfully: $backupPath ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "✗ Backup failed!" -ForegroundColor Red
    exit 1
}

# Удаляем старые бэкапы
Write-Host "Cleaning up old backups (older than $RetentionDays days)..." -ForegroundColor Gray
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "vibe-wheel-backup-*.zip" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate } | 
    Remove-Item -Force

# Показываем список всех бэкапов
Write-Host ""
Write-Host "Available backups:" -ForegroundColor Cyan
Get-ChildItem -Path $BackupDir -Filter "vibe-wheel-backup-*.zip" | 
    Format-Table Name, @{Label="Size (MB)"; Expression={[math]::Round($_.Length / 1MB, 2)}}, LastWriteTime -AutoSize

Write-Host ""
Write-Host "Backup completed at $(Get-Date)" -ForegroundColor Green
