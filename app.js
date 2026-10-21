'use strict';
const translations = {
  "en": {
    "skip": "Skip to content",
    "navAbout": "About DUNE",
    "navExpertise": "Products",
    "navApproach": "How we work",
    "getInTouch": "Request a quote",
    "heroEyebrow": "ENERGY PRODUCTS · MULTI-BRAND LUBRICANTS",
    "heroTitle": "Energy products.",
    "heroTitleItalic": "Lubricants.",
    "heroDescription": "For vehicles, fleets and industrial equipment. A clear approach to multi-brand product sourcing, sales and supply.",
    "explore": "Explore our products",
    "meetDune": "Prepare an enquiry",
    "heroFootnote": "Automotive. Commercial. Industrial.\nOne conversation, your requirements.",
    "imageLabel": "PRODUCT KNOWLEDGE. COMMERCIAL FOCUS.",
    "imageCaption": "The application comes first.",
    "visualCardLabel": "THE DUNE APPROACH",
    "visualCardTitle": "The right brief.\nA clearer choice.",
    "strip1": "Multi-brand enquiries",
    "strip2": "Application-led selection",
    "strip3": "Clear commercial terms",
    "aboutLabel": "ABOUT DUNE",
    "aboutTitle": "A focused supplier.",
    "aboutTitleItalic": "A wider perspective.",
    "aboutLead": "DUNE ENERGY GLOBAL INC. focuses on the sale and supply of energy products and multi-brand lubricants.",
    "aboutBody": "We help business buyers set out requirements for passenger vehicles, commercial fleets and industrial equipment. Our sales approach brings product references, application details, documentation and supply terms into one conversation.",
    "ourThinking": "Explore our approach",
    "expertiseLabel": "HOW WE WORK",
    "expertiseSide": "APPLICATION. SPECIFICATION. SUPPLY.",
    "expertiseTitle": "A better enquiry.",
    "expertiseTitleItalic": "A clearer quotation.",
    "expertiseBody": "A useful quotation starts with the details. We bring your product, documentation and commercial requirements into one structured brief.",
    "discuss": "Build your product enquiry",
    "service1Title": "Define the application",
    "service1Body": "Identify the vehicle or equipment, operating conditions and current product. Include the equipment manufacturer’s instructions where available.",
    "service2Title": "Check the specification",
    "service2Body": "Specify the relevant viscosity or grease consistency grade. List API or ACEA performance requirements and any required OEM approvals separately; viscosity alone does not establish suitability.",
    "service3Title": "Confirm the supply details",
    "service3Body": "Set out the preferred brand, exact product reference, pack size, quantity and destination. Request the applicable product data sheet (TDS/PDS) and safety data sheet (SDS). Delivery and commercial terms are confirmed in the quotation.",
    "tagSourcing": "APPLICATION",
    "tagCommercial": "OPERATING CONDITIONS",
    "tagLogistics": "SAE / ISO VG / NLGI",
    "tagDocumentation": "API / ACEA / OEM",
    "tagDialogue": "TDS / PDS & SDS",
    "tagPartnerships": "PACKAGING & DELIVERY",
    "approachLabel": "OUR APPROACH",
    "approachSide": "A LONGER VIEW. A CLEARER PATH.",
    "approachTitle": "Good energy.",
    "approachTitleItalic": "Better connections.",
    "approachIntro": "Markets move. A thoughtful approach stays grounded. These principles guide how we want to work.",
    "value1Title": "Clarity first.",
    "value1Body": "Start with the right questions. Understand the requirement and make the next step clear.",
    "value2Title": "A connected perspective.",
    "value2Body": "Look beyond a single transaction. Consider how each decision fits the wider supply chain.",
    "value3Title": "Progress with purpose.",
    "value3Body": "Build relationships through considered communication, practical planning and mutual understanding.",
    "contactLabel": "LET’S TALK PRODUCTS",
    "contactTitle": "Your next requirement.",
    "contactTitleItalic": "Let’s make it clear.",
    "contactBody": "A brand. A product reference. An application.\nStart with what you know; build a more useful enquiry.",
    "startConversation": "Prepare a product enquiry",
    "footerTagline": "Energy products.\nMulti-brand lubricants.",
    "downloadLogo": "Download our logo",
    "rights": "All rights reserved.",
    "privacy": "Privacy",
    "backTop": "Back to top",
    "inquiryLabel": "PRODUCT & SUPPLY ENQUIRY",
    "inquiryTitle": "Tell us what you need.",
    "inquiryDescription": "Build a product brief to share with your DUNE contact. Add the details you have; product-specific fields are optional.",
    "nameLabel": "Your name",
    "companyLabel": "Company",
    "emailLabel": "Work email",
    "interestLabel": "Product category",
    "messageLabel": "Application & additional requirements",
    "formNote": "Your details stay in this browser session. Nothing is sent from this page.",
    "prepareInquiry": "Prepare my enquiry",
    "inquiryReady": "Your product enquiry is ready.",
    "inquiryReadyBody": "Check your brief, then copy or download it to share through your existing contact channel.",
    "copyInquiry": "Copy enquiry",
    "downloadInquiry": "Download .txt",
    "editInquiry": "← Edit enquiry",
    "copySuccess": "Copied. Your inquiry is ready to share.",
    "copyFailure": "Automatic copying is unavailable. Select the text above or download the .txt file.",
    "privacyTitle": "Your privacy.",
    "privacyBody": "This website does not use analytics, advertising trackers or third-party fonts. Your language preference is stored on your device. Inquiry details remain in the current browser session and are only exported when you choose to copy or download them. They are not submitted to a server. The hosting provider may process standard access logs under its own policy.",
    "privacyAdvice": "Please do not include confidential commercial information in your initial inquiry.",
    "menuOpen": "Open menu",
    "menuClose": "Close menu",
    "close": "Close dialog",
    "switchLanguage": "Switch to Chinese",
    "home": "DUNE ENERGY GLOBAL INC. — home",
    "navLabel": "Main navigation",
    "mobileNavLabel": "Mobile navigation",
    "focusLabel": "Our focus",
    "heroAlt": "Clean precision steel gears with a ribbon of amber lubricating oil against a cool industrial background",
    "approachLink": "Explore the DUNE approach",
    "pageTitle": "DUNE ENERGY GLOBAL INC. — Energy Products & Multi-brand Lubricants",
    "metaDescription": "Energy products and multi-brand lubricants for passenger vehicles, commercial fleets and industrial equipment. Product sourcing, sales and supply enquiries with DUNE ENERGY GLOBAL INC.",
    "navBrands": "Brands",
    "productsLabel": "PRODUCT CATEGORIES",
    "productsTitle": "Products for the",
    "productsTitleItalic": "way you work.",
    "productsIntro": "Start with the application. Explore our enquiry categories for automotive, commercial and industrial needs.",
    "filterAll": "All products",
    "filterAutomotive": "Automotive",
    "filterCommercial": "Commercial",
    "filterIndustrial": "Industrial",
    "filterEnergy": "Energy",
    "filterLabel": "Filter product categories",
    "productCount": "Showing {n} product categories",
    "productQuote": "Enquire about this category",
    "productsNote": "Product availability, specifications, manufacturer approvals, pack sizes and lead times are confirmed in each quotation.",
    "brandsLabel": "MULTI-BRAND ENQUIRIES",
    "brandsTitle": "Your preferred brand.",
    "brandsTitleItalic": "Your specific requirements.",
    "brandsBody": "Tell us the brand and exact product you need, or share your current product reference and application. Brand selection forms part of your enquiry.",
    "brandsNote": "Brand names identify products customers may request. They do not indicate authorised distribution or a commercial partnership. Availability is confirmed per enquiry.",
    "brandOther": "Another brand",
    "brandAsk": "Prepare an enquiry for {brand}",
    "specLabel": "A QUICK GUIDE TO PRODUCT GRADES",
    "saeBody": "Viscosity grades for engine and automotive gear oils use different SAE systems. Follow the grade and system specified for the application.",
    "isoBody": "ISO viscosity grades classify industrial oils by kinematic viscosity at 40 °C. Confirm the grade required by the equipment manufacturer.",
    "nlgiBody": "NLGI grades describe grease consistency, not oil viscosity. Consider the required grade, thickener type and application together.",
    "specNote": "A manufacturer approval, a performance claim and a recommendation for use are different statements. Confirm the exact product’s current documentation.",
    "brandLabel": "Preferred brand",
    "referenceLabel": "Product reference / current product",
    "viscosityLabel": "Viscosity / consistency grade",
    "specificationLabel": "Performance requirements / OEM approvals",
    "quantityLabel": "Quantity & pack size",
    "destinationLabel": "Delivery destination",
    "documentsLabel": "Documents requested",
    "optional": "Optional",
    "brandPlaceholder": "e.g. Shell, Mobil, ENEOS, or another brand",
    "referencePlaceholder": "Exact product name or part number",
    "viscosityPlaceholder": "e.g. SAE 5W-30, ISO VG 46, or NLGI 2",
    "specificationPlaceholder": "Required API / ACEA category or OEM approval",
    "quantityPlaceholder": "e.g. 20 × 20 L pails",
    "destinationPlaceholder": "City, country",
    "messagePlaceholder": "Equipment, operating conditions, timing or other requirements",
    "detailsLabel": "PRODUCT & DELIVERY DETAILS",
    "notSpecified": "Not specified",
    "inquiryDocumentTitle": "Product and supply enquiry",
    "product1Title": "Passenger car engine oils",
    "product1Body": "Engine oils for passenger cars and light-duty applications. Start with the vehicle manufacturer’s viscosity and performance requirements.",
    "product1Tag": "SAE · API / ACEA",
    "product2Title": "Heavy-duty diesel engine oils",
    "product2Body": "Engine oils for commercial vehicles, fleets and off-highway equipment. Specify the engine, operating conditions and required performance category.",
    "product2Tag": "SAE · ENGINE REQUIREMENTS",
    "product3Title": "Industrial lubricants",
    "product3Body": "Hydraulic oils, industrial gear oils and compressor oils. Identify equipment, operating conditions and the specified ISO viscosity grade.",
    "product3Tag": "ISO VG · EQUIPMENT REQUIREMENTS",
    "product4Title": "Transmission & gear fluids",
    "product4Body": "Automatic and manual transmission fluids, automotive gear oils and axle fluids. Confirm the exact application and required OEM specification.",
    "product4Tag": "ATF / MTF · OEM REQUIREMENTS",
    "product5Title": "Lubricating greases",
    "product5Body": "Bearing, multipurpose and application-specific greases. Include the required NLGI grade, thickener type and service conditions.",
    "product5Tag": "NLGI · APPLICATION REQUIREMENTS",
    "product6Title": "Energy products",
    "product6Body": "Enquiries for energy products, defined by your requirements. Set out the product name, specification, volume, destination and delivery schedule for commercial review.",
    "product6Tag": "PRODUCT GRADE · VOLUME & DESTINATION"
  },
  "zh": {
    "skip": "跳至正文",
    "navAbout": "关于 DUNE",
    "navExpertise": "产品类别",
    "navApproach": "采购流程",
    "getInTouch": "产品询价",
    "heroEyebrow": "能源产品 · 多品牌润滑油销售",
    "heroTitle": "能源产品，",
    "heroTitleItalic": "多品牌润滑油。",
    "heroDescription": "面向乘用车、商用车队与工业设备，以清晰的产品需求对接多品牌采购、销售与供应。",
    "explore": "浏览产品类别",
    "meetDune": "填写产品询盘",
    "heroFootnote": "车用 · 商用 · 工业\n从具体需求，开始清晰对接。",
    "imageLabel": "了解产品，聚焦需求。",
    "imageCaption": "从应用出发，选择适合的产品。",
    "visualCardLabel": "DUNE 的采购思路",
    "visualCardTitle": "需求更清楚，\n选择更有据。",
    "strip1": "多品牌产品询盘",
    "strip2": "从实际应用出发",
    "strip3": "明确商务与交付条件",
    "aboutLabel": "关于 DUNE",
    "aboutTitle": "专注产品销售，",
    "aboutTitleItalic": "连接多元需求。",
    "aboutLead": "DUNE ENERGY GLOBAL INC. 专注于能源产品与多品牌润滑油的销售及供应。",
    "aboutBody": "面向乘用车、商用车队与工业设备等商业采购需求，我们把产品型号、实际应用、技术文件与供应条件串联起来，让询价与商务对接更清晰。",
    "ourThinking": "了解采购流程",
    "expertiseLabel": "采购流程",
    "expertiseSide": "应用 · 规格 · 供应",
    "expertiseTitle": "询盘更完整，",
    "expertiseTitleItalic": "报价更清晰。",
    "expertiseBody": "有效的报价始于准确的信息。把产品、技术文件与商务需求整理在一起，让下一步沟通更有依据。",
    "discuss": "整理产品采购需求",
    "service1Title": "明确应用与工况",
    "service1Body": "说明车辆或设备、运行条件及当前使用的产品。如有设备制造商的用油要求，也请一并提供。",
    "service2Title": "核对技术规格",
    "service2Body": "填写适用的黏度或润滑脂稠度等级，分别注明 API、ACEA 性能要求及所需的 OEM 批准。仅有相同黏度，并不意味着适用于同一设备。",
    "service3Title": "确认供应与交付条件",
    "service3Body": "列明意向品牌、准确型号、包装、数量和目的地，并提出产品技术资料（TDS/PDS）与安全数据表（SDS）需求。交付与商务条件在报价中确认。",
    "tagSourcing": "实际应用",
    "tagCommercial": "运行工况",
    "tagLogistics": "SAE / ISO VG / NLGI",
    "tagDocumentation": "API / ACEA / OEM",
    "tagDialogue": "TDS / PDS 与 SDS",
    "tagPartnerships": "包装与交付",
    "approachLabel": "合作理念",
    "approachSide": "看得更远，走得更清晰。",
    "approachTitle": "汇聚能源，",
    "approachTitleItalic": "连接彼此。",
    "approachIntro": "市场不断变化，合作需要清晰的方向。我们希望以这些原则，推进每一次沟通。",
    "value1Title": "清晰为先",
    "value1Body": "从有价值的问题开始，了解真实需求，让下一步行动有据可循。",
    "value2Title": "以整体视角思考",
    "value2Body": "不止着眼于单笔交易，也考虑每个决定如何影响整条供应链。",
    "value3Title": "有方向地前行",
    "value3Body": "通过认真沟通、务实规划与相互理解，建立值得持续投入的合作关系。",
    "contactLabel": "从具体产品，谈下一步",
    "contactTitle": "下一项采购需求，",
    "contactTitleItalic": "从清晰沟通开始。",
    "contactBody": "一个品牌，一个型号，一种实际应用。\n从你已知的信息出发，整理一份更有用的询盘。",
    "startConversation": "填写产品询盘",
    "footerTagline": "能源产品销售\n多品牌润滑油供应",
    "downloadLogo": "下载品牌 Logo",
    "rights": "保留所有权利。",
    "privacy": "隐私说明",
    "backTop": "返回顶部",
    "inquiryLabel": "产品与供应询盘",
    "inquiryTitle": "告诉我们你的需求。",
    "inquiryDescription": "整理一份可分享给 DUNE 联系人的产品需求简报。产品细节为选填，可先填写你已知的信息。",
    "nameLabel": "你的姓名",
    "companyLabel": "公司名称",
    "emailLabel": "工作邮箱",
    "interestLabel": "产品类别",
    "messageLabel": "实际应用与其他需求",
    "formNote": "填写内容仅保留在当前浏览器会话中，本页面不会发送任何信息。",
    "prepareInquiry": "生成产品询盘",
    "inquiryReady": "产品询盘已准备好。",
    "inquiryReadyBody": "核对内容后，复制或下载简报，通过你已有的联系方式分享。",
    "copyInquiry": "复制询盘",
    "downloadInquiry": "下载 .txt",
    "editInquiry": "← 返回编辑",
    "copySuccess": "已复制，可以分享你的询盘了。",
    "copyFailure": "当前无法自动复制，请选择上方文字手动复制，或下载 .txt 文件。",
    "privacyTitle": "关于你的隐私。",
    "privacyBody": "本网站不使用访问统计、广告追踪或第三方字体。语言偏好保存在你的设备上。询盘内容仅保留在当前浏览器会话中，只有你选择复制或下载时才会导出，不会提交到服务器。网站托管服务商可能依据其自身政策处理常规访问日志。",
    "privacyAdvice": "初次询盘请勿包含商业机密或其他敏感信息。",
    "menuOpen": "打开菜单",
    "menuClose": "关闭菜单",
    "close": "关闭弹窗",
    "switchLanguage": "Switch to English",
    "home": "DUNE ENERGY GLOBAL INC. — 首页",
    "navLabel": "主导航",
    "mobileNavLabel": "手机导航",
    "focusLabel": "我们的重点",
    "heroAlt": "冷色工业背景中，精密钢制齿轮与流动的琥珀色润滑油",
    "approachLink": "探索 DUNE 的合作理念",
    "pageTitle": "DUNE ENERGY GLOBAL INC. — 能源产品与多品牌润滑油销售",
    "metaDescription": "DUNE ENERGY GLOBAL INC. 提供面向乘用车、商用车队与工业设备的能源产品及多品牌润滑油采购、销售与供应询盘。",
    "navBrands": "品牌询盘",
    "productsLabel": "产品类别",
    "productsTitle": "围绕实际应用，",
    "productsTitleItalic": "找到采购方向。",
    "productsIntro": "从用途开始，浏览适用于车用、商用及工业领域的产品询盘类别。",
    "filterAll": "全部产品",
    "filterAutomotive": "车用",
    "filterCommercial": "商用",
    "filterIndustrial": "工业",
    "filterEnergy": "能源",
    "filterLabel": "筛选产品类别",
    "productCount": "显示 {n} 个产品类别",
    "productQuote": "咨询此类产品",
    "productsNote": "具体产品的可供情况、技术规格、制造商批准、包装及交期，以逐项报价确认为准。",
    "brandsLabel": "多品牌产品询盘",
    "brandsTitle": "你需要的品牌，",
    "brandsTitleItalic": "你明确的需求。",
    "brandsBody": "告诉我们意向品牌与准确型号，也可以提供当前使用的产品和具体应用。品牌选择将一并纳入你的询盘。",
    "brandsNote": "品牌名称用于识别客户可能询问的产品，不代表授权经销或商业合作关系。具体可供情况逐单确认。",
    "brandOther": "其他品牌",
    "brandAsk": "填写 {brand} 产品询盘",
    "specLabel": "认识常见的产品等级",
    "saeBody": "发动机油与车用齿轮油采用不同的 SAE 黏度分级体系，应按具体应用确认所需体系与牌号。",
    "isoBody": "ISO VG 按油品在 40 °C 时的运动黏度对工业油进行分级，具体等级应遵循设备制造商要求。",
    "nlgiBody": "NLGI 等级描述润滑脂的稠度，不等同于油品黏度。选择时还需结合稠化剂类型与应用要求。",
    "specNote": "制造商正式批准、产品性能声明与推荐适用，是不同性质的表述，应以具体产品的现行技术资料核对。",
    "brandLabel": "意向品牌",
    "referenceLabel": "产品型号／当前使用产品",
    "viscosityLabel": "黏度／稠度等级",
    "specificationLabel": "性能规范／OEM 批准要求",
    "quantityLabel": "采购数量与包装",
    "destinationLabel": "交付目的地",
    "documentsLabel": "所需技术文件",
    "optional": "选填",
    "brandPlaceholder": "例如 Shell、Mobil、ENEOS 或其他品牌",
    "referencePlaceholder": "准确产品名称或产品编号",
    "viscosityPlaceholder": "例如 SAE 5W-30、ISO VG 46 或 NLGI 2",
    "specificationPlaceholder": "所需 API／ACEA 类别或 OEM 批准",
    "quantityPlaceholder": "例如 20 桶 × 20 L",
    "destinationPlaceholder": "城市、国家／地区",
    "messagePlaceholder": "设备、运行工况、期望时间或其他要求",
    "detailsLabel": "产品与交付细节",
    "notSpecified": "未提供",
    "inquiryDocumentTitle": "产品与供应询盘",
    "product1Title": "乘用车发动机油",
    "product1Body": "面向乘用车及轻型车辆应用的发动机油，按车辆制造商要求核对黏度与性能规范。",
    "product1Tag": "SAE · API / ACEA",
    "product2Title": "重负荷柴油机油",
    "product2Body": "面向商用车辆、车队及非道路设备的柴油机油，按发动机、运行工况与性能类别要求询价。",
    "product2Tag": "SAE · 发动机要求",
    "product3Title": "工业润滑油",
    "product3Body": "涵盖液压油、工业齿轮油与压缩机油，结合设备、工况及规定的 ISO 黏度等级提出需求。",
    "product3Tag": "ISO VG · 设备要求",
    "product4Title": "变速箱与车用齿轮油",
    "product4Body": "涵盖自动与手动变速箱油、车用齿轮油及驱动桥油，按准确应用与所需 OEM 规范核对。",
    "product4Tag": "ATF / MTF · OEM 要求",
    "product5Title": "润滑脂",
    "product5Body": "涵盖轴承、多用途及特定工况润滑脂，询盘时注明 NLGI 稠度等级、稠化剂类型与使用条件。",
    "product5Tag": "NLGI · 应用要求",
    "product6Title": "能源产品",
    "product6Body": "按具体能源产品需求询价，列明产品名称、规格、数量、目的地与期望交付时间，逐项确认商务条件。",
    "product6Tag": "品类规格 · 数量与目的地"
  }
};

