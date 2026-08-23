# seo-v2 host watchdog: keeps the A2UI server + cloudflared tunnel alive
# with restart-on-failure. Survives terminal close (launch detached):
#   Start-Process powershell -WindowStyle Hidden -ArgumentList '-File','C:\Users\DIVYA SINGHI\seo_v2\watchdog.ps1'
# Also registered as a logon scheduled task for reboot persistence.
$ErrorActionPreference = 'SilentlyContinue'
$seoDir = 'C:\Users\DIVYA SINGHI\seo_v2'
$home = 'C:\Users\DIVYA SINGHI'
$urlFile = Join-Path $seoDir 'ui_url.txt'
$log = Join-Path $seoDir 'watchdog.log'
$port = 8001

# single-instance guard: if another watchdog is alive, this one exits.
try {
    $mutex = New-Object System.Threading.Mutex($false, 'Local\seo_v2_watchdog')
    $mutexOk = $mutex.WaitOne(0)
} catch {
    $mutexOk = $true  # can't acquire a mutex -> don't block startup
}
if (-not $mutexOk) { exit 0 }

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Add-Content -Path $log -Value $line
    Write-Output $line
}

function Get-PortOwner($portNumber) {
    $conn = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { return $conn.OwningProcess }
    return $null
}

function Ensure-Server {
    $owner = Get-PortOwner $port
    if ($owner) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/state" -UseBasicParsing -TimeoutSec 15
            if ($r.StatusCode -eq 200) { $script:healthFailures = 0; return $true }
        } catch {}
        # A healthy server under a heavy batch (lazy LLM init, docx/image work)
        # can stall /api/state for several seconds. Never kill on the first
        # timeout: only after two consecutive failed checks (~30s+ unresponsive)
        # is the server truly dead.
        $script:healthFailures++
        if ($script:healthFailures -lt 2) {
            Log "port $port owned by PID $owner slow (failure $script:healthFailures/2) - holding"
            return $true
        }
        $script:healthFailures = 0
        # port bound but not responding -> kill ONLY the port owner, never all python
        Log "port $port owned by PID $owner not responding after 2 checks - killing it"
        Stop-Process -Id $owner -Force
        Start-Sleep -Seconds 2
    }
    $script:healthFailures = 0
    Log 'server down - starting uvicorn'
    Start-Process python -ArgumentList '-m','uvicorn','seo_v2.ui_server:app','--host','127.0.0.1','--port',"$port" -WorkingDirectory $home -RedirectStandardOutput (Join-Path $seoDir 'ui_server.log') -RedirectStandardError (Join-Path $seoDir 'ui_server_err.log')
    foreach ($i in 1..15) {
        Start-Sleep -Seconds 2
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/state" -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { Log 'server up'; return $true }
        } catch {}
    }
    return $false
}

function Ensure-Tunnel {
    $current = $null
    if (Test-Path $urlFile) { $current = (Get-Content $urlFile -Raw).Trim() }
    if ($current) {
        try {
            $r = Invoke-WebRequest -Uri "$current/api/state" -UseBasicParsing -TimeoutSec 15
            if ($r.StatusCode -eq 200) { return $current }
        } catch {}
    }
    Log 'tunnel down - restarting cloudflared'
    Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    Remove-Item (Join-Path $seoDir 'cloudflared_err.log') -ErrorAction SilentlyContinue
    Start-Process cloudflared -ArgumentList 'tunnel','--url',"http://127.0.0.1:$port",'--edge-ip-version','4','--protocol','http2','--no-autoupdate' -RedirectStandardOutput (Join-Path $seoDir 'cloudflared.log') -RedirectStandardError (Join-Path $seoDir 'cloudflared_err.log')
    foreach ($i in 1..20) {
        Start-Sleep -Seconds 3
        $m = Get-Content (Join-Path $seoDir 'cloudflared_err.log') -ErrorAction SilentlyContinue | Select-String -Pattern 'https://\S+trycloudflare.com'
        if ($m) {
            $url = $m.Matches[0].Value
            Set-Content -Path $urlFile -Value $url
            Log "tunnel up: $url"
            return $url
        }
    }
    return $null
}

Log 'watchdog started'
$script:healthFailures = 0
while ($true) {
    Ensure-Server | Out-Null
    $url = Ensure-Tunnel
    if ($url) {
        Start-Sleep -Seconds 30
    } else {
        Log 'tunnel unavailable - retrying in 15s'
        Start-Sleep -Seconds 15
    }
}