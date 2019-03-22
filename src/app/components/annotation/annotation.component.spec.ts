import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationComponent } from './annotation.component';
import {
  MatCardModule,
  MatFormFieldModule,
  MatIconModule, MatSnackBarModule, MatStepperModule,
  MatTooltipModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {Annotation} from '../../interfaces/annotation2/annotation2';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';

describe('AnnotationComponent', () => {
  let component: AnnotationComponent;
  let fixture: ComponentFixture<AnnotationComponent>;

  beforeEach(async(() => {

    TestBed.configureTestingModule({
      declarations: [AnnotationComponent],
      imports: [
        MatFormFieldModule,
        MatCardModule,
        MatIconModule,
        MatSnackBarModule,
        MatTooltipModule,
        FormsModule,
        HttpClientModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationComponent);
    component = fixture.componentInstance;

    // Mock annotation for @Input
    component.annotation = {
      validated: true,
      _id: 'DefaultAnnotation',
      identifier: 'DefaultAnnotation',
      ranking: 1,
      creator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'userID',
      },
      created: '2019-01-18T22:05:31.230Z',
      generator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      generated: 'Creation-Timestamp by Server',
      motivation: 'defaultMotivation',
      lastModificationDate: 'Last-Manipulation-Timestamp by Server',
      lastModifiedBy: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      body: {
        type: 'annotation',
        content: {
          type: 'text',
          title: 'Welcome to Kompakkt',
          description: 'Hi! I am an annotation of this cool logo. Please feel free to add a friend for me by clicking on the edit button in the corner on the right bottom and double click this 3D logo!',
          relatedPerspective: {
            camera: 'ArcRoatateCamera',
            vector: {
              x: 2.7065021761026817,
              y: 1.3419080619941322,
              z: 90.44884111420268
            },
            preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAADhCAYAAADmtuMcAAARU0lEQVR4Xu3de6xVZXoH4BcvXHQAPTJIlQxy08Y60yZYcNTUZESmGpUQgplJo41FJbaxamIijvWSpilNTKPRKS1/VGOdmGomBsJAGsdEg/iHo9UBagIKhJuCIhe5FhFp1poOOVwOZ5+1v3POXvt7VmJictb3ru993pXzc629wQHhIECAAAECFQQGVFhjCQECBAgQCAHiJiBAgACBSgICpBKbRQQIECAgQNwDBAgQIFBJQIBUYrOIAAECBASIe4AAAQIEKgkIkEpsFhEgQICAAHEPECBAgEAlAQFSic0iAgQIEBAg7gECBAgQqCQgQCqxWUSAAAECAsQ9QIAAAQKVBARIJTaLCBAgQECAuAcIECBAoJKAAKnEZhEBAgQICBD3AAECBAhUEhAgldgsIkCAAAEB4h4gQIAAgUoCAqQSm0UECBAgIEDcAwQIECBQSUCAVGKziAABAgQEiHuAAAECBCoJCJBKbBYRIECAgABxDxAgQIBAJQEBUonNIgIECBAQIO4BAgQIEKgkIEAqsVlEgAABAgLEPUCAAAEClQQGTJo06WillRYRIECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OyTQWmTZsW48ePj3Xr1sXrr7/epl1qi0DzAgKkeUMV2kxgwYIFxzqaM2dOm3WnHQLpBARIOkuV2kRAgLTJILXR6wICpNeJXaBuAgKkbhOz3/4SECD9Je+6LSsgQFp2NDbWYgICpMUGYjv9LyBA+n8GdlAPAQFSjznZZR8KCJA+xHapWgsIkFqPz+Z7Q0CA9Iaqmu0oIEDacap6akpAgDTFZ3FGAgIko2FrtTEBAdKYk7MICBD3AIETBASIW4JAYwICpDEnZ2UkIEAyGrZWmxIQIE3xWdyOAgKkHaeqp94QECC9oapmrQUESK3HZ/N9KCBA+hDbpeohIEDqMSe77H8BAdL/M7CDFhMQIC02ENtpWQEB0rKjsbH+EhAg/SXvunUTECB1m5j99rqAAOl1YhdoEwEB0iaD1EY6AQGSzlKl9hYQIO09X91VEBAgFdAsyVJAgGQ5dk2fTkCAuD8INCYgQBpzclZGAgIko2FrtSkBAdIUn8XtKCBA2nGqeuoNAQHSG6pq1lpAgNR6fDbfhwICpA+xXaoeAgKkHnOyy/4XECD9PwM7aDEBAdJiA7GdlhUQIC07GhvrLwEB0l/yrls3AQFSt4nZb68LCJBeJ3aBNhEQIG0ySG2kExAg6SxVam8BAdLe89VdBQEBUgHNkiwFBEiWY9f06QQEiPuDQGMCAqQxJ2dlJCBAMhq2VpsSECBN8VncrgKXXHJJbNiwoV3b0xeBJAICJAmjIgQIEMhPQIDkN3MdEyBAIImAAEnCqAgBAgTyExAg+c1cxwQIEEgiIECSMCpCgACB/AQESH4z13EXAmPGjIlZs2bFqFGjYuDAgbF37974+OOPY9WqVfHBBx9wI0DgBAEB4pbISmDs2LFx9dVXxxVXXBEdHR1N9X706NHYtWtX+c+mTZvinXfeic2bNzdV02ICdRIQIHWalr02JDBs2LCYOnVq7N+/P957773YuXNnua7zHxDsrtDabQdjwqgh3Z3W0M+LfSxcuDCWLVvW0PlOIlAXAQFSl0nZZ8MC8+bNa/jpYv0XB+Off7U53l+/N458e7Tba4wcNjDGjhwcfzLmO3H998+PcSMbC5mlS5fGokWLuq3vBAJ1EhAgdZqWvTYk0JMAOVXBvQePxJqtB2LVpn2xfM1XsWLjvjh30Jkx7QcdMXPKd+MPLzqnoX10Pumll16K5cuX93idBQRaWUCAtPJ07K2SQOcAeeGtrbFx+//GpHFDY/KEYXHh8IGVavZk0fxffxpvrNwVc6d/r7xmcQiQngg6ty4CAqQuk7LPhgUee+yxGD16dHn+v/760/j3N7d2ubYIlivHDY0f/6AjvjdicMPXKE78dOehWPLhjvjVBzvis12HTlo7/68uPRYgTz/9dKxevbpH9Z1MoNUFBEirT8j+eizw0EMPxcSJExsKkNMVH90xKH546fCYNHZoTPyDIfHGql3xy3e/iO17Dje0p//82z869kG8AGmIzEk1ExAgNRuY7XYvkCpAur/S6c/oHCCPPvpofPnll82WtJ5ASwkIkJYah82kEOgcIP+1Ymf83SvrU5TtcY3Xf/bH0fGds8t1AqTHfBbUQECA1GBIttgzAQHSMy9nE6gqIECqylnXsgKtGCBz5sxpWS8bI1BVQIBUlbOuZQXuvPPOuOqqq8r99ecrrPf/8cpjRgKkZW8XG2tCQIA0gWdpawoIkNaci121n4AAab+ZZt9RygCZMvG8+OXca2LAgAGx5DdbYs6//bZhX08gDVM5saYCAqSmg7PtrgVSBsijM8bEjD/97rGLXfmz9xumFyANUzmxpgICpKaDs+3GAuQ3a/fEXz//cWWuzgGy+8A3MfUfPIFUxrSw7QQESNuNVEPTp0+Pm266qYQQIO4HAr0nIEB6z1blfhJIGSDzZ18ak8f/7i9E9ATSTwN12ZYVECAtOxobqyogQKrKWUegZwICpGdezq6BgACpwZBssS0EBEhbjFETnQUEiPuBQN8ICJC+cXaVPhS4/vrr47bbbiuv2OyH6J0/Ayn+x1Qzn/6fhjvxNd6GqZxYUwEBUtPB2XbXAtdcc03ccccd5Qlrtx2Mnzz7UWUuAVKZzsIMBARIBkPOrUUBktvE9dtfAgKkv+Rdt9cEBEiv0SpM4DgBAeKGaDuB3wfIWWedFSNGjY5H/mNlvPRGtT+Nvuih78fFHYNKo0Y+A/mLH02MXzz8o/L8TZs2xfbt28t/P9Xfxjt8+PD46quv2s5fQ/kICJB8Zp1Np52fQIqmhwwZEhdddFGcd955pcHf/+K/418WfxRf7D7YrUnnAPlk28H46Sk+T7ntz8bHK49OLWvt2rUr1q8/+f+AeGKAPPDAA9HR0RGXXXZZnH/++bFx48ZYtmxZLF68OHbv3t3tvpxAoBUEBEgrTMEeeiQwevTouOuuu+Lmm2+OQ4cOxWeffRYvvPBCLF26tKxT/Pzhhx+OgQMHdln34osvjhEjRkTxlLJmy+74m58vj2Urt8bhI98et6ZzgKzYuC9mL1hd/nz6Dy+JhU/+uPz3PXv2xCeffHLStdauXRtPPfXUKfdQBMipjnPPPTcmTJgQw4YNK/f26quvlsGyefPmHhk5mUBfCAiQvlB2jaYEzjjjjJgyZUo899xzZZ19+/bFmjVrjv9Fv2jRsQA58WJTp06NadOmRfHKqKtj8ODBMXbs2PJppfir2+cv/ij+6ZXfxs//cuyxV1jrtx+KWX9+dVli//79sXr178Kk87Fz58548skny2A73VGE23XXXRcTJ048bdAVNYq9jRs3rtx/YVEEysKFC4VKU3eVxSkEBEgKRTWSC4waNSrmzp0b1157bRw+fDi2bNkSxS/nUx2ff/55PP744w3vofhlPHv27PIJ5HTHmDFjYuvWrfH111+Xp51zzjlx4MCBk5bs3bs3HnnkkXKfzR433HBDQ6FSXGf8+PHla7kzzzwz1q1bFwsWLCg/c+kuvJrdo/UEfi8gQNwLLSEwaNCgmDVrVhSvdo4ePRrFL+VTvRYqNvvNN9/EkiVLunziqNJQ8dRQhFbx9NHIUezx5ZdfLp8GevMoPh+58cYb44ILLiiDorujeIoaOnRo+fprw4YNpdOHH354LAS7W+/nBHoiIEB6ouXcpALFL7o333yzrHnkyJEyMIpXQ6c6iqeA++67L+n1T1fs9ttvL1+bnX322ced9u6778bzzz/fZ/s41YWKz0luueWWGDlyZPlKq7ujeNIqwrEIoCL4XnzxxXj77bfj22+P/7ynuzp+TuBEAQHinugzgeK/7u+55564++67y2sWr56KV1NdHdu2bYsnnniiz/ZX5wsVQTdjxozy22aNHEUIFh/+Owg0IyBAmtGztluByZMnx7PPPlu+UimOFStWlK+gujrmz58fK1euLP9L2VFdoAjr4ttot95660lPUUXVZ555pnpxKwn8v4AAcSskFyg+oL733nvLusWH0MWTxOlelzz44IOn/HA6+cYyL1i8wrrwwgvLMC/+kKODQLMCAqRZQetPEii+Mjtz5swuZd5666147bXXfFvIvUOg5gICpOYDbMXtX3755XH//fcft7V58+aV3wpyECDQPgICpH1m2VKdFN8OKr6CumPHjpbal80QIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQGpCulEgECBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4C/weLi1NGQXXHbQAAAABJRU5ErkJggg==',
          }
        }
      },
      target: {
        source: {
          relatedModel: 'Cube',
        },
        selector: {
          referencePoint: {
            x: -10.204414220764392,
            y: 10.142734374740286,
            z: -3.9197811803792177
          },
          referenceNormal: {
            x: -0.8949183602315889,
            y: 0.011999712324764563,
            z: -0.44606853220612525
          }
        }
      }
    };

    fixture.detectChanges();
  });

  it('should create', () => {

    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
