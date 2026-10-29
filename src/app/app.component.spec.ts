import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { LinkService } from './link.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: LinkService,
          useValue: {
            getLinks: () => of([]),
            createLink: (url: string) => of({
              code: 'a1B2c3',
              url,
              shortUrl: `http://localhost:3000/a1B2c3`,
              hits: 0,
              createdAt: new Date().toISOString(),
            }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the Snip link workspace', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Link manager');
    expect(compiled.querySelector('input[type="url"]')).toBeTruthy();
  });
});
