import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

let sharedClient: SupabaseClient | null = null;

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    if (!sharedClient) {
      sharedClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    }
    this.client = sharedClient;
  }

  get supabase() {
    return this.client;
  }
}
