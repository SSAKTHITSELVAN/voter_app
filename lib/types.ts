export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'FIELD_USER';
export type HouseType = 'INDIVIDUAL' | 'APARTMENT';
export type GenderType = 'MALE' | 'FEMALE' | 'OTHER';
export type VerificationStatus = 'MATCHED' | 'MISMATCH';

export interface AuthUser {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
}

export interface Person {
  id?: string;
  age: number | null;
  gender: GenderType | null;
  is_voter: boolean;
}

export interface Household {
  id: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  landmark_description: string | null;
  house_type: HouseType;
  unit_id: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  persons: Person[];
  images: HouseholdImage[];
}

export interface HouseholdBrief {
  id: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  house_type: HouseType;
  created_at: string;
  distance_metres: number | null;
}

export interface HouseholdImage {
  id: string;
  household_id: string;
  image_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface HouseholdCreate {
  latitude: number;
  longitude: number;
  address_text?: string;
  landmark_description?: string;
  house_type: HouseType;
  unit_id?: string;
  persons: Person[];
  image_urls: string[];
}

export interface VerificationRecord {
  id: string;
  household_id: string;
  verified_by: string;
  status: VerificationStatus;
  notes: string | null;
  created_at: string;
}

export interface VerificationCreate {
  household_id: string;
  status: VerificationStatus;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Building {
  id: string;
  name: string;
  address_text: string | null;
  total_floors: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Unit {
  id: string;
  building_id: string;
  flat_number: string;
  floor_number: number | null;
  created_at: string;
}

export interface DuplicateCheckResult {
  has_duplicates: boolean;
  duplicates: HouseholdBrief[];
}

export interface BulkUploadResult {
  total: number;
  created: number;
  duplicates_skipped: number;
  errors: { index: number; detail: string }[];
}

export interface CollectionRecord {
  id: string;
  household_id: string;
  collected_by: string;
  total_people: number;
  total_voters: number;
  raw_data_json: Record<string, unknown> | null;
  created_at: string;
}