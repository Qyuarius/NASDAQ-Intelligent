# create-shortcut.ps1 — Creates a NASDAQ Intel desktop shortcut with custom icon
# Run: powershell -ExecutionPolicy Bypass -File create-shortcut.ps1

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$batPath     = Join-Path $projectRoot 'start.bat'
$icoPath     = Join-Path $projectRoot 'nasdaq-intel.ico'
$desktopPath = [Environment]::GetFolderPath('Desktop')
$lnkPath     = Join-Path $desktopPath 'NASDAQ Intel.lnk'

Add-Type -AssemblyName System.Drawing

# --- Create 32x32 icon ------------------------------------------------------
$bmp = New-Object System.Drawing.Bitmap(32, 32)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background — rounded rect, dark terminal
$bg = [System.Drawing.Color]::FromArgb(255, 2, 4, 8)
$g.Clear([System.Drawing.Color]::Transparent)

$bgBrush = New-Object System.Drawing.SolidBrush($bg)
$rect = New-Object System.Drawing.Rectangle(0, 0, 31, 31)
$radius = 6
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
$path.AddArc($rect.Right - $radius, $rect.Y, $radius, $radius, 270, 90)
$path.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()
$g.FillPath($bgBrush, $path)

# Grid lines (subtle)
$gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 0, 200, 255), 0.5)
for ($i = 4; $i -lt 32; $i += 6) {
    $g.DrawLine($gridPen, 3, $i, 28, $i)
}

# Upward trending line (cyan)
$cyan = [System.Drawing.Color]::FromArgb(255, 0, 229, 255)
$linePen = New-Object System.Drawing.Pen($cyan, 2.2)
$points = @(
    (New-Object System.Drawing.PointF(5, 24)),
    (New-Object System.Drawing.PointF(11, 19)),
    (New-Object System.Drawing.PointF(16, 21)),
    (New-Object System.Drawing.PointF(21, 12)),
    (New-Object System.Drawing.PointF(27, 7))
)
$g.DrawLines($linePen, $points)

# Arrowhead at the end
$arrowBrush = New-Object System.Drawing.SolidBrush($cyan)
$arrowPts = @(
    (New-Object System.Drawing.PointF(27, 3)),
    (New-Object System.Drawing.PointF(30, 8)),
    (New-Object System.Drawing.PointF(24, 8))
)
$g.FillPolygon($arrowBrush, $arrowPts)

# Small green dot (signal indicator)
$green = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
$greenBrush = New-Object System.Drawing.SolidBrush($green)
$g.FillEllipse($greenBrush, 4, 4, 4, 4)

# Save as .ico
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = [System.IO.File]::Create($icoPath)
$icon.Save($fs)
$fs.Close()
$g.Dispose()
$bmp.Dispose()

Write-Host "[OK] Icon saved: $icoPath"

# --- Create desktop shortcut (target cmd.exe so it can be pinned) -----------
$cmdExe = Join-Path $env:SystemRoot 'System32\cmd.exe'
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath       = $cmdExe
$lnk.Arguments        = "/c `"$batPath`""
$lnk.WorkingDirectory = $projectRoot
$lnk.IconLocation     = $icoPath
$lnk.Description      = 'NASDAQ Intel Terminal — Stock Intelligence Platform'
$lnk.WindowStyle      = 7
$lnk.Save()

Write-Host "[OK] Shortcut created: $lnkPath"
Write-Host ""
Write-Host "Done! Right-click the shortcut on your desktop and select 'Pin to taskbar'."
