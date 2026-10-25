export const INTERESTS = ['passenger', 'commercial', 'industrial', 'driveline', 'grease', 'energy'] as const;
export type Interest = typeof INTERESTS[number];
export interface FieldError { field: string; code: string; message: string }
export interface Enquiry {
  requestId: string;
  language: 'en' | 'fr';
  name: string;
  company: string;
  email: string;
  interest: Interest;
  message: string;
  preferredBrand: string;
  productReference: string;
  viscosity: string;
  specification: string;
  quantity: string;
  destination: string;
  documents: string[];
}

const SHORT_FIELDS = ['preferredBrand', 'productReference', 'viscosity', 'specification', 'quantity', 'destination'] as const;
const FIELDS = new Set(['requestId', 'language', 'name', 'company', 'email', 'interest', 'message', 'documents', 'website', ...SHORT_FIELDS]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;

export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL.test(value) && !CONTROLS.test(value);
}

export function validateEnquiry(raw: unknown): { value?: Enquiry; fieldErrors: FieldError[] } {
  const errors: FieldError[] = [];
  const error = (field: string, code: string, message: string) => errors.push({ field, code, message });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { fieldErrors: [{ field: '_request', code: 'invalid_type', message: 'The request must be a JSON object.' }] };
  }
  const data = raw as Record<string, unknown>;
  for (const key of Object.keys(data)) {
    if (!FIELDS.has(key)) error(key, 'unknown_field', 'This field is not supported.');
  }
  function text(field: string, required = false, multiline = false, max = 254): string {
    const value = data[field];
    if (value === undefined) {
      if (required) error(field, 'required', 'Please complete this field.');
      return '';
    }
    if (typeof value !== 'string') {
      error(field, 'invalid_type', 'This field must be a string.');
      return '';
    }
    // In Unicode mode this detects lone surrogates but permits valid pairs.
    if (/[\uD800-\uDFFF]/u.test(value)) {
      error(field, 'invalid_unicode', 'This field contains invalid Unicode text.');
      return '';
    }
    if (value.length > max) {
      error(field, 'max_length', `Use at most ${max} characters.`);
      return '';
    }
    const normalized = multiline ? value.replace(/\r\n/g, '\n') : value;
    if (CONTROLS.test(multiline ? normalized.replace(/\n/g, '') : normalized)) {
      error(field, 'control_characters', 'Control characters are not allowed in this field.');
      return '';
    }
    const trimmed = normalized.trim();
    if (required && !trimmed) error(field, 'required', 'Please complete this field.');
    return trimmed;
  }

  const requestId = text('requestId', true);
  const language = text('language', true);
  const name = text('name', true);
  const company = text('company', true);
  const email = text('email', true);
  const interest = text('interest', true);
  const message = text('message', true, true, 5000);
  const optional = Object.fromEntries(SHORT_FIELDS.map(field => [field, text(field)])) as Record<typeof SHORT_FIELDS[number], string>;
  const website = text('website');
  if (requestId && !UUID.test(requestId)) error('requestId', 'invalid_uuid', 'Use a valid request UUID.');
  if (language && !['en', 'fr'].includes(language)) error('language', 'invalid_value', 'Choose en or fr.');
  if (email && !isEmail(email)) error('email', 'invalid_email', 'Please enter a valid email address.');
  if (interest && !INTERESTS.includes(interest as Interest)) error('interest', 'invalid_value', 'Choose a listed product category.');
  if (website) error('website', 'invalid_value', 'This field must be empty.');
  const documents: string[] = [];
  if (data.documents !== undefined) {
    if (!Array.isArray(data.documents)) {
      error('documents', 'invalid_type', 'Documents must be an array.');
    } else if (data.documents.length > 2) {
      error('documents', 'max_items', 'Choose at most two document types.');
    } else {
      for (const document of data.documents) {
        if (document !== 'TDS / PDS' && document !== 'SDS') error('documents', 'invalid_value', 'Choose TDS / PDS and/or SDS.');
        else if (documents.includes(document)) error('documents', 'duplicate_value', 'Document types must be unique.');
        else documents.push(document);
      }
    }
  }
  if (errors.length) return { fieldErrors: errors };
  return {
    value: { requestId, language: language as 'en' | 'fr', name, company, email, interest: interest as Interest, message, ...optional, documents },
    fieldErrors: [],
  };
}
