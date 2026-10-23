import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompanyInfo, getEnquiryRequirements, listProductCategories, searchProducts } from '../src/tools/catalogue.ts';
import { createEnquiryDraft } from '../src/tools/enquiry.ts';
import type { ValidationError } from '../src/tools/types.ts';

const AVAILABILITY_NOTE = 'Availability and specifications confirmed by quotation.';
const BRAND_DISCLAIMER = 'Brand names identify requested products, not authorised distribution.';
const buyer = {
  name: 'Test Buyer',
  company: 'Example Company',
  email: 'buyer@example.com',
  requirements: 'Please confirm the requested product specifications and quotation.',
};

function expectOk<T extends { status: 'ok' }>(result: T | ValidationError): T {
  if (result.status !== 'ok') assert.fail(JSON.stringify(result.field_errors));
  return result;
}

function expectDraft(result: ReturnType<typeof createEnquiryDraft>) {
  if (result.status !== 'draft') assert.fail(JSON.stringify(result.field_errors));
  return result;
}

function expectFieldError(result: { status: string } | ValidationError, field: string, code: string) {
  assert.equal(result.status, 'validation_error');
  if (result.status !== 'validation_error' || !('field_errors' in result)) assert.fail('Expected field-level validation errors.');
  assert.ok(result.field_errors.some(error => error.field === field && error.code === code), `${field}: expected ${code}`);
}

function resultIds(args: unknown) {
  return expectOk(searchProducts(args)).results.map(result => result.id);
}

test('company facts expose only the published contact and enquiry brands', () => {
  const { company } = expectOk(getCompanyInfo());
  assert.equal(company.legal_name, 'DUNE ENERGY GLOBAL INC.');
  assert.equal(company.display_name, 'DUNE ENERGY GLOBAL');
  assert.equal(company.website, 'https://energydune.com/');
  assert.equal(company.email, 'info@energydune.com');
  assert.deepEqual(company.brands, ['SINOPEC', 'Great Wall Lubricants']);
  assert.equal(company.brand_disclaimer, BRAND_DISCLAIMER);
  assert.equal(company.availability_note, AVAILABILITY_NOTE);
  assert.equal(company.catalogue_scope, 'category-level');
  for (const unsupported of ['phone', 'telephone', 'address', 'locations', 'certifications', 'authorised_distributor']) {
    assert.equal(unsupported in company, false, `${unsupported} must not be invented`);
  }
  const french = expectOk(getCompanyInfo({ lang: 'fr' })).company;
  assert.match(french.description, /produits énergétiques/);
  assert.match(french.brand_disclaimer_localized, /n’impliquent pas de distribution agréée/);
  assert.equal(french.brand_disclaimer, BRAND_DISCLAIMER);
});

test('the six real categories preserve overlapping website segments', () => {
  const all = expectOk(listProductCategories());
  assert.equal(all.count, 6);
  assert.deepEqual(all.categories.map(category => category.id), ['pcmo', 'hdeo', 'industrial', 'driveline', 'greases', 'energy']);
  assert.deepEqual(expectOk(listProductCategories({ segment: 'Automotive' })).categories.map(category => category.id), ['pcmo', 'driveline']);
  assert.deepEqual(expectOk(listProductCategories({ segment: 'Commercial' })).categories.map(category => category.id), ['hdeo', 'driveline', 'greases']);
  assert.deepEqual(expectOk(listProductCategories({ segment: 'Industrial' })).categories.map(category => category.id), ['industrial', 'greases']);
  assert.deepEqual(expectOk(listProductCategories({ segment: 'Energy' })).categories.map(category => category.id), ['energy']);
  assert.equal(expectOk(listProductCategories({ lang: 'fr' })).categories[2]?.name, 'Lubrifiants industriels');
  expectFieldError(listProductCategories({ segment: 'Imaginary segment' }), 'segment', 'unsupported_segment');
});

