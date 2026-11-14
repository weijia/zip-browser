// 目录自动标签规则，移植自 dir-struct-gen/serve.js（保持同一套口径）。
// 规则只看「目录的直接子项名」：有 .git → git，有 package.json → node …
// 自动标签写进 struct 节点 tags；用户自定义标签仍只写 file-tags（格式文档硬性要求）。

export const TAG_RULES = [
  { match: '.git', tag: 'git' },
  { match: '.gitignore', tag: 'git' },
  { match: '.gitmodules', tag: 'git' },
  { match: 'node_modules', tag: 'node_modules' },
  { match: 'package.json', tag: 'node' },
  { match: 'package-lock.json', tag: 'npm' },
  { match: 'yarn.lock', tag: 'yarn' },
  { match: 'pnpm-lock.yaml', tag: 'pnpm' },
  { match: 'pnpm-workspace.yaml', tag: 'pnpm' },
  { match: 'Cargo.toml', tag: 'rust' },
  { match: 'Cargo.lock', tag: 'rust' },
  { match: 'requirements.txt', tag: 'python' },
  { match: 'pyproject.toml', tag: 'python' },
  { match: 'setup.py', tag: 'python' },
  { match: '.venv', tag: 'venv' },
  { match: 'venv', tag: 'venv' },
  { match: '.svn', tag: 'svn' },
  { match: '.hg', tag: 'hg' },
  { match: '.idea', tag: 'idea' },
  { match: '.vscode', tag: 'vscode' },
  { match: 'Dockerfile', tag: 'docker' },
  { match: 'docker-compose.yml', tag: 'docker' },
  { match: 'docker-compose.yaml', tag: 'docker' },
  { match: 'go.mod', tag: 'go' },
  { match: 'go.sum', tag: 'go' },
  { match: 'Gemfile', tag: 'ruby' },
  { match: 'Gemfile.lock', tag: 'ruby' },
  { match: 'pom.xml', tag: 'maven' },
  { match: 'build.gradle', tag: 'gradle' },
  { match: 'build.gradle.kts', tag: 'gradle' },
  { match: 'Makefile', tag: 'make' },
  { match: 'CMakeLists.txt', tag: 'cmake' },
];

const RULE_MAP = new Map(TAG_RULES.map((rule) => [rule.match, rule.tag]));

export function detectTags(names) {
  const tags = [];
  for (const name of names || []) {
    const tag = RULE_MAP.get(name);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}
