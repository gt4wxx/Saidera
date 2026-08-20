Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;

public static class BrandCut {
  static int Find(int[] p, int i) {
    while (p[i] != i) { p[i] = p[p[i]]; i = p[i]; }
    return i;
  }
  static void Union(int[] p, int[] sz, int a, int b) {
    a = Find(p, a); b = Find(p, b);
    if (a == b) return;
    if (sz[a] < sz[b]) { int t = a; a = b; b = t; }
    p[b] = a; sz[a] += sz[b];
  }

  public static string ProcessDark(string src, string dst, int darkMax) {
    using (var srcImg = new Bitmap(src))
    using (var bmp = new Bitmap(srcImg.Width, srcImg.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) {
        g.Clear(Color.Transparent);
        g.DrawImage(srcImg, 0, 0, srcImg.Width, srcImg.Height);
      }
      int w = bmp.Width, h = bmp.Height;
      var rect = new Rectangle(0, 0, w, h);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      int bytes = Math.Abs(stride) * h;
      byte[] px = new byte[bytes];
      Marshal.Copy(data.Scan0, px, 0, bytes);

      bool[] keep = new bool[w * h];
      for (int y = 0; y < h; y++) {
        int row = y * stride;
        for (int x = 0; x < w; x++) {
          int i = row + x * 4;
          byte b = px[i], gv = px[i + 1], r = px[i + 2];
          int mx = Math.Max(r, Math.Max(gv, b));
          int a;
          if (mx <= darkMax) a = 0;
          else if (mx < darkMax + 36) a = (mx - darkMax) * 255 / 36;
          else a = 255;
          px[i + 3] = (byte)a;
          keep[y * w + x] = a > 48;
        }
      }

      DropLabels(keep, w, h, 0.16, 0.55, 0.025);
      ApplyKeep(px, stride, w, h, keep);
      Marshal.Copy(px, 0, data.Scan0, bytes);
      bmp.UnlockBits(data);
      return CropSave(bmp, dst, 10);
    }
  }

  public static string ProcessLight(string src, string dst, bool dropTopLabel) {
    using (var srcImg = new Bitmap(src))
    using (var bmp = new Bitmap(srcImg.Width, srcImg.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) {
        g.Clear(Color.Transparent);
        g.DrawImage(srcImg, 0, 0, srcImg.Width, srcImg.Height);
      }
      int w = bmp.Width, h = bmp.Height;
      var rect = new Rectangle(0, 0, w, h);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      int bytes = Math.Abs(stride) * h;
      byte[] px = new byte[bytes];
      Marshal.Copy(data.Scan0, px, 0, bytes);

      bool[] keep = new bool[w * h];
      for (int y = 0; y < h; y++) {
        int row = y * stride;
        for (int x = 0; x < w; x++) {
          int i = row + x * 4;
          byte b = px[i], gv = px[i + 1], r = px[i + 2];
          int mn = Math.Min(r, Math.Min(gv, b));
          int mx = Math.Max(r, Math.Max(gv, b));
          bool bg = mn >= 232 || (mn >= 198 && (mx - mn) < 16);
          int a = bg ? 0 : 255;
          if (!bg && mn >= 170 && (mx - mn) < 22) a = (int)((232 - mn) * 255.0 / 62);
          px[i + 3] = (byte)a;
          keep[y * w + x] = a > 48;
        }
      }

      if (dropTopLabel) DropLabels(keep, w, h, 0.28, 1.0, 0.04);
      ApplyKeep(px, stride, w, h, keep);
      Marshal.Copy(px, 0, data.Scan0, bytes);
      bmp.UnlockBits(data);
      return CropSave(bmp, dst, 6);
    }
  }

