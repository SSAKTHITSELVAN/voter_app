import { AuthStore } from './auth';
import {
  AuthUser,
  BulkUploadResult,
  Building,
  CollectionRecord,
  DuplicateCheckResult,
  Household,
  HouseholdBrief,
  HouseholdCreate,
  Unit,
  User,
  VerificationCreate,
  VerificationRecord,
} from './types';

// Android emulator  → http://10.0.2.2:8000
// iOS simulator     → http://localhost:8000
// Physical device   → http://<your-LAN-IP>:8000
const BASE_URL = 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  const token = AuthStore.getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  login: (phone: string, password: string) =>
    request<AuthUser>('POST', '/auth/login', { phone, password }),
};

export const usersApi = {
  me: () => request<User>('GET', '/users/me'),
  list: (limit = 50, offset = 0) =>
    request<{ items: User[]; total: number }>('GET', '/users', undefined, { limit, offset }),
  create: (data: { name: string; phone: string; password: string; role: string }) =>
    request<User>('POST', '/users', data),
  get: (id: string) => request<User>('GET', `/users/${id}`),
  delete: (id: string) => request<{ message: string }>('DELETE', `/users/${id}`),
};

export const buildingsApi = {
  create: (data: { name: string; address_text?: string; total_floors?: number }) =>
    request<Building>('POST', '/buildings', data),
  get: (id: string) => request<Building>('GET', `/buildings/${id}`),
  createUnit: (data: { building_id: string; flat_number: string; floor_number?: number }) =>
    request<Unit>('POST', '/buildings/units', data),
  listUnits: (buildingId: string) =>
    request<Unit[]>('GET', `/buildings/${buildingId}/units`),
};

export const householdsApi = {
  create: (data: HouseholdCreate) =>
    request<Household>('POST', '/households', data),
  get: (id: string) => request<Household>('GET', `/households/${id}`),
  delete: (id: string) => request<{ message: string }>('DELETE', `/households/${id}`),
  duplicateCheck: (latitude: number, longitude: number, radius_metres = 20) =>
    request<DuplicateCheckResult>('GET', '/households/duplicate-check', undefined, {
      latitude, longitude, radius_metres,
    }),
  nearby: (latitude: number, longitude: number, radius_metres = 500, limit = 50) =>
    request<HouseholdBrief[]>('GET', '/households/nearby', undefined, {
      latitude, longitude, radius_metres, limit,
    }),
  bulk: (households: HouseholdCreate[]) =>
    request<BulkUploadResult>('POST', '/households/bulk', { households }),
  collectionRecords: (householdId: string) =>
    request<CollectionRecord[]>('GET', `/households/${householdId}/collection-records`),
  verifications: (householdId: string) =>
    request<VerificationRecord[]>('GET', `/households/${householdId}/verifications`),
};

export const verificationApi = {
  submit: (data: VerificationCreate) =>
    request<VerificationRecord>('POST', '/verification', data),
};