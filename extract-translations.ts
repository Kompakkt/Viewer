import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { extname, join } from 'path';

const translateRegex = /\{\{\s*([^{|]+?)(?:\s*\|\s*translate\s*\}\})/gs;
const ternaryRegex = /([\?:]\s?('.+')){1,2}/gs;
const appPath = join(__dirname, 'src', 'app');
const i18nPath = join(__dirname, 'src', 'assets', 'i18n');
const languages = ['en', 'mn'];

const removeApostrophe = (str: string) => {
  if (str[0] === "'" && str[str.length - 1] === "'") {
    return str.substring(1, str.length - 1);
  }
  return str;
};

const extractTranslationsFromFile = async (file: string): Promise<string[]> => {
  const translations = new Array<string>();
  const content = await readFile(file, 'utf8');
  let match;
  while ((match = translateRegex.exec(content))) {
    const capture = match[1]
      .split(/[\n\r]/)
      .map(line => line.trim())
      .join(' ');
    const ternaryMatch = ternaryRegex.exec(capture);
    if (ternaryMatch) {
      const ternaryCaptures = ternaryMatch[2].split(':').map(line => line.trim());
      translations.push(...ternaryCaptures);
    } else {
      translations.push(capture);
    }
  }
  return translations.map(removeApostrophe);
};

const aggregateFilePaths = async (directory: string): Promise<string[]> => {
  const files = await readdir(directory);
  const filePaths = new Array<string>();
  for (const file of files) {
    const path = join(directory, file);
    const pathStat = await stat(path);
    if (pathStat.isDirectory()) {
      filePaths.push(...(await aggregateFilePaths(join(directory, file))));
    } else if (extname(file) === '.html') {
      filePaths.push(path);
    }
  }
  return filePaths;
};

const fileExists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch (e) {
    return false;
  }
};

const combineTranslations = async (translations: string[]) => {
  const translateObj: Record<string, string> = {};
  for (const translation of translations) {
    translateObj[translation] = translation;
  }

  for (const language of languages) {
    const path = join(i18nPath, `${language}.json`);
    if (!(await fileExists(path))) {
      await writeFile(path, JSON.stringify(translateObj, null, 2));
      continue;
    }
    const content = await readFile(path, 'utf8');
    const parsedContent = JSON.parse(content);
    for (const key of Object.keys(translateObj)) {
      if (!parsedContent[key]) {
        parsedContent[key] = translateObj[key];
      }
    }
    await writeFile(path, JSON.stringify(parsedContent, null, 2));
  }
};

(async () => {
  const paths = await aggregateFilePaths(appPath);
  const translations = await Promise.all(paths.flatMap(extractTranslationsFromFile));
  const uniqueTranslations = Array.from(new Set<string>(translations.flat()));
  const sortedTranslations = uniqueTranslations.sort((a, b) => a.localeCompare(b));
  console.log(`Found ${sortedTranslations.length} translation strings`);
  await combineTranslations(sortedTranslations);
  console.log(`Wrote translations for ${languages.length} languages: ${languages.join(', ')}`);
})();
