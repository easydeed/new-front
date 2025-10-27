export const validators = {
  required: (label: string) => (value?: string) => (!value || !String(value).trim() ? `${label} is required` : null),
  apnFormat: (value?: string) => (value && !/^\d{3}-\d{3}-\d{3}$/.test(value) ? 'APN format should be 123-456-789' : null),
  name: (label: string) => (value?: string) => (!value || value.trim().length < 2 ? `${label} looks too short` : null),
};
