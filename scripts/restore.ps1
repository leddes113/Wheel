# PowerShell скрипт для восстановления данных из резервной копии (Windows)

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile,
    [string]$BackupDir = ".\backups",
    [string]$DataDir = ".\data"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Vibe Wheel Restore Script ===" -ForegroundColor Cyan

# Если файл не указан, показываем список доступных бэкапов
if (-not $BackupFile) {
    Write-Host "Usage: .\restore.ps1 -BackupFile <backup-file>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Cyan
    Get-ChildItem -Path $BackupDir -Filter "vibe-wheel-backup-*.zip" | 
        Format-Table Name, @{Label="Size (MB)"; Expression={[math]::Round($_.Length / 1MB, 2)}}, LastWriteTime -AutoSize
    exit 1
}

# Проверяем существование файла бэкапа
if (-not (Test-Path $BackupFile)) {
    Write-Host "Error: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "Backup file: $BackupFile" -ForegroundColor Gray
Write-Host "Target directory: $DataDir" -ForegroundColor Gray
Write-Host ""

# Подтверждение
$confirm = Read-Host "This will overwrite current data. Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    exit 0
}

# Создаём бэкап текущих данных перед восстановлением
if (Test-Path $DataDir) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $safetyBackup = Join-Path $BackupDir "pre-restore-$timestamp.zip"
    Write-Host "Creating safety backup of current data: $safetyBackup" -ForegroundColor Yellow
    Compress-Archive -Path $DataDir -DestinationPath $safetyBackup -CompressionLevel Optimal
}

# Удаляем текущую директорию данных
if (Test-Path $DataDir) {
    Remove-Item -Path $DataDir -Recurse -Force
}

# Восстанавливаем данные
Write-Host "Restoring data..." -ForegroundColor Yellow
Expand-Archive -Path $BackupFile -DestinationPath "." -Force

Write-Host "✓ Data restored successfully from: $BackupFile" -ForegroundColor Green
Write-Host ""
Write-Host "Please restart the application for changes to take effect." -ForegroundColor Cyan
