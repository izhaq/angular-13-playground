import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { take } from 'rxjs/operators';

import { WsService } from './ws.service';
import { FieldUpdate } from '../components/status-grid/grid.models';

describe('WsService', () => {
  let service: WsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WsService],
    });
    service = TestBed.inject(WsService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose message$ observable', () => {
    expect(service.message$).toBeDefined();
  });

  it('should complete message$ on destroy', (done) => {
    service.message$.subscribe({
      complete: () => done(),
    });
    service.ngOnDestroy();
  });
});
