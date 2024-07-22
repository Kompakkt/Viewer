import { Pipe, PipeTransform } from '@angular/core';
import { environment } from 'src/environment';

const REPLACEMENTS = {
  'https://kompakkt.uni-koeln.de:8080/': 'https://kompakkt.de/server/',
};

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
      ? environment.server_url + value
      : environment.server_url + '/' + value;
  }
}
