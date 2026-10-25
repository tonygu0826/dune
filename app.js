'use strict';
const translations = {
  "en": {
    "skip": "Skip to content",
    "navAbout": "About",
    "navExpertise": "Products",
    "getInTouch": "Enquire",
    "heroEyebrow": "ENERGY PRODUCTS & MULTI-BRAND LUBRICANTS",
    "heroTitle": "Energy &",
    "heroTitleItalic": "lubricants.",
    "heroDescription": "Multi-brand products for automotive, industrial and energy applications.",
    "explore": "Explore products",
    "meetDune": "Get in touch",
    "aboutLabel": "DUNE ENERGY GLOBAL",
    "aboutTitle": "A focused partner.",
    "aboutTitleItalic": "A broader choice.",
    "aboutLead": "DUNE ENERGY GLOBAL supplies energy products and multi-brand lubricants for automotive, commercial vehicle and industrial applications, with enquiries shaped around your brand preferences, product specifications, quantities and delivery requirements.",
    "contactLabel": "CONTACT",
    "contactTitle": "Let’s talk products.",
    "startConversation": "Start an enquiry",
    "footerTagline": "Energy products. Multi-brand lubricants.",
    "downloadLogo": "Download our logo",
    "rights": "All rights reserved.",
    "privacy": "Privacy Policy",
    "terms": "Terms of Use",
    "backTop": "Back to top",
    "inquiryTitle": "Your product enquiry.",
    "inquiryDescription": "Tell us the product and quantity you need.",
    "nameLabel": "Name",
    "companyLabel": "Company",
    "emailLabel": "Email",
    "interestLabel": "Product category",
    "messageLabel": "Your requirements",
    "formNote": "We use your details to handle this enquiry.",
    "prepareInquiry": "Send enquiry",
    "inquiryReady": "Your enquiry has been submitted.",
    "inquiryReadyBody": "Thank you for contacting DUNE ENERGY GLOBAL.",
    "inquirySending": "Submitting your enquiry…",
    "inquirySendingBody": "Please wait for confirmation.",
    "inquiryUnconfirmed": "Submission not confirmed.",
    "inquirySendError": "Please try again. For help, contact info@energydune.com.",
    "inquiryRateLimited": "Please wait a minute before trying again.",
    "inquiryUnavailable": "Online enquiries are temporarily unavailable. Please try again later.",
    "inquiryConflict": "We could not confirm this request. Review the enquiry before trying again.",
    "inquiryInvalid": "Please review the enquiry fields before trying again.",
    "retryInquiry": "Try again",
    "startAnotherInquiry": "Start another enquiry",
    "invalidField": "Please check this field.",
    "copyInquiry": "Copy enquiry",
    "downloadInquiry": "Download .txt",
    "editInquiry": "← Edit enquiry",
    "copySuccess": "Enquiry copied.",
    "copyFailure": "Automatic copying is unavailable. Select the text above or download the .txt file.",
    "menuOpen": "Open menu",
    "menuClose": "Close menu",
    "close": "Close dialog",
    "switchLanguage": "Switch to French",
    "home": "DUNE ENERGY GLOBAL — home",
    "navLabel": "Main navigation",
    "mobileNavLabel": "Mobile navigation",
    "heroAlt": "Clean precision steel gears with a ribbon of amber lubricating oil against a cool industrial background",
    "pageTitle": "DUNE ENERGY GLOBAL — Energy & Lubricants",
    "metaDescription": "Energy products and multi-brand lubricants for automotive, commercial and industrial applications. Contact DUNE ENERGY GLOBAL for product enquiries.",
    "navBrands": "Brands",
    "productsTitle": "Our products.",
    "productsIntro": "Automotive. Commercial. Industrial.",
    "filterAll": "All products",
    "filterAutomotive": "Automotive",
    "filterCommercial": "Commercial",
    "filterIndustrial": "Industrial",
    "filterEnergy": "Energy",
    "filterLabel": "Filter product categories",
    "productCount": "Categories: {n}",
    "productQuote": "Enquire",
    "productsNote": "Availability and specifications confirmed by quotation.",
    "brandsTitle": "Your preferred brands.",
    "brandsBody": "Select a brand to enquire.",
    "brandsNote": "Brand names identify requested products, not authorised distribution. Availability is confirmed by quotation.",
    "brandAsk": "Prepare an enquiry for {brand}",
    "brandLabel": "Brand",
    "referenceLabel": "Product / reference",
    "viscosityLabel": "Viscosity / consistency grade",
    "specificationLabel": "Specification / OEM approval",
    "quantityLabel": "Quantity / packaging",
    "destinationLabel": "Destination",
    "documentsLabel": "Documents",
    "optional": "Optional",
    "brandPlaceholder": "Brand name",
    "referencePlaceholder": "Product name or reference",
    "viscosityPlaceholder": "SAE 5W-30 / ISO VG 46 / NLGI 2",
    "specificationPlaceholder": "API / ACEA / OEM requirement",
    "quantityPlaceholder": "Quantity and pack size",
    "destinationPlaceholder": "City, country",
    "messagePlaceholder": "Product, quantity and delivery requirements",
    "notSpecified": "Not specified",
    "inquiryDocumentTitle": "Product and supply enquiry",
    "product1Title": "Passenger car engine oils",
    "product1Body": "Engine oils matched to vehicle requirements.",
    "product1Tag": "SAE · API / ACEA",
    "product2Title": "Heavy-duty diesel engine oils",
    "product2Body": "For commercial vehicles and off-highway equipment.",
    "product2Tag": "SAE · API / OEM",
    "product3Title": "Industrial lubricants",
    "product3Body": "Hydraulic, gear and compressor oils.",
    "product3Tag": "ISO VG",
    "product4Title": "Transmission & gear oils",
    "product4Body": "ATF, CVT, DCT and automotive gear oils.",
    "product4Tag": "ATF / MTF · OEM",
    "product5Title": "Lubricating greases",
    "product5Body": "Bearing and multipurpose greases.",
    "product5Tag": "NLGI",
    "product6Title": "Energy products",
    "product6Body": "Enquiries by product, specification and destination.",
    "product6Tag": "GRADE / VOLUME",
    "productListLabel": "Product categories",
    "productScrollPrevious": "Previous product categories",
    "productScrollNext": "Next product categories",
    "brandNoteLabel": "Brand information",
    "moreSpecifications": "Additional specifications",
    "requiredField": "Please complete this field.",
    "invalidEmail": "Please enter a valid email address.",
    "categoryIndustrial": "INDUSTRIAL",
    "categoryDriveline": "DRIVELINE",
    "categoryGrease": "GREASES",
    "categoryEnergy": "ENERGY",
    "backToWebsite": "Back to website",
    "enquiryPageTitle": "Product enquiry | DUNE ENERGY GLOBAL",
    "enquiryPageDescription": "Send a product and supply enquiry to DUNE ENERGY GLOBAL."
  },
  "fr": {
    "skip": "Aller au contenu",
    "navAbout": "À propos",
    "navExpertise": "Produits",
    "getInTouch": "Demander un prix",
    "heroEyebrow": "ÉNERGIE & LUBRIFIANTS MULTIMARQUES",
    "heroTitle": "Énergie &",
    "heroTitleItalic": "lubrifiants.",
    "heroDescription": "Des produits multimarques pour l’automobile, l’industrie et l’énergie.",
    "explore": "Voir les produits",
    "meetDune": "Nous joindre",
    "aboutLabel": "DUNE ENERGY GLOBAL",
    "aboutTitle": "Un partenaire à l’écoute.",
    "aboutTitleItalic": "Un choix élargi.",
    "aboutLead": "DUNE ENERGY GLOBAL propose des produits énergétiques et des lubrifiants multimarques pour les véhicules légers, les poids lourds et l’industrie. Chaque demande tient compte de vos marques, spécifications, quantités et besoins de livraison.",
    "contactLabel": "CONTACT",
    "contactTitle": "Parlons de vos besoins.",
    "startConversation": "Demander un prix",
    "footerTagline": "Produits énergétiques. Lubrifiants multimarques.",
    "downloadLogo": "Télécharger le logo",
    "rights": "Tous droits réservés.",
    "privacy": "Politique de confidentialité",
    "terms": "Conditions d’utilisation",
    "backTop": "Haut de page",
    "inquiryTitle": "Votre demande de prix.",
    "inquiryDescription": "Précisez le produit et la quantité souhaités.",
    "nameLabel": "Nom",
    "companyLabel": "Entreprise",
    "emailLabel": "Courriel",
    "interestLabel": "Catégorie de produits",
    "messageLabel": "Vos besoins",
    "formNote": "Nous utilisons vos coordonnées pour traiter cette demande.",
    "prepareInquiry": "Envoyer la demande",
    "inquiryReady": "Votre demande a été transmise.",
    "inquiryReadyBody": "Merci d’avoir contacté DUNE ENERGY GLOBAL.",
    "inquirySending": "Transmission de votre demande…",
    "inquirySendingBody": "Veuillez attendre la confirmation.",
    "inquiryUnconfirmed": "Transmission non confirmée.",
    "inquirySendError": "Veuillez réessayer. Pour obtenir de l’aide, contactez info@energydune.com.",
    "inquiryRateLimited": "Patientez une minute avant de réessayer.",
    "inquiryUnavailable": "Les demandes en ligne sont temporairement indisponibles. Veuillez réessayer plus tard.",
    "inquiryConflict": "Nous n’avons pas pu confirmer cette demande. Vérifiez son contenu avant de réessayer.",
    "inquiryInvalid": "Veuillez vérifier les champs de votre demande avant de réessayer.",
    "retryInquiry": "Réessayer",
    "startAnotherInquiry": "Nouvelle demande",
    "invalidField": "Veuillez vérifier ce champ.",
    "copyInquiry": "Copier la demande",
    "downloadInquiry": "Télécharger .txt",
    "editInquiry": "← Modifier la demande",
    "copySuccess": "Demande copiée.",
    "copyFailure": "La copie automatique est indisponible. Sélectionnez le texte ci-dessus ou téléchargez le fichier .txt.",
    "menuOpen": "Ouvrir le menu",
    "menuClose": "Fermer le menu",
    "close": "Fermer la fenêtre",
    "switchLanguage": "Passer à l’anglais",
    "home": "DUNE ENERGY GLOBAL — accueil",
    "navLabel": "Navigation principale",
    "mobileNavLabel": "Navigation mobile",
    "heroAlt": "Engrenages en acier de précision et ruban d’huile lubrifiante ambrée sur fond industriel aux tons froids",
    "pageTitle": "DUNE ENERGY GLOBAL — Énergie et lubrifiants",
    "metaDescription": "Produits énergétiques et lubrifiants multimarques pour véhicules légers, poids lourds et industrie. Demandez un prix à DUNE ENERGY GLOBAL.",
    "navBrands": "Marques",
    "productsTitle": "Nos produits.",
    "productsIntro": "Automobile. Poids lourds. Industrie.",
    "filterAll": "Tous les produits",
    "filterAutomotive": "Automobile",
    "filterCommercial": "Poids lourds",
    "filterIndustrial": "Industrie",
    "filterEnergy": "Énergie",
    "filterLabel": "Filtrer les catégories de produits",
    "productCount": "Catégories : {n}",
    "productQuote": "Demander un prix",
    "productsNote": "Disponibilité et spécifications confirmées par devis.",
    "brandsTitle": "Vos marques préférées.",
    "brandsBody": "Choisissez une marque pour votre demande.",
    "brandsNote": "Les marques identifient les produits demandés et n’impliquent pas de distribution agréée. Disponibilité confirmée par devis.",
    "brandAsk": "Préparer une demande pour {brand}",
    "brandLabel": "Marque",
    "referenceLabel": "Produit / référence",
    "viscosityLabel": "Grade de viscosité / consistance",
    "specificationLabel": "Norme / homologation",
    "quantityLabel": "Quantité / emballage",
    "destinationLabel": "Destination",
    "documentsLabel": "Documents",
    "optional": "Facultatif",
    "brandPlaceholder": "Nom de la marque",
    "referencePlaceholder": "Nom ou référence du produit",
    "viscosityPlaceholder": "SAE 5W-30 / ISO VG 46 / NLGI 2",
    "specificationPlaceholder": "API / ACEA / exigence OEM",
    "quantityPlaceholder": "Quantité et format",
    "destinationPlaceholder": "Ville, pays",
    "messagePlaceholder": "Produit, quantité et livraison souhaitée",
    "notSpecified": "Non précisé",
    "inquiryDocumentTitle": "Demande de produits et d’approvisionnement",
    "product1Title": "Huiles moteur véhicules légers",
    "product1Body": "Selon les exigences du véhicule.",
    "product1Tag": "SAE · API / ACEA",
    "product2Title": "Huiles moteur poids lourds",
    "product2Body": "Pour véhicules commerciaux et équipements hors route.",
    "product2Tag": "SAE · API / OEM",
    "product3Title": "Lubrifiants industriels",
    "product3Body": "Huiles hydrauliques, pour engrenages et compresseurs.",
    "product3Tag": "ISO VG",
    "product4Title": "Huiles de transmission",
    "product4Body": "ATF, CVT, DCT et huiles d’engrenages automobiles.",
    "product4Tag": "ATF / MTF · OEM",
    "product5Title": "Graisses lubrifiantes",
    "product5Body": "Graisses polyvalentes et pour roulements.",
    "product5Tag": "NLGI",
    "product6Title": "Produits énergétiques",
    "product6Body": "Demandes par produit, spécification et destination.",
    "product6Tag": "SPÉC. / VOLUME",
    "productListLabel": "Catégories de produits",
    "productScrollPrevious": "Catégories précédentes",
    "productScrollNext": "Catégories suivantes",
    "brandNoteLabel": "À propos des marques",
    "moreSpecifications": "Autres spécifications",
    "requiredField": "Veuillez remplir ce champ.",
    "categoryIndustrial": "INDUSTRIE",
    "categoryDriveline": "TRANSMISSION",
    "categoryGrease": "GRAISSES",
    "categoryEnergy": "ÉNERGIE",
    "invalidEmail": "Veuillez saisir une adresse courriel valide.",
    "backToWebsite": "Retour au site",
    "enquiryPageTitle": "Demande de prix | DUNE ENERGY GLOBAL",
    "enquiryPageDescription": "Envoyez une demande de produits et d’approvisionnement à DUNE ENERGY GLOBAL."
  }
};

