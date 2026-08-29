<#
.SYNOPSIS
  Compila el APK de Chefcito en EAS y lo deja en C:\proyectos\Chefcito.

.DESCRIPTION
  EAS compila en la nube y deja el APK en un link de descarga. Este script
  hace el viaje completo: dispara el build, espera a que termine, busca el
  artefacto y lo baja a la carpeta de destino con un nombre fechado, así
  no se pisan las versiones entre una prueba y la siguiente.

  Ojo: `eas build --output` NO sirve para esto — ese flag es solo para
  builds locales. Para un build en la nube hay que pedir el link con
  `eas build:list` y bajarlo aparte, que es lo que hace este script.

.EXAMPLE
  .\scripts\bajar-apk.ps1
  Compila con el perfil development y baja el APK.

.EXAMPLE
  .\scripts\bajar-apk.ps1 -SoloBajar
  No compila: baja el último APK que ya haya terminado en EAS.

.EXAMPLE
  .\scripts\bajar-apk.ps1 -Perfil preview -Destino "D:\otra\carpeta"
#>
param(
  [string]$Perfil = 'development',
  [string]$Destino = 'C:\proyectos\Chefcito',
  [switch]$SoloBajar
)

$ErrorActionPreference = 'Stop'

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

# Corta con un mensaje legible en vez del stack trace de PowerShell, que
# esconde el motivo real entre líneas de sintaxis.
function Cortar($texto) {
  Write-Host "`n$texto" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
  Cortar "No encuentro el comando 'eas'. Instalalo con:  npm install -g eas-cli"
}

if (-not $SoloBajar) {
  Paso "Compilando en EAS (perfil: $Perfil). Esto tarda ~20 minutos."
  Write-Host "   Podés cerrar la ventana: el build sigue en los servidores de Expo." -ForegroundColor DarkGray
  eas build --platform android --profile $Perfil --non-interactive --wait
  if ($LASTEXITCODE -ne 0) { Cortar "El build de EAS falló. Revisá el log que imprimió arriba." }
}

Paso "Buscando el último build terminado"
$json = eas build:list --platform android --status finished --build-profile $Perfil `
  --limit 1 --json --non-interactive
if ($LASTEXITCODE -ne 0) { Cortar "No pude consultar los builds en EAS." }

$builds = @(($json -join "`n") | ConvertFrom-Json)
if ($builds.Count -eq 0) {
  Cortar "No hay ningún build terminado con el perfil '$Perfil'. Corré el script sin -SoloBajar."
}

$build = $builds[0]
# applicationArchiveUrl es el APK en sí; buildUrl queda de respaldo por si
# una versión de eas-cli devuelve solo ese.
$url = $build.artifacts.applicationArchiveUrl
if (-not $url) { $url = $build.artifacts.buildUrl }
if (-not $url) { Cortar "El build $($build.id) no tiene un artefacto descargable." }

if (-not (Test-Path $Destino)) {
  Paso "Creando la carpeta $Destino"
  New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

$fecha = Get-Date -Format 'yyyy-MM-dd-HHmm'
$archivo = Join-Path $Destino "chefcito-$Perfil-$fecha.apk"

Paso "Bajando el APK a $archivo"
$progresoPrevio = $ProgressPreference
$ProgressPreference = 'SilentlyContinue'   # sin esto Invoke-WebRequest va lentísimo
try {
  Invoke-WebRequest -Uri $url -OutFile $archivo
} finally {
  $ProgressPreference = $progresoPrevio
}

$mb = [math]::Round((Get-Item $archivo).Length / 1MB, 1)
Write-Host "`nListo: $archivo ($mb MB)" -ForegroundColor Green
Write-Host "Pasalo al celular y tocalo para instalar. Hay que aceptar" -ForegroundColor DarkGray
Write-Host "'instalar apps de origen desconocido' la primera vez." -ForegroundColor DarkGray
