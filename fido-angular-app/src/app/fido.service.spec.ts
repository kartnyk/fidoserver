import { TestBed } from '@angular/core/testing';

import { FidoService } from './fido.service';

describe('FidoService', () => {
  let service: FidoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FidoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
