Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "public\icon.png"
$dstPath = Join-Path $PSScriptRoot "public\icon.ico"

$srcBitmap = [System.Drawing.Bitmap]::FromFile($srcPath)

$sizes = @(256, 128, 64, 48, 32, 16)
$pngBytesList = @()

foreach ($size in $sizes) {
    $resized = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($srcBitmap, 0, 0, $size, $size)
    $graphics.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()

    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}

$srcBitmap.Dispose()

# Now assemble standard ICO
$fs = [System.IO.File]::Create($dstPath)
$bw = New-Object System.IO.BinaryWriter $fs

# Header (6 bytes)
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type: ICO
$bw.Write([uint16]$sizes.Count) # Count of images

$offset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $size = $sizes[$i]
    $data = $pngBytesList[$i]

    $w = if ($size -eq 256) { 0 } else { $size }
    $h = if ($size -eq 256) { 0 } else { $size }

    $bw.Write([byte]$w)            # Width
    $bw.Write([byte]$h)            # Height
    $bw.Write([byte]0)             # Colors
    $bw.Write([byte]0)             # Reserved
    $bw.Write([uint16]1)           # Planes
    $bw.Write([uint16]32)          # BitCount
    $bw.Write([uint32]$data.Length) # BytesInRes
    $bw.Write([uint32]$offset)     # ImageOffset

    $offset += $data.Length
}

# Write PNG byte streams
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$bw.Dispose()
$fs.Dispose()

Write-Host "Created valid multi-resolution ICO at: $dstPath"

# Validate that Windows .NET can load it as a genuine Icon
try {
    $testIcon = New-Object System.Drawing.Icon $dstPath
    Write-Host "SUCCESS: Windows successfully loaded icon with size: $($testIcon.Width)x$($testIcon.Height)"
    $testIcon.Dispose()
} catch {
    Write-Host "ERROR validating icon: $_"
}
