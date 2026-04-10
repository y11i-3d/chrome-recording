#!/usr/bin/env node
import { Command } from "commander";
import { registerConcatCommand } from "./concat.js";
import { registerRecordCommand } from "./record.js";

const program = new Command();
program
  .name("chrome-recording")
  .description("Record Chrome browser content in WSL");

registerRecordCommand(program);
registerConcatCommand(program);
program.parse();