let language = 'en';
try { language = localStorage.getItem('dune-language') === 'fr' ? 'fr' : 'en'; } catch { /* Storage is optional. */ }
const pageParameters = new URLSearchParams(window.location.search);
const requestedLanguage = pageParameters.get('lang');
if (requestedLanguage === 'en' || requestedLanguage === 'fr') language = requestedLanguage;
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const form = document.querySelector('#inquiry-form');
const result = document.querySelector('#inquiry-result');
const preview = document.querySelector('#inquiry-preview');
const status = document.querySelector('#copy-status');
let inquiryText = '';
const sendInquiryButton = document.querySelector('#send-inquiry');
const inquiryResultTitle = document.querySelector('#inquiry-result-title');
const inquiryResultBody = document.querySelector('#inquiry-result-body');
const formSubmitButton = form?.querySelector('[type="submit"]');
let inquiryPhase = 'idle';
let inquiryError = '';
let requestInFlight = false;
let activeRequest = null;
let activeRequestSignature = '';

function updateInquiryState() {
  if (!form) return;
  const t = translations[language];
  const pending = inquiryPhase === 'sending';
  const accepted = inquiryPhase === 'accepted';
  const errorKeys = { rate_limited: 'inquiryRateLimited', service_unavailable: 'inquiryUnavailable', request_conflict: 'inquiryConflict', validation_error: 'inquiryInvalid' };
  inquiryResultTitle.textContent = t[pending ? 'inquirySending' : accepted ? 'inquiryReady' : 'inquiryUnconfirmed'];
  inquiryResultBody.textContent = t[pending ? 'inquirySendingBody' : accepted ? 'inquiryReadyBody' : errorKeys[inquiryError] || 'inquirySendError'];
  result.dataset.state = inquiryPhase;
  result.setAttribute('aria-busy', String(pending));
  formSubmitButton.disabled = requestInFlight;
  sendInquiryButton.hidden = accepted || inquiryError === 'validation_error' || inquiryError === 'request_conflict';
  sendInquiryButton.disabled = requestInFlight;
  sendInquiryButton.textContent = t[pending ? 'inquirySending' : 'retryInquiry'];
  for (const button of result.querySelectorAll('button:not(#send-inquiry)')) button.disabled = requestInFlight;
  document.querySelector('#edit-inquiry').textContent = t[accepted ? 'startAnotherInquiry' : 'editInquiry'];
}

