# seo_v2 — running the service (Windows)

The A2UI SEO-article service = 2 long-running processes + 1 supervisor.

## Architecture

| Process | What it does | Logs |
|---|---|---|
| `uvicorn seo_v2.ui_server:app` on `127.0.0.1:8001` | FastAPI backend (UI, `/api/action`, `/api/state`, `/api/sessions`, `/files/{name}`) | `seo_v2/ui_server.log`, `seo_v2/ui_server_err.log` |
| `cloudflared tunnel --url http://127.0.0.1:8001 --edge-ip-version 4 --protocol http2` | Public URL (trycloudflare quick tunnel) | `seo_v2/cloudflared.log`, `seo_v2/cloudflared_err.log` |
| `watchdog.ps1` | Supervisor: restarts both on failure, writes live URL to `ui_url.txt` | `seo_v2/watchdog.log` |

All three are detached from any terminal: the watchdog is started hidden via
`Start-Process` (and at Windows logon via the Startup-folder launcher
`seo_v2_watchdog.cmd`), so **closing the terminal does not stop the service**.

## Public URL

The live URL is always in `seo_v2/ui_url.txt`. It changes whenever the quick
tunnel restarts. A stable URL needs a named Cloudflare tunnel or a different
hosting option (see Phase 5 recommendation).

## Logs

- Server: `C:\Users\DIVYA SINGHI\seo_v2\ui_server.log` / `ui_server_err.log`
- Tunnel: `C:\Users\DIVYA SINGHI\seo_v2\cloudflared.log` / `cloudflared_err.log`
- Watchdog: `C:\Users\DIVYA SINGHI\seo_v2\watchdog.log`
- Tail them with: `Get-Content <path> -Tail 50 -Wait`

## Restarting each piece

### Server (uvicorn)
The watchdog restarts it automatically on failure. To force a restart:

```powershell
$owner = (Get-NetTCPConnection -LocalPort 8001 -State Listen).OwningProcess
Stop-Process -Id $owner -Force      # watchdog brings it back within ~30s
```

Never use `Stop-Process -Name python` — it kills unrelated projects
(e.g. the adk web UI on :8000, the react_qa_agent static server on :8123).

### Tunnel (cloudflared)
The watchdog restarts it automatically when the URL stops answering. To force:

```powershell
Get-Process -Name cloudflared | Stop-Process -Force   # watchdog restarts it
```

New URL appears in `ui_url.txt` within ~1 minute.

### Watchdog
```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'watchdog\.ps1' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\DIVYA SINGHI\seo_v2\watchdog.ps1"
```

The watchdog is single-instance (named mutex `Local\seo_v2_watchdog`); a
second copy exits immediately.

## Startup persistence

`C:\Users\DIVYA SINGHI\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\seo_v2_watchdog.cmd`
runs the watchdog at every logon (no admin needed). Task Scheduler would be
more robust but requires an elevated shell.

## Boot guard

`ui_server.py` refuses to start a second instance if port 8001 is already
bound (exits with `[FATAL] Port 8001 is already bound...`). Set
`SEO_SKIP_PORT_CHECK=1` to bypass (only for tests).

## Manual start (if the watchdog is ever removed)

```powershell
Start-Process python -ArgumentList '-m','uvicorn','seo_v2.ui_server:app','--host','127.0.0.1','--port','8001' -WorkingDirectory 'C:\Users\DIVYA SINGHI' -RedirectStandardOutput 'C:\Users\DIVYA SINGHI\seo_v2\ui_server.log' -RedirectStandardError 'C:\Users\DIVYA SINGHI\seo_v2\ui_server_err.log'
Start-Process cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:8001','--edge-ip-version','4','--protocol','http2','--no-autoupdate' -RedirectStandardOutput 'C:\Users\DIVYA SINGHI\seo_v2\cloudflared.log' -RedirectStandardError 'C:\Users\DIVYA SINGHI\seo_v2\cloudflared_err.log'
```

## Notes

- `--edge-ip-version 4 --protocol http2` on cloudflared is **mandatory** on this
  machine's Wi-Fi — without it the tunnel loops on IPv6/QUIC and dies.
- The service dies when the laptop sleeps; nothing on this machine keeps it up
  across a sleep cycle. That is a Phase 5 (hosting) decision, not a bug.