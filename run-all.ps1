param(
  [string] $DbName = 'eventdb',
  [string] $DbHost = 'localhost',
  [int]    $DbPort = 5432,
  [string] $DbUser = 'postgres',
  [string] $PgPassword = '',
  [switch] $NoInitDb,
  [switch] $NoDropDb,
  [Nullable[int]] $BackendPortOverride
)

$ErrorActionPreference = 'Stop'

function Test-CommandExists($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name not found on PATH." }
}

function Invoke-PSqlCmd([string]$Sql, [string]$Database = '') {
  $psqlArgs = @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-v', 'ON_ERROR_STOP=1', '-c', $Sql)
  if ($Database) { $psqlArgs += @('-d', $Database) }
  & psql @psqlArgs
}

function Invoke-PSqlFile([string]$File, [string]$Database = '') {
  $psqlArgs = @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-v', 'ON_ERROR_STOP=1', '-f', $File)
  if ($Database) { $psqlArgs += @('-d', $Database) }
  & psql @psqlArgs
}

function Ensure-DatabaseExists {
  Write-Host "> Ensuring database '$DbName' exists..." -ForegroundColor Cyan
  $exists = (& psql -h $DbHost -p $DbPort -U $DbUser -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'") -eq '1'
  if (-not $exists) { Invoke-PSqlCmd "CREATE DATABASE `"$DbName`";" 'postgres'; Write-Host "  created." -ForegroundColor Green } else { Write-Host "  already exists." -ForegroundColor DarkGray }
}

function Initialize-Database([string]$SchemaFile) {
  if ($NoInitDb) { Write-Host "> Skipping DB init (-NoInitDb)" -ForegroundColor Yellow; return }
  if (-not $SchemaFile) { throw "No schema file found." }
  Write-Host "> Applying schema from '$SchemaFile' to '$DbName'..." -ForegroundColor Cyan
  Invoke-PSqlFile $SchemaFile $DbName
  Write-Host "  schema applied." -ForegroundColor Green
}

function Remove-Database {
  Write-Host "> Dropping database '$DbName'..." -ForegroundColor Magenta
  Invoke-PSqlCmd "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" 'postgres'
  Invoke-PSqlCmd "DROP DATABASE IF EXISTS `"$DbName`";" 'postgres'
  Write-Host "  dropped." -ForegroundColor Green
}

# --- paths ---
$Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $Root 'eventstack\apps\backend'
$FrontendDir = Join-Path $Root 'eventstack\apps\frontend'

# --- schema discovery ---
$SchemaCandidates = @((Join-Path $BackendDir 'database\schema.sql'), (Join-Path $Root 'schema.sql'))
$SchemaFile = $SchemaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# --- preflight ---
Test-CommandExists 'psql'
Test-CommandExists 'npm'
if (-not (Test-Path $BackendDir))  { throw "Backend directory not found: $BackendDir" }
if (-not (Test-Path $FrontendDir)) { throw "Frontend directory not found: $FrontendDir" }

# set password if provided
if ($PgPassword) { $env:PGPASSWORD = $PgPassword }

# --- DB lifecycle ---
Ensure-DatabaseExists
Initialize-Database -SchemaFile $SchemaFile

# run demo seed script
$SeedScript = Join-Path $BackendDir 'scripts\create_demo_users.ts'
if (Test-Path $SeedScript) { Push-Location $BackendDir; npm exec --yes tsx $SeedScript; Pop-Location; Write-Host "Demo seed complete." -ForegroundColor Green } else { Write-Host "No demo seed script found." -ForegroundColor Yellow }

# launch backend, frontend and psql in separate cmd windows
$backendCmd = if ($BackendPortOverride) { "cd /d `"$BackendDir`" && set PORT=$BackendPortOverride && npm run dev" } else { "cd /d `"$BackendDir`" && npm run dev" }
$frontendCmd = "cd /d `"$FrontendDir`" && npm run dev"
$dbCmd = "psql -h `"$DbHost`" -p $DbPort -U `"$DbUser`" -d `"$DbName`""

$backendProc  = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -PassThru
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -PassThru
$dbProc       = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $dbCmd -PassThru

Write-Host "Launched backend (PID:$($backendProc.Id)), frontend (PID:$($frontendProc.Id)) and psql (PID:$($dbProc.Id))."
Write-Host "Press ENTER to stop processes and (optionally) drop the DB..." -ForegroundColor Yellow
[void](Read-Host)

foreach ($p in @($backendProc,$frontendProc,$dbProc)) { if ($p -and -not $p.HasExited) { try { Stop-Process -Id $p.Id -Force } catch {} } }

if (-not $NoDropDb) { try { Remove-Database } catch { Write-Warning "Drop failed: $($_.Exception.Message)" } } else { Write-Host "Keeping DB (NoDropDb)." }

Write-Host "Done." -ForegroundColor Green
  $Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
  $BackendDir  = Join-Path $Root 'eventstack\apps\backend'
  $FrontendDir = Join-Path $Root 'eventstack\apps\frontend'

  # --- schema discovery ---
  $SchemaCandidates = @(
    (Join-Path $BackendDir 'database\schema.sql'),
    (Join-Path $Root 'schema.sql')
  )
  $SchemaFile = $SchemaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  # --- preflight ---
  Test-CommandExists 'psql'
  Test-CommandExists 'npm'
  if (-not (Test-Path $BackendDir))  { throw "Backend directory not found: $BackendDir" }
  if (-not (Test-Path $FrontendDir)) { throw "Frontend directory not found: $FrontendDir" }

  # --- set PGPASSWORD if provided (accept plain or SecureString) ---
  if ($PgPassword -is [System.Security.SecureString]) {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPassword)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
    $env:PGPASSWORD = $plain
  } elseif ($PgPassword) {
    $env:PGPASSWORD = [string]$PgPassword
  }

  # --- DB lifecycle ---
  Ensure-DatabaseExists
  Initialize-Database -SchemaFile $SchemaFile

  # --- run demo seed script if present ---
  $SeedScript = Join-Path $BackendDir 'scripts\create_demo_users.ts'
  if (Test-Path $SeedScript) {
    Write-Host "> Running demo seed script..." -ForegroundColor Cyan
    Push-Location $BackendDir
    # use npm exec to run tsx so it uses local node_modules when available
    npm exec --yes tsx $SeedScript
    Pop-Location
    Write-Host "  demo users created (if script succeeded)." -ForegroundColor Green
  } else {
    Write-Host "> No demo seed script found at $SeedScript" -ForegroundColor Yellow
  }

  # --- launch three persistent terminals using cmd /k ---
  # Backend
  $backendCmd = if ($BackendPortOverride) {
    "cd /d `"$BackendDir`" && set PORT=$BackendPortOverride && npm run dev"
  } else {
    "cd /d `"$BackendDir`" && npm run dev"
  }
  $backendProc  = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -PassThru -WindowStyle Normal
  Write-Host ("Backend window PID: {0}" -f $backendProc.Id)

  # Frontend
  $frontendCmd = "cd /d `"$FrontendDir`" && npm run dev"
  $frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -PassThru -WindowStyle Normal
  Write-Host ("Frontend window PID: {0}" -f $frontendProc.Id)

  # DB console
  $dbCmd = "psql -h `"$DbHost`" -p $DbPort -U `"$DbUser`" -d `"$DbName`""
  $dbProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $dbCmd -PassThru -WindowStyle Normal
  Write-Host ("DB (psql) window PID: {0}" -f $dbProc.Id)

  Write-Host ""
  Write-Host "All three windows launched. Press ENTER here to stop them..." -ForegroundColor Yellow
  [void](Read-Host)

  # --- shutdown & cleanup ---
  foreach ($p in @($backendProc,$frontendProc,$dbProc)) {
    if ($p -and -not $p.HasExited) {
      try { Stop-Process -Id $p.Id -Force } catch {}
    }
  }

  if (-not $NoDropDb) {
    try { Remove-Database } catch { Write-Warning ("Drop failed: {0}" -f $_.Exception.Message) }
  } else {
    Write-Host "> Keeping database '$DbName' (-NoDropDb specified)." -ForegroundColor Cyan
  }

  Write-Host "Done." -ForegroundColor Green
# --- launch three persistent terminals using cmd /k ---
# Backend
$backendCmd = if ($BackendPortOverride) {
  "cd /d `"$BackendDir`" && set PORT=$BackendPortOverride && npm run dev"
} else {
  "cd /d `"$BackendDir`" && npm run dev"
}
$backendProc  = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -PassThru -WindowStyle Normal
Write-Host ("Backend window PID: {0}" -f $backendProc.Id)

# Frontend
$frontendCmd = "cd /d `"$FrontendDir`" && npm run dev"
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -PassThru -WindowStyle Normal
Write-Host ("Frontend window PID: {0}" -f $frontendProc.Id)

# DB console
$dbCmd = "psql -h `"$DbHost`" -p $DbPort -U `"$DbUser`" -d `"$DbName`""
$dbProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $dbCmd -PassThru -WindowStyle Normal
Write-Host ("DB (psql) window PID: {0}" -f $dbProc.Id)

Write-Host ""
Write-Host "All three windows launched. Press ENTER here to stop them..." -ForegroundColor Yellow
[void](Read-Host)

# --- shutdown & cleanup ---
foreach ($p in @($backendProc,$frontendProc,$dbProc)) {
  if ($p -and -not $p.HasExited) {
    try { Stop-Process -Id $p.Id -Force } catch {}
  }
param(
  [string] $DbName = 'eventdb',
  [string] $DbHost = 'localhost',
  [int]    $DbPort = 5432,
  [string] $DbUser = 'postgres',
  [string] $PgPassword,
  [switch] $NoInitDb,
  [switch] $NoDropDb,
  [Nullable[int]] $BackendPortOverride
)

$env:PGPASSWORD = $PgPassword

$ErrorActionPreference = 'Stop'

# --- paths ---
$Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $Root 'eventstack\apps\backend'
$FrontendDir = Join-Path $Root 'eventstack\apps\frontend'

# --- schema discovery ---
$SchemaCandidates = @(
  (Join-Path $BackendDir 'database\schema.sql'),
  (Join-Path $Root 'schema.sql')
)
$SchemaFile = $SchemaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# --- helpers ---
function Ensure-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name not found on PATH."
  }
}
function Invoke-PSqlCmd([string]$Sql, [string]$Database = '') {
  $args = @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-v', 'ON_ERROR_STOP=1', '-c', $Sql)
  if ($Database) { $args += @('-d', $Database) }
  & psql @args
}
function Invoke-PSqlFile([string]$File, [string]$Database = '') {
  $args = @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-v', 'ON_ERROR_STOP=1', '-f', $File)
  if ($Database) { $args += @('-d', $Database) }
  & psql @args
}
function Ensure-Database {
  Write-Host "> Ensuring database '$DbName' exists..." -ForegroundColor Cyan
  $exists = (& psql -h $DbHost -p $DbPort -U $DbUser -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'") -eq '1'
  if (-not $exists) {
    Invoke-PSqlCmd "CREATE DATABASE `"$DbName`";" 'postgres'
    Write-Host "  created." -ForegroundColor Green
  } else {
    Write-Host "  already exists." -ForegroundColor DarkGray
  }
}
function Init-Database {
  if ($NoInitDb) { Write-Host "> Skipping DB init (-NoInitDb)" -ForegroundColor Yellow; return }
  if (-not $SchemaFile) { throw "No schema file found. Looked for: $($SchemaCandidates -join ', ')" }
  Write-Host "> Applying schema from '$SchemaFile' to '$DbName'..." -ForegroundColor Cyan
  Invoke-PSqlFile $SchemaFile $DbName
  Write-Host "  schema applied." -ForegroundColor Green
}
function Drop-Database {
  Write-Host "> Dropping database '$DbName'..." -ForegroundColor Magenta
  Invoke-PSqlCmd "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" 'postgres'
  Invoke-PSqlCmd "DROP DATABASE IF EXISTS `"$DbName`";" 'postgres'
  Write-Host "  dropped." -ForegroundColor Green
}

# --- preflight ---
Ensure-Command 'psql'
Ensure-Command 'npm'
if (-not (Test-Path $BackendDir))  { throw "Backend directory not found: $BackendDir" }
if (-not (Test-Path $FrontendDir)) { throw "Frontend directory not found: $FrontendDir" }
if ($PgPassword) { $env:PGPASSWORD = $PgPassword }

# --- DB lifecycle ---
Ensure-Database
Init-Database

# --- run demo seed script if present ---
$SeedScript = Join-Path $BackendDir 'scripts\create_demo_users.ts'
if (Test-Path $SeedScript) {
  Write-Host "> Running demo seed script..." -ForegroundColor Cyan
  Push-Location $BackendDir
  npm exec --yes tsx $SeedScript
  Pop-Location
  Write-Host "  demo users created (if script succeeded)." -ForegroundColor Green
} else {
  Write-Host "> No demo seed script found at $SeedScript" -ForegroundColor Yellow
}

# --- launch three persistent terminals using cmd /k ---
# Backend
$backendCmd = if ($BackendPortOverride) {
  "cd /d `"$BackendDir`" && set PORT=$BackendPortOverride && npm run dev"
} else {
  "cd /d `"$BackendDir`" && npm run dev"
}
$backendProc  = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -PassThru -WindowStyle Normal
Write-Host ("Backend window PID: {0}" -f $backendProc.Id)

# Frontend
$frontendCmd = "cd /d `"$FrontendDir`" && npm run dev"
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -PassThru -WindowStyle Normal
Write-Host ("Frontend window PID: {0}" -f $frontendProc.Id)

# DB console
$dbCmd = "psql -h `"$DbHost`" -p $DbPort -U `"$DbUser`" -d `"$DbName`""
$dbProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $dbCmd -PassThru -WindowStyle Normal
Write-Host ("DB (psql) window PID: {0}" -f $dbProc.Id)

Write-Host ""
Write-Host "All three windows launched. Press ENTER here to stop them..." -ForegroundColor Yellow
[void](Read-Host)

# --- shutdown & cleanup ---
foreach ($p in @($backendProc,$frontendProc,$dbProc)) {
  if ($p -and -not $p.HasExited) {
    try { Stop-Process -Id $p.Id -Force } catch {}
  }
}

if (-not $NoDropDb) {
  try { Drop-Database } catch { Write-Warning ("Drop failed: {0}" -f $_.Exception.Message) }
} else {
  Write-Host "> Keeping database '$DbName' (-NoDropDb specified)." -ForegroundColor Cyan
}

Write-Host "Done." -ForegroundColor Green
