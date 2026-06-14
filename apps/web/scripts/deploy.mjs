import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, "..");
const repoDir = path.resolve(webDir, "..", "..");
const vitePath = path.join(repoDir, "node_modules", "vite", "bin", "vite.js");
const wranglerPath = path.join(repoDir, "node_modules", "wrangler", "bin", "wrangler.js");

const requireEnvValue = (key, fallback = "") => {
  const value = process.env[key]?.trim() ?? fallback;

  if (!value) {
    throw new Error(`${key} 환경 변수가 필요합니다.`);
  }

  return value;
};

const runNodeCommand = (args, options = {}) => {
  const result = spawnSync(process.execPath, args, {
    cwd: options.cwd ?? repoDir,
    encoding: "utf8",
    env: options.env ?? process.env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`명령 실행에 실패했습니다: ${args.join(" ")}`);
  }

  return result.stdout ?? "";
};

const apiBaseUrl = requireEnvValue("VITE_API_BASE_URL");
const projectName = process.env.AWESOMEKOREA_PAGES_PROJECT?.trim() || "awesomekorea-web";
const branchName = process.env.AWESOMEKOREA_PAGES_BRANCH?.trim() || "main";

console.log(`[deploy:web] Vite build를 시작합니다. (VITE_API_BASE_URL=${apiBaseUrl})`);

runNodeCommand([vitePath, "build"], {
  cwd: webDir,
  env: {
    ...process.env,
    VITE_API_BASE_URL: apiBaseUrl,
  },
});

console.log(`[deploy:web] Pages 프로젝트 '${projectName}' 존재 여부를 확인합니다.`);

const projectsOutput = runNodeCommand([wranglerPath, "pages", "project", "list", "--json"]);
const projects = JSON.parse(projectsOutput);
const getProjectName = (project) => project?.name ?? project?.["Project Name"] ?? null;
const hasProject = Array.isArray(projects)
  ? projects.some((project) => getProjectName(project) === projectName)
  : false;

if (!hasProject) {
  console.log(`[deploy:web] Pages 프로젝트 '${projectName}'를 생성합니다.`);
  runNodeCommand([
    wranglerPath,
    "pages",
    "project",
    "create",
    projectName,
    "--production-branch",
    branchName,
  ]);
}

console.log(`[deploy:web] Cloudflare Pages 배포를 시작합니다. (branch=${branchName})`);

runNodeCommand([
  wranglerPath,
  "pages",
  "deploy",
  "dist",
  "--project-name",
  projectName,
  "--branch",
  branchName,
  "--commit-dirty",
  "true",
], {
  cwd: webDir,
});
