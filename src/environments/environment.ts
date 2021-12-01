// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Original:
//
export const environment = {
  production: false,
  server_url: 'https://kompakkt.de/server/',
  version: require('../../package.json').version,
  repo_url: 'https://kompakkt.de/',
};

// Local:
//
// export const environment = {
//   production: false,
//   express_server_url: 'http://localhost',
//   express_server_port: 8080,
//   version: require('../../package.json').version
// };

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