function createInquiryRequestId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function prepareInquiryRequest() {
  const data = new FormData(form);
  const fields = ['name', 'company', 'email', 'interest', 'preferredBrand', 'productReference', 'message', 'viscosity', 'specification', 'quantity', 'destination', 'website'];
  const payload = Object.fromEntries(fields.map(name => [name, String(data.get(name) || '').trim()]));
  payload.language = language;
  payload.documents = data.getAll('documents');
  const signature = JSON.stringify(payload);
  if (!activeRequest || signature !== activeRequestSignature) {
    activeRequest = { ...payload, requestId: createInquiryRequestId() };
    activeRequestSignature = signature;
  }
}

function getInquiryEndpoint() {
  const configured = document.querySelector('meta[name="dune-enquiry-endpoint"]')?.content;
  if (!configured) return null;
  try {
    const endpoint = new URL(configured);
    return endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password && endpoint.pathname === '/enquiries' && !endpoint.search && !endpoint.hash ? endpoint.href : null;
  } catch { return null; }
}

async function submitInquiry() {
  if (requestInFlight || !activeRequest) return;
  requestInFlight = true;
  inquiryPhase = 'sending';
  inquiryError = '';
  updateInquiryState();
  const endpoint = getInquiryEndpoint();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    if (!endpoint) {
      inquiryError = 'service_unavailable';
      throw new Error('Enquiry endpoint is not configured');
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeRequest),
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    const payload = await response.json();
    if (response.status !== 202 || payload.status !== 'accepted' || payload.requestId !== activeRequest.requestId) {
      inquiryError = response.status === 429 ? 'rate_limited' : response.status === 503 ? 'service_unavailable' : typeof payload.code === 'string' ? payload.code : '';
      if (payload.code === 'validation_error' && Array.isArray(payload.fieldErrors)) {
        for (const error of payload.fieldErrors) {
          const input = form.elements.namedItem(error.field);
          if (input && typeof input.setCustomValidity === 'function') {
            input.setCustomValidity(translations[language][error.code === 'required' ? 'requiredField' : error.field === 'email' ? 'invalidEmail' : 'invalidField']);
          }
        }
      }
      throw new Error('Enquiry submission was not confirmed');
    }
    inquiryPhase = 'accepted';
  } catch {
    inquiryPhase = 'error';
  } finally {
    clearTimeout(timer);
    requestInFlight = false;
    updateInquiryState();
    inquiryResultTitle.focus();
  }
}