test('published examples resolve to categories without manufacturing SKU comparisons', () => {
  assert.deepEqual(resultIds({ query: 'heavy-duty diesel engine oils' }), ['hdeo']);
  assert.deepEqual(resultIds({ query: 'ISO VG 46 hydraulic oil' }), ['industrial']);
  const comparison = expectOk(searchProducts({ query: 'compare passenger car engine oils by SAE/API/ACEA' }));
  assert.deepEqual(comparison.results.map(result => result.id), ['pcmo']);
  assert.match(comparison.guidance, /Category-level information only/);
  assert.match(comparison.guidance, /No SKU catalogue, product performance comparisons/);
  assert.equal(comparison.results[0]?.spec_system, 'SAE · API / ACEA');
  assert.deepEqual(resultIds({ query: 'PCMO' }), ['pcmo']);
  assert.deepEqual(resultIds({ query: 'HDEO' }), ['hdeo']);
  assert.deepEqual(resultIds({ query: 'huile hydraulique ISO VG 46', lang: 'fr' }), ['industrial']);
  assert.deepEqual(resultIds({ query: 'graisses pour roulements', lang: 'fr' }), ['greases']);
});

test('query, category and application filters form an intersection', () => {
  assert.deepEqual(resultIds({ query: 'hydraulic', category: 'industrial', application: 'Industrial', brand: 'SINOPEC' }), ['industrial']);
  assert.deepEqual(resultIds({ query: 'hydraulic', category: 'pcmo' }), []);
  assert.deepEqual(resultIds({ query: 'hydraulic', application: 'Automotive' }), []);
  assert.deepEqual(resultIds({ query: 'grease', application: 'Commercial' }), ['greases']);
  assert.deepEqual(resultIds({ application: 'Automotive' }), ['pcmo', 'driveline']);
  assert.deepEqual(resultIds({ category: 'driveline' }), ['driveline']);
  assert.deepEqual(resultIds({ query: 'HDEO', application: 'unrecognised application' }), []);
});

test('unknown products and brand-only requests never populate the catalogue', () => {
  for (const args of [
    { query: 'unicorn reactor fluid ZX-9999' },
    { query: 'unknown product', brand: 'SINOPEC' },
    { query: 'unknown lubricants' },
    { query: 'SINOPEC' },
    { query: 'SINOPEC lubricants' },
    { brand: 'SINOPEC' },
    { brand: 'Great Wall Lubricants' },
  ]) {
    const result = expectOk(searchProducts(args));
    assert.equal(result.count, 0, JSON.stringify(args));
    assert.deepEqual(result.results, []);
    assert.match(result.guidance, /No matching category/);
    assert.equal(result.availability_note, AVAILABILITY_NOTE);
  }
  expectFieldError(searchProducts({ query: 'hydraulic', brand: 'Unlisted brand' }), 'brand', 'unsupported_brand');
  expectFieldError(searchProducts({ category: 'fictional_category' }), 'category', 'unsupported_category');
  expectFieldError(searchProducts({}), 'query', 'query_or_filter_required');
});

test('price and stock questions retain quotation boundaries and omit unsupported facts', () => {
  for (const query of ['What is the price?', 'Is it in stock?', 'price of passenger car engine oils', 'hydraulic oil stock and delivery time']) {
    const response = expectOk(searchProducts({ query }));
    assert.equal(response.availability_note, AVAILABILITY_NOTE);
    assert.equal(response.brand_disclaimer, BRAND_DISCLAIMER);
    assert.equal(response.data_scope, 'category-level');
    for (const result of response.results) {
      assert.equal(result.availability_note, AVAILABILITY_NOTE);
      for (const unsupported of ['sku', 'price', 'currency', 'stock', 'inventory', 'lead_time', 'oem_approvals', 'performance_rating']) {
        assert.equal(unsupported in result, false, `${unsupported} must not be invented`);
      }
    }
  }
});

