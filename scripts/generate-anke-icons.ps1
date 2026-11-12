$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$build = Join-Path $PSScriptRoot '../apps/desktop/build'
$backup = Join-Path $PSScriptRoot '../../backups/anke-icons-20261111'
New-Item -ItemType Directory -Force -Path $backup | Out-Null
foreach ($name in @('icon.png','icon_1024.png','icon.ico','icon.icns','tray-icon-mac.png')) {
    $source = Join-Path $build $name
    if ((Test-Path $source) -and !(Test-Path (Join-Path $backup $name))) { Copy-Item -LiteralPath $source -Destination $backup }
}
function New-AnkeIcon([int]$size, [bool]$wordmark, [string]$path) {
    $canvas = [System.Drawing.Bitmap]::new(1024,1024)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'AntiAliasGridFit'
    $g.Clear([System.Drawing.Color]::Transparent)
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255,78,80,79),27)
    $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
    $offset = if ($wordmark) { 20 } else { 110 }
    $points = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(222,(664-$offset)),[System.Drawing.PointF]::new(222,(294-$offset)),[System.Drawing.PointF]::new(512,(62-$offset)),[System.Drawing.PointF]::new(802,(294-$offset)),[System.Drawing.PointF]::new(802,(664-$offset)))
    $g.TranslateTransform(0,105)
    $g.DrawLines($pen,$points)
    $g.DrawLine($pen,377,(664-$offset),377,(393-$offset)); $g.DrawLine($pen,377,(393-$offset),647,(393-$offset)); $g.DrawLine($pen,647,(393-$offset),647,(664-$offset))
    $g.DrawLine($pen,145,(664-$offset),879,(664-$offset))
    $pen.Color = [System.Drawing.Color]::FromArgb(100,78,80,79)
    $g.DrawLine($pen,512,(62-$offset),512,(217-$offset)); $g.DrawLine($pen,377,(294-$offset),647,(294-$offset))
    $g.ResetTransform()
    if ($wordmark) {
        $font = [System.Drawing.Font]::new('Segoe UI',112,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255,78,80,79))
        $format = [System.Drawing.StringFormat]::new(); $format.Alignment = 'Center'
        $g.DrawString('A N K E',$font,$brush,[System.Drawing.RectangleF]::new(0,795,1024,170),$format)
        $format.Dispose(); $brush.Dispose(); $font.Dispose()
    }
    $output = [System.Drawing.Bitmap]::new($size,$size)
    $resizer = [System.Drawing.Graphics]::FromImage($output)
    $resizer.InterpolationMode = 'HighQualityBicubic'
    $resizer.DrawImage($canvas,0,0,$size,$size)
    $output.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
    $resizer.Dispose(); $output.Dispose(); $pen.Dispose(); $g.Dispose(); $canvas.Dispose()
}
New-AnkeIcon 1024 $true (Join-Path $build 'icon_1024.png')
New-AnkeIcon 512 $true (Join-Path $build 'icon.png')
New-AnkeIcon 64 $false (Join-Path $build 'tray-icon.png')
New-AnkeIcon 64 $false (Join-Path $build 'tray-icon-mac.png')
$brand = Join-Path $build '../src/assets/brand'
foreach ($name in @('logo-light.png','logo-dark.png')) {
    if (!(Test-Path (Join-Path $backup $name))) { Copy-Item -LiteralPath (Join-Path $brand $name) -Destination $backup }
}
New-AnkeIcon 128 $false (Join-Path $brand 'logo-light.png')
$dark = [System.Drawing.Bitmap]::new((Join-Path $brand 'logo-light.png'))
for ($x=0; $x -lt $dark.Width; $x++) {
    for ($y=0; $y -lt $dark.Height; $y++) {
        $pixel = $dark.GetPixel($x,$y)
        $dark.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($pixel.A,225,227,226))
    }
}
$dark.Save((Join-Path $brand 'logo-dark.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$dark.Dispose()
$frames = @(16,20,24,32,40,48,64,128,256)
$data = @()
foreach ($size in $frames) {
    $temp = Join-Path $build "anke-$size.png"
    New-AnkeIcon $size ($size -ge 64) $temp
    $data += ,([System.IO.File]::ReadAllBytes($temp))
    Remove-Item -LiteralPath $temp
}
$stream = [System.IO.File]::Create((Join-Path $build 'icon.ico'))
$writer = [System.IO.BinaryWriter]::new($stream)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$frames.Count)
    $offset = 6 + 16 * $frames.Count
    for ($i=0; $i -lt $frames.Count; $i++) {
        $dimension = if ($frames[$i] -eq 256) { 0 } else { $frames[$i] }
        $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$data[$i].Length); $writer.Write([uint32]$offset)
        $offset += $data[$i].Length
    }
    foreach ($bytes in $data) { $writer.Write([byte[]]$bytes) }
} finally { $writer.Dispose(); $stream.Dispose() }
Write-Output 'Generated ANKE PNG and nine-resolution Windows ICO assets.'
