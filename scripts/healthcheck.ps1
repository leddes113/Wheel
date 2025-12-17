# PowerShell скрипт для проверки работоспособности приложения (Windows)

param(
    [string]$Host = "localhost",
    [int]$Port = 3000,
    [int]$Timeout = 10
)

$ErrorActionPreference = "SilentlyContinue"

$url = "http://${Host}:${Port}/api/health"

Write-Host "Checking health: $url" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $url -TimeoutSec $Timeout -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Application is healthy (HTTP $($response.StatusCode))" -ForegroundColor Green
        
        # Получаем детали
        $details = $response.Content | ConvertFrom-Json
        Write-Host "Details:" -ForegroundColor Gray
        Write-Host "  Status: $($details.status)" -ForegroundColor Gray
        Write-Host "  Uptime: $($details.uptime) seconds" -ForegroundColor Gray
        Write-Host "  Version: $($details.version)" -ForegroundColor Gray
        
        exit 0
    } else {
        Write-Host "✗ Application is unhealthy (HTTP $($response.StatusCode))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Application is unreachable: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
