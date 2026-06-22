$source = "..\components"
$dest = "."
if (Test-Path $source) {
    Move-Item -Path $source -Destination $dest -Force
    Write-Host "Moved components to app_calculator_energy"
} else {
    Write-Host "Source components folder not found at $source"
}
