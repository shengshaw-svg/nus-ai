import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LinkService, ShortLink } from './link.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly title = 'Snip';
  readonly urlDraft = signal('');
  readonly links = signal<ShortLink[]>([]);
  readonly recentLink = signal<ShortLink | null>(null);
  readonly errorMessage = signal('');
  readonly copyState = signal<'idle' | 'copied' | 'error'>('idle');
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly totalHits = computed(() => this.links().reduce((total, link) => total + link.hits, 0));

  private readonly linkService = inject(LinkService);

  ngOnInit(): void {
    this.loadLinks();
  }

  loadLinks(): void {
    this.isLoading.set(true);
    this.linkService.getLinks().subscribe({
      next: (links) => {
        this.links.set(links);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.describeError(error));
        this.isLoading.set(false);
      },
    });
  }

  createLink(): void {
    this.errorMessage.set('');
    this.recentLink.set(null);
    this.copyState.set('idle');

    const candidate = this.urlDraft().trim();
    let destination: URL;
    try {
      destination = new URL(candidate);
    } catch {
      this.errorMessage.set('Enter a valid HTTP or HTTPS address.');
      return;
    }

    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      this.errorMessage.set('Only HTTP and HTTPS addresses can be shortened.');
      return;
    }

    this.isSubmitting.set(true);
    this.linkService.createLink(destination.href).subscribe({
      next: (link) => {
        this.recentLink.set(link);
        this.links.update((links) => [link, ...links]);
        this.urlDraft.set('');
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.describeError(error));
        this.isSubmitting.set(false);
      },
    });
  }

  async copyShortUrl(shortUrl: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(shortUrl);
      this.copyState.set('copied');
    } catch {
      this.copyState.set('error');
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { error?: unknown } | null;
      if (typeof body?.error === 'string') return body.error;
      if (error.status === 0) return 'Cannot reach the Snip API at http://localhost:3000.';
      return `The request failed (${error.status}). Please try again.`;
    }

    return 'Something went wrong. Please try again.';
  }
}
