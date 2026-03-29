import { AuthStore } from './auth';
import {
  AuthUser,
  Building,
  BulkUploadResult,
  CollectionRecord,
  DuplicateCheckResult,
  Household,
  HouseholdBrief,
  HouseholdCreate,
  Unit,
  UploadableImage,
  User,
  VerificationCreate,
  VerificationRecord,
} from './types';

const BASE_URL = 'https://d1c519tq-8000.inc1.devtunnels.ms';

export const API_BASE_URL = BASE_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function appendUpload(form: FormData, fieldName: string, image: UploadableImage) {
  form.append(fieldName, {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as any);
}

function normalizeHouseholdPayload(data: HouseholdCreate): HouseholdCreate {
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    house_type: data.house_type,
    persons: data.persons,
    ...(data.address_text ? { address_text: data.address_text } : {}),
    ...(data.unit_id ? { unit_id: data.unit_id } : {}),
    ...(data.landmark_image_urls?.length
      ? { landmark_image_urls: data.landmark_image_urls }
      : {}),
  };
}

function buildCreateHouseholdFormData(
  data: HouseholdCreate,
  landmarkImages: UploadableImage[],
): FormData {
  const form = new FormData();
  form.append('payload', JSON.stringify(normalizeHouseholdPayload(data)));

  landmarkImages.forEach((image) => {
    appendUpload(form, 'landmark_images', image);
  });

  return form;
}

function buildBulkHouseholdsFormData(
  households: HouseholdCreate[],
  landmarkImagesByIndex: Record<number, UploadableImage[]>,
): FormData {
  const form = new FormData();
  form.append(
    'payload',
    JSON.stringify({ households: households.map(normalizeHouseholdPayload) }),
  );

  Object.entries(landmarkImagesByIndex).forEach(([index, images]) => {
    images.forEach((image) => {
      appendUpload(form, `landmark_images_${index}`, image);
    });
  });

  return form;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    if (entries.length > 0) {
      const qs = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
      url += `?${qs}`;
    }
  }
  return url;
}

async function parseError(res: Response): Promise<never> {
  let detail = `HTTP ${res.status}`;
  try {
    const err = await res.json();
    detail =
      typeof err.detail === 'string'
        ? err.detail
        : JSON.stringify(err.detail);
  } catch {}
  throw new ApiError(res.status, detail);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const token = AuthStore.getToken();
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;

  let requestBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isFormData(body)) {
      requestBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: requestBody,
  });

  if (!res.ok) {
    await parseError(res);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function requestText(
  method: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<string> {
  const token = AuthStore.getToken();
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
  });

  if (!res.ok) {
    await parseError(res);
  }

  return res.text();
}

export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  try {
    return new URL(path, `${BASE_URL}/`).toString();
  } catch {
    return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

export const authApi = {
  login: (phone: string, password: string) =>
    request<AuthUser>('POST', '/auth/login', { phone, password }),
};

export const usersApi = {
  me: () => request<User>('GET', '/users/me'),
  list: (limit = 50, offset = 0) =>
    request<{ items: User[]; total: number }>('GET', '/users', undefined, {
      limit,
      offset,
    }),
  create: (data: {
    name: string;
    phone: string;
    password: string;
    role: string;
  }) => request<User>('POST', '/users', data),
  get: (id: string) => request<User>('GET', `/users/${id}`),
  delete: (id: string) =>
    request<{ message: string }>('DELETE', `/users/${id}`),
};

export const buildingsApi = {
  create: (data: {
    name: string;
    address_text?: string;
    total_floors?: number;
  }) => request<Building>('POST', '/buildings', data),
  get: (id: string) => request<Building>('GET', `/buildings/${id}`),
  createUnit: (data: {
    building_id: string;
    flat_number: string;
    floor_number?: number;
  }) => request<Unit>('POST', '/buildings/units', data),
  listUnits: (buildingId: string) =>
    request<Unit[]>('GET', `/buildings/${buildingId}/units`),
};

export const householdsApi = {
  create: (data: HouseholdCreate, landmarkImages: UploadableImage[] = []) => {
    if (landmarkImages.length === 0) {
      return request<Household>('POST', '/households', normalizeHouseholdPayload(data));
    }

    return request<Household>(
      'POST',
      '/households',
      buildCreateHouseholdFormData(data, landmarkImages),
    );
  },
  get: (id: string) => request<Household>('GET', `/households/${id}`),
  delete: (id: string) =>
    request<{ message: string }>('DELETE', `/households/${id}`),
  duplicateCheck: (latitude: number, longitude: number, radius_metres = 20) =>
    request<DuplicateCheckResult>(
      'GET',
      '/households/duplicate-check',
      undefined,
      {
        latitude,
        longitude,
        radius_metres,
      },
    ),
  nearby: (
    latitude: number,
    longitude: number,
    radius_metres = 500,
    limit = 50,
  ) =>
    request<HouseholdBrief[]>('GET', '/households/nearby', undefined, {
      latitude,
      longitude,
      radius_metres,
      limit,
    }),
  bulk: (
    households: HouseholdCreate[],
    landmarkImagesByIndex: Record<number, UploadableImage[]> = {},
  ) => {
    const hasUploads = Object.values(landmarkImagesByIndex).some(
      (images) => images.length > 0,
    );

    if (!hasUploads) {
      return request<BulkUploadResult>('POST', '/households/bulk', {
        households: households.map(normalizeHouseholdPayload),
      });
    }

    return request<BulkUploadResult>(
      'POST',
      '/households/bulk',
      buildBulkHouseholdsFormData(households, landmarkImagesByIndex),
    );
  },
  collectionRecords: (householdId: string) =>
    request<CollectionRecord[]>(
      'GET',
      `/households/${householdId}/collection-records`,
    ),
  adminCollectionRecords: (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    collector_id?: string;
    household_id?: string;
    record_id?: string;
  }) =>
    request<CollectionRecord[]>(
      'GET',
      '/households/collection-records',
      undefined,
      params,
    ),
  exportCollectionRecordsCsv: (params?: {
    search?: string;
    collector_id?: string;
    household_id?: string;
    record_id?: string;
    limit?: number;
  }) =>
    requestText('GET', '/households/collection-records/export', params),
  verifications: (householdId: string) =>
    request<VerificationRecord[]>(
      'GET',
      `/households/${householdId}/verifications`,
    ),
};

export const verificationApi = {
  submit: (data: VerificationCreate) =>
    request<VerificationRecord>('POST', '/verification', data),
};



