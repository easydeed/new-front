
export type PartnerCategory = 'title_company' | 'real_estate' | 'lender';
export type PartnerRole = 'title_officer' | 'realtor' | 'loan_officer';

export interface Partner {
  id: string;
  organization_id: string;
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
