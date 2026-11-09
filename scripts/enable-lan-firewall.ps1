param([ValidateRange(1, 65535)][int]$Port = 3000)
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $arguments = '-NoProfile -File "{0}" -Port {1}' -f $PSCommandPath, $Port
  $process = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList $arguments -PassThru
  $process.WaitForExit()
  exit $process.ExitCode
}
$nodePath = (Get-Command node.exe).Source
$ruleName = "DR-Strategy-Tracker-LAN-$Port"
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name $ruleName -DisplayName "DR Strategy Tracker LAN ($Port)" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port `
    -Program $nodePath -RemoteAddress LocalSubnet -Profile Any | Out-Null
}
Write-Output "LAN firewall rule ready for TCP $Port (local subnet only)."
