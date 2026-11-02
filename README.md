# DUNE ENERGY GLOBAL

能源产品与多品牌润滑油销售企业官网，提供英文与法文界面（EN / FR）。网站向访客提供原生静态 HTML、CSS 和 JavaScript，发布时无需服务器端运行环境。内容源位于 `site/`，通过 Python 构建器生成英法双语页面。

官网：https://energydune.com/

产品入口涵盖乘用车发动机油、重负荷柴油机油、工业润滑油、变速箱与车用齿轮油、润滑脂及能源产品询盘。六类产品桌面单排、小屏横滑；支持按应用筛选，产品和品牌按钮可预填询盘；询盘包含品牌、型号、黏度／稠度、性能规范／OEM 要求、包装数量、目的地及 TDS/PDS、SDS 文件需求。

英文首页为 `/`，法语首页为 `/fr/`，各有完整原始 HTML、规范地址及可抓取的语言互链。页面路径决定语言，不再依赖本地存储；导航、表单、校验提示及询盘导出均已本地化。

页脚提供正式英法隐私政策与使用条款，分别对应 `privacy.html`、`terms.html` 及 `privacy-fr.html`、`terms-fr.html`。使用条款正文与日期保持原样；隐私政策仅按实际语言 URL 与询盘语言处理方式更新相应技术说明及日期。旧 `?lang=en` / `?lang=fr` 地址继续兼容，原生语言入口指向独立静态页面。

## 本地启动

```bash
python3 -m http.server 8000 --bind 0.0.0.0 --directory /workspace/dune
```

在浏览器中访问开发服务的 8000 端口。

首页仅保留产品、品牌、公司简介与联系方式，技术规格集中到询价表单的可选展开项。

## 品牌资产

- 标准 Logo：`assets/dune-logo.svg`
- 深底 Logo：`assets/dune-logo-light.svg`
- 独立图形：`assets/dune-symbol.svg`
- 页面品牌色采用深石油蓝 `#092C34`、深琥珀与金铜，搭配暖浅色产品区。主按钮与重点状态使用克制的琥珀金铜渐变，深色文字配亮度足够的金色底；正文、边框与表单保持清晰对比。
- 官网使用已确认的初版 D 图形（太阳与沙丘）和两行加粗字标。图形三条原路径共用同一深琥珀至金铜渐变；浅底文字为深石油蓝，深底文字为暖金渐变。独立图标与完整 Logo 使用同源图形。
- DUNE 与 ENERGY GLOBAL 保留已确认的粗体字形、字号与字距，并固化为 SVG 矢量轮廓，不再依赖设备字体。副行按 DUNE 字母实际可见轮廓的中心对齐；页眉与页脚引用同一 SVG 组合。
- Logo 显示 DUNE ENERGY GLOBAL，去除标志中的 INC.；法定公司全称仅用于版权信息。首页工业油液影像为生成的示意视觉，不代表某一品牌或实际产品。

## 联系功能与上线

官方邮箱：`info@energydune.com`，已由公司确认用于官网，显示于联系区、页脚及独立询盘页。英法询盘页分别为可直接分享的 `https://energydune.com/mail/` 与 `https://energydune.com/fr/mail/`，打开即能填写；旧 `?lang=` 地址继续兼容，法律页入口保留对应语言。旧 `https://energydune.com/#mail` 地址会自动跳转到独立询盘页。表单提交按钮继续直接发送，不依赖本机邮件应用。

询盘现可填写后直接点击 Send enquiry／Envoyer la demande，通过独立 Cloudflare Worker 与 Resend 发送至官方邮箱。提交过程中防重复点击；相同内容重试保留同一请求 UUID，由服务商幂等处理。仅在后端返回有效接受回执后显示已提交，失败时保留资料并提供重试。复制、下载功能保留。发信子域为 `notify.energydune.com`，密钥仅存于后端；英法隐私页已覆盖表单提交及服务商处理。实现和配置见 `energydune-enquiries/README.md`。

品牌名称仅作为客户意向产品的询盘选项，不表示授权经销、库存保证或合作关系。SAE、ISO VG、NLGI 与 API/ACEA/OEM 要求分开表述，具体批准和可供情况逐项报价确认。

