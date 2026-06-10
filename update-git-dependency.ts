// Gets the latest commit of a specific GitHub repository and a specific branch
// Then updates the specified dependency in the package.json file to point to that commit
// Used to update the @kompakkt/* dependencies in the package.json file to the latest version

/// <reference types="bun-types" />

import { spawnSync } from 'bun';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    dependency: {
      type: 'string',
      short: 'd',
      description: 'The dependency to update',
      required: true,
    },
    owner: {
      type: 'string',
      short: 'o',
      description: 'The owner of the repository',
      required: true,
    },
    repo: {
      type: 'string',
      short: 'r',
      description: 'The name of the repository',
      required: true,
    },
    branch: {
      type: 'string',
      short: 'b',
      description: 'The name of the branch',
      required: true,
    },
    isDevDependency: {
      type: 'boolean',
      short: 'D',
      description: 'Whether the dependency is a dev dependency',
      default: false,
    },
  },
  allowPositionals: true,
});

const { dependency, owner, repo, branch } = values;
if (!dependency || !owner || !repo || !branch) {
  console.error('Missing required arguments: --dependency, --owner, --repo, --branch');
  process.exit(1);
}

// Get current commit of the dependency from package.json
const packageJson = await Bun.file('./package.json').json();
const currentDependency = values.isDevDependency
  ? packageJson.devDependencies?.[dependency]
  : packageJson.dependencies?.[dependency];
if (!currentDependency) {
  console.error(`Dependency ${dependency} not found in package.json`);
  process.exit(1);
}
if (typeof currentDependency !== 'string' || !currentDependency.startsWith('git+')) {
  console.error(`Dependency ${dependency} is not a git dependency`);
  process.exit(1);
}
const currentCommit = currentDependency.split('#').at(1);
if (!currentCommit) {
  console.error(`Failed to parse current commit for ${dependency} from package.json`);
  process.exit(1);
}

const gitProcess = spawnSync({
  cmd: ['git', 'ls-remote', `https://github.com/${owner}/${repo}.git`, branch],
});

const result = gitProcess.stdout?.toString().trim();

if (!result) {
  console.error(`Failed to get the latest commit for ${owner}/${repo} on branch ${branch}`);
  process.exit(1);
}

const [latestCommit] = result.split('\t');

if (latestCommit.slice(0, 7) === currentCommit.slice(0, 7)) {
  console.log(
    `Dependency ${dependency} is already up to date with commit ${currentCommit} from ${owner}/${repo} on branch ${branch}`,
  );
  process.exit(0);
}

console.log(
  `Updating ${dependency} to latest commit ${latestCommit} from ${owner}/${repo} on branch ${branch}`,
);

const removeDepProcess = spawnSync({
  cmd: ['bun', 'remove', dependency],
});

if (removeDepProcess.exitCode !== 0) {
  console.error(`Failed to remove ${dependency}: ${removeDepProcess.stderr?.toString()}`);
  process.exit(1);
}

const addDepProcess = spawnSync({
  cmd: ['bun', 'add', `git+https://github.com/${owner}/${repo}.git#${latestCommit}`],
});

if (addDepProcess.exitCode !== 0) {
  console.error(`Failed to add ${dependency}: ${addDepProcess.stderr?.toString()}`);
  process.exit(1);
}

console.log(
  `Successfully updated ${dependency} to latest commit ${latestCommit} from ${owner}/${repo} on branch ${branch}`,
);
