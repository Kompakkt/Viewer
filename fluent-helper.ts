/// <reference types="bun-types" />

import { FluentBundle, FluentResource } from '@fluent/bundle';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    'default-locale': {
      type: 'string',
    },
    'fluent-directory': {
      type: 'string',
    },
    'mode': {
      type: 'string',
      default: 'missing'
    },
    'list-matching': {
      type: 'boolean',
      default: false,
    },
  },
  strict: true,
  allowPositionals: true,
});

const i18nDir = (() => {
  let fromArgs = values['fluent-directory'];
  if (fromArgs) {
    if (!fromArgs.endsWith('/')) {
      return `${fromArgs}/`;
    } else {
      return fromArgs;
    }
  }
  return 'src/assets/i18n/';
})();
const defaultLocale = values['default-locale'] ?? 'en';

console.time('Scanning .ftl files');
const fluentFiles = await Array.fromAsync(new Bun.Glob(`${i18nDir}*.ftl`).scan());
const fluentContent: Record<string, string> = Object.fromEntries(
  await Promise.all(
    fluentFiles.map(async filename => [
      filename.split('.').at(0)!.replace(i18nDir, ''),
      await Bun.file(filename).text(),
    ]),
  ),
);

const fluentErrors: Record<string, Error[]> = {}
const fluentBundles = Object.fromEntries(
  Object.entries(fluentContent).map(([locale, content]) => {
    const bundle = new FluentBundle(locale);
    const errors = bundle.addResource(new FluentResource(content));
    if (errors.length > 0) fluentErrors[locale] = errors;
    return [locale, bundle];
  }),
);
const keysPerBundle = Object.fromEntries(
  Object.entries(fluentBundles).map(([locale, bundle]) => {
    return [locale, new Set(Array.from(bundle._messages.keys()))];
  }),
);
const allKeys = Object.values(keysPerBundle).reduce((acc, val) => new Set([...acc, ...val]));
console.timeEnd('Scanning .ftl files');

const defaultBundle = fluentBundles[defaultLocale];
if (!defaultBundle) {
  console.error(`No bundle for defaultLocale ${defaultLocale} found in ${fluentFiles.join(', ')}`);
  process.exit(1);
}

if (values.mode === 'missing') {
  const findTranslationsMatchingInDefault = (locale: string) => {
    if (defaultLocale === locale) return [];
    const bundle = fluentBundles[locale];
    if (!bundle) return [];
    return [...bundle._messages].filter(m => {
      const defaultMessage = defaultBundle._messages.get(m[0]);
      return defaultMessage?.value === m[1]?.value;
    });
  };

  const findKeysNotMatchingDefault = (locale: string) => {
    if (defaultLocale === locale) return [];
    const bundle = fluentBundles[locale];
    if (!bundle) return [];
    return {
      missingInDefault: [...bundle._messages].filter(m => !defaultBundle._messages.has(m[0])),
      missingInLocale: [...defaultBundle._messages].filter(m => !bundle._messages.has(m[0])),
    };
  };

  console.log('Keys in all .ftl files:', allKeys.size);
  const distribution = new Array<{
    locale: string;
    keys: number;
    percentage: number;
    sameAsDefault: number;
  }>();
  console.log('Keys per .ftl file:');
  for (const [locale, keys] of Object.entries(keysPerBundle))
    distribution.push({
      locale,
      keys: keys.size,
      percentage: (keys.size / allKeys.size) * 100,
      sameAsDefault:
        locale === defaultLocale ? keys.size : findTranslationsMatchingInDefault(locale).length,
    });
  console.table(distribution);

  for (const [locale, _] of Object.entries(keysPerBundle)) {
    if (locale === defaultLocale) continue;
    if (values['list-matching']) {
      console.log(
        `Keys in ${locale} matching keys in ${defaultLocale}`,
        Object.fromEntries(
          findTranslationsMatchingInDefault(locale).map(m => [m[0], m[1].value ?? '']),
        ),
      );
    }

    const notMatching = findKeysNotMatchingDefault(locale);
    if (Object.values(notMatching).some(arr => arr.length > 0)) {
      console.log(`Keys not matching between ${locale} and ${defaultLocale}`, notMatching);
    }
  }

  console.time('Scanning .html and .ts files');
  const templateFiles = await Array.fromAsync(new Bun.Glob('src/**/*.{ts,html}').scan());
  const templateContent: Record<string, string> = Object.fromEntries(
    await Promise.all(
      templateFiles.map(async filename => [filename, await Bun.file(filename).text()]),
    ),
  );
  console.timeEnd('Scanning .html and .ts files');
  console.log('Template files with keys:', Object.keys(templateContent).length);

  const keyRegex = new RegExp(/['"]k_(\w+[-_]?)+['"]/g);

  const templateKeys = new Set<string>(
    Object.values(templateContent)
      .flatMap(content => {
        const matches = Array.from(content.matchAll(keyRegex));
        return matches.flatMap(m => m.at(0));
      })
      .map(key => {
        if (key?.startsWith("'") || key?.startsWith('"')) key = key.slice(1);
        if (key?.endsWith("'") || key?.endsWith('"')) key = key.slice(0, -1);
        return key;
      })
      .filter(v => !!v) as string[],
  );

  const missing = {
    templates: new Array<string>(),
    fluent: new Array<string>(),
  };

  for (const key of allKeys) {
    if (templateKeys.has(key)) continue;
    missing.templates.push(key);
  }

  for (const key of templateKeys) {
    if (allKeys.has(key)) continue;
    missing.fluent.push(key);
  }

  console.log('Keys in templates that were not found in fluent:', missing.fluent);
  console.log('Keys in fluent that were not found in templates:', missing.templates);

} else if (values.mode === 'validate') {
  for (const [locale, errors] of Object.entries(fluentErrors)) {
    if (errors.length > 0) {
      console.log(`Errors found in locale: ${locale}`, errors);
    }
  }
}