品牌区和询盘品牌快捷选项目前仅保留 SINOPEC 与 Great Wall Lubricants。SINOPEC 使用官方润滑油产品资料中的英文矢量字标（含 PERFORMANCE IN MOTION），从新加坡官网 `Resource/pdf/L-HM%20Antiwear%20Hydraulic%20Oil.pdf` 页脚提取原有路径及字体轮廓，无图片或外部字体依赖。长城润滑油使用现成的 700×381 标准上下组合图，来源 `https://www.sucai999.com/sucai/4683449.html` 的公开无水印预览，已与长城官网 `https://www.sinolube.com/images/logo.png` 的图形和标准字核对；原图直接使用，不放大生成或重绘，显示宽度最高 240px，像素密度约 2.9 倍。长城中文为商标组成，网站界面仍仅提供英文和法文。两品牌在电脑上并排，窄屏改为单列；点击标识可预填对应品牌询盘。原小尺寸 PNG 保留兼容旧缓存，新页面引用高清资源。

## 发布

公开抓取配置：根目录 `robots.txt` 明确允许 Meta-WebIndexer、facebookexternalhit，并保持其他爬虫的默认公开访问；其中声明 `https://energydune.com/sitemap.xml`。站点地图列出 28 个规范页面：首页、询盘页、润滑油专题、分类总览、六类产品详情、选型指南、公司介绍的双语版本及四个法律页面，均提供双向语言替代链接；产品、品牌、公司简介、联系信息和法律正文在原始 HTML 中可读。每种语言使用独立规范地址，不把页面片段或查询参数加入 sitemap。允许抓取并不保证任何平台收录、排名或引用。

GitHub Pages 从远端 `gh-pages` 分支根目录发布，必须保留该分支已有的 `CNAME`（`energydune.com`）和 `.nojekyll`。发布前先读取最新远端提交，以其为父提交，明确选择网站文件；不要上传 `.local/`、询盘导出、测试结果或 `.git/`。不要以本地初始 `work` 分支强推覆盖线上分支。

## 行业术语参考

- [Mobil 工业润滑产品](https://www.mobil.com/en/lubricants/for-businesses/industrial/lubricants)
- [Mobil DTE 25 Ultra 产品资料与批准表述](https://www.mobil.com/en/lubricants/for-businesses/industrial/lubricants/products/products/mobil-dte-25-ultra)
- [Chevron 润滑产品](https://www.chevronlubricants.com/en_us/home.html)
- [ENEOS 润滑产品](https://www.eneos.co.jp/english/products/lubricants/)
- [TotalEnergies 润滑油](https://lubricants.totalenergies.com/)
- [API 发动机油性能类别](https://www.api.org/products-and-services/engine-oil/eolcs-categories-and-classifications/oil-categories)

仅参考类别和术语，未复制品牌图片、标识或产品性能宣传。


## SEO / AI 搜索维护

内容分层、结构化实体、双语路径、技术引用、抓取策略、IndexNow 与站长平台接入说明见 [docs/SEARCH-VISIBILITY.md](docs/SEARCH-VISIBILITY.md)。账户持有人已确认 Google 站点验证和 sitemap 提交成功，Bing 已从 Google 导入成功；这些接入结果不代表已取得收录、排名或 AI 引用，实际数据需登录对应后台查看。

```sh
python3 -m pip install -r tools/requirements-site.txt
python3 tools/build_site.py
python3 tools/build_site.py --check
python3 tools/check_seo.py
node --check app.js
```

修改 `site/` 内容源再构建；不要手改生成后的 HTML 或 `app.js`。生成结果保持静态发布，后端发信与 MCP 工具实现不受构建器影响。

美国与加拿大为目前明确的目标客户市场。英文 `/lubricants/` 和法文 `/fr/lubrifiants/` 作为汽车及工业润滑油专题，与分类目录和选型指南互链。目标包括普通搜索与联网AI引用；可重复的查询观察方法见 [docs/AI-SEARCH-MEASUREMENT.md](docs/AI-SEARCH-MEASUREMENT.md)，不把技术部署或单次AI回答等同于稳定排名。
