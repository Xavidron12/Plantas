import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';
import { AuthService } from './core/auth.service';

describe('AppComponent', () => {
  const authMock: Pick<AuthService, 'user' | 'isLoggedIn' | 'isAdmin' | 'logout'> = {
    user: signal(null),
    isLoggedIn: signal(false),
    isAdmin: signal(false),
    logout: async () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authMock }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render toolbar title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Plantas Solares');
  });
});
