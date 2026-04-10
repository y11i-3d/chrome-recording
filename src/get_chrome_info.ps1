Add-Type -AssemblyName System.Windows.Forms

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hwnd, StringBuilder buf, int maxCount);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc cb, IntPtr lParam);
    public struct RECT { public int Left, Top, Right, Bottom; }

    public static List<RECT> FindContentRects(IntPtr chromeHwnd) {
        RECT mainRect;
        GetWindowRect(chromeHwnd, out mainRect);
        var results = new List<RECT>();
        EnumChildWindows(chromeHwnd, (h, _) => {
            var buf = new StringBuilder(256);
            GetClassName(h, buf, 256);
            if (buf.ToString() == "Chrome_RenderWidgetHostHWND") {
                RECT r;
                GetWindowRect(h, out r);
                if (r.Top >= mainRect.Top && r.Top < mainRect.Bottom) {
                    results.Add(r);
                }
            }
            return true;
        }, IntPtr.Zero);
        return results;
    }
}
"@

$proc = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if (-not $proc) {
    Write-Error "Chrome is not running or has no visible window."
    exit 1
}

$rects = [Win32]::FindContentRects($proc.MainWindowHandle)
$best = $rects | Sort-Object { $_.Left }, { $_.Top } | Select-Object -First 1

if (-not $best) {
    Write-Error "Chrome content area (Chrome_RenderWidgetHostHWND) not found."
    exit 1
}

$x = $best.Left
$y = $best.Top
$w = $best.Right - $best.Left
$h = $best.Bottom - $best.Top

Write-Output "content $x $y $w $h"

$i = 0
foreach ($s in [System.Windows.Forms.Screen]::AllScreens) {
    $b = $s.Bounds
    Write-Output "monitor $i $($b.Left) $($b.Top) $($b.Right) $($b.Bottom)"
    $i++
}
