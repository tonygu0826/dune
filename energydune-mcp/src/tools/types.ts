/** Shared, side-effect-free input validation for the category catalogue and draft tools. */
export type Language = 'en' | 'fr';
export type CategoryId = 'pcmo' | 'hdeo' | 'industrial' | 'driveline' | 'greases' | 'energy';
export type Segment = 'Automotive' | 'Commercial' | 'Industrial' | 'Energy';
export type Brand = 'SINOPEC' | 'Great Wall Lubricants';
export type RequestedDocument = 'TDS / PDS' | 'SDS';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationError {
  status: 'validation_error';
  field_errors: FieldError[];
}

export interface ProductCategory {
  id: CategoryId;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  segments: Segment[];
  spec_system: string;
  spec_system_fr: string;
  enquiry_notes_en: string[];
  enquiry_notes_fr: string[];
  search_terms: string[];
}

export interface ReadArgs { lang?: Language }
export interface ListProductCategoriesArgs extends ReadArgs { segment?: Segment }
export interface SearchProductsArgs extends ReadArgs {
  query?: string;
  category?: CategoryId;
  brand?: Brand;
  application?: string;
}
export interface GetEnquiryRequirementsArgs extends ReadArgs { category?: CategoryId }
export interface CreateEnquiryDraftArgs extends ReadArgs {
  name: string;
  company: string;
  email: string;
  requirements: string;
  category?: CategoryId;
  brand?: Brand;
  product_reference?: string;
  viscosity_or_grade?: string;
  specification_or_oem?: string;
  quantity_packaging?: string;
  destination?: string;
  documents_requested?: RequestedDocument[];
  /** Accepted alias; do not supply both document fields. */
  docs_requested?: RequestedDocument[];
}

export const CATEGORY_IDS: readonly CategoryId[] = ['pcmo', 'hdeo', 'industrial', 'driveline', 'greases', 'energy'];
export const SEGMENTS: readonly Segment[] = ['Automotive', 'Commercial', 'Industrial', 'Energy'];
export const BRANDS: readonly Brand[] = ['SINOPEC', 'Great Wall Lubricants'];

export function validationError(field_errors: FieldError[]): ValidationError {
  return { status: 'validation_error', field_errors };
}

export function addError(errors: FieldError[], field: string, code: string, en: string, fr: string, lang: Language): void {
  errors.push({ field, code, message: lang === 'fr' ? fr : en });
}

export function readObject(args: unknown, errors: FieldError[]): Record<string, unknown> {
  if (args === undefined) return {};
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    errors.push({ field: 'arguments', code: 'invalid_type', message: 'Arguments must be a JSON object.' });
    return {};
  }
  return args as Record<string, unknown>;
}

export function readLanguage(args: Record<string, unknown>, errors: FieldError[]): Language {
  if (args.lang === undefined) return 'en';
  if (args.lang === 'en' || args.lang === 'fr') return args.lang;
  errors.push({ field: 'lang', code: 'invalid_language', message: 'Use lang "en" or "fr".' });
  return 'en';
}

export function readText(
  args: Record<string, unknown>, field: string, errors: FieldError[], lang: Language,
  options: { required?: boolean; maxLength?: number; multiline?: boolean } = {},
): string | undefined {
  const raw = args[field];
  if (raw === undefined) {
    if (options.required) addError(errors, field, 'required', 'Please complete this field.', 'Veuillez remplir ce champ.', lang);
    return undefined;
  }
  if (typeof raw !== 'string') {
    addError(errors, field, 'invalid_type', 'This field must be a string.', 'Ce champ doit être une chaîne de caractères.', lang);
    return undefined;
  }
  // In Unicode mode a valid surrogate pair is one astral code point, outside
  // this range. Lone UTF-16 surrogates would make encodeURIComponent throw.
  if (/[\uD800-\uDFFF]/u.test(raw)) {
    addError(errors, field, 'invalid_unicode', 'This field contains invalid Unicode text.', 'Ce champ contient du texte Unicode non valide.', lang);
    return undefined;
  }
  const maxLength = options.maxLength ?? 254;
  if (raw.length > maxLength) {
    addError(errors, field, 'max_length', `Use at most ${maxLength} characters.`, `Utilisez au maximum ${maxLength} caractères.`, lang);
    return undefined;
  }
  // Only LF or CRLF line breaks are allowed in the requirements body. Single-line
  // fields reject all controls before trimming, including header-injection CR/LF.
  const controlCheck = options.multiline ? raw.replace(/\r\n/g, '\n').replace(/\n/g, '') : raw;
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(controlCheck)) {
    addError(errors, field, 'control_characters', 'Control characters are not allowed in this field.', 'Les caractères de contrôle ne sont pas autorisés dans ce champ.', lang);
    return undefined;
  }
  const value = (options.multiline ? raw.replace(/\r\n/g, '\n') : raw).trim();
  if (!value) {
    if (options.required) addError(errors, field, 'required', 'Please complete this field.', 'Veuillez remplir ce champ.', lang);
    return undefined;
  }
  return value;
}

export function readCategory(args: Record<string, unknown>, errors: FieldError[], lang: Language): CategoryId | undefined {
  const value = readText(args, 'category', errors, lang);
  if (value === undefined) return undefined;
  const normalized = value.toLowerCase();
  if (CATEGORY_IDS.includes(normalized as CategoryId)) return normalized as CategoryId;
  addError(errors, 'category', 'unsupported_category', `Choose one of: ${CATEGORY_IDS.join(', ')}.`, `Choisissez parmi : ${CATEGORY_IDS.join(', ')}.`, lang);
  return undefined;
}

export function readBrand(args: Record<string, unknown>, errors: FieldError[], lang: Language): Brand | undefined {
  const value = readText(args, 'brand', errors, lang);
  if (value === undefined) return undefined;
  const brand = BRANDS.find(item => item.toLowerCase() === value.toLowerCase());
  if (brand) return brand;
  addError(errors, 'brand', 'unsupported_brand', 'The listed enquiry brands are SINOPEC and Great Wall Lubricants. Supply is confirmed by quotation.', 'Les marques proposées pour une demande sont SINOPEC et Great Wall Lubricants. La disponibilité est confirmée par devis.', lang);
  return undefined;
}

export function readSegment(args: Record<string, unknown>, errors: FieldError[], lang: Language): Segment | undefined {
  const value = readText(args, 'segment', errors, lang);
  if (value === undefined) return undefined;
  const segment = SEGMENTS.find(item => item.toLowerCase() === value.toLowerCase());
  if (segment) return segment;
  addError(errors, 'segment', 'unsupported_segment', `Choose one of: ${SEGMENTS.join(', ')}.`, `Choisissez parmi : ${SEGMENTS.join(', ')}.`, lang);
  return undefined;
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
