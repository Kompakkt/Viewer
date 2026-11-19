import { provideExtender } from '@kompakkt/plugins/extender';
import { BackendService } from './services/backend/backend.service';
import { FluentPipe } from './pipes/fluent.pipe';
import { TranslateService } from './services/translate/translate.service';

import plugins from './custom-plugins';

export const pluginProviders = provideExtender({
  plugins,
  componentSet: 'viewerComponents',
  services: {
    backendService: BackendService,
    translateService: TranslateService,
  },
  pipes: {
    translatePipe: FluentPipe,
  },
});
