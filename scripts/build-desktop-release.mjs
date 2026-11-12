import { spawn } from "node:child_process";
import process from "node:process";
import { readFileSync } from "node:fs";

const releaseConfig = JSON.parse(readFileSync(new URL("../apps/desktop/resources/plugins/local.pi-bot/anke-release.json", import.meta.url), "utf8"));
if (!releaseConfig.repository) {
  throw new Error("Configure the owned Anke release repository before building a distributed release.");
}
const desktopPackage = JSON.parse(readFileSync(new URL("../apps/desktop/package.json", import.meta.url), "utf8"));
const [releaseOwner, releaseRepo] = releaseConfig.repository.split("/");
if (releaseConfig.currentVersion !== desktopPackage.version ||
    desktopPackage.build.publish?.[0]?.owner !== releaseOwner ||
    desktopPackage.build.publish?.[0]?.repo !== releaseRepo) {
  throw new Error("Release metadata is out of sync; rerun configure-anke-release.mjs before packaging.");
}
if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== releaseConfig.repository) {
  throw new Error("The CI repository does not match the configured Anke update feed.");
}

const forwardedArgs = process.argv.slice(2);

const hostTarget =
  process.platform === "win32"
    ? "win"
    : process.platform === "darwin"
      ? "mac"
      : "linux";
const requestedTarget = ["linux", "mac", "win"].includes(forwardedArgs[0])
  ? forwardedArgs.shift()
  : undefined;
const target = requestedTarget ?? hostTarget;

if (!["linux", "mac", "win"].includes(target)) {
  throw new Error(`Unsupported desktop release target: ${target}`);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function runBuilder(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pnpmCommand, ["exec", "electron-builder", ...args], {
      // Windows exposes pnpm as a .cmd shim. Launch it through the shell so
      // Node can start the shim consistently on the hosted Windows runner.
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `electron-builder ${target} target failed with ${
            code === null ? `signal ${signal ?? "unknown"}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}

if (target === "win") {
  await runBuilder([
    "--win",
    "nsis",
    "--publish",
    "never",
    ...forwardedArgs,
    "-c.extraMetadata.piDistribution=installed",
  ]);
  await runBuilder([
    "--win",
    "zip",
    "--publish",
    "never",
    ...forwardedArgs,
    "-c.extraMetadata.piDistribution=zip",
  ]);
  await runBuilder([
    "--win",
    "portable",
    "--publish",
    "never",
    ...forwardedArgs,
    "-c.extraMetadata.piDistribution=portable",
  ]);
} else {
  await runBuilder([
    `--${target}`,
    "--publish",
    "never",
    ...forwardedArgs,
  ]);
}
