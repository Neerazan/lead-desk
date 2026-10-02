export type UserRole = 'admin' | 'member';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string | null;
  status: LeadStatus;
  owner_id: string;
  owner_name?: string | null;
  created_at: string;
}

export interface LeadCreateInput {
  name: string;
  email: string;
  company: string;
  website?: string | null;
  status?: LeadStatus;
}

export interface LeadUpdateInput {
  name?: string;
  email?: string;
  company?: string;
  website?: string | null;
  status?: LeadStatus;
}

export interface ApiMessageResponse {
  message: string;
}
