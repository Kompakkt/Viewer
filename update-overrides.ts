// Updates any library in overrides to the same pin as listed in dependencies/devDependencies

/// <reference types="bun-types" />

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  overrides?: Record<string, Record<string, string>>;
};
const file = Bun.file('./package.json')
const packageJson: PackageJson = await file.json();

type Log = {
  dependencyType: string;
  library: string;
  fromVersion: string;
  toVersion: string;
  override: string;
}

console.log('Checking package.json for possible alignments in overrides');

if (packageJson.overrides === undefined) {
  console.warn('No overrides field in package.json');
  process.exit(1);
}

const changes = new Array<Log>();
const dependencyTypes = ['dependencies', 'devDependencies'] as Array<keyof PackageJson>;
for (const dependencyType of dependencyTypes) {
  if (packageJson[dependencyType] === undefined) continue;
  for (const [library, toVersion] of Object.entries(packageJson[dependencyType])) {
    for (const override of Object.keys(packageJson.overrides)) {
      for (const oLibrary of Object.keys(packageJson.overrides[override])) {
        if (library !== oLibrary) continue;
        const fromVersion = packageJson.overrides[override][library];
        if (fromVersion === toVersion) continue;
        packageJson.overrides[override][library] = toVersion;
        changes.push({ dependencyType, override, library, fromVersion, toVersion })
      }
    }
  }
}

if (changes.length <= 0) {
  console.log('Nothing to change');
  process.exit(0);
}

console.log('Found overrides');
console.table(changes.map(change => {
  if (change.fromVersion.startsWith('git+')) {
    change.fromVersion = change.fromVersion.split('#').at(-1)?.slice(0, 7) ?? change.fromVersion;
  }
  if (change.toVersion.startsWith('git+')) {
    change.toVersion = change.toVersion.split('#').at(-1)?.slice(0, 7) ?? change.toVersion;
  }
  return change;
}));

console.log('Writing updated package.json');
await Bun.write(file, JSON.stringify(packageJson, null, 2));
console.log('Done!');

export { };
