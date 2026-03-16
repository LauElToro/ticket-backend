# Pruebas del backend desplegado en Vercel
# Uso: .\scripts\test-deploy.ps1
# O con URL custom: $env:DEPLOY_URL="https://tu-url.vercel.app"; .\scripts\test-deploy.ps1

$base = if ($env:DEPLOY_URL) { $env:DEPLOY_URL } else { "https://ticket-backend-nine.vercel.app" }
$passed = 0
$failed = 0

function Test-Endpoint {
  param([string]$Name, [string]$Method, [string]$Path, [hashtable]$Headers = @{}, [string]$Body = $null)
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  try {
    $params = @{
      Uri = "$base$Path"
      Method = $Method
      ContentType = "application/json"
      TimeoutSec = 25
    }
    if ($Headers.Count -gt 0) { $params.Headers = $Headers }
    if ($Body) { $params.Body = $Body }
    $r = Invoke-RestMethod @params
    Write-Host "OK" -ForegroundColor Green
    $script:passed++
    return $r
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $msg = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    Write-Host "Status: $code | $msg" -ForegroundColor Yellow
    $script:failed++
    return $null
  }
}

Write-Host "Probando deploy: $base" -ForegroundColor Magenta

# Públicos
Test-Endpoint -Name "GET /api/health" -Method Get -Path "/api/health"
Test-Endpoint -Name "GET /api/events" -Method Get -Path "/api/events"
Test-Endpoint -Name "GET /api/events?page=1&limit=5" -Method Get -Path "/api/events?page=1&limit=5"
Test-Endpoint -Name "GET /api/events/:id (404)" -Method Get -Path "/api/events/id-inexistente"
Test-Endpoint -Name "GET /api/payment-places/bank-account" -Method Get -Path "/api/payment-places/bank-account"
Test-Endpoint -Name "GET /api/payment-places/nearby (400 city)" -Method Get -Path "/api/payment-places/nearby?lat=-34.6&lng=-58.4"

# Auth sin credenciales
Test-Endpoint -Name "POST /api/auth/login (body vacio -> 400)" -Method Post -Path "/api/auth/login" -Body '{}'
Test-Endpoint -Name "GET /api/auth/me (sin token -> 401)" -Method Get -Path "/api/auth/me"
Test-Endpoint -Name "GET /api/admin/dashboard (sin token -> 401)" -Method Get -Path "/api/admin/dashboard"
Test-Endpoint -Name "GET /api/orders/:id (sin token -> 401)" -Method Get -Path "/api/orders/xxx"
Test-Endpoint -Name "GET /api/favorites (sin token -> 401)" -Method Get -Path "/api/favorites"
Test-Endpoint -Name "GET /api/tickets/my-tickets (sin token -> 401)" -Method Get -Path "/api/tickets/my-tickets"

# Webhook (puede 200/400 según body)
Test-Endpoint -Name "POST /api/webhooks/mercadopago" -Method Post -Path "/api/webhooks/mercadopago" -Body '{}'

Write-Host "`n--- Resumen ---" -ForegroundColor Magenta
Write-Host "OK: $passed | Con status esperado (4xx): $failed" -ForegroundColor Green