test('search input bounds and language validation agree with the public schema', () => {
  assert.equal(expectOk(searchProducts({ query: 'x'.repeat(500) })).count, 0);
  expectFieldError(searchProducts({ query: 'x'.repeat(501) }), 'query', 'max_length');
  expectFieldError(searchProducts({ query: 'hydraulic', application: 'x'.repeat(255) }), 'application', 'max_length');
  expectFieldError(searchProducts({ query: 42 }), 'query', 'invalid_type');
  expectFieldError(getCompanyInfo({ lang: 'zh' }), 'lang', 'invalid_language');
  expectFieldError(getCompanyInfo(null), 'arguments', 'invalid_type');
});

test('enquiry requirements mirror the four required website fields and technical requests', () => {
  const requirements = expectOk(getEnquiryRequirements({ category: 'hdeo' }));
  assert.deepEqual(requirements.required_fields.map(field => field.field), ['name', 'company', 'email', 'requirements']);
  assert.deepEqual(requirements.optional_fields.map(field => field.field), [
    'category', 'brand', 'product_reference', 'viscosity_or_grade', 'specification_or_oem', 'quantity_packaging', 'destination', 'documents_requested',
  ]);
  assert.equal(requirements.required_fields.find(field => field.field === 'requirements')?.max_length, 5000);
  assert.equal(requirements.required_fields.find(field => field.field === 'email')?.max_length, 254);
  assert.equal(requirements.default_category, 'pcmo');
  assert.deepEqual(requirements.allowed_brands, ['SINOPEC', 'Great Wall Lubricants']);
  assert.deepEqual(requirements.documents_requested, ['TDS / PDS', 'SDS']);
  assert.match(requirements.category_notes[0]?.notes.join(' ') ?? '', /SAE.*API.*OEM/);
  const driveline = expectOk(getEnquiryRequirements({ category: 'driveline' }));
  assert.match(driveline.category_notes[0]?.notes.join(' ') ?? '', /ATF\/CVT\/DCT/);
  const french = expectOk(getEnquiryRequirements({ category: 'industrial', lang: 'fr' }));
  assert.equal(french.required_fields[0]?.label, 'Nom');
  assert.match(french.category_notes[0]?.notes.join(' ') ?? '', /ISO VG/);
});

test('a successful draft is unsent, unpersisted and contains a complete English enquiry', () => {
  const draft = expectDraft(createEnquiryDraft({
    ...buyer, category: 'industrial', brand: 'SINOPEC', product_reference: 'Requested hydraulic oil',
    viscosity_or_grade: 'ISO VG 46', specification_or_oem: 'Equipment requirement to be confirmed',
    quantity_packaging: '10 drums', destination: 'Montréal, Canada', documents_requested: ['TDS/PDS', 'SDS'],
  }));
  assert.deepEqual([draft.draft_only, draft.sent, draft.persisted], [true, false, false]);
  assert.equal(draft.email.to, 'info@energydune.com');
  assert.equal(draft.email.subject, 'Product enquiry | DUNE ENERGY GLOBAL');
  assert.match(draft.email.body, /Product and supply enquiry/);
  assert.match(draft.email.body, /Product category: Industrial lubricants/);
  assert.match(draft.email.body, /Viscosity \/ consistency grade: ISO VG 46/);
  assert.match(draft.email.body, /Destination: Montréal, Canada/);
  assert.match(draft.email.body, /Documents: TDS \/ PDS, SDS/);
  assert.ok(draft.email.body.endsWith(buyer.requirements));
  assert.equal(draft.availability_note, AVAILABILITY_NOTE);
  assert.equal(draft.brand_disclaimer, BRAND_DISCLAIMER);
  for (const unsupported of ['id', 'order_id', 'confirmation_id', 'submitted_at']) assert.equal(unsupported in draft, false);
});

