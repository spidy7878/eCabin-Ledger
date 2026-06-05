/**
 * Central API service for the eCabin Ledger backend.
 *
 * ⚙️  API_BASE_URL must point to wherever the Node.js server is reachable:
 *   • Same WiFi (physical device): use your Windows machine's LAN IP,
 *     e.g. "http://192.168.1.10:4000/api"
 *   • Android emulator (AVD):      "http://10.0.2.2:4000/api"
 *   • Production (SmartASP.NET):   "http://macron-001-site3.ktempurl.com/api"
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ecabin-server-production.up.railway.app/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Aircraft {
  AircraftId: number;
  MSN: string;
  Registration: string;
  AircraftType: string;
  DOM: string;
  IsActive: boolean;
}

export interface AircraftSummary extends Aircraft {
  galleyCount: number;
  lavatoryCount: number;
}

export interface Galley {
  GalleyId: number;
  AircraftId: number;
  GalleyCode: string;
  GalleyName: string;
  Location: string;
  GalleyType: string;
  Status: string;
  LastInspectionDate: string | null;
  NextInspectionDate: string | null;
  SubCatID: string | null;
}

export interface Lavatory {
  LavatoriesId: number;
  AircraftId: number;
  LavatoriesCode: string;
  LavatoriesName: string;
  Location: string;
  LavatoriesType: string;
  Status: string;
  LastInspectionDate: string | null;
  NextInspectionDate: string | null;
  Notes: string | null;
  SubCatID: string | null;
}

export interface AttendantSeat {
  AttendantSeatId: number;
  AircraftId: number;
  AttendantSeatCode: string;
  AttendantSeatName: string;
  Location: string;
  AttendantSeatType: string;
  Status: string;
  LastInspectionDate: string | null;
  NextInspectionDate: string | null;
  Notes: string | null;
  MSN: string | null;
  SubCatID: string | null;
}

export interface SubCategory {
  SubCatID: string;
  SubCatName: string;
  CatID: string;
}

export interface Part {
  PartID: number;
  PartName: string;
}

export interface IssueType {
  IssueID: number;
  IssueName: string;
  IssueCode: string;
  Categories: string;
  IssuePriority: string;
}

export interface DashboardStats {
  total: number;
  overdue: number;
  dueSoon: number;
  upcoming: number;
}

export interface AuditTask {
  AuditId: number;
  AircraftId: number;
  MSN: string;
  Registration: string;
  AircraftType: string;
  LastAuditDate: string;
  LastAuditBase: string;
  LastAuditPerson: string;
  IssuesReported: number;
  ExistingIssues: number;
  NextAuditDate: string;
  TaskStatus: 'Overdue' | 'Due Soon' | 'Upcoming';
}

export interface Dashboard {
  stats: DashboardStats;
  tasks: AuditTask[];
  role: string;
}

export interface AuthUser {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  email: string;
  employeeId: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface UploadResult {
  serverId: number | null;  // null for satisfied inspections (no DB row inserted)
  clientId: string | null;
  url: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

// ── Token management (set/get from outside — AuthContext injects it) ──────────
let _authToken: string | null = null;
export function setAuthToken(token: string | null) { _authToken = token; }

// Called by AuthContext so 401 responses trigger an automatic sign-out.
let _onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) { _onUnauthorized = cb; }

// ── Base fetcher ─────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    _authToken = null;
    _onUnauthorized?.();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Exported API ─────────────────────────────────────────────────────────────

export const api = {
  getAircraft:        ()              => request<Aircraft[]>('/aircraft'),
  getAircraftSummary: (id: number)    => request<AircraftSummary>(`/aircraft/${id}/summary`),
  getGalleys:         (aircraftId?: number) =>
    request<Galley[]>(aircraftId ? `/galleys?aircraftId=${aircraftId}` : '/galleys'),
  getGalleyById:      (id: number)    => request<Galley>(`/galleys/${id}`),
  getLavatories:      (aircraftId?: number) =>
    request<Lavatory[]>(aircraftId ? `/lavatories?aircraftId=${aircraftId}` : '/lavatories'),
  getLavatoryById:    (id: number)    => request<Lavatory>(`/lavatories/${id}`),
  getAttendantSeats:  (aircraftId?: number) =>
    request<AttendantSeat[]>(aircraftId ? `/attendantseats?aircraftId=${aircraftId}` : '/attendantseats'),
  getSubCategories:   (catId = '1')   => request<SubCategory[]>(`/subcategories?catId=${catId}`),
  getParts:           (subCatId: string, aircraftId: number) =>
    request<Part[]>(`/parts?subCatId=${subCatId}&aircraftId=${aircraftId}`),
  getIssueTypes:      ()              => request<IssueType[]>('/issues'),
  getDashboard:       ()              => request<Dashboard>('/dashboard'),

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Login uses its own fetch (not request()) so that a 401 wrong-credentials
  // response throws an error containing "401" rather than "Session expired".
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new Error(String(res.status));
    }
    return res.json() as Promise<LoginResponse>;
  },

  // ── Image upload (multipart) ──────────────────────────────────────────────
  async uploadImage(params: {
    localUri:    string;
    clientId:    string;
    aircraftId:  number;
    aircraftMsn: string;
    zoneType:    'seats' | 'galley' | 'lavatory' | 'attendant',
    zoneId:      number;
    zoneName:    string;
    partId?:     number;
    partName:    string;
    issueId?:    number;
    issueName?:  string;
    satisfaction: number;
    remarks?:    string;
  }): Promise<UploadResult> {
    const form = new FormData();
    form.append('image', {
      uri:  params.localUri,
      name: params.localUri.split('/').pop() ?? 'image.jpg',
      type: 'image/jpeg',
    } as any);
    form.append('client_id',    params.clientId);
    form.append('aircraft_id',  String(params.aircraftId));
    form.append('aircraft_msn', params.aircraftMsn);
    form.append('zone_type',    params.zoneType);
    form.append('zone_id',      String(params.zoneId));
    form.append('zone_name',    params.zoneName);
    if (params.partId) form.append('part_id', String(params.partId));
    form.append('part_name',    params.partName);
    form.append('issue_id',     String(params.issueId ?? ''));
    form.append('issue_name',   params.issueName ?? '');
    form.append('satisfaction', String(params.satisfaction));
    form.append('remarks',      params.remarks ?? '');

    const headers: Record<string, string> = {};
    if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

    const res = await fetch(`${API_BASE_URL}/inspections/upload`, {
      method:  'POST',
      headers,
      body:    form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<UploadResult>;
  },
};
