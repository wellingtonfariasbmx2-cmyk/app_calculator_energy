$currentDir = Get-Location
$parentDir = ".."
Write-Host "Restaurando projeto para a pasta raiz..."
Move-Item -Path ".\*" -Destination $parentDir -Force
Write-Host "Arquivos movidos. Você pode deletar a pasta app_calculator_energy agora se ela estiver vazia."