  static void DropLabels(bool[] keep, int w, int h, double topFrac, double leftFrac, double areaFrac) {
    int n = w * h;
    int[] p = new int[n];
    int[] sz = new int[n];
    for (int i = 0; i < n; i++) { p[i] = i; sz[i] = 1; }
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int i = y * w + x;
        if (!keep[i]) continue;
        if (x + 1 < w && keep[i + 1]) Union(p, sz, i, i + 1);
        if (y + 1 < h && keep[i + w]) Union(p, sz, i, i + w);
      }
    }
    int minArea = Math.Max(80, (int)(n * areaFrac));
    int topLim = (int)(h * topFrac);
    int leftLim = (int)(w * leftFrac);
    bool[] dropRoot = new bool[n];
    int[] minx = new int[n], miny = new int[n], maxx = new int[n], maxy = new int[n];
    for (int i = 0; i < n; i++) { minx[i] = w; miny[i] = h; maxx[i] = -1; maxy[i] = -1; }
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int i = y * w + x;
        if (!keep[i]) continue;
        int r = Find(p, i);
        if (x < minx[r]) minx[r] = x;
        if (y < miny[r]) miny[r] = y;
        if (x > maxx[r]) maxx[r] = x;
        if (y > maxy[r]) maxy[r] = y;
      }
    }
    for (int i = 0; i < n; i++) {
      if (p[i] != i || sz[i] < 2) continue;
      bool topBand = maxy[i] < topLim && miny[i] < (int)(h * 0.12);
      bool leftish = maxx[i] < leftLim;
      if (sz[i] < minArea && topBand && leftish) dropRoot[i] = true;
      if (sz[i] < minArea && topBand) dropRoot[i] = true;
    }
    for (int i = 0; i < n; i++) {
      if (keep[i] && dropRoot[Find(p, i)]) keep[i] = false;
    }
  }

  static void ApplyKeep(byte[] px, int stride, int w, int h, bool[] keep) {
    for (int y = 0; y < h; y++) {
      int row = y * stride;
      for (int x = 0; x < w; x++) {
        if (!keep[y * w + x]) px[row + x * 4 + 3] = 0;
      }
    }
  }

  static string CropSave(Bitmap bmp, string dst, int pad) {
    int w = bmp.Width, h = bmp.Height;
    int minx = w, miny = h, maxx = -1, maxy = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (bmp.GetPixel(x, y).A > 24) {
          if (x < minx) minx = x;
          if (y < miny) miny = y;
          if (x > maxx) maxx = x;
          if (y > maxy) maxy = y;
        }
      }
    }
    if (maxx < 0) throw new Exception("empty after cut: " + dst);
    minx = Math.Max(0, minx - pad);
    miny = Math.Max(0, miny - pad);
    maxx = Math.Min(w - 1, maxx + pad);
    maxy = Math.Min(h - 1, maxy + pad);
    int cw = maxx - minx + 1, ch = maxy - miny + 1;
    using (var crop = new Bitmap(cw, ch, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(crop)) {
        g.Clear(Color.Transparent);
        g.DrawImage(bmp, new Rectangle(0, 0, cw, ch), new Rectangle(minx, miny, cw, ch), GraphicsUnit.Pixel);
      }
      Directory.CreateDirectory(Path.GetDirectoryName(dst));
      crop.Save(dst, ImageFormat.Png);
      return Path.GetFileName(dst) + " " + cw + "x" + ch;
    }
  }
}
"@

$root = "c:\Users\ellis\OneDrive\Ambiente de Trabalho\Projeto\Saidera"
$kit = Join-Path $root "Saidera_Kit_Marca"
$orig = Join-Path $kit "_orig"
$out = Join-Path $root "assets\brand"
New-Item -ItemType Directory -Force -Path $orig, $out | Out-Null

$files = @(
  "01_logo_principal.png","02_simbolo_logo.png","03_logo_horizontal.png",
  "05_favicon.png","10_app_icon_amarelo.png","11_app_icon_preto.png"
)
foreach ($f in $files) {
  $src = Join-Path $kit $f
  $bak = Join-Path $orig $f
  if (-not (Test-Path $bak)) { Copy-Item $src $bak }
}

Write-Output ([BrandCut]::ProcessDark((Join-Path $orig "03_logo_horizontal.png"), (Join-Path $out "03_logo_horizontal.png"), 28))
Write-Output ([BrandCut]::ProcessDark((Join-Path $orig "02_simbolo_logo.png"), (Join-Path $out "02_simbolo_logo.png"), 28))
Write-Output ([BrandCut]::ProcessDark((Join-Path $orig "01_logo_principal.png"), (Join-Path $out "01_logo_principal.png"), 28))
Write-Output ([BrandCut]::ProcessLight((Join-Path $orig "05_favicon.png"), (Join-Path $out "05_favicon.png"), $true))
Write-Output ([BrandCut]::ProcessLight((Join-Path $orig "10_app_icon_amarelo.png"), (Join-Path $out "10_app_icon_amarelo.png"), $false))
Write-Output ([BrandCut]::ProcessLight((Join-Path $orig "11_app_icon_preto.png"), (Join-Path $out "11_app_icon_preto.png"), $false))
Write-Output "ok"
