import { provideExtender } from '@kompakkt/plugins/extender';
import { BackendService } from './services/backend/backend.service';
import { TranslatePipe } from './pipes/translate.pipe';

import plugins from './custom-plugins';

export const pluginProviders = provideExtender({
  plugins,
  componentSet: 'viewerComponents',
  services: {
    backendService: BackendService,
  },
  pipes: {
    translatePipe: TranslatePipe,
  },
});