let language = 'en';
try { language = localStorage.getItem('dune-language') === 'zh' ? 'zh' : 'en'; } catch { /* Storage is optional. */ }
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const inquiryDialog = document.querySelector('#inquiry-dialog');
const privacyDialog = document.querySelector('#privacy-dialog');
const form = document.querySelector('#inquiry-form');
const result = document.querySelector('#inquiry-result');
const preview = document.querySelector('#inquiry-preview');
const status = document.querySelector('#copy-status');
let inquiryText = '';

function setMenu(open) {
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
  return `DUNE ENERGY GLOBAL INC.\n${t.inquiryDocumentTitle}\n\n${lines.join('\n')}\n\n${t.messageLabel}:\n${String(data.get('message') || '').trim()}`;
}
let activeFilter = 'all';
function updateProductFilter(nextFilter = activeFilter) {
  activeFilter = nextFilter;
  let count = 0;
  document.querySelectorAll('[data-product]').forEach(card => {
    card.hidden = nextFilter !== 'all' && !card.dataset.groups.split(' ').includes(nextFilter);
    if (!card.hidden) count++;
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === nextFilter)));
  document.querySelector('.product-count').textContent = translations[language].productCount.replace('{n}', count);
}
function setLanguage(nextLanguage) {
  language = nextLanguage;
  const t = translations[language];
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = t.pageTitle;
  document.querySelector('meta[name="description"]').content = t.metaDescription;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t[el.dataset.i18nPlaceholder]);
  document.querySelector('.filter-group').setAttribute('aria-label', t.filterLabel);
  document.querySelectorAll('[data-brand]').forEach(el => el.setAttribute('aria-label', t.brandAsk.replace('{brand}', el.dataset.brand)));
  updateProductFilter();
  document.querySelector('.language-current').textContent = language === 'zh' ? '中文' : 'EN';
  document.querySelector('.language-next').textContent = language === 'zh' ? 'EN' : '中文';
  document.querySelector('.language-switch').setAttribute('aria-label', t.switchLanguage);
  document.querySelectorAll('.brand').forEach(el => el.setAttribute('aria-label', t.home));
  document.querySelectorAll('[data-close-dialog]').forEach(el => el.setAttribute('aria-label', t.close));
  document.querySelector('.desktop-nav').setAttribute('aria-label', t.navLabel);
  mobileNav.setAttribute('aria-label', t.mobileNavLabel);
  document.querySelector('.principle-strip').setAttribute('aria-label', t.focusLabel);
  document.querySelector('.hero-image').alt = t.heroAlt;
  document.querySelector('.visual-card a').setAttribute('aria-label', t.approachLink);
  menuButton.setAttribute('aria-label', t[mobileNav.hidden ? 'menuOpen' : 'menuClose']);
  status.textContent = '';
  if (!result.hidden) { inquiryText = formatInquiry(); preview.textContent = inquiryText; }
  try { localStorage.setItem('dune-language', language); } catch { /* Storage is optional. */ }
}
document.querySelector('.language-switch').addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
document.addEventListener('click', event => { if (!mobileNav.hidden && !document.querySelector('.site-header').contains(event.target)) setMenu(false); });
window.matchMedia('(min-width: 681px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

function openDialog(dialog) {
  setMenu(false);
  document.body.classList.add('dialog-open');
  dialog.showModal();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => updateProductFilter(button.dataset.filter)));
document.querySelectorAll('[data-inquiry]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.category || button.dataset.brand) {
    if (button.dataset.category) form.elements.interest.value = button.dataset.category;
    if (button.dataset.brand) form.elements.preferredBrand.value = button.dataset.brand;
    form.hidden = false;
    result.hidden = true;
    status.textContent = '';
  }
  openDialog(inquiryDialog);
}));
document.querySelector('[data-privacy]').addEventListener('click', () => openDialog(privacyDialog));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  for (const input of form.querySelectorAll('input[required], textarea[required]')) {
    if (!input.value.trim()) { input.setCustomValidity(language === 'zh' ? '请填写此项。' : 'Please complete this field.'); input.reportValidity(); return; }
  }
  inquiryText = formatInquiry();
  preview.textContent = inquiryText;
  form.hidden = true;
  result.hidden = false;
  status.textContent = '';
  inquiryDialog.scrollTop = 0;
  document.querySelector('#copy-inquiry').focus();
});
form.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => input.setCustomValidity('')));
document.querySelector('#edit-inquiry').addEventListener('click', () => { result.hidden = true; form.hidden = false; form.elements.name.focus(); });
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
document.querySelector('#year').textContent = String(new Date().getFullYear());
setLanguage(language);
