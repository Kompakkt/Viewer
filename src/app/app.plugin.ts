import { provideExtender } from '@kompakkt/extender';
import { HelloWorldPlugin } from '@kompakkt/plugins/hello-world';
import { SemanticKompakktMetadataPlugin } from '@kompakkt/plugins/semantic-kompakkt-metadata';
import { BackendService } from './services/backend/backend.service';
import { TranslatePipe } from './pipes/translate.pipe';

export const pluginProviders = provideExtender({
  plugins: [new HelloWorldPlugin(), new SemanticKompakktMetadataPlugin()],
  componentSet: 'viewerComponents',
  services: {
    backendService: BackendService,
  },
  pipes: {
    translatePipe: TranslatePipe,
  },
});
