'use strict';
const translations = __UI_TRANSLATIONS__;

let language = document.documentElement.lang === 'fr' ? 'fr' : 'en';
const pageParameters = new URLSearchParams(window.location.search);
const requestedLanguage = pageParameters.get('lang');

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
    const target = new URL(language === 'fr' ? '/fr/mail/' : '/mail/', window.location.origin);
    if (link.dataset.category) target.searchParams.set('category', link.dataset.category);
    if (link.dataset.brand) target.searchParams.set('brand', link.dataset.brand);
    link.href = target.pathname + target.search;
  });
  document.querySelectorAll('[data-home-link]').forEach(link => { link.href = language === 'fr' ? '/fr/' : '/'; });
  if (form) {
    document.querySelectorAll('[data-language-link]').forEach(link => {
      const target = new URL(link.href);
      for (const key of ['category', 'brand']) {
        if (pageParameters.has(key)) target.searchParams.set(key, pageParameters.get(key));
      }
      link.href = target.pathname + target.search;
    });
  }
  if (form) {
    status.textContent = '';
    form.querySelectorAll('input, textarea, select').forEach(input => input.setCustomValidity(''));
    if (!result.hidden) { inquiryText = formatInquiry(); preview.textContent = inquiryText; }
  }
  updateInquiryState();
}
menuButton?.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
document.addEventListener('click', event => { if (mobileNav && !mobileNav.hidden && !document.querySelector('.site-header').contains(event.target)) setMenu(false); });
window.matchMedia('(min-width: 681px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => updateProductFilter(button.dataset.filter)));
function redirectLegacyRoute() {
  const nextLanguage = requestedLanguage === 'en' || requestedLanguage === 'fr' ? requestedLanguage : language;
  const mailRoute = Boolean(form) || window.location.hash === '#mail';
  if (window.location.hash !== '#mail' && nextLanguage === language && !pageParameters.has('lang')) return;
  const target = new URL(mailRoute ? (nextLanguage === 'fr' ? '/fr/mail/' : '/mail/') : (nextLanguage === 'fr' ? '/fr/' : '/'), window.location.origin);
  target.search = window.location.search;
  target.searchParams.delete('lang');
  if (window.location.hash !== '#mail') target.hash = window.location.hash;
  if (target.href !== window.location.href) window.location.replace(target.href);
}
window.addEventListener('hashchange', redirectLegacyRoute);

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
redirectLegacyRoute();
