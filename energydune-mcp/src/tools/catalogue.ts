import productsData from '../data/products.json';
import companyData from '../data/company.json';
import {
  addError, normalizeSearch, readBrand, readCategory, readLanguage, readObject, readSegment, readText, validationError,
  type CategoryId, type FieldError, type Language, type ProductCategory,
} from './types';

const categories = productsData.categories as ProductCategory[];

export function publicCategory(category: ProductCategory, lang: Language) {
  return {
    id: category.id,
    name: lang === 'fr' ? category.name_fr : category.name_en,
    name_en: category.name_en,
    name_fr: category.name_fr,
    segments: [...category.segments],
    spec_system: lang === 'fr' ? category.spec_system_fr : category.spec_system,
    description: lang === 'fr' ? category.description_fr : category.description_en,
    enquiry_notes: [...(lang === 'fr' ? category.enquiry_notes_fr : category.enquiry_notes_en)],
    availability_note: companyData.availability_note,
    availability_note_localized: lang === 'fr' ? companyData.availability_note_fr : companyData.availability_note,
  };
}

export function getCompanyInfo(args: unknown = {}) {
  const errors: FieldError[] = [];
  const input = readObject(args, errors);
  const lang = readLanguage(input, errors);
  if (errors.length) return validationError(errors);
  return {
    status: 'ok' as const,
    lang,
    company: {
      legal_name: companyData.legal_name,
      display_name: companyData.display_name,
      description: lang === 'fr' ? companyData.description_fr : companyData.description_en,
      website: companyData.website,
      email: companyData.email,
      segments: [...companyData.segments],
      brands: [...companyData.brands],
      brand_disclaimer: companyData.brand_disclaimer,
      brand_disclaimer_localized: lang === 'fr' ? companyData.brand_disclaimer_fr : companyData.brand_disclaimer,
      availability_note: companyData.availability_note,
      availability_note_localized: lang === 'fr' ? companyData.availability_note_fr : companyData.availability_note,
      catalogue_scope: companyData.catalogue_scope,
      catalogue_limitations: lang === 'fr' ? companyData.catalogue_limitations_fr : companyData.catalogue_limitations_en,
    },
  };
}

export function listProductCategories(args: unknown = {}) {
  const errors: FieldError[] = [];
  const input = readObject(args, errors);
  const lang = readLanguage(input, errors);
  const segment = readSegment(input, errors, lang);
  if (errors.length) return validationError(errors);
  const results = categories.filter(category => !segment || category.segments.includes(segment));
  return {
    status: 'ok' as const,
    lang,
    data_scope: 'category-level' as const,
    count: results.length,
    categories: results.map(category => publicCategory(category, lang)),
    availability_note: companyData.availability_note,
  };
}

function phraseInQuery(query: string, phrase: string): boolean {
  return (` ${query} `).includes(` ${normalizeSearch(phrase)} `);
}

/** Match category intent, never a brand name or a shared generic word alone. */
function categoryMatches(query: string): Set<CategoryId> {
  const normalized = normalizeSearch(query);
  const matches = new Set<CategoryId>();
  for (const category of categories) {
    if (category.search_terms.some(term => phraseInQuery(normalized, term))) matches.add(category.id);
  }
  // Unqualified gear oils span these two published categories. A specific
  // industrial/automotive/transmission term takes priority over the broad name.
  if (!matches.size && /\b(?:gear oils?|huiles? (?:pour |d )?engrenages?)\b/.test(normalized)) {
    matches.add('industrial');
    matches.add('driveline');
  }
  // Deliberately limit generic family queries to complete recognised phrases:
  // an unknown product containing "oil" or "lubricants" must not match all.
  if (!matches.size && ['engine oil', 'engine oils', 'motor oil', 'motor oils', 'huile moteur', 'huiles moteur'].includes(normalized)) {
    matches.add('pcmo');
    matches.add('hdeo');
  }
  if (!matches.size && ['lubricants', 'all lubricants', 'lubrifiants', 'tous les lubrifiants'].includes(normalized)) {
    for (const category of categories) if (category.id !== 'energy') matches.add(category.id);
  }
  return matches;
}