test('French calls keep English email labels and subject while localising summary and messages', () => {
  const requirements = 'Merci de confirmer les spécifications.';
  const draft = expectDraft(createEnquiryDraft({ ...buyer, category: 'pcmo', requirements, lang: 'fr' }));
  assert.equal(draft.summary.category_name, 'Huiles moteur véhicules légers');
  assert.equal(draft.email.subject, 'Product enquiry | DUNE ENERGY GLOBAL');
  assert.match(draft.email.body, /Product category: Passenger car engine oils/);
  assert.match(draft.email.body, /Your requirements:/);
  assert.ok(draft.email.body.endsWith(requirements), 'User-provided requirements must not be translated or lost');
  assert.match(draft.next_step, /Vérifiez le brouillon/);
  assert.equal(draft.availability_note_localized, 'Disponibilité et spécifications confirmées par devis.');
  const error = createEnquiryDraft({ ...buyer, email: 'invalid', lang: 'fr' });
  expectFieldError(error, 'email', 'invalid_email');
  if (error.status === 'validation_error') assert.match(error.field_errors[0]?.message ?? '', /adresse courriel valide/);
});

test('draft values are trimmed, category defaults to PCMO, and normal multiline requirements survive', () => {
  const draft = expectDraft(createEnquiryDraft({
    ...buyer, name: '  Test Buyer  ', company: ' Example Company ', email: ' buyer@example.com ',
    requirements: '  First line\r\nSecond line\nThird line  ', brand: ' sinopec ', product_reference: '  requested reference  ',
  }));
  assert.equal(draft.summary.name, 'Test Buyer');
  assert.equal(draft.summary.company, 'Example Company');
  assert.equal(draft.summary.email, 'buyer@example.com');
  assert.equal(draft.summary.requirements, 'First line\nSecond line\nThird line');
  assert.equal(draft.summary.category, 'pcmo');
  assert.equal(draft.summary.brand, 'SINOPEC');
  assert.equal(draft.summary.product_reference, 'requested reference');
});

test('missing and wrongly typed required fields yield machine-readable field errors', () => {
  for (const field of ['name', 'company', 'email', 'requirements'] as const) {
    expectFieldError(createEnquiryDraft({ ...buyer, [field]: undefined }), field, 'required');
    expectFieldError(createEnquiryDraft({ ...buyer, [field]: '   ' }), field, 'required');
    expectFieldError(createEnquiryDraft({ ...buyer, [field]: 42 }), field, 'invalid_type');
  }
  const allMissing = createEnquiryDraft({});
  assert.equal(allMissing.status, 'validation_error');
  if (allMissing.status === 'validation_error') assert.equal(allMissing.field_errors.length, 4);
});

test('all short text limits and the 5000-character requirements limit are enforced', () => {
  const shortFields = ['name', 'company', 'product_reference', 'viscosity_or_grade', 'specification_or_oem', 'quantity_packaging', 'destination'] as const;
  for (const field of shortFields) {
    assert.equal(expectDraft(createEnquiryDraft({ ...buyer, [field]: 'x'.repeat(254) })).summary[field]?.length, 254);
    expectFieldError(createEnquiryDraft({ ...buyer, [field]: 'x'.repeat(255) }), field, 'max_length');
  }
  const longestEmail = `${'a'.repeat(242)}@example.com`;
  assert.equal(longestEmail.length, 254);
  assert.equal(expectDraft(createEnquiryDraft({ ...buyer, email: longestEmail })).summary.email, longestEmail);
  expectFieldError(createEnquiryDraft({ ...buyer, email: `a${longestEmail}` }), 'email', 'max_length');
  assert.equal(expectDraft(createEnquiryDraft({ ...buyer, requirements: 'x'.repeat(5000) })).summary.requirements.length, 5000);
  expectFieldError(createEnquiryDraft({ ...buyer, requirements: 'x'.repeat(5001) }), 'requirements', 'max_length');
  expectFieldError(createEnquiryDraft({ ...buyer, category: 'x'.repeat(255) }), 'category', 'max_length');
  expectFieldError(createEnquiryDraft({ ...buyer, brand: 'x'.repeat(255) }), 'brand', 'max_length');
});

