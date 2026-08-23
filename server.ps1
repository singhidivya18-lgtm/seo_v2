$env:PYTHONUTF8 = "1"
while ($true) {
    Write-Host "Starting trending article agent on port 8001..." -ForegroundColor Green
    $proc = Start-Process -FilePath "C:\Users\DIVYA SINGHI\AppData\Roaming\Python\Python314\Scripts\adk.exe" -ArgumentList "web", "--port", "8001", "--no-reload", "`"C:\Users\DIVYA SINGHI\trending_article_agent`"" -NoNewWindow -PassThru
    $proc.WaitForExit()
    Write-Host "Server crashed (exit code: $($proc.ExitCode)). Restarting in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
