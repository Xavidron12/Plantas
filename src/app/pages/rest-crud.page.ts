import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RestDemoPost, RestDemoPostInput, RestPostsService } from '../core/rest-posts.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rest-crud.page.html',
  styleUrl: './rest-crud.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestCrudPage implements OnInit {
  private api = inject(RestPostsService);

  loading = signal(false);
  saving = signal(false);
  error = signal('');
  message = signal('');

  posts = signal<RestDemoPost[]>([]);
  selectedId = signal<number | null>(null);
  selectedPost = signal<RestDemoPost | null>(null);

  formUserId = signal(1);
  formTitle = signal('');
  formBody = signal('');

  editing = computed(() => this.selectedId() !== null);

  formValid = computed(() => {
    return (
      this.formUserId() > 0 &&
      this.formTitle().trim().length >= 3 &&
      this.formBody().trim().length >= 5
    );
  });

  selectedSummary = computed(() => {
    const post = this.selectedPost();
    if (!post) return 'Sin seleccion';
    return `Post #${post.id} de user ${post.userId}`;
  });

  ngOnInit() {
    void this.loadPosts();
  }

  trackById = (_: number, p: RestDemoPost) => p.id;

  toPositiveInt(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  }

  private payload(): RestDemoPostInput {
    return {
      userId: this.toPositiveInt(this.formUserId()),
      title: this.formTitle().trim(),
      body: this.formBody().trim(),
    };
  }

  private clearMessages() {
    this.error.set('');
    this.message.set('');
  }

  async loadPosts() {
    this.clearMessages();
    this.loading.set(true);

    try {
      const list = await firstValueFrom(this.api.list(15));
      this.posts.set(list ?? []);

      const currentId = this.selectedId();
      if (currentId && !(list ?? []).some(p => p.id === currentId)) {
        this.selectedId.set(null);
        this.selectedPost.set(null);
      }
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  async selectPost(id: number) {
    this.clearMessages();
    this.selectedId.set(id);

    try {
      const post = await firstValueFrom(this.api.getById(id));
      this.selectedPost.set(post);
      this.formUserId.set(this.toPositiveInt(post.userId));
      this.formTitle.set(post.title ?? '');
      this.formBody.set(post.body ?? '');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  resetForm() {
    this.clearMessages();
    this.selectedId.set(null);
    this.selectedPost.set(null);
    this.formUserId.set(1);
    this.formTitle.set('');
    this.formBody.set('');
  }

  async save() {
    this.clearMessages();
    if (!this.formValid()) {
      this.error.set('Completa el formulario antes de guardar.');
      return;
    }

    this.saving.set(true);
    try {
      if (this.selectedId()) {
        const updated = await firstValueFrom(this.api.update(this.selectedId()!, this.payload()));
        this.selectedPost.set(updated);
        this.posts.set(this.posts().map(p => (p.id === updated.id ? updated : p)));
        this.message.set(`Post #${updated.id} actualizado (PUT)`);
      } else {
        const created = await firstValueFrom(this.api.create(this.payload()));
        this.selectedId.set(created.id ?? 0);
        this.selectedPost.set(created);
        this.posts.set([created, ...this.posts()]);
        this.message.set(`Post #${created.id} creado (POST)`);
      }
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteSelected() {
    const id = this.selectedId();
    if (!id) return;
    if (!confirm(`Eliminar post #${id}?`)) return;

    this.clearMessages();
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.delete(id));
      this.posts.set(this.posts().filter(p => p.id !== id));
      this.resetForm();
      this.message.set(`Post #${id} eliminado (DELETE)`);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.saving.set(false);
    }
  }
}