test('control characters cannot inject headers or alter single-line fields', () => {
  for (const field of ['name', 'company', 'email', 'brand', 'product_reference', 'viscosity_or_grade', 'specification_or_oem', 'quantity_packaging', 'destination'] as const) {
    expectFieldError(createEnquiryDraft({ ...buyer, [field]: 'Buyer\r\nBcc: other@example.com' }), field, 'control_characters');
  }
  for (const control of ['\u0000', '\u0009', '\u000b', '\u000d', '\u007f', '\u0085', '\u2028', '\u2029']) {
    expectFieldError(createEnquiryDraft({ ...buyer, requirements: `Line${control}Injected` }), 'requirements', 'control_characters');
  }
  expectFieldError(createEnquiryDraft({ ...buyer, name: '\nBuyer' }), 'name', 'control_characters');
  expectFieldError(createEnquiryDraft({ ...buyer, email: 'not an email' }), 'email', 'invalid_email');
});

test('unpaired UTF-16 surrogates yield field errors before mailto encoding', () => {
  const textFields = [
    'name', 'company', 'email', 'requirements', 'category', 'brand', 'product_reference',
    'viscosity_or_grade', 'specification_or_oem', 'quantity_packaging', 'destination',
  ] as const;
  for (const field of textFields) {
    for (const surrogate of ['\uD800', '\uDC00']) {
      expectFieldError(createEnquiryDraft({ ...buyer, [field]: `Text${surrogate}value` }), field, 'invalid_unicode');
    }
  }
  const french = createEnquiryDraft({ ...buyer, requirements: '\uD800', lang: 'fr' });
  expectFieldError(french, 'requirements', 'invalid_unicode');
  if (french.status === 'validation_error') assert.match(french.field_errors[0]?.message ?? '', /Unicode non valide/);
  expectFieldError(searchProducts({ query: '\uDC00' }), 'query', 'invalid_unicode');
  expectFieldError(listProductCategories({ segment: '\uD800' }), 'segment', 'invalid_unicode');
});

test('valid astral Unicode is preserved in short drafts and long mailto fallbacks', () => {
  const requirements = 'Confirm specifications for the requested product 🌍🛢️.';
  const short = expectDraft(createEnquiryDraft({
    ...buyer, name: 'Buyer 🌍', company: 'Company 🚚', product_reference: 'Reference 🔧', requirements,
  }));
  assert.equal(short.summary.name, 'Buyer 🌍');
  assert.equal(short.summary.company, 'Company 🚚');
  assert.equal(short.summary.product_reference, 'Reference 🔧');
  assert.ok(short.email.body.endsWith(requirements));
  assert.equal(short.email.manual_copy_required, false);
  assert.equal(new URL(short.email.mailto_url).searchParams.get('body'), short.email.body.replace(/\n/g, '\r\n'));
  const longRequirements = '🌍'.repeat(2500);
  assert.equal(longRequirements.length, 5000);
  const long = expectDraft(createEnquiryDraft({ ...buyer, requirements: longRequirements }));
  assert.equal(long.summary.requirements, longRequirements);
  assert.ok(long.email.body.endsWith(longRequirements));
  assert.equal(long.email.manual_copy_required, true);
  assert.equal(new URL(long.email.mailto_url).searchParams.has('body'), false);
  const longestName = '🌍'.repeat(127);
  assert.equal(expectDraft(createEnquiryDraft({ ...buyer, name: longestName })).summary.name, longestName);
  expectFieldError(createEnquiryDraft({ ...buyer, name: `${longestName}🌍` }), 'name', 'max_length');
});

test('brands, categories and requested documents reject unsupported inputs', () => {
  expectFieldError(createEnquiryDraft({ ...buyer, brand: 'Unlisted brand' }), 'brand', 'unsupported_brand');
  expectFieldError(createEnquiryDraft({ ...buyer, category: 'fictional_category' }), 'category', 'unsupported_category');
  expectFieldError(createEnquiryDraft({ ...buyer, documents_requested: ['Certificate of approval'] }), 'documents_requested', 'invalid_document');
  expectFieldError(createEnquiryDraft({ ...buyer, documents_requested: [42] }), 'documents_requested', 'invalid_document');
  expectFieldError(createEnquiryDraft({ ...buyer, documents_requested: null }), 'documents_requested', 'invalid_type');
  expectFieldError(createEnquiryDraft({ ...buyer, documents_requested: ['SDS\nBcc: injected'] }), 'documents_requested', 'invalid_document');
  const draft = expectDraft(createEnquiryDraft({ ...buyer, brand: 'Great Wall Lubricants', documents_requested: ['TDS/PDS', 'TDS / PDS', 'SDS'] }));
  assert.deepEqual(draft.summary.documents_requested, ['TDS / PDS', 'SDS']);
  assert.deepEqual(expectDraft(createEnquiryDraft({ ...buyer, docs_requested: ['SDS'] })).summary.documents_requested, ['SDS']);
  expectFieldError(createEnquiryDraft({ ...buyer, documents_requested: ['SDS'], docs_requested: ['SDS'] }), 'documents_requested', 'conflicting_fields');
});

