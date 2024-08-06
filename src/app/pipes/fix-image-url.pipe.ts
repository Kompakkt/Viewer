import { Pipe, PipeTransform } from '@angular/core';
import { environment } from 'src/environment';

const REPLACEMENTS = {
  'https://kompakkt.uni-koeln.de:8080/': 'https://kompakkt.de/server/',
};

const SERVER_URL = environment.server_url.endsWith('/') ? environment.server_url.slice(0, -1) : environment.server_url;

@Pipe({
  name: 'fixImageUrl',
  standalone: true,
})
export class FixImageUrlPipe implements PipeTransform {
  transform(value?: string): string {
    if (!value) {
      return 'assets/image-not-found.png';
    }

    if (value.startsWith('data:image')) {
      return value;
    }

    for (const [key, replacement] of Object.entries(REPLACEMENTS)) {
      if (value.includes(key)) {
        value = value.replace(key, replacement);
      }
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    return value.startsWith('/')
      ? SERVER_URL + value
      : SERVER_URL + '/' + value;
  }
}
