import { execSync } from "child_process";
import { readdirSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import type { Command } from "commander";

export function registerConcatCommand(program: Command): void {
  program
    .command("concat")
    .description("Concatenate recorded mp4 files")
    .option(
      "-i, --input <dir>",
      "Input directory",
      resolve(process.cwd(), "recordings"),
    )
    .option("-o, --output <file>", "Output file path")
    .option("-v, --verbose", "Show ffmpeg output")
    .action((options: { input: string; output?: string; verbose: boolean }) => {
      const files = readdirSync(options.input)
        .filter((f) => f.endsWith(".mp4") && !f.startsWith("concat_"))
        .sort()
        .map((f) => resolve(options.input, f));

      if (files.length === 0) throw new Error("No mp4 files to concatenate");

      const outputFile =
        options.output ?? resolve(options.input, `concat_${Date.now()}.mp4`);

      const concatList = resolve(tmpdir(), `concat_list_${Date.now()}.txt`);
      writeFileSync(concatList, files.map((f) => `file '${f}'`).join("\n"));

      const stdio = options.verbose ? "inherit" : "ignore";
      try {
        execSync(
          `ffmpeg.exe -f concat -safe 0 -i "${concatList}" -c copy -y "${outputFile}"`,
          { stdio: ["ignore", stdio, stdio] },
        );
      } finally {
        unlinkSync(concatList);
      }

      console.log(`Done: ${outputFile}`);
    });
}