test('mailto contains the complete CRLF body through exactly 1800 encoded characters', () => {
  const baseline = expectDraft(createEnquiryDraft({ ...buyer, requirements: 'x' }));
  assert.equal(baseline.email.manual_copy_required, false);
  const url = new URL(baseline.email.mailto_url);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'info@energydune.com');
  assert.equal(url.searchParams.get('subject'), baseline.email.subject);
  assert.equal(url.searchParams.get('body'), baseline.email.body.replace(/\n/g, '\r\n'));
  const exactLength = 1800 - baseline.email.mailto_url.length + 1;
  assert.ok(exactLength > 1 && exactLength < 5000);
  const exact = expectDraft(createEnquiryDraft({ ...buyer, requirements: 'x'.repeat(exactLength) }));
  assert.equal(exact.email.mailto_url.length, 1800);
  assert.equal(exact.email.manual_copy_required, false);
  assert.ok(new URL(exact.email.mailto_url).searchParams.has('body'));
  const tooLong = expectDraft(createEnquiryDraft({ ...buyer, requirements: 'x'.repeat(exactLength + 1) }));
  assert.equal(tooLong.email.manual_copy_required, true);
  const fallback = new URL(tooLong.email.mailto_url);
  assert.equal(fallback.searchParams.has('body'), false);
  assert.equal(fallback.searchParams.get('subject'), tooLong.email.subject);
  assert.ok(tooLong.email.body.endsWith('x'.repeat(exactLength + 1)), 'Fallback must preserve the complete returned body');
});

test('long Unicode requirements remain complete when mailto body is omitted', () => {
  const requirements = 'é'.repeat(5000);
  const draft = expectDraft(createEnquiryDraft({ ...buyer, requirements, lang: 'fr' }));
  assert.equal(draft.email.manual_copy_required, true);
  assert.equal(new URL(draft.email.mailto_url).searchParams.has('body'), false);
  assert.ok(draft.email.body.endsWith(requirements));
  assert.equal(draft.summary.requirements, requirements);
  assert.match(draft.next_step, /Copiez le texte intégral/);
});

test('calls do not mutate caller input or expose shared mutable catalogue arrays', () => {
  const input = { ...buyer, documents_requested: ['TDS/PDS', 'SDS'] };
  const before = structuredClone(input);
  expectDraft(createEnquiryDraft(input));
  assert.deepEqual(input, before);
  const company = expectOk(getCompanyInfo());
  company.company.brands.push('Imaginary brand');
  assert.deepEqual(expectOk(getCompanyInfo()).company.brands, ['SINOPEC', 'Great Wall Lubricants']);
  const categories = expectOk(listProductCategories());
  categories.categories[0]?.segments.pop();
  categories.categories[0]?.enquiry_notes.pop();
  assert.deepEqual(expectOk(listProductCategories()).categories[0]?.segments, ['Automotive']);
  assert.equal(expectOk(listProductCategories()).categories[0]?.enquiry_notes.length, 2);
  const fields = expectOk(getEnquiryRequirements());
  fields.optional_fields.find(field => field.field === 'documents_requested')?.allowed_values?.push('Imaginary document');
  assert.deepEqual(expectOk(getEnquiryRequirements()).optional_fields.find(field => field.field === 'documents_requested')?.allowed_values, ['TDS / PDS', 'SDS']);
});
