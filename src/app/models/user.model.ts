export type UserRole = 'admin' | 'client';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
