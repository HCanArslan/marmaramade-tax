import { hash } from "bcryptjs";
import { createInterface } from "node:readline";

async function readPassword() {
  if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal.");
  const readline = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
  process.stderr.write("Admin password (input hidden when supported): ");
  const stdin = process.stdin; let value = "";
  stdin.setRawMode?.(true); stdin.resume();
  return new Promise<string>((resolve, reject) => {
    const onData = (buffer: Buffer) => { const char = buffer.toString("utf8"); if (char === "\r" || char === "\n") { stdin.setRawMode?.(false); stdin.pause(); stdin.off("data", onData); readline.close(); process.stderr.write("\n"); resolve(value); } else if (char === "\u0003") { reject(new Error("Canceled.")); } else if (char === "\u007f" || char === "\b") { value = value.slice(0, -1); } else { value += char; } };
    stdin.on("data", onData);
  });
}

async function main() {
  const password = await readPassword();
  if (password.length < 14) throw new Error("Use at least 14 characters.");
  process.stdout.write(`${await hash(password, 12)}\n`);
}
main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Password hashing failed."}\n`); process.exitCode = 1; });
