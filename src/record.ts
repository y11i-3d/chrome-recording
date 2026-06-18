import { execSync, spawn } from "child_process";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { createInterface } from "readline";
import type { Command } from "commander";

interface Monitor {
  idx: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function registerRecordCommand(program: Command): void {
  program
    .command("record")
    .description("Record Chrome browser content")
    .option("-s, --screenshot", "Take a screenshot", false)
    .option("-o, --output <file>", "Output file path")
    .option("-c, --crop <top:right:bottom:left>", "Crop (CSS order)")
    .option("-m, --manual", "Start recording manually")
    .option("-d, --duration <seconds>", "Recording duration in seconds")
    .option(
      "-q, --quality <value>",
      "Quality: number for CRF, number+unit for bitrate (e.g. 23, 4000k, 4M)",
    )
    .option("-f, --fps <fps>", "Frame rate")
    .option("-v, --verbose", "Show ffmpeg output")
    .action(
      async (options: {
        screenshot: boolean;
        duration?: string;
        quality?: string;
        fps?: string;
        crop?: string;
        verbose: boolean;
        manual: boolean;
        output?: string;
      }) => {
        const missing = ["powershell.exe", "ffmpeg.exe", "wslpath"].filter(
          (cmd) => {
            try {
              execSync(`which ${cmd}`, { stdio: "ignore" });
              return false;
            } catch {
              return true;
            }
          },
        );
        if (missing.length > 0) {
          throw new Error(
            `Command(s) not found: ${missing.join(", ")}\nWSL + Windows environment required.`,
          );
        }

        const localAppDataWin = execSync(
          "powershell.exe -Command '$env:LOCALAPPDATA'",
        )
          .toString()
          .trim();
        const ps1Win = `${localAppDataWin}\\y11i-3d\\chrome-recording\\get_chrome_info.ps1`;

        const info = execSync(
          `powershell.exe -ExecutionPolicy Bypass -File "${ps1Win}"`,
        )
          .toString()
          .trim()
          .split("\n")
          .map((l) => l.trim().replace(/\r/, ""));

        const contentLine = info.find((l) => l.startsWith("content"));
        if (!contentLine) {
          throw new Error("Failed to get Chrome content area info");
        }
        const contentParts = contentLine.split(/\s+/).slice(1).map(Number);
        const contentX = contentParts[0] ?? 0;
        const contentY = contentParts[1] ?? 0;
        const contentW = contentParts[2] ?? 0;
        const contentH = contentParts[3] ?? 0;

        const monitors: Monitor[] = info
          .filter((l) => l.startsWith("monitor"))
          .map((l) => {
            const parts = l.split(/\s+/).map(Number);
            const idx = parts[1] ?? 0;
            const left = parts[2] ?? 0;
            const top = parts[3] ?? 0;
            const right = parts[4] ?? 0;
            const bottom = parts[5] ?? 0;
            return { idx, left, top, right, bottom };
          });

        const monitor = monitors.find(
          (m) =>
            contentX >= m.left &&
            contentX < m.right &&
            contentY >= m.top &&
            contentY < m.bottom,
        );

        if (!monitor) throw new Error("Chrome content area not found");

        const offsetX = contentX - monitor.left;
        const offsetY = contentY - monitor.top;

        console.log(
          `Capturing monitor ${monitor.idx + 1} at (${offsetX}, ${offsetY}), size ${contentW}x${contentH}`,
        );

        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const waitEnter = (msg: string): Promise<void> =>
          new Promise((res) => {
            process.stdout.write(msg);
            rl.once("line", () => res());
          });

        const [cropT, cropR, cropB, cropL] = options.crop
          ? options.crop.split(":").map(Number)
          : [0, 0, 0, 0];

        const cropW = `floor((iw-${(cropL ?? 0) + (cropR ?? 0)})/2)*2`;
        const cropH = `floor((ih-${(cropT ?? 0) + (cropB ?? 0)})/2)*2`;
        const cropFilter = `crop=${cropW}:${cropH}:${cropL ?? 0}:${cropT ?? 0}`;

        const screenshot = options.screenshot;
        const duration =
          options.duration !== undefined ? Number(options.duration) : null;
        const qualityArgs: string[] =
          options.quality === undefined
            ? []
            : /[a-zA-Z]$/.test(options.quality)
              ? ["-b:v", options.quality]
              : ["-crf", options.quality];

        const ext = screenshot ? "png" : "mp4";
        const outputLinux =
          options.output ??
          resolve(process.cwd(), "recordings", `${Date.now()}.${ext}`);
        mkdirSync(dirname(outputLinux), { recursive: true });
        const outputWin = execSync(`wslpath -w "${outputLinux}"`)
          .toString()
          .trim();

        if (options.manual) {
          await waitEnter(
            `Press Enter to ${screenshot ? "capture" : "start recording"}...`,
          );
        }

        const ddagrabParams = [
          `ddagrab=output_idx=${monitor.idx}`,
          `offset_x=${offsetX}`,
          `offset_y=${offsetY}`,
          `video_size=${contentW}x${contentH}`,
          ...(options.fps !== undefined ? [`framerate=${options.fps}`] : []),
        ];
        const ddagrab = ddagrabParams.join(":");

        const ffmpegArgs = screenshot
          ? [
              "-filter_complex",
              `${ddagrab},hwdownload,format=bgra,${cropFilter}`,
              "-frames:v",
              "1",
              "-y",
              outputWin,
            ]
          : [
              "-filter_complex",
              `${ddagrab},hwdownload,format=bgra,${cropFilter}`,
              ...(duration !== null ? ["-t", String(duration)] : []),
              "-c:v",
              "libx264",
              "-pix_fmt",
              "yuv420p",
              ...qualityArgs,
              "-y",
              outputWin,
            ];

        const io = options.verbose ? "inherit" : "ignore";
        const ffmpeg = spawn("ffmpeg.exe", ffmpegArgs, {
          stdio: ["pipe", io, io],
        });

        ffmpeg.on("close", () => {
          console.log(`\nDone: ${outputLinux}`);
        });

        if (screenshot || duration !== null) {
          rl.close();
        } else {
          await waitEnter("Press Enter to stop recording...");
          rl.close();
          ffmpeg.stdin?.end("q");
        }
      },
    );
}
