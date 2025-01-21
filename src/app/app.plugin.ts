import { provideExtender } from '@kompakkt/extender';
import { HelloWorldPlugin } from '@kompakkt/plugin-hello-world';
import { TranslatePlugin } from '@kompakkt/plugin-i18n';
import { SemanticKompakktMetadataPlugin } from '@kompakkt/plugin-semantic-kompakkt-metadata';
import { BackendService } from './services/backend/backend.service';

export const pluginProviders = provideExtender({
  plugins: [
    new HelloWorldPlugin(),
    new TranslatePlugin(),
    new SemanticKompakktMetadataPlugin(),
  ],
  componentSet: 'viewerComponents',
  services: {},
  backendService: BackendService,
});
