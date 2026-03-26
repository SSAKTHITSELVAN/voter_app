import { AuthUser } from './types';

// Simple in-memory store (upgrade to SecureStore/AsyncStorage if needed)
let _authUser: AuthUser | null = null;

export const AuthStore = {
  set(user: AuthUser) {
    _authUser = user;
  },
  get(): AuthUser | null {
    return _authUser;
  },
  clear() {
    _authUser = null;
  },
  getToken(): string | null {
    return _authUser?.access_token ?? null;
  },
  getRole() {
    return _authUser?.role ?? null;
  },
  getUserId() {
    return _authUser?.user_id ?? null;
  },
};