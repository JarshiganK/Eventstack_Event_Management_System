param(
  [string] $DbName = 'eventstack',
  [string] $DbHost = 'localhost',
  [int]    $DbPort = 5432,
  [string] $DbUser = 'postgres',
  [string] $DbPassword = 'Jarshi17225',
  [string] $BackendHost = 'localhost',
  [int]    $BackendPort = 4000,
  [string] $FrontendHost = 'localhost',
  [int]    $FrontendPort = 5173,
  [string] $JwtSecret = 'change-me-now',
  [string] $CorsOrigins = 'http://localhost:5173',
  [switch] $SkipDb,
  [switch] $SkipBackend,
  [switch] $SkipFrontend,
  [switch] $LoadSampleData,
  [switch] $ProdFrontend
)

$ErrorActionPreference = 'Stop'
$env:PGPASSWORD = $DbPassword

function Write-Header($Message, $Color = 'Cyan') {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor $Color
  Write-Host " $Message" -ForegroundColor $Color
  Write-Host ("=" * 72) -ForegroundColor $Color
}

function Write-Step($Message, $Color = 'Yellow') {
  Write-Host ""
  Write-Host "> $Message" -ForegroundColor $Color
}

function Write-Success($Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarningMessage($Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage($Message) {
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Ensure-Command($CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "$CommandName is not available on PATH. Please install it first."
  }
}

function Invoke-Psql([string] $Database, [string] $Command) {
  psql -h $DbHost -p $DbPort -U $DbUser -d $Database -c $Command 2>&1 | Out-Null
}

function Wait-ForPort([int] $Port, [string] $HostName = 'localhost', [int] $TimeoutSeconds = 30) {
  $stopWatch = [Diagnostics.Stopwatch]::StartNew()
  Write-Step "Waiting for $HostName`:$Port ..."
  while ($stopWatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect($HostName, $Port, $null, $null)
      $completed = $async.AsyncWaitHandle.WaitOne(500)
      if ($completed -and $client.Connected) {
        $client.Close()
        Write-Success "Service ready on $HostName`:$Port"
        return $true
      }
      $client.Close()
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  Write-WarningMessage "Timeout waiting for $HostName`:$Port"
  return $false
}

# Paths
$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root 'apps\backend'
$FrontendDir = Join-Path $Root 'apps\frontend'
$SchemaFile  = Join-Path $BackendDir 'database\schema.sql'
$SeedFile    = Join-Path $BackendDir 'database\sample_data.sql'
$BackendEnv  = Join-Path $BackendDir '.env'

Write-Header "EventStack Local Deployment"
Write-Host "Database   : $DbHost`:$DbPort/$DbName (user: $DbUser)" -ForegroundColor Gray
Write-Host "Backend    : http://$BackendHost`:$BackendPort" -ForegroundColor Gray
Write-Host "Frontend   : http://$FrontendHost`:$FrontendPort" -ForegroundColor Gray
Write-Host ""

Write-Header "Preflight Checks"
Ensure-Command 'psql'
Ensure-Command 'npm'
Ensure-Command 'node'

if (-not (Test-Path $BackendDir)) { throw "Backend directory not found: $BackendDir" }
if (-not (Test-Path $FrontendDir)) { throw "Frontend directory not found: $FrontendDir" }

Write-Success "Required commands and directories detected"

# Database setup (must happen before .env file creation)
if (-not $SkipDb) {
  Write-Header "Step 1: Database Setup"

  Write-Step "Testing PostgreSQL connectivity"
  try {
    Invoke-Psql -Database 'postgres' -Command "SELECT 1;"
    Write-Success "PostgreSQL reachable"
  } catch {
    Write-ErrorMessage "Cannot connect to PostgreSQL at ${DbHost}:${DbPort}"
    Write-Host "Ensure PostgreSQL is running and credentials are correct" -ForegroundColor Red
    exit 1
  }

  Write-Step "Ensuring database '$DbName' exists"
  $dbExistsCmd = "SELECT 1 FROM pg_database WHERE datname='$DbName';"
  $exists = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -t -c $dbExistsCmd 2>$null
  if (-not $exists.Trim()) {
    try {
      Invoke-Psql -Database 'postgres' -Command "CREATE DATABASE `"$DbName`";"
      Write-Success "Database '$DbName' created"
    } catch {
      Write-ErrorMessage "Failed to create database '$DbName': $($_.Exception.Message)"
      exit 1
    }
  } else {
    Write-Success "Database '$DbName' already exists"
  }

  if (Test-Path $SchemaFile) {
    Write-Step "Applying schema from $SchemaFile"
    try {
      # Capture all output (stdout and stderr) and suppress PowerShell error handling
      $output = & {
        $ErrorActionPreference = 'SilentlyContinue'
        Get-Content $SchemaFile | psql -h $DbHost -p $DbPort -U $DbUser -d $DbName 2>&1
      }
      
      # Check for actual errors (ERROR or FATAL), ignore NOTICE messages
      $errors = $output | Where-Object { $_ -match 'ERROR|FATAL' }
      if ($errors) {
        Write-ErrorMessage "Schema application had errors: $errors"
        throw "Schema application failed"
      }
      Write-Success "Schema applied"
    } catch {
      # Check if it's just a NOTICE (which is harmless)
      if ($_.Exception.Message -match 'NOTICE') {
        Write-Success "Schema applied (NOTICE messages are normal)"
      } else {
        Write-ErrorMessage "Failed to apply schema: $($_.Exception.Message)"
        throw
      }
    }
  } else {
    Write-WarningMessage "Schema file not found at $SchemaFile"
  }

  if ($LoadSampleData -and (Test-Path $SeedFile)) {
    Write-Step "Loading sample data"
    try {
      # Capture all output (stdout and stderr) and suppress PowerShell error handling
      $output = & {
        $ErrorActionPreference = 'SilentlyContinue'
        Get-Content $SeedFile | psql -h $DbHost -p $DbPort -U $DbUser -d $DbName 2>&1
      }
      
      # Check for actual errors (ERROR or FATAL), ignore NOTICE messages
      $errors = $output | Where-Object { $_ -match 'ERROR|FATAL' }
      if ($errors) {
        Write-ErrorMessage "Sample data loading had errors: $errors"
        throw "Sample data loading failed"
      }
      Write-Success "Sample data imported"
    } catch {
      # Check if it's just a NOTICE (which is harmless)
      if ($_.Exception.Message -match 'NOTICE') {
        Write-Success "Sample data imported (NOTICE messages are normal)"
      } else {
        Write-ErrorMessage "Failed to load sample data: $($_.Exception.Message)"
        throw
      }
    }
  } elseif ($LoadSampleData) {
    Write-WarningMessage "Sample data requested but $SeedFile not found"
  }
} else {
  Write-WarningMessage "Skipping database setup (-SkipDb)"
}

# Create/Update backend .env file (after database is ensured to exist)
Write-Header "Step 2: Backend Configuration"

$expectedDbUrl = "postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}"
$shouldUpdateEnv = $false

if (Test-Path $BackendEnv) {
  Write-Step "Checking existing .env file"
  $envLines = Get-Content $BackendEnv
  # Extract DATABASE_URL from existing file
  $existingDbUrl = ""
  foreach ($line in $envLines) {
    if ($line -match "^DATABASE_URL=(.+)$") {
      $existingDbUrl = $matches[1].Trim()
      break
    }
  }
  # Check if DATABASE_URL matches (compare normalized URLs)
  if ($existingDbUrl -ne $expectedDbUrl) {
    Write-WarningMessage ".env file exists but DATABASE_URL doesn't match script parameters"
    Write-Host "  Existing: $existingDbUrl" -ForegroundColor Gray
    Write-Host "  Expected: $expectedDbUrl" -ForegroundColor Gray
    $shouldUpdateEnv = $true
  } else {
    Write-Success ".env file exists and DATABASE_URL matches"
  }
} else {
  Write-Step "Creating new .env file"
  $shouldUpdateEnv = $true
}

if ($shouldUpdateEnv) {
  Write-Step "Updating backend .env file"
  $envContent = @"
NODE_ENV=development
PORT=$BackendPort
DATABASE_URL=$expectedDbUrl
JWT_SECRET=$JwtSecret
CORS_ORIGINS=$CorsOrigins
GEMINI_API_KEY=
"@
  $envContent | Set-Content -Path $BackendEnv -Encoding UTF8
  Write-Success "Updated $BackendEnv with current configuration"
}

# Backend install + start
if (-not $SkipBackend) {
  Write-Header "Step 3: Backend Setup"
  Push-Location $BackendDir
  Write-Step "Installing backend dependencies"
  npm install | Out-Null
  Write-Success "Backend dependencies ready"

  Write-Step "Starting backend server on port $BackendPort"
  $backendCommand = "cd `"$BackendDir`"; npm run dev"
  Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCommand -WindowStyle Normal
  Pop-Location
  Wait-ForPort -Port $BackendPort -HostName $BackendHost | Out-Null
} else {
  Write-WarningMessage "Skipping backend startup (-SkipBackend)"
}

# Frontend install + start
if (-not $SkipFrontend) {
  Write-Header "Step 4: Frontend Setup"
  Push-Location $FrontendDir
  Write-Step "Installing frontend dependencies"
  npm install | Out-Null
  Write-Success "Frontend dependencies ready"

  if ($ProdFrontend) {
    Write-Step "Building and starting frontend preview"
    npm run build | Out-Null
    $frontendCommand = "cd `"$FrontendDir`"; npm run preview -- --host $FrontendHost --port $FrontendPort"
  } else {
    Write-Step "Starting frontend dev server on port $FrontendPort"
    $frontendCommand = "cd `"$FrontendDir`"; npm run dev -- --host $FrontendHost --port $FrontendPort"
  }

  Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCommand -WindowStyle Normal
  Pop-Location
  Wait-ForPort -Port $FrontendPort -HostName $FrontendHost | Out-Null
} else {
  Write-WarningMessage "Skipping frontend startup (-SkipFrontend)"
}

Write-Header "Deployment Complete"
Write-Host "Frontend : http://$FrontendHost`:$FrontendPort" -ForegroundColor Green
Write-Host "Backend  : http://$BackendHost`:$BackendPort" -ForegroundColor Green
Write-Host "Database : postgresql://$DbUser@$DbHost`:$DbPort/$DbName" -ForegroundColor Green
Write-Host ""
Write-Host "Press ENTER to drop database and cleanup, or CTRL+C to exit (database will be kept)." -ForegroundColor Yellow
Write-Host ""

# Setup cleanup function
function Cleanup-Services {
  param([bool] $DropDatabase = $false)
  
  Write-Header "Shutting Down Services" 'Magenta'
  
  # Stop backend and frontend Node.js processes
  Write-Step "Stopping backend and frontend servers..."
  try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
      foreach ($nodeProc in $nodeProcesses) {
        try {
          Stop-Process -Id $nodeProc.Id -Force -ErrorAction Stop
          Write-Success "Stopped Node.js process PID: $($nodeProc.Id)"
        } catch {
          Write-WarningMessage "Could not stop Node.js process PID $($nodeProc.Id): $($_.Exception.Message)"
        }
      }
    } else {
      Write-Success "No Node.js processes found"
    }
  } catch {
    Write-WarningMessage "Error checking Node.js processes: $($_.Exception.Message)"
  }
  
  # Stop spawned PowerShell windows
  Write-Step "Closing spawned PowerShell windows..."
  try {
    $currentPid = $PID
    $powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid }
    if ($powershellProcesses) {
      foreach ($psProc in $powershellProcesses) {
        try {
          Stop-Process -Id $psProc.Id -Force -ErrorAction Stop
          Write-Success "Stopped PowerShell process PID: $($psProc.Id)"
        } catch {
          Write-WarningMessage "Could not stop PowerShell process PID $($psProc.Id): $($_.Exception.Message)"
        }
      }
    }
  } catch {
    Write-WarningMessage "Error checking PowerShell processes: $($_.Exception.Message)"
  }
  
  # Drop database if requested
  if ($DropDatabase -and -not $SkipDb) {
    Write-Step "Dropping database '$DbName'..."
    try {
      # Terminate active connections first
      $null = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" 2>$null
      # Drop database
      psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS `"$DbName`"" 2>$null | Out-Null
      Write-Success "Database '$DbName' dropped successfully"
    } catch {
      Write-WarningMessage "Could not drop database: $($_.Exception.Message)"
    }
  } else {
    Write-Host "Database '$DbName' kept (not dropped)" -ForegroundColor Gray
  }
  
  Write-Host ""
  Write-Header "Cleanup Complete" 'Green'
}

# Setup cleanup flag
$script:cleanupDone = $false

# Wait for Enter key press
try {
  # This will wait for Enter key press
  # Read-Host will throw PipelineStoppedException on Ctrl+C
  $null = Read-Host "Press ENTER to drop database and cleanup"
  # If we get here, Enter was pressed
  if (-not $script:cleanupDone) {
    Cleanup-Services -DropDatabase $true
    $script:cleanupDone = $true
  }
} catch {
  # Handle Ctrl+C or other interrupts
  if (-not $script:cleanupDone) {
    # Check if it's a pipeline stop (Ctrl+C)
    if ($_.Exception.GetType().Name -eq 'PipelineStoppedException' -or 
        $_.FullyQualifiedErrorId -match 'PipelineStopped' -or
        $_.Exception.Message -match 'CtrlC') {
      Write-Host ""
      Write-Host "Interrupted by user (Ctrl+C)" -ForegroundColor Yellow
      Cleanup-Services -DropDatabase $false
    } else {
      Write-Host ""
      Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
      Cleanup-Services -DropDatabase $false
    }
    $script:cleanupDone = $true
  }
  # Exit gracefully
  exit 0
}

