$ErrorActionPreference = 'Stop'
$installer = Get-ChildItem dist/*-Setup.exe | Select-Object -First 1
if (!$installer) { throw 'No Windows installer was generated.' }
$installDir = Join-Path $env:RUNNER_TEMP 'QuietNotesInstallCheck'
$setup = Start-Process $installer.FullName -ArgumentList "/S /D=$installDir" -Wait -PassThru
if ($setup.ExitCode -ne 0) { throw "Installer exited with $($setup.ExitCode)." }
$executable = Join-Path $installDir 'Quiet Notes.exe'
if (!(Test-Path $executable)) { throw 'Installer did not install Quiet Notes.exe.' }
try {
    $app = Start-Process $executable -PassThru
    $opened = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        $windows = Get-Process -Name 'Quiet Notes' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
        if ($windows) { $opened = $true; break }
    }
    if (!$opened) { throw 'Quiet Notes did not open a desktop window.' }
} finally {
    Get-Process -Name 'Quiet Notes' -ErrorAction SilentlyContinue | Stop-Process -Force
}
$uninstaller = Get-ChildItem $installDir/*Uninstall*.exe | Select-Object -First 1
if (!$uninstaller) { throw 'The uninstall program is missing.' }
Start-Process $uninstaller.FullName -ArgumentList '/S' -Wait
Write-Output 'Windows installer installed the app, opened a desktop window, and ran the uninstaller.'
