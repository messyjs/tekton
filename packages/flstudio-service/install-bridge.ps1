# Tekton FL Studio Bridge — Install & Deploy Script
# Run as Administrator for factory dir access (optional)
$ErrorActionPreference = "Continue"

# ─── Source files ───
$srcDir = "C:\Users\Massi\pi-agent\tekton\packages\flstudio-service\bridge"
$bridgeSrc = Join-Path $srcDir "tekton_flstudio_bridge.py"
$canarySrc = Join-Path $srcDir "tekton_canary.py"
$portTestSrc = Join-Path $srcDir "tekton_porttest.py"

# ─── Scripts to install ───
$scripts = @(
    @{ Name="Tekton FL Studio Bridge"; Src=$bridgeSrc; Desc="Main bridge (receiveFrom=Maschine Plus Virtual)" },
    @{ Name="Tekton Canary";           Src=$canarySrc; Desc="Diagnostic (receiveFrom=Maschine Plus Virtual)" },
    @{ Name="Tekton Port Test";        Src=$portTestSrc; Desc="Self-loopback test (receiveFrom=Tekton Port Test)" }
)

# ─── Destination directories (PRIMARY first) ───
# The PRIMARY dir is D:\OneDrive\Patches\FL Studio\Settings\Hardware\
# This is where FL Studio 2025 ACTUALLY reads controller scripts from!
$dests = @(
    @{ Name="*** PRIMARY: FL Studio user data ***"; Path="D:\OneDrive\Patches\FL Studio\Settings\Hardware" },
    @{ Name="User Documents FL Studio";            Path="C:\Users\Massi\Documents\Image-Line\FL Studio\Settings\Hardware" },
    @{ Name="User Documents FL Studio 2025";        Path="C:\Users\Massi\Documents\FL Studio 2025\Settings\Hardware" },
    @{ Name="User Documents FL Studio 21";          Path="C:\Users\Massi\Documents\FL Studio 21\Settings\Hardware" },
    @{ Name="OneDrive Patches (alt)";               Path="D:\OneDrive\Patches\Settings\Hardware" },
    @{ Name="Factory (System, needs Admin)";        Path="C:\Program Files (x86)\Image-Line\FL Studio 2025\System\Hardware specific" }
)

# ─── Clear old log files ───
foreach ($log in @(
    "C:\Users\Massi\tekton_bridge_log.txt",
    "C:\Users\Massi\tekton_canary_log.txt",
    "C:\Users\Massi\tekton_porttest_log.txt",
    "C:\Users\Massi\fl_debug.txt"
)) {
    if (Test-Path $log) { Remove-Item $log -Force; Write-Host "Cleared: $log" }
}

# ─── Install each script to each destination ───
foreach ($script in $scripts) {
    Write-Host "`n=== Installing $($script.Name) ===" -ForegroundColor Cyan
    Write-Host "    $($script.Desc)" -ForegroundColor DarkGray
    foreach ($d in $dests) {
        $dir = Join-Path $d.Path $script.Name
        $file = Join-Path $dir "device_$($script.Name).py"
        try {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            Copy-Item -Force -Path $script.Src -Destination $file
            Write-Host "  [$($d.Name)] -> $file" -ForegroundColor Green
        } catch {
            Write-Host "  [$($d.Name)] ACCESS DENIED (run as Admin): $file" -ForegroundColor Red
        }
    }
}

# ─── Clean up old flat files (confuse FL Studio) ───
Write-Host "`n=== Cleaning old flat files ===" -ForegroundColor Cyan
foreach ($d in $dests) {
    foreach ($flat in @("tekton_flstudio_bridge.py", "test_debug.py")) {
        $flatPath = Join-Path $d.Path $flat
        if (Test-Path $flatPath) {
            Remove-Item $flatPath -Force -ErrorAction SilentlyContinue
            Write-Host "  Removed: $flatPath" -ForegroundColor DarkGray
        }
    }
    $testDir = Join-Path $d.Path "Test Debug"
    if (Test-Path $testDir) {
        Remove-Item $testDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: $testDir" -ForegroundColor DarkGray
    }
}

# ─── Syntax check with FL Studio's Python ───
Write-Host "`n=== Syntax Check ===" -ForegroundColor Cyan
$flPython = "C:\Program Files (x86)\Image-Line\FL Studio 2025\Shared\Python\python.exe"
if (Test-Path $flPython) {
    foreach ($script in $scripts) {
        try {
            $result = & $flPython -c "import ast; ast.parse(open(r'$($script.Src)').read()); print('OK')" 2>&1
            Write-Host "  [$($script.Name)] $result" -ForegroundColor Green
        } catch {
            Write-Host "  [$($script.Name)] FAILED: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  FL Python not found at $flPython" -ForegroundColor Yellow
}

# ─── Summary ───
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PRIMARY install location (where FL Studio reads from):" -ForegroundColor Yellow
Write-Host "  D:\OneDrive\Patches\FL Studio\Settings\Hardware\" -ForegroundColor White
Write-Host ""
Write-Host "Three scripts installed:" -ForegroundColor White
Write-Host "  1. Tekton FL Studio Bridge  - receiveFrom=Maschine Plus Virtual" -ForegroundColor White
Write-Host "  2. Tekton Canary           - receiveFrom=Maschine Plus Virtual" -ForegroundColor White  
Write-Host "  3. Tekton Port Test         - receiveFrom=Tekton Port Test (self-loopback)" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Close FL Studio completely" -ForegroundColor White
Write-Host "  2. Reopen FL Studio" -ForegroundColor White
Write-Host "  3. OPTIONS -> MIDI Settings (Ctrl+Alt+M)" -ForegroundColor White
Write-Host "  4. You should now see ALL THREE controllers in the dropdown" -ForegroundColor White
Write-Host "  5. Select 'Tekton Port Test' first (self-loopback pattern)" -ForegroundColor White
Write-Host "  6. CLICK THE PORT NUMBER to enable it (gray=off, colored=on)" -ForegroundColor White
Write-Host "  7. Check C:\Users\Massi\tekton_porttest_log.txt" -ForegroundColor White