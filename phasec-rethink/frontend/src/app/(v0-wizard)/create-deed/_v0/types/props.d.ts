export interface PropertySearchProps {
  address: string;
  onChange: (value: string) => void;
  onVerify: () => void;
  suggestions?: Array<{ id: string; label: string; secondary?: string }>;
  onSelectSuggestion?: (id: string) => void;
  verified?: boolean;
  loading?: boolean;
  error?: string | null;
  // Enrichment display (read-only chips)
  apn?: string;
  county?: string;
  legalDescription?: string;
  owner?: string;
}