function applicationMatches(application: string): Set<CategoryId> {
  const normalized = normalizeSearch(application);
  const segmentAliases: Record<string, string> = {
    automotive: 'Automotive', automobile: 'Automotive',
    commercial: 'Commercial', 'commercial vehicles': 'Commercial', 'poids lourds': 'Commercial',
    industrial: 'Industrial', industriel: 'Industrial', industrie: 'Industrial',
    energy: 'Energy', energie: 'Energy',
  };
  const segment = segmentAliases[normalized];
  if (segment) return new Set(categories.filter(category => category.segments.some(item => item === segment)).map(category => category.id));
  return categoryMatches(application);
}

export function searchProducts(args: unknown = {}) {
  const errors: FieldError[] = [];
  const input = readObject(args, errors);
  const lang = readLanguage(input, errors);
  const query = readText(input, 'query', errors, lang, { maxLength: 500 });
  const category = readCategory(input, errors, lang);
  const brand = readBrand(input, errors, lang);
  const application = readText(input, 'application', errors, lang);
  if (!query && !category && !brand && !application && !errors.length) {
    addError(errors, 'query', 'query_or_filter_required', 'Provide a product query, category, brand or application.', 'Indiquez un produit, une catégorie, une marque ou une application.', lang);
  }
  if (errors.length) return validationError(errors);

  const queryMatches = query ? categoryMatches(query) : undefined;
  const applicationIds = application ? applicationMatches(application) : undefined;
  // A supported brand records the customer's preference. It is not evidence
  // that any individual product or every category is offered under that brand.
  const hasProductIntent = Boolean(query || category || application);
  const results = hasProductIntent ? categories.filter(item =>
    (!category || item.id === category) &&
    (!queryMatches || queryMatches.has(item.id)) &&
    (!applicationIds || applicationIds.has(item.id)),
  ) : [];
  const guidance = results.length
    ? (lang === 'fr' ? companyData.catalogue_limitations_fr : companyData.catalogue_limitations_en)
    : (lang === 'fr'
      ? 'Aucune catégorie correspondante. Précisez le type de produit ou préparez une demande à info@energydune.com. Une marque seule ne confirme aucun produit disponible.'
      : 'No matching category. Try a product type or prepare an enquiry to info@energydune.com. A brand alone does not confirm any product availability.');
  return {
    status: 'ok' as const,
    lang,
    data_scope: 'category-level' as const,
    count: results.length,
    results: results.map(item => publicCategory(item, lang)),
    requested_brand: brand ?? null,
    brand_disclaimer: companyData.brand_disclaimer,
    brand_disclaimer_localized: lang === 'fr' ? companyData.brand_disclaimer_fr : companyData.brand_disclaimer,
    availability_note: companyData.availability_note,
    availability_note_localized: lang === 'fr' ? companyData.availability_note_fr : companyData.availability_note,
    guidance,
  };
}

export function getEnquiryRequirements(args: unknown = {}) {
  const errors: FieldError[] = [];
  const input = readObject(args, errors);
  const lang = readLanguage(input, errors);
  const category = readCategory(input, errors, lang);
  if (errors.length) return validationError(errors);
  const fields = companyData.enquiry_fields.map(field => {
    const { label_en, label_fr, ...definition } = structuredClone(field);
    return { ...definition, label: lang === 'fr' ? label_fr : label_en };
  });
  return {
    status: 'ok' as const,
    lang,
    required_fields: fields.filter(field => field.required),
    optional_fields: fields.filter(field => !field.required),
    default_category: 'pcmo' as const,
    allowed_brands: [...companyData.brands],
    documents_requested: [...companyData.documents_requested],
    category_notes: categories.filter(item => !category || item.id === category).map(item => ({
      category: item.id,
      name: lang === 'fr' ? item.name_fr : item.name_en,
      notes: [...(lang === 'fr' ? item.enquiry_notes_fr : item.enquiry_notes_en)],
    })),
    email: companyData.email,
    draft_only: true,
    brand_disclaimer: companyData.brand_disclaimer,
    brand_disclaimer_localized: lang === 'fr' ? companyData.brand_disclaimer_fr : companyData.brand_disclaimer,
    availability_note: companyData.availability_note,
    availability_note_localized: lang === 'fr' ? companyData.availability_note_fr : companyData.availability_note,
  };
}
