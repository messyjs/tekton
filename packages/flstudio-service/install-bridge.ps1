$src = "C:\Users\Massi\pi-agent\tekton\packages\flstudio-service\bridge\tekton_flstudio_bridge.py"
$dstDir = "C:\Program Files (x86)\Image-Line\FL Studio 2025\System\Hardware specific\Tekton FL Studio Bridge"
$dstFile = "$dstDir\device_Tekton FL Studio Bridge.py"

New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
Copy-Item -Force -Path $src -Destination $dstFile
Write-Host "Installed to: $dstFile"
