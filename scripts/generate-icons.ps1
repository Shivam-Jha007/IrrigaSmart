# Generates IrrigaSmart app icons from the brand logo.
#
# The source is a JPEG render of the logo sitting on a white app-icon card with
# a drop shadow. Three things are done about that:
#   1. Crop to the artwork bounds only, so no card edge or shadow is baked in.
#   2. Flatten the crop's near-white pixels to pure white. The card is subtly
#      shaded and JPEG-mottled, which otherwise shows as a seam where the crop
#      meets the pure-white canvas. Only low-saturation near-white pixels are
#      touched, so the artwork and its anti-aliased edges survive untouched.
#   3. Resample from that cleaned full-resolution crop for every size, rather
#      than cleaning each size separately.
Add-Type -AssemblyName System.Drawing

$srcPath = $args[0]
$outDir = $args[1]

# Artwork bounding box measured from the source (colored pixels only).
$ax = 314; $ay = 192; $aw = 667; $ah = 829

# A pixel is background if it is bright and near-grey.
$WHITE_MIN = 235
$MAX_CHROMA = 12

$src = [System.Drawing.Image]::FromFile($srcPath)

# --- Step 1: crop to the artwork -------------------------------------------
$art = New-Object System.Drawing.Bitmap $aw, $ah, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$ag = [System.Drawing.Graphics]::FromImage($art)
$ag.InterpolationMode = 'HighQualityBicubic'
$ag.PixelOffsetMode = 'HighQuality'
$ag.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $aw, $ah),
                    $ax, $ay, $aw, $ah, [System.Drawing.GraphicsUnit]::Pixel)
$ag.Dispose()
$src.Dispose()

# --- Step 2: flatten the background to pure white ---------------------------
$rect = New-Object System.Drawing.Rectangle 0, 0, $aw, $ah
$data = $art.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
                      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($data.Stride * $ah)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

$flattened = 0
for ($i = 0; $i -lt $bytes.Length; $i += 4) {
    # Memory order for Format32bppArgb on a little-endian machine is B,G,R,A.
    $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]
    $min = [Math]::Min($b, [Math]::Min($g, $r))
    $max = [Math]::Max($b, [Math]::Max($g, $r))
    if ($min -ge $WHITE_MIN -and ($max - $min) -le $MAX_CHROMA) {
        $bytes[$i] = 255; $bytes[$i + 1] = 255; $bytes[$i + 2] = 255
        $flattened++
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
$art.UnlockBits($data)
Write-Output ("flattened {0} background pixels of {1}" -f $flattened, ($aw * $ah))

# --- Step 3: emit each size ------------------------------------------------
function Write-Icon {
    param([int]$Size, [double]$Coverage, [string]$Name)

    $canvas = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::White)

    # Scale so the taller artwork axis fills `Coverage` of the canvas.
    $scale = ($Size * $Coverage) / $script:ah
    $w = $script:aw * $scale
    $h = $script:ah * $scale
    $dest = New-Object System.Drawing.RectangleF (($Size - $w) / 2), (($Size - $h) / 2), $w, $h
    $g.DrawImage($script:art, $dest)

    $canvas.Save((Join-Path $script:outDir $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $canvas.Dispose()
    Write-Output ("{0}  {1}x{1}  coverage {2}" -f $Name, $Size, $Coverage)
}

Write-Icon -Size 512 -Coverage 0.90 -Name 'pwa-512x512.png'
Write-Icon -Size 192 -Coverage 0.90 -Name 'pwa-192x192.png'
Write-Icon -Size 180 -Coverage 0.90 -Name 'apple-touch-icon.png'
# In-app brand mark. Rendered at 96px on onboarding and 34px in the header, so
# 192 is exactly 2x for the largest use — every byte here is precached and this
# app installs over 2G.
Write-Icon -Size 192 -Coverage 0.94 -Name 'logo.png'
Write-Icon -Size 64  -Coverage 0.94 -Name 'favicon.png'
# Maskable: the artwork must survive an aggressive platform crop, so it sits
# well inside the 80% safe zone.
Write-Icon -Size 512 -Coverage 0.66 -Name 'pwa-maskable-512x512.png'

$art.Dispose()
