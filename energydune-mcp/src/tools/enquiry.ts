import companyData from '../data/company.json';
import productsData from '../data/products.json';
import {
  addError, readBrand, readCategory, readLanguage, readObject, readText, validationError,
  type FieldError, type Language, type ProductCategory, type RequestedDocument,
} from './types';

const categories = productsData.categories as ProductCategory[];
const MAILTO_MAX_LENGTH = 1800;

// HTML email inputs use this syntax family. Header controls are rejected by
// readText before the syntax check; recipient and subject are fixed, not user input.
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function readDocuments(input: Record<string, unknown>, errors: FieldError[], lang: Language): RequestedDocument[] {
  if (input.documents_requested !== undefined && input.docs_requested !== undefined) {
    addError(errors, 'documents_requested', 'conflicting_fields', 'Use documents_requested only; do not also supply docs_requested.', 'Utilisez uniquement documents_requested, sans docs_requested.', lang);
    return [];
  }
  const raw = input.documents_requested !== undefined ? input.documents_requested : input.docs_requested;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    addError(errors, 'documents_requested', 'invalid_type', 'Documents must be an array containing TDS/PDS and/or SDS.', 'Les documents doivent être une liste contenant TDS/PDS et/ou SDS.', lang);
    return [];
  }
  const documents: RequestedDocument[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') {
      addError(errors, 'documents_requested', 'invalid_document', 'Only TDS/PDS and SDS may be requested.', 'Seuls TDS/PDS et SDS peuvent être demandés.', lang);
      continue;
    }
    const normalized = value.trim().toUpperCase();
    const document = normalized === 'SDS' ? 'SDS' : /^TDS\s*\/\s*PDS$/.test(normalized) ? 'TDS / PDS' : undefined;
    if (!document || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)) {
      addError(errors, 'documents_requested', 'invalid_document', 'Only TDS/PDS and SDS may be requested.', 'Seuls TDS/PDS et SDS peuvent être demandés.', lang);
    } else if (!documents.includes(document)) {
      documents.push(document);
    }
  }
  return documents;
}

const emailLabels = {
  documentTitle: 'Product and supply enquiry', subject: 'Product enquiry | DUNE ENERGY GLOBAL',
  name: 'Name', company: 'Company', email: 'Email', category: 'Product category', brand: 'Brand',
  product_reference: 'Product / reference', viscosity_or_grade: 'Viscosity / consistency grade',
  specification_or_oem: 'Specification / OEM approval', quantity_packaging: 'Quantity / packaging',
  destination: 'Destination', documents_requested: 'Documents', requirements: 'Your requirements',
  notSpecified: 'Not specified',
} as const;

const messages = {
  en: {
    sendNote: 'Review the draft and send it from your email app. This tool has not sent or saved your enquiry.',
    longNote: 'Your enquiry is long. Copy the complete body into your email. The mailto link includes only the recipient and subject.',
  },
  fr: {
    sendNote: 'Vérifiez le brouillon et envoyez-le depuis votre messagerie. Cet outil n’a ni envoyé ni enregistré votre demande.',
    longNote: 'Votre demande est longue. Copiez le texte intégral dans votre courriel. Le lien mailto contient uniquement le destinataire et l’objet.',
  },
} as const;

/** Generate a draft only. No network, storage, logging or submission occurs. */
export function createEnquiryDraft(args: unknown = {}) {
  const errors: FieldError[] = [];
  const input = readObject(args, errors);
  const lang = readLanguage(input, errors);
  const name = readText(input, 'name', errors, lang, { required: true });
  const company = readText(input, 'company', errors, lang, { required: true });
  const email = readText(input, 'email', errors, lang, { required: true });
  const requirements = readText(input, 'requirements', errors, lang, { required: true, maxLength: 5000, multiline: true });
  const category = readCategory(input, errors, lang) ?? 'pcmo';
  const brand = readBrand(input, errors, lang);
  const product_reference = readText(input, 'product_reference', errors, lang);
  const viscosity_or_grade = readText(input, 'viscosity_or_grade', errors, lang);
  const specification_or_oem = readText(input, 'specification_or_oem', errors, lang);
  const quantity_packaging = readText(input, 'quantity_packaging', errors, lang);
  const destination = readText(input, 'destination', errors, lang);
  const documents_requested = readDocuments(input, errors, lang);
  if (email && !EMAIL_PATTERN.test(email)) {
    addError(errors, 'email', 'invalid_email', 'Please enter a valid email address.', 'Veuillez saisir une adresse courriel valide.', lang);
  }
  if (errors.length) return validationError(errors);

  // Required fields are guaranteed by validation above. Copying strings/arrays
  // into the response does not retain them after this stateless invocation.
  const selectedCategory = categories.find(item => item.id === category)!;
  const categoryName = lang === 'fr' ? selectedCategory.name_fr : selectedCategory.name_en;
  const summary = {
    name: name!, company: company!, email: email!, requirements: requirements!,
    category, category_name: categoryName, brand: brand ?? null,
    product_reference: product_reference ?? null, viscosity_or_grade: viscosity_or_grade ?? null,
    specification_or_oem: specification_or_oem ?? null, quantity_packaging: quantity_packaging ?? null,
    destination: destination ?? null, documents_requested,
  };
  // Keep the send-ready email in English per the service contract. User-supplied
  // requirements are preserved verbatim; only summary/UI messages are localised.
  const t = emailLabels;
  const localizedMessages = messages[lang];
  const body = [
    companyData.display_name,
    t.documentTitle,
    '',
    `${t.name}: ${summary.name}`,
    `${t.company}: ${summary.company}`,
    `${t.email}: ${summary.email}`,
    `${t.category}: ${selectedCategory.name_en}`,
    `${t.brand}: ${brand ?? t.notSpecified}`,
    `${t.product_reference}: ${product_reference ?? t.notSpecified}`,
    `${t.viscosity_or_grade}: ${viscosity_or_grade ?? t.notSpecified}`,
    `${t.specification_or_oem}: ${specification_or_oem ?? t.notSpecified}`,
    `${t.quantity_packaging}: ${quantity_packaging ?? t.notSpecified}`,
    `${t.destination}: ${destination ?? t.notSpecified}`,
    `${t.documents_requested}: ${documents_requested.length ? documents_requested.join(', ') : t.notSpecified}`,
    '',
    `${t.requirements}:`,
    requirements!,
  ].join('\n');
  const base = `mailto:${companyData.email}?subject=${encodeURIComponent(t.subject)}`;
  const fullDraft = `${base}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;
  const manual_copy_required = fullDraft.length > MAILTO_MAX_LENGTH;
  return {
    status: 'draft' as const,
    lang,
    draft_only: true,
    sent: false,
    persisted: false,
    summary,
    email: {
      to: companyData.email,
      subject: t.subject,
      body,
      mailto_url: manual_copy_required ? base : fullDraft,
      manual_copy_required,
    },
    next_step: manual_copy_required ? `${localizedMessages.longNote} ${localizedMessages.sendNote}` : localizedMessages.sendNote,
    brand_disclaimer: companyData.brand_disclaimer,
    brand_disclaimer_localized: lang === 'fr' ? companyData.brand_disclaimer_fr : companyData.brand_disclaimer,
    availability_note: companyData.availability_note,
    availability_note_localized: lang === 'fr' ? companyData.availability_note_fr : companyData.availability_note,
  };
}