function setMenu(open) {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', translations[language][open ? 'menuClose' : 'menuOpen']);
  mobileNav.hidden = !open;
}
function formatInquiry() {
  const data = new FormData(form);
  const t = translations[language];
  const fields = [['name', 'nameLabel'], ['company', 'companyLabel'], ['email', 'emailLabel'], ['interest', 'interestLabel'], ['preferredBrand', 'brandLabel'], ['productReference', 'referenceLabel'], ['viscosity', 'viscosityLabel'], ['specification', 'specificationLabel'], ['quantity', 'quantityLabel'], ['destination', 'destinationLabel'], ['documents', 'documentsLabel']];
  const lines = fields.map(([name, label]) => {
    let value = name === 'interest' ? form.elements.interest.selectedOptions[0].textContent : name === 'documents' ? data.getAll(name).join(', ') : String(data.get(name) || '').trim();
    return `${t[label]}: ${value || t.notSpecified}`;
  });
  return `DUNE ENERGY GLOBAL\n${t.inquiryDocumentTitle}\n\n${lines.join('\n')}\n\n${t.messageLabel}:\n${String(data.get('message') || '').trim()}`;
}
let activeFilter = 'all';
const productList = document.querySelector('#product-list');
const productScrollControls = document.querySelector('.product-scroll-controls');
const productScrollButtons = [...document.querySelectorAll('[data-scroll-products]')];
function updateProductScrollControls() {
  if (!productList) return;
  const maxScroll = productList.scrollWidth - productList.clientWidth;
  productScrollControls.hidden = maxScroll <= 2;
  productScrollButtons[0].disabled = productList.scrollLeft <= 1;
  productScrollButtons[1].disabled = productList.scrollLeft >= maxScroll - 2;
}
productScrollButtons.forEach(button => button.addEventListener('click', () => {
  const card = productList.querySelector('[data-product]:not([hidden])');
  if (!card) return;
  productList.scrollBy({
    left: Number(button.dataset.scrollProducts) * card.getBoundingClientRect().width,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  });
}));
productList?.addEventListener('scroll', updateProductScrollControls, { passive: true });
productList?.addEventListener('focusin', event => {
  const card = event.target.closest('[data-product]');
  if (card && event.target.matches(':focus-visible')) {
    card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
});
window.addEventListener('resize', updateProductScrollControls);
function updateProductFilter(nextFilter = activeFilter) {
  if (!productList) return;
  activeFilter = nextFilter;
  let count = 0;
  document.querySelectorAll('[data-product]').forEach(card => {
    card.hidden = nextFilter !== 'all' && !card.dataset.groups.split(' ').includes(nextFilter);
    if (!card.hidden) count++;
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === nextFilter)));
  document.querySelector('.product-count').textContent = translations[language].productCount.replace('{n}', count);
  productList.scrollLeft = 0;
  updateProductScrollControls();
}
function setLanguage(nextLanguage) {
  language = nextLanguage === 'fr' ? 'fr' : 'en';
  try {
    const pageUrl = new URL(window.location.href);
    if (form || pageUrl.searchParams.has('lang')) {
      pageUrl.searchParams.set('lang', language);
      window.history.replaceState(window.history.state, '', pageUrl);
    }
  } catch { /* URL updates are optional. */ }
  const t = translations[language];
  document.documentElement.lang = language;
  document.title = t[form ? 'enquiryPageTitle' : 'pageTitle'];
  document.querySelector('meta[name="description"]').content = t[form ? 'enquiryPageDescription' : 'metaDescription'];
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = t[form ? 'enquiryPageDescription' : 'metaDescription'];
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t[el.dataset.i18nPlaceholder]);
  document.querySelector('.filter-group')?.setAttribute('aria-label', t.filterLabel);
  productList?.setAttribute('aria-label', t.productListLabel);
  productScrollButtons[0]?.setAttribute('aria-label', t.productScrollPrevious);
  productScrollButtons[1]?.setAttribute('aria-label', t.productScrollNext);
  document.querySelectorAll('[data-brand]').forEach(el => el.setAttribute('aria-label', t.brandAsk.replace('{brand}', el.dataset.brand)));
  document.querySelectorAll('[data-legal-page]').forEach(link => link.setAttribute('href', `/${link.dataset.legalPage}${language === 'fr' ? '-fr' : ''}.html`));
  updateProductFilter();
  document.querySelector('.language-current').textContent = language === 'fr' ? 'FR' : 'EN';
  document.querySelector('.language-next').textContent = language === 'fr' ? 'EN' : 'FR';
  document.querySelector('.language-switch').setAttribute('aria-label', t.switchLanguage);
  document.querySelectorAll('.brand').forEach(el => el.setAttribute('aria-label', t.home));
  document.querySelector('.desktop-nav')?.setAttribute('aria-label', t.navLabel);
  mobileNav?.setAttribute('aria-label', t.mobileNavLabel);
  const heroImage = document.querySelector('.hero-image');
  if (heroImage) heroImage.alt = t.heroAlt;
  document.querySelector('.hero-scroll')?.setAttribute('aria-label', t.explore);
  if (menuButton) menuButton.setAttribute('aria-label', t[mobileNav.hidden ? 'menuOpen' : 'menuClose']);
  document.querySelectorAll('[data-inquiry]').forEach(link => {
    const target = new URL('/mail/', window.location.origin);
    target.searchParams.set('lang', language);
    if (link.dataset.category) target.searchParams.set('category', link.dataset.category);
    if (link.dataset.brand) target.searchParams.set('brand', link.dataset.brand);
    link.href = target.pathname + target.search;
  });
  document.querySelectorAll('[data-home-link]').forEach(link => { link.href = `/?lang=${language}`; });
  if (form) {
    status.textContent = '';
    form.querySelectorAll('input, textarea, select').forEach(input => input.setCustomValidity(''));
    if (!result.hidden) { inquiryText = formatInquiry(); preview.textContent = inquiryText; }
  }
  updateInquiryState();
  try { localStorage.setItem('dune-language', language); } catch { /* Storage is optional. */ }
}
document.querySelector('.language-switch').addEventListener('click', () => setLanguage(language === 'en' ? 'fr' : 'en'));
menuButton?.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
document.addEventListener('click', event => { if (mobileNav && !mobileNav.hidden && !document.querySelector('.site-header').contains(event.target)) setMenu(false); });
window.matchMedia('(min-width: 681px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => updateProductFilter(button.dataset.filter)));
function redirectLegacyMailRoute() {
  if (!form && window.location.hash === '#mail') {
    window.location.replace(`/mail/?lang=${language}`);
  }
}
window.addEventListener('hashchange', redirectLegacyMailRoute);

if (form) {
  const category = pageParameters.get('category');
  if ([...form.elements.interest.options].some(option => option.value === category)) {
    form.elements.interest.value = category;
  }
  const brand = pageParameters.get('brand');
  if (brand) form.elements.preferredBrand.value = brand.slice(0, 254);
  form.addEventListener('invalid', event => {
    const input = event.target;
    if (!input.value.trim()) input.setCustomValidity(translations[language].requiredField);
    else if (input.type === 'email' && input.validity.typeMismatch) input.setCustomValidity(translations[language].invalidEmail);
  }, true);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (requestInFlight) return;
    for (const input of form.querySelectorAll('input[required], textarea[required]')) {
      if (!input.value.trim()) { input.setCustomValidity(translations[language].requiredField); input.reportValidity(); return; }
    }
    inquiryText = formatInquiry();
    preview.textContent = inquiryText;
    form.hidden = true;
    result.hidden = false;
    status.textContent = '';
    result.scrollIntoView({ block: 'start' });
    try {
      prepareInquiryRequest();
      void submitInquiry();
    } catch {
      inquiryPhase = 'error';
      inquiryError = 'service_unavailable';
      updateInquiryState();
    }
  });
  form.querySelectorAll('input, textarea, select').forEach(input => input.addEventListener('input', () => input.setCustomValidity('')));
  sendInquiryButton.addEventListener('click', () => { void submitInquiry(); });
  document.querySelector('#edit-inquiry').addEventListener('click', () => {
    if (requestInFlight) return;
    if (inquiryPhase === 'accepted') {
      form.reset();
      activeRequest = null;
      activeRequestSignature = '';
    }
    inquiryPhase = 'idle';
    inquiryError = '';
    result.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
  document.querySelector('#copy-inquiry').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(inquiryText);
      status.textContent = translations[language].copySuccess;
    } catch { status.textContent = translations[language].copyFailure; }
  });
  document.querySelector('#download-inquiry').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + inquiryText], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DUNE-business-inquiry.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());
setLanguage(language);
redirectLegacyMailRoute();
