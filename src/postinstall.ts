#!/usr/bin/env node
import { copyFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import pkg from "../package.json" with { type: "json" };

const [scope, pkgName] = pkg.name.replace(/^@/, "").split("/");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const ps1Src = resolve(scriptDir, "get_chrome_info.ps1");

const localAppDataWin = execSync("powershell.exe -Command '$env:LOCALAPPDATA'")
  .toString()
  .trim();
const localAppDataLinux = execSync(`wslpath -u "${localAppDataWin}"`)
  .toString()
  .trim();

const destDir = resolve(localAppDataLinux, scope ?? pkg.name, pkgName ?? "");
mkdirSync(destDir, { recursive: true });
copyFileSync(ps1Src, resolve(destDir, "get_chrome_info.ps1"));

console.log(`Installed get_chrome_info.ps1 to ${destDir}`);
