import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

export async function isFfmpegAvailable(binary = "ffmpeg"): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = spawn(binary, ["-version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

export async function runFfmpeg(
  args: string[],
  options: {
    binary?: string;
    signal?: AbortSignal;
    onStderr?: (chunk: string) => void;
  } = {},
): Promise<{ exitCode: number; stderr: string }> {
  const binary = options.binary ?? "ffmpeg";
  return await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    const onAbort = () => {
      child.kill("SIGTERM");
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stderr.on("data", (buf: Buffer) => {
      const text = buf.toString("utf8");
      stderr += text;
      options.onStderr?.(text);
    });
    child.on("error", (error) => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.on("exit", (code) => {
      options.signal?.removeEventListener("abort", onAbort);
      resolve({ exitCode: code ?? 1, stderr });
    });
  });
}

export async function assertOutputExists(path: string): Promise<void> {
  await access(path, constants.F_OK);
}
