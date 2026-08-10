/**
 * Phase 15 v5: Industry Partners Types
 * Purpose: Type definitions for title companies, real estate partners, lenders
 */

export type PartnerCategory =
  | 'title_company' | 'escrow_company' | 'notary' | 'attorney'
  | 'real_estate' | 'lender' | 'other';
export type PartnerRole =
  | 'title_officer' | 'escrow_officer' | 'notary_public' | 'attorney'
  | 'realtor' | 'loan_officer' | 'other';

export interface Partner {
  id: string;
  user_id: number;
  name: string;
  category: PartnerCategory;
  created_at?: string;
}

export interface PartnerPerson {
  id: string;
  partner_id: string;
  name: string;
  role: PartnerRole;
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface PartnerSelectItem {
  display: string; // e.g. "Acme Title — Jane Smith (Title Officer)"
  partner_id: string;
  person_id?: string;
  category: PartnerCategory;
  role?: PartnerRole;
}

export interface PartnerCreate {
  name: string;
  category: PartnerCategory;
  person?: {
    name: string;
    role?: PartnerRole;
    email?: string;
    phone?: string;
  };
}

