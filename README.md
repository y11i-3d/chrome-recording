# chrome-recording

[![npm version](https://img.shields.io/npm/v/@y11i-3d/chrome-recording.svg)](https://www.npmjs.com/package/@y11i-3d/chrome-recording)

CLI for recording Windows Chrome content from WSL, using ffmpeg's ddagrab.

## Prerequisites

- WSL (Windows Subsystem for Linux)
- Chrome running on Windows
- `ffmpeg.exe` available in PATH (Windows-side)
- `powershell.exe` available in PATH (Windows-side)
- `wslpath` available in PATH

## Installation

```bash
npm install -g @y11i-3d/chrome-recording
```

Or run directly with `npx`:

```bash
npx @y11i-3d/chrome-recording <subcommand> [options]
```

After installation, a PowerShell script (`get_chrome_info.ps1`) is automatically copied to `%LOCALAPPDATA%\y11i-3d\chrome-recording\` on Windows. This script is required by the `record` command.

## Subcommands

| Subcommand | Description                                             |
| ---------- | ------------------------------------------------------- |
| `record`   | Capture Chrome browser content as a video or screenshot |
| `concat`   | Concatenate recorded mp4 files into one                 |

## record

Capture the Chrome content area using ffmpeg's ddagrab.

```bash
chrome-recording record [options]
```

By default, recording starts immediately and stops when you press Enter. The output is saved to `./recordings/<timestamp>.mp4`.

| Option                               | Description                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `-s, --screenshot`                   | Take a screenshot instead of recording a video                                          |
| `-o, --output <file>`                | Output file path                                                                        |
| `-c, --crop <top:right:bottom:left>` | Crop in CSS shorthand order (px)                                                        |
| `-m, --manual`                       | Wait for Enter before starting capture                                                  |
| `-d, --duration <seconds>`           | Stop recording automatically after N seconds                                            |
| `-q, --quality <value>`              | Quality: plain number for CRF (e.g. `23`), number+unit for bitrate (e.g. `4000k`, `4M`) |
| `-f, --fps <fps>`                    | Frame rate                                                                              |
| `-v, --verbose`                      | Show ffmpeg output                                                                      |

### Examples

```bash
# Record until Enter is pressed
chrome-recording record

# Take a screenshot
chrome-recording record -s

# Record for 10 seconds at CRF 18
chrome-recording record -d 10 -q 18

# Record with manual start and crop
chrome-recording record -m -c 40:0:0:0

# Record to a specific file at 4 Mbps
chrome-recording record -o output.mp4 -q 4M
```

## concat

Concatenate all mp4 files in a directory into a single file (stream copy, no re-encode).

```bash
chrome-recording concat [options]
```

Files named `concat_*.mp4` are excluded. Input files are sorted alphabetically.

| Option                | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `-i, --input <dir>`   | Input directory (default: `./recordings`)                    |
| `-o, --output <file>` | Output file path (default: `<input>/concat_<timestamp>.mp4`) |
| `-v, --verbose`       | Show ffmpeg output                                           |

### Examples

```bash
# Concatenate all recordings in ./recordings
chrome-recording concat

# Concatenate from a specific directory
chrome-recording concat -i ./clips -o final.mp4
```
