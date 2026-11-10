// Klypza - Cloudflare Worker API (routes /api/*).
// Keeps the SaveAPI key server-side, resolves supported public video links,
// normalizes the response, and serves signed download links.
//
// Cloudflare Worker secret/variables:
//   SAVEAPI_KEY       required secret from SaveAPI
//   MAX_PROXY_BYTES   optional, defaults to 19,500,000 bytes

const PLATFORM_HOSTS = {
  TikTok: ['tiktok.com'],
  Instagram: ['instagram.com', 'instagr.am'],
  Facebook: ['facebook.com', 'fb.watch', 'fb.com'],
  YouTube: ['youtube.com', 'youtu.be'],
  Pinterest: ['pinterest.com', 'pin.it'],
};

const IMG_EXT = /\.(jpe?g|png|webp|gif|heic|avif)(\?|#|$)/i;
const VID_EXT = /\.(mp4|mov|webm|m4v|mkv)(\?|#|$)/i;
const AUD_EXT = /\.(mp3|m4a|aac|wav|ogg)(\?|#|$)/i;

const enc = new TextEncoder();
const INDEX_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, viewport-fit=cover\">\n<meta name=\"color-scheme\" content=\"light\">\n<title>Klypza — Download Videos from TikTok, Instagram, Facebook & More</title>\n<meta name=\"description\" content=\"Download supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest with Klypza. Explore features, plans and a simple video-saving workflow.\">\n<meta name=\"robots\" content=\"index, follow, max-image-preview:large\">\n<meta name=\"theme-color\" content=\"#111936\">\n<link rel=\"canonical\" href=\"https://klypza.web.id/\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:site_name\" content=\"Klypza\">\n<meta property=\"og:url\" content=\"https://klypza.web.id/\">\n<meta property=\"og:title\" content=\"Klypza — Download Videos from TikTok, Instagram, Facebook & More\">\n<meta property=\"og:description\" content=\"Explore Klypza features, supported platforms, batch downloads and flexible subscription plans.\">\n<meta name=\"twitter:card\" content=\"summary\">\n<meta name=\"twitter:title\" content=\"Klypza — Social Video Downloader\">\n<meta name=\"twitter:description\" content=\"Download supported public social videos with Klypza in a few simple steps.\">\n<link rel=\"icon\" type=\"image/webp\" href=\"/brand-icon.webp?v=2\">\n<link rel=\"apple-touch-icon\" type=\"image/webp\" href=\"/brand-icon.webp\">\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css\">\n<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"WebApplication\",\n  \"name\": \"Klypza\",\n  \"url\": \"https://klypza.web.id/\",\n  \"applicationCategory\": \"MultimediaApplication\",\n  \"operatingSystem\": \"Any\",\n  \"inLanguage\": \"en\",\n  \"description\": \"Klypza is a simple browser-based tool for processing supported public video links from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest.\",\n  \"offers\": { \"@type\": \"Offer\", \"price\": \"0\", \"priceCurrency\": \"USD\" }\n}\n</script>\n<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": [\n    {\"@type\":\"Question\",\"name\":\"Is Klypza free to use?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"The website is free to access. Successful video processing depends on the source platform and the availability of the configured download provider.\"}},\n    {\"@type\":\"Question\",\"name\":\"Which platforms are supported?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Klypza is designed for supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest video Pins.\"}},\n    {\"@type\":\"Question\",\"name\":\"Why did my video link fail?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"A link can fail when a post is private, unavailable, restricted, unsupported, or not supported by the configured provider. Try a public video post URL.\"}},\n    {\"@type\":\"Question\",\"name\":\"Can I download any video?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Only download videos you own or have permission to save. Respect copyright, privacy and each platform's terms.\"}},\n    {\"@type\":\"Question\",\"name\":\"Can I download profile links?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"No. Paste a direct video post URL rather than a profile or account URL.\"}}\n  ]\n}\n</script>\n<style>\n:root{color-scheme:light;--ink:#111936;--muted:#64708a;--line:#e4e8f2;--paper:#fff;--wash:#f5f7fc;--brand:#2878f0;--brand-dark:#1d5fc4;--violet:#7928ca;--navy:#111936;--shadow:0 18px 50px rgba(29,40,78,.09);--radius:24px}\n*{box-sizing:border-box;margin:0;padding:0}\nhtml{scroll-behavior:smooth;-webkit-text-size-adjust:100%}\nbody{font-family:\"DM Sans\",system-ui,-apple-system,\"Segoe UI\",sans-serif;background:var(--wash);color:var(--ink);line-height:1.65;min-height:100vh;min-height:100dvh;overflow-x:hidden}\nbutton,input,textarea,select{font:inherit}button{cursor:pointer}a{color:inherit}img{max-width:100%}\n:focus-visible{outline:3px solid var(--violet);outline-offset:3px}\n.site-header{position:relative;z-index:2;background:rgba(16,21,43,.98);color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}\n.nav-wrap{max-width:1160px;margin:auto;padding:17px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}\n.logo{display:inline-flex;align-items:center;gap:11px;color:#fff;text-decoration:none;font-family:Manrope,sans-serif;font-size:1.12rem;font-weight:800;letter-spacing:-.04em}\n.logo-mark{width:38px;height:38px;display:block;flex:0 0 38px;border-radius:13px;box-shadow:0 8px 22px rgba(40,120,240,.22)}\n.nav-links{display:flex;gap:24px;align-items:center;font-size:.9rem;color:#d8def2}\n.nav-links a{text-decoration:none}.nav-links a:hover{color:#fff}\n.nav-cta{background:#fff;color:var(--navy)!important;padding:9px 15px;border-radius:999px;font-weight:700}\n.container{width:min(1160px,100% - 40px);margin:0 auto}\n.hero{position:relative;isolation:isolate;padding:64px 0 36px;background:radial-gradient(ellipse at 12% 10%,rgba(40,120,240,.20),transparent 35%),radial-gradient(ellipse at 85% 0%,rgba(121,40,202,.14),transparent 30%),var(--navy);color:#fff;overflow:hidden}\n.hero:after{content:\"\";position:absolute;inset:0;z-index:-1;opacity:.18;background-image:radial-gradient(rgba(255,255,255,.45) .7px,transparent .7px);background-size:18px 18px;mask-image:linear-gradient(to bottom,black,transparent)}\n.hero-inner{max-width:850px;margin:auto;text-align:center}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);padding:7px 13px;border-radius:999px;color:#d9d5ff;font-size:.82rem;font-weight:700;letter-spacing:.02em}\n.eyebrow i{color:#b58af0}\n.hero h1{font-family:Manrope,sans-serif;font-size:clamp(2.35rem,6vw,4.55rem);line-height:1.08;letter-spacing:-.065em;margin:22px auto 17px;max-width:850px;font-weight:800;text-wrap:balance}\n.hero h1 .accent{background:linear-gradient(90deg,#83b5ff,#b58af0);-webkit-background-clip:text;background-clip:text;color:transparent}\n.hero-copy{font-size:clamp(1rem,2vw,1.15rem);color:#c6cde1;max-width:690px;margin:0 auto}\n.platform-pills{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;margin:25px auto 0}\n.platform-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);border-radius:999px;padding:8px 12px;color:#f5f6ff;font-size:.84rem;font-weight:600}\n.platform-pill i{font-size:1rem}\nmain{padding-bottom:42px}\n.ad-slot{min-height:94px;margin:26px auto;max-width:970px;border:1px dashed #cfd5e5;border-radius:15px;background:rgba(255,255,255,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#8a93a8;text-align:center;padding:12px}\n.ad-label{font-size:.68rem;text-transform:uppercase;letter-spacing:.14em;font-weight:700}\n.ad-placeholder{font-size:.82rem}\n.tool-card{position:relative;max-width:920px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:28px;padding:clamp(22px,4vw,42px);box-shadow:var(--shadow)}\n.tool-heading{text-align:center;margin-bottom:27px}\n.tool-heading .mini-icon{width:52px;height:52px;border-radius:17px;background:#eaf1ff;color:var(--brand);display:grid;place-items:center;margin:0 auto 14px;font-size:1.25rem}\n.tool-heading h2{font-family:Manrope,sans-serif;font-size:clamp(1.45rem,3vw,2rem);line-height:1.25;letter-spacing:-.04em;margin-bottom:8px}\n.tool-heading p{color:var(--muted);max-width:620px;margin:auto}\n#configBanner{margin:0 0 18px;border-radius:12px;padding:12px 15px;font-size:.9rem;line-height:1.5}\n.banner.warn{background:#fff7e4;border:1px solid #f2dfab;color:#855700}\n.platform-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:24px 0}\n.platform-btn{min-height:80px;border:1px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:12px 7px;font-size:.8rem;font-weight:700;transition:transform .18s,border-color .18s,background .18s}\n.platform-btn i{font-size:1.35rem}\n.platform-btn:hover{transform:translateY(-2px);border-color:#9bbcff}\n.platform-btn.active{background:#eaf1ff;border-color:var(--brand);color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand)}\n.field-label{display:block;font-weight:700;font-size:.94rem;margin-bottom:8px}\n.input-field{display:block;width:100%;min-height:142px;resize:vertical;padding:16px;border:1px solid #cbd8f0;border-radius:15px;background:#fbfcff;color:var(--ink);font-size:1rem;line-height:1.55;transition:border-color .15s,box-shadow .15s}\n.input-field::placeholder{color:#9aa3b6}.input-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(40,120,240,.12)}\n.input-hint{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:.82rem;margin-top:9px}\n.options-row{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;margin:24px 0}\n.check{display:flex;align-items:flex-start;gap:10px;font-size:.9rem;color:#3b465c}\n.check input{width:18px;height:18px;margin-top:4px;accent-color:var(--brand)}\n.select-wrap{display:flex;align-items:center;gap:10px;color:#3b465c;font-size:.88rem;font-weight:600}\n.select-wrap select{border:1px solid var(--line);border-radius:10px;background:#fff;padding:9px 30px 9px 11px;min-height:42px}\n.btn-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;min-height:56px;border:0;border-radius:15px;background:linear-gradient(100deg,var(--brand),var(--violet));color:#fff;font-weight:800;font-size:1rem;box-shadow:0 10px 24px rgba(40,120,240,.24);transition:transform .15s,filter .15s}\n.btn-submit:hover{filter:brightness(1.04);transform:translateY(-1px)}.btn-submit:disabled{opacity:.65;cursor:wait;transform:none}\n.legal{color:var(--muted);font-size:.82rem;text-align:center;margin:18px auto 0;max-width:690px}\n.status-container{margin-top:28px;padding-top:23px;border-top:1px solid var(--line)}\n.status-container h2{font-family:Manrope,sans-serif;font-size:1.15rem;text-align:center}\n.progress-bar{height:8px;border-radius:999px;background:#eceef7;overflow:hidden;margin:15px 0 8px}\n.progress-fill{height:100%;width:0;background:linear-gradient(90deg,var(--brand),var(--violet));border-radius:inherit;transition:width .2s}\n.status-sub{text-align:center;color:var(--muted);font-size:.86rem;overflow-wrap:anywhere}\n.kloter-bar{display:grid;gap:12px;margin-top:16px}.batch-card{border:1px solid var(--line);border-radius:15px;padding:15px;margin-top:12px;background:#fff}\n.batch-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.link-title{font-weight:700;overflow-wrap:anywhere}.muted{font-size:.84rem;color:var(--muted)}.error-row{margin-top:8px;color:#b42318;font-size:.9rem}.note-row{padding:9px 11px;background:#fff6df;color:#875a00;border-radius:9px;font-size:.85rem;margin-bottom:10px}\n.item-list{display:grid;gap:10px}.item-row{display:flex;align-items:center;gap:12px;min-width:0;padding:10px;border:1px solid #edf0f7;border-radius:12px}\n.thumb{width:62px;height:62px;flex:0 0 62px;object-fit:cover;border-radius:10px;background:#f0f2f9;display:grid;place-items:center;color:#7c83a0}\n.item-meta{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;font-size:.86rem;overflow-wrap:anywhere}.badge{display:inline-flex;align-self:flex-start;padding:3px 8px;border-radius:999px;background:#e6faf4;color:#087d69;font-size:.73rem;font-weight:700}.badge.warn{background:#fff0d2;color:#8b5900}\n.btn-download{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #c6d9ff;border-radius:10px;background:#eef4ff;color:#1d5fc4;text-decoration:none;font-size:.85rem;font-weight:800;padding:10px 13px;white-space:nowrap}.btn-download:hover{background:#dceaff}\n.content-section{max-width:920px;margin:26px auto 0;background:#fff;border:1px solid var(--line);border-radius:24px;padding:clamp(22px,4vw,38px)}\n.section-kicker{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--brand);margin-bottom:8px}\n.content-section h2{font-family:Manrope,sans-serif;font-size:clamp(1.35rem,3vw,1.8rem);line-height:1.25;letter-spacing:-.035em;margin-bottom:12px}\n.content-section h3{font-family:Manrope,sans-serif;font-size:1.02rem;line-height:1.35;margin:20px 0 6px}\n.content-section p{color:#566178;margin:8px 0}.steps-grid,.platform-info-grid,.benefit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-top:20px}\n.info-card{border:1px solid var(--line);border-radius:16px;padding:17px;background:#fcfcff}\n.info-card .step-num{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#eaf1ff;color:var(--brand);font-weight:800;margin-bottom:12px}\n.info-card h3{margin:0 0 7px}.info-card p{font-size:.9rem;margin:0}\n.platform-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\n.platform-info{display:flex;gap:13px;align-items:flex-start;border-bottom:1px solid #eef0f6;padding:14px 0}.platform-info:last-child{border-bottom:0}\n.platform-info .platform-symbol{width:40px;height:40px;flex:0 0 40px;border-radius:12px;background:#eaf1ff;color:var(--brand);display:grid;place-items:center;font-size:1.1rem}\n.platform-info h3{margin:0 0 4px}.platform-info p{font-size:.9rem;margin:0}\n.faq-list details{border-top:1px solid var(--line);padding:16px 0}.faq-list details:first-child{margin-top:12px}.faq-list summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:14px}.faq-list summary::-webkit-details-marker{display:none}.faq-list summary:after{content:\"+\";color:var(--brand);font-size:1.2rem;font-weight:700}.faq-list details[open] summary:after{content:\"−\"}.faq-list details p{padding-right:25px;margin-top:8px}\n.notice{padding:15px 17px;border-radius:14px;background:#f2ebff;border:1px solid #e6d8f7;color:#5b347d;margin-top:16px;font-size:.9rem}\n.site-footer{margin-top:48px;background:var(--navy);color:#d6dced;padding:34px 20px calc(28px + env(safe-area-inset-bottom))}\n.footer-inner{max-width:1160px;margin:auto;display:flex;align-items:flex-start;justify-content:space-between;gap:26px;flex-wrap:wrap}\n.footer-brand{max-width:390px}.footer-brand .logo{margin-bottom:12px}.footer-brand p{font-size:.88rem;color:#aeb8d0}\n.footer-links{display:flex;gap:12px 20px;flex-wrap:wrap;font-size:.88rem}.footer-links a{color:#d6dced;text-decoration:none}.footer-links a:hover{color:#fff;text-decoration:underline}\n.copyright{max-width:1160px;margin:24px auto 0;padding-top:17px;border-top:1px solid rgba(255,255,255,.12);font-size:.8rem;color:#98a3bd}\n.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n@media(max-width:760px){.nav-wrap{padding:14px 18px}.nav-links{gap:14px}.nav-links a:not(.nav-cta){display:none}.nav-links a[href='/login']{display:inline-block}.hero{padding:48px 0 30px}.container{width:min(100% - 28px,1160px)}.platform-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.platform-btn{min-height:74px}.steps-grid,.benefit-grid{grid-template-columns:1fr}.platform-info-grid{grid-template-columns:1fr}.ad-slot{margin:18px auto;min-height:76px}.content-section,.tool-card{border-radius:20px}}\n@media(max-width:430px){.container{width:calc(100% - 20px)}.logo{font-size:1rem}.logo-mark{width:34px;height:34px;flex-basis:34px}.nav-cta{padding:8px 11px;font-size:.82rem}.hero h1{font-size:2.25rem}.hero-copy{font-size:.96rem}.platform-pills{gap:7px}.platform-pill{font-size:.76rem;padding:7px 9px}.tool-card,.content-section{padding:19px}.platform-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.platform-btn:last-child{grid-column:span 2}.input-hint{font-size:.78rem}.options-row{align-items:flex-start}.select-wrap{width:100%;justify-content:space-between}.item-row{flex-wrap:wrap}.item-meta{min-width:calc(100% - 80px)}.item-row .btn-download{width:100%}.batch-header{align-items:flex-start;flex-direction:column}.footer-links{gap:12px 15px}}\n.pricing-grid{align-items:stretch}.pricing-card{display:flex;flex-direction:column;gap:8px}.pricing-card h3{font-size:1.25rem;margin:8px 0 0}.plan-price{font-family:Manrope,sans-serif;font-size:2.2rem;font-weight:800;letter-spacing:-.05em}.plan-price small{font-family:\"DM Sans\",sans-serif;font-size:.85rem;font-weight:500;letter-spacing:0;color:#64708a}.plan-tag{font-size:.86rem;color:#64708a!important}.pricing-card ul{list-style:none;display:grid;gap:9px;padding:10px 0 18px;flex:1}.pricing-card li{font-size:.9rem;color:#3b465c;padding-left:23px;position:relative}.pricing-card li:before{content:\"✓\";position:absolute;left:0;color:#2878f0;font-weight:900}.pricing-card .btn-download{width:100%;margin-top:auto}.premium-card{border-color:#bba3e8;box-shadow:0 10px 30px rgba(121,40,202,.08)}.plan-disabled{opacity:.65;cursor:not-allowed}\n#accountPanel input:focus{outline:3px solid rgba(40,120,240,.18);border-color:#2878f0}\n#accountPanel .steps-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n@media(max-width:760px){#accountPanel .steps-grid{grid-template-columns:1fr}}\n@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important;animation:none!important}}\nbody{background:#f8f9ff;color:#111936}.site-header{background:rgba(255,255,255,.96);color:#111936;border-bottom:1px solid #e8eaf4;backdrop-filter:blur(14px)}.logo{color:#111936}.nav-links{color:#303854}.nav-cta{background:linear-gradient(100deg,#1681f5,#8328e6);color:white!important;border-radius:12px}.public-hero{background:linear-gradient(110deg,#f8fbff,#f0f2ff 58%,#f7efff);color:#111936;padding:65px 0 45px}.public-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:32px;align-items:center}.public-hero-copy{text-align:left;max-width:620px}.public-hero .eyebrow{background:#eeeaff;color:#592bd4;border-color:#ddd3ff}.public-hero h1{font-size:clamp(2.5rem,5vw,4.2rem);color:#111936;margin:20px 0 16px;max-width:650px}.public-hero h1 .accent{background:linear-gradient(90deg,#087cf2,#8629df);-webkit-background-clip:text;background-clip:text;color:transparent}.public-hero .hero-copy{color:#5c6680;margin:0}.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.hero-primary,.hero-secondary{display:inline-flex;align-items:center;gap:9px;text-decoration:none;border-radius:13px;padding:13px 20px;font-weight:800}.hero-primary{background:linear-gradient(100deg,#167df4,#7b2ce1);color:white}.hero-secondary{border:1px solid #bbaaf3;background:white;color:#5429d2}.hero-benefits{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px;font-size:.86rem;font-weight:700}.hero-benefits i{color:#0aa978}.public-hero .platform-pills{justify-content:flex-start;margin:22px 0 0}.public-hero .platform-pill{background:#fff;color:#35405c;border:1px solid #e3e6f2}.public-hero .platform-pill i{color:#7132e4}.hero-visual{position:relative;min-height:360px;display:grid;place-items:center;background:radial-gradient(ellipse,#d4d5ff 0%,transparent 68%)}.visual-window{width:min(420px,90%);height:275px;border:9px solid #fff;border-radius:30px;background:linear-gradient(140deg,#17358d,#5e2bdc 75%,#a32ce5);box-shadow:0 25px 60px #5942aa40;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;transform:rotate(-4deg)}.visual-brand{display:flex;align-items:center;gap:10px;font-size:2rem}.visual-progress{width:65%;height:11px;border-radius:99px;background:#ffffff55;margin-top:30px;overflow:hidden}.visual-progress span{display:block;width:65%;height:100%;background:linear-gradient(90deg,#05d6ef,#fff)}.visual-download{position:absolute;right:13%;bottom:18%;width:55px;height:55px;border-radius:18px;background:white;color:#642bdd;display:grid;place-items:center;font-size:1.3rem}.visual-window p{color:#eeeaff;margin-top:18px}.float-platform{position:absolute;width:50px;height:50px;border-radius:16px;background:#fff;display:grid;place-items:center;box-shadow:0 10px 25px #20205022;font-size:1.6rem}.float-platform.youtube{top:8%;left:7%;color:#f22}.float-platform.tiktok{top:7%;right:6%;color:#111}.float-platform.instagram{bottom:14%;left:6%;color:#d32ca4}.float-platform.facebook{bottom:9%;right:9%;color:#1877f2}.float-platform.pinterest{top:46%;right:0;color:#bd081c}.public-main{padding-top:14px}.public-main .tool-card,.public-main .ad-slot{display:none!important}.public-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:center;max-width:1100px}.stat-item{display:grid;grid-template-columns:45px 1fr;column-gap:10px;align-items:center}.stat-item i{grid-row:span 2;width:44px;height:44px;border-radius:14px;background:#f0eaff;color:#6b30e3;display:grid;place-items:center;font-size:1.2rem}.stat-item strong{font-size:1.45rem}.stat-item span{font-size:.85rem;color:#64708a}.stats-note{grid-column:1/-1;text-align:center;font-size:.76rem!important;color:#9099ad!important;margin:0!important}.public-features,.public-pricing,.public-reviews{max-width:1100px}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}.feature-tile{border:1px solid #e6e8f3;border-radius:17px;padding:21px;background:#fff}.feature-tile>i{font-size:1.65rem;color:#7031e5;margin-bottom:12px}.feature-tile h3{margin:0 0 7px}.feature-tile p{font-size:.9rem;margin:0}.standard-card{border-color:#aa9af0;box-shadow:0 10px 30px #6c3cd219}.review-promise{display:flex;gap:15px;align-items:center;padding:18px;background:#f5f1ff;border:1px solid #e7ddff;border-radius:15px;margin-top:16px}.review-promise>i{font-size:1.8rem;color:#edb500}.review-promise div{display:grid}.review-promise span{font-size:.88rem;color:#68718a}.dashboard-downloader-intro{margin:28px 0 14px}.dashboard-downloader-intro p{color:#64708a}#dashboardCard #video-tool{max-width:none;margin:0 0 24px}@media(max-width:850px){.public-hero-grid{grid-template-columns:1fr}.public-hero-copy{text-align:center;margin:auto}.public-hero .hero-copy{margin:auto}.public-hero .platform-pills,.hero-benefits{justify-content:center}.hero-visual{min-height:280px}.public-stats{grid-template-columns:1fr}.stat-item{max-width:300px;width:100%;margin:auto}}@media(max-width:650px){.public-hero{padding:45px 0 30px}.public-hero h1{font-size:2.45rem}.hero-visual{min-height:230px}.visual-window{height:210px;width:78%}.float-platform{width:42px;height:42px;font-size:1.35rem}.feature-grid{grid-template-columns:1fr}} \n/* Brand lockup and visual system based on the approved Klypza reference */\n:root{--klypza-navy:#09143d;--klypza-blue:#087cf5;--klypza-purple:#7825e9;--klypza-cyan:#06c9ee}\n.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.82);backdrop-filter:blur(18px);box-shadow:0 5px 28px rgba(26,36,91,.045)}\n.nav-wrap{max-width:1280px}.brand-wordmark{display:block;width:150px;height:auto;max-height:44px;object-fit:contain}.logo{display:flex;align-items:center;min-width:160px}.nav-links{align-items:center;gap:clamp(12px,2vw,28px)}.nav-links a{font-weight:650;color:#111936;text-decoration:none}.nav-links .nav-home{color:#5525d9;background:#f0eaff;padding:9px 15px;border-radius:30px}.nav-links .nav-login{border:1px solid #7951ee;border-radius:12px;padding:10px 20px}.nav-links .nav-cta{padding:12px 22px;box-shadow:0 8px 22px rgba(99,43,221,.2)}\n.public-hero{padding:38px 0 28px;background:radial-gradient(ellipse at 78% 45%,rgba(142,127,255,.20),transparent 38%),linear-gradient(110deg,#f9fbff 0%,#f0f2ff 56%,#f8f1ff 100%);overflow:hidden}\n.public-hero-grid{max-width:1280px;grid-template-columns:1fr 1fr;gap:34px;min-height:390px}\n.public-hero-copy{text-align:left}.public-hero .eyebrow{display:inline-flex;align-items:center;gap:8px;background:#eeeaff;border:1px solid #e0d7ff;color:#33218d;border-radius:30px;padding:8px 14px;font-size:.85rem;font-weight:750}\n.public-hero h1{font-size:clamp(2.65rem,4.2vw,3.8rem);line-height:1.04;letter-spacing:-.055em;max-width:650px;margin:20px 0 16px;color:#07143d}\n.public-hero .hero-copy{font-size:1.08rem;line-height:1.58;max-width:580px;color:#465273}\n.hero-primary{padding:15px 27px;border-radius:13px;background:linear-gradient(105deg,#5524e9,#7925e9);box-shadow:0 12px 28px rgba(101,40,220,.22)}\n.hero-secondary{padding:14px 25px;border-radius:13px;border:1.4px solid #7854f1;color:#4422cf;background:rgba(255,255,255,.62)}\n.hero-benefits{gap:24px;margin-top:25px;font-size:.9rem;font-weight:650;color:#172347}.hero-benefits span{display:flex;align-items:center;gap:7px}.hero-benefits i{font-size:1.05rem;color:#0d9c86}\n.public-hero .platform-pills{display:none}\n.hero-visual{min-height:380px;background:radial-gradient(ellipse,rgba(173,173,255,.34),transparent 68%)}\n.visual-window{width:min(460px,88%);height:290px;border:10px solid rgba(255,255,255,.94);border-radius:34px;background:linear-gradient(140deg,#5141d6 0%,#3026a5 50%,#7825e9 100%);box-shadow:0 28px 55px rgba(73,54,190,.24);transform:rotate(-4deg)}\n.visual-brand{display:flex;align-items:center;gap:10px;font-size:2rem}.visual-brand img{width:116px;height:82px;object-fit:contain;filter:drop-shadow(0 5px 8px rgba(13,11,70,.2))}.footer-wordmark{display:block;width:240px;height:auto;max-height:76px;object-fit:contain}\n.visual-progress{width:60%;margin-top:24px}.visual-download{width:62px;height:62px;border-radius:50%;right:12%;bottom:15%;font-size:1.4rem}\n.float-platform{width:62px;height:62px;border-radius:20px;font-size:1.9rem;box-shadow:0 13px 30px rgba(40,37,100,.16)}\n.float-platform.youtube{top:3%;left:6%}.float-platform.tiktok{top:4%;right:4%}.float-platform.instagram{bottom:20%;right:0;left:auto}.float-platform.facebook{bottom:17%;left:2%;right:auto}.float-platform.pinterest{top:62%;right:10%}\n.public-main{max-width:none;padding-top:8px}.public-main>.container{max-width:1280px}\n.public-stats{max-width:1280px;margin:0 auto 12px;padding:17px 26px;grid-template-columns:repeat(3,1fr);background:rgba(255,255,255,.8);border:1px solid #e5e7f2;border-radius:18px;box-shadow:0 12px 32px rgba(39,44,103,.06)}\n.stat-item{grid-template-columns:50px 1fr;column-gap:12px}.stat-item i{width:45px;height:45px;border-radius:50%;background:transparent;color:#6327df;font-size:1.8rem}.stat-item strong{font-size:1.42rem;color:#0c1741}.stat-item span{color:#58627d}.stats-note{margin-top:4px!important}\n.public-features{max-width:1280px;padding-top:12px}.public-features h2{font-size:1.85rem;color:#0b1742}.feature-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.feature-tile{min-height:168px;border-radius:18px;background:rgba(255,255,255,.83);box-shadow:0 10px 25px rgba(31,40,90,.045);padding:20px}.feature-tile>i{font-size:1.65rem;color:#6b2be8}.feature-tile h3{font-size:1.02rem;color:#111b43}.feature-tile p{line-height:1.45;color:#53607e}\n.public-pricing{max-width:1280px}.public-pricing h2,.public-reviews h2{color:#0b1742}\n.public-pricing .pricing-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n.public-pricing .pricing-card{border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 12px 28px rgba(34,41,92,.06)}\n.public-pricing .premium-card{background:linear-gradient(145deg,#6953ef,#7421d8);color:#fff}.public-pricing .premium-card h3,.public-pricing .premium-card li,.public-pricing .premium-card .plan-price,.public-pricing .premium-card .plan-price small{color:#fff!important}\n.public-reviews{max-width:1280px}\n.review-promise{background:#fff;border-color:#e7e4f6}\n#dashboardCard .brand-wordmark{width:135px}\n@media(max-width:900px){.public-hero-grid{grid-template-columns:1fr 1fr;gap:14px}.public-hero h1{font-size:clamp(2.3rem,5vw,3.1rem)}.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nav-links{gap:10px}.nav-links .nav-login{padding:8px 12px}.nav-links .nav-cta{padding:9px 13px}}\n@media(max-width:650px){.nav-wrap{gap:10px;padding:10px 14px}.brand-wordmark{width:118px}.logo{min-width:120px}.nav-links{gap:7px}.nav-links a:not(.nav-cta):not(.nav-login){display:none}.nav-links .nav-login{padding:8px 10px;font-size:.82rem}.nav-links .nav-cta{padding:9px 11px;font-size:.82rem}.public-hero{padding:36px 0 16px}.public-hero-grid{grid-template-columns:1fr}.public-hero-copy{text-align:left}.public-hero h1{font-size:2.65rem;line-height:1.02}.public-hero .hero-copy{font-size:1rem}.hero-actions{gap:9px}.hero-primary,.hero-secondary{padding:12px 15px}.hero-benefits{gap:12px;font-size:.78rem}.hero-visual{min-height:260px}.visual-window{height:220px;width:76%}.float-platform{width:45px;height:45px;border-radius:15px;font-size:1.4rem}.public-stats{grid-template-columns:1fr;padding:15px;gap:8px}.stat-item{max-width:100%;margin:0}.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.feature-tile{padding:15px;min-height:160px}.public-pricing .pricing-grid{grid-template-columns:1fr}}\n/* Refined Klypza wordmark and hero composition */\n.visual-brand{width:min(78%,300px);justify-content:center;position:relative;z-index:4}\n.visual-brand img{display:block;width:100%;height:auto;max-height:none;object-fit:contain}\n.visual-window{position:relative;z-index:2;padding:22px 18px;box-sizing:border-box}\n.visual-window p{position:relative;z-index:5;text-align:center;width:100%;max-width:85%;margin:22px auto 0;line-height:1.35;font-size:clamp(.82rem,1.8vw,1rem);white-space:normal}\n.visual-progress{position:relative;z-index:3;margin-top:25px}\n.visual-download{z-index:4;right:7%;bottom:26%;width:48px;height:48px;border-radius:50%;box-shadow:0 8px 24px #17114a35}\n.float-platform{z-index:1}\n.float-platform.youtube{top:1%;left:4%}\n.float-platform.tiktok{top:0;right:4%}\n.float-platform.instagram{bottom:4%;left:2%}\n.float-platform.facebook{bottom:2%;right:5%}\n.float-platform.pinterest{top:37%;right:-1%}\n@media(max-width:650px){\n .visual-brand{width:76%;max-width:250px}\n .visual-window{padding:18px 14px}\n .visual-window p{max-width:78%;font-size:.78rem;margin-top:17px}\n .visual-progress{margin-top:20px}\n .visual-download{right:5%;bottom:28%;width:42px;height:42px}\n .float-platform.pinterest{top:32%;right:-2%}\n}\n\n/* Keep the hero slogan clear of the download badge */\n.visual-window{position:relative}\n.visual-window p{\n  width:72%;\n  max-width:72%;\n  align-self:flex-start;\n  margin:20px 0 0 8%;\n  text-align:left;\n  line-height:1.28;\n  position:relative;\n  z-index:6;\n  overflow-wrap:normal;\n}\n.visual-download{\n  right:6%;\n  bottom:12%;\n  top:auto;\n  z-index:4;\n}\n@media(max-width:650px){\n  .visual-window p{\n    width:70%;\n    max-width:70%;\n    margin:16px 0 0 7%;\n    font-size:.76rem;\n    line-height:1.25;\n  }\n  .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n}\n\n\n/* Keep the hero slogan clear of the download badge */\n.visual-window p{\n  width:72%;\n  max-width:72%;\n  align-self:flex-start;\n  margin:20px 0 0 8%;\n  text-align:left;\n  line-height:1.28;\n  position:relative;\n  z-index:6;\n  overflow-wrap:normal;\n}\n.visual-download{\n  right:6%;\n  bottom:12%;\n  top:auto;\n  z-index:4;\n}\n@media(max-width:650px){\n  .visual-window p{\n    width:70%;\n    max-width:70%;\n    margin:16px 0 0 7%;\n    font-size:.76rem;\n    line-height:1.25;\n  }\n  .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n}\n\n\n/* Final hero composition: social platform badges remain fully visible */\n.hero-visual{isolation:isolate;overflow:visible}\n.visual-window{position:relative;z-index:2}\n.float-platform{z-index:5}\n.visual-brand{width:min(78%,300px);display:flex;justify-content:center;align-items:center}\n.visual-brand img{width:100%;height:auto;max-height:none;object-fit:contain}\n.visual-window p{width:72%;max-width:72%;margin:20px 0 0 7%;align-self:flex-start;text-align:left;position:relative;z-index:6;line-height:1.28}\n.visual-download{right:6%;bottom:12%;top:auto;z-index:4}\n@media(max-width:650px){\n .hero-visual{min-height:300px;margin:10px 0 18px}\n .visual-window{width:76%;height:220px;padding:18px 14px}\n .visual-brand{width:78%;max-width:250px}\n .visual-progress{width:60%;margin-top:20px}\n .visual-window p{width:70%;max-width:70%;margin:16px 0 0 6%;font-size:.76rem;line-height:1.25}\n .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n .float-platform{z-index:5;width:45px;height:45px;border-radius:15px;font-size:1.4rem}\n .float-platform.youtube{top:0;left:0}\n .float-platform.tiktok{top:0;right:0}\n .float-platform.facebook{bottom:0;left:0}\n .float-platform.instagram{bottom:0;right:0;left:auto}\n .float-platform.pinterest{top:43%;right:-1%}\n}\n\n\n/* Klypza hero: one authoritative responsive layout */\n.hero-visual{position:relative;overflow:visible;isolation:isolate}\n.visual-window{position:relative;z-index:2}\n.visual-brand{width:min(86%,340px);display:flex;align-items:center;justify-content:center;position:relative;z-index:4}\n.visual-brand img{display:block;width:100%;height:auto;max-height:none;object-fit:contain}\n.visual-download{z-index:4;right:7%;bottom:12%;top:auto}\n.float-platform{position:absolute;z-index:6;width:52px;height:52px;border-radius:16px}\n.float-platform.youtube{top:1%;left:2%;right:auto;bottom:auto}\n.float-platform.tiktok{top:1%;right:2%;left:auto;bottom:auto}\n.float-platform.pinterest{top:43%;right:-1%;left:auto;bottom:auto}\n.float-platform.facebook{bottom:1%;left:2%;right:auto;top:auto}\n.float-platform.instagram{bottom:1%;right:2%;left:auto;top:auto}\n@media(max-width:650px){\n .hero-visual{min-height:300px;margin:10px 0 18px}\n .visual-window{width:76%;height:220px;padding:18px 14px}\n .visual-brand{width:88%;max-width:270px}\n .visual-progress{width:60%;margin-top:20px}\n .visual-window p{width:70%;max-width:70%;margin:16px 0 0 6%;font-size:.76rem;line-height:1.25}\n .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n .float-platform{z-index:6;width:45px;height:45px;border-radius:15px;font-size:1.4rem}\n .float-platform.youtube{top:0;left:0}\n .float-platform.tiktok{top:0;right:0}\n .float-platform.pinterest{top:43%;right:-1%}\n .float-platform.facebook{bottom:0;left:0}\n .float-platform.instagram{bottom:0;right:0}\n}\n\n</style>\n</head>\n<body>\n<header class=\"site-header\">\n  <div class=\"nav-wrap\">\n    <a href=\"/\" class=\"logo\" aria-label=\"Klypza home\"><img class=\"brand-wordmark\" src=\"/brand-wordmark.webp\" alt=\"Klypza\" width=\"150\" height=\"41\"></a>\n    <nav class=\"nav-links\" aria-label=\"Main navigation\">\n      <a href=\"/\" class=\"nav-home\">Home</a>\n      <a href=\"#features\">Features</a>\n      <a href=\"#public-pricing\">Pricing</a>\n      <a href=\"#reviews\">Reviews</a>\n      <a href=\"#faq\">Help</a>\n      <a href=\"/login\" class=\"nav-login\">Log in</a>\n      <a href=\"/register\" class=\"nav-cta\">Create Account</a>\n    </nav>\n  </div>\n</header>\n\n<section class=\"hero public-hero\"><div class=\"container public-hero-grid\"><div class=\"public-hero-copy\"><span class=\"eyebrow\"><i class=\"fa-solid fa-cloud-arrow-down\"></i> ⚡ All-in-One Media Downloader</span><h1>Download videos from your favorite platforms <span class=\"accent\">in one place.</span></h1><p class=\"hero-copy\">Klypza helps you download supported public social media videos quickly, safely, and in high quality. Simple, fast, and reliable.</p><div class=\"hero-actions\"><a class=\"hero-primary\" href=\"/register\">Get started free <i class=\"fa-solid fa-arrow-right\"></i></a><a class=\"hero-secondary\" href=\"/plans\">Explore plans</a></div><div class=\"hero-benefits\"><span><i class=\"fa-solid fa-check\"></i> Safe &amp; Secure</span><span><i class=\"fa-solid fa-bolt\"></i> Fast Processing</span><span><i class=\"fa-solid fa-infinity\"></i> Quality options</span></div><div class=\"platform-pills\"><span class=\"platform-pill\"><i class=\"fa-brands fa-tiktok\"></i> TikTok</span><span class=\"platform-pill\"><i class=\"fa-brands fa-instagram\"></i> Instagram</span><span class=\"platform-pill\"><i class=\"fa-brands fa-facebook\"></i> Facebook</span><span class=\"platform-pill\"><i class=\"fa-brands fa-youtube\"></i> YouTube</span><span class=\"platform-pill\"><i class=\"fa-brands fa-pinterest-p\"></i> Pinterest</span></div></div><div class=\"hero-visual\"><div class=\"visual-window\"><div class=\"visual-brand\"><img src=\"/hero-wordmark-v2.svg\" alt=\"Klypza\" width=\"260\" height=\"72\"></div><div class=\"visual-progress\"><span></span></div><div class=\"visual-download\"><i class=\"fa-solid fa-download\"></i></div><p>Your videos. One simple place.</p></div><span class=\"float-platform youtube\"><i class=\"fa-brands fa-youtube\"></i></span><span class=\"float-platform tiktok\"><i class=\"fa-brands fa-tiktok\"></i></span><span class=\"float-platform instagram\"><i class=\"fa-brands fa-instagram\"></i></span><span class=\"float-platform facebook\"><i class=\"fa-brands fa-facebook-f\"></i></span><span class=\"float-platform pinterest\"><i class=\"fa-brands fa-pinterest-p\"></i></span></div></div></section>\n\n<main class=\"public-main\">\n  <div class=\"container\">\n    <!-- Reserved ad placement. Add a compliant ad network tag only after account approval. Keep ads visually separate from navigation and download controls. -->\n    \n\n\n\n    <!-- Second reserved ad placement. Keep clear spacing from the main action and results. -->\n    \n\n    <section class=\"content-section public-stats\"><div class=\"stat-item\"><i class=\"fa-solid fa-users\"></i><strong id=\"publicUsers\">—</strong><span>Registered members</span></div><div class=\"stat-item\"><i class=\"fa-solid fa-download\"></i><strong id=\"publicDownloads\">—</strong><span>Video links processed</span></div><div class=\"stat-item\"><i class=\"fa-solid fa-layer-group\"></i><strong>3</strong><span>Flexible plans</span></div><p class=\"stats-note\">Live figures are based on recorded Klypza account and download activity.</p></section>\n<section class=\"content-section public-features\" id=\"features\"><div class=\"section-kicker\">Why Klypza</div><h2>Why Choose Klypza?</h2><p>A complete, simple, and reliable solution for downloading supported social media videos.</p><div class=\"feature-grid\"><article class=\"feature-tile\"><i class=\"fa-solid fa-bolt\"></i><h3>Simple workflow</h3><p>Choose a platform, add a public video link and process it from your account.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-layer-group\"></i><h3>Batch processing</h3><p>Process several links in one batch, with limits matched to your plan.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-file-zipper\"></i><h3>ZIP downloads</h3><p>Group available video files into ZIP archives for convenient saving.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-sliders\"></i><h3>Quality options</h3><p>Choose from video qualities returned by the supported provider.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-shield-halved\"></i><h3>Account controls</h3><p>View your plan, daily usage and recent activity in a private dashboard.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-mobile-screen\"></i><h3>Mobile friendly</h3><p>Use Klypza from a phone, tablet, laptop or desktop browser.</p></article></div></section>\n<section class=\"content-section public-pricing\" id=\"public-pricing\"><div class=\"section-kicker\">Plans & pricing</div><h2>Choose the plan that works for you</h2><p>Start free, then upgrade when you need more daily capacity.</p><div class=\"steps-grid pricing-grid\"><article class=\"info-card pricing-card\"><span class=\"badge\">Free</span><h3>Free</h3><div class=\"plan-price\">$0 <small>/ month</small></div><ul><li>5 videos per batch</li><li>10 videos per day</li><li>ZIP download</li><li>Basic quality</li><li>Standard queue</li><li>Ads supported</li></ul><a class=\"btn-download\" href=\"/register\">Create free account</a></article><article class=\"info-card pricing-card standard-card\"><span class=\"badge warn\">Test price</span><h3>Standard</h3><div class=\"plan-price\">$0.10 <small>/ month</small></div><ul><li>15 videos per batch</li><li>90 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Faster queue</li><li>Ad-free</li></ul><a class=\"btn-download\" href=\"/plans\">View plan details</a></article><article class=\"info-card pricing-card premium-card\"><span class=\"badge warn\">Test price</span><h3>Premium</h3><div class=\"plan-price\">$0.20 <small>/ month</small></div><ul><li>25 videos per batch</li><li>150 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Priority queue</li><li>Ad-free</li></ul><a class=\"btn-download\" href=\"/plans\">View plan details</a></article></div><p class=\"notice\">Standard and Premium prices are temporary test prices. Checkout is not active and no payment will be collected.</p></section>\n<section class=\"content-section public-reviews\" id=\"reviews\"><div class=\"section-kicker\">Community feedback</div><h2>Built around real user experience</h2><p>Verified ratings and testimonials will appear here as genuine user feedback is collected. Klypza does not publish invented review counts or star ratings.</p><div class=\"review-promise\"><i class=\"fa-solid fa-star\"></i><div><strong>Verified reviews only</strong><span>Feedback will be tied to genuine accounts and moderated for spam.</span></div></div></section><section class=\"content-section\" id=\"how-it-works\">\n      <div class=\"section-kicker\">Getting started</div>\n      <h2>How to download a social media video</h2>\n      <p>Klypza is built for supported public video posts. You do not need to paste an entire profile: use the direct link to the video you want to save.</p>\n      <div class=\"steps-grid\">\n        <article class=\"info-card\"><span class=\"step-num\">01</span><h3>Copy a video link</h3><p>Open a public TikTok, Reel, Short, or video Pin and copy its post URL.</p></article>\n        <article class=\"info-card\"><span class=\"step-num\">02</span><h3>Paste and process</h3><p>Choose the matching platform, paste the URL, then select <strong>Find Videos</strong>.</p></article>\n        <article class=\"info-card\"><span class=\"step-num\">03</span><h3>Save your video</h3><p>Download an available video individually or group multiple results into ZIP batches.</p></article>\n      </div>\n      <div class=\"notice\"><strong>Good to know:</strong> Results depend on the source post being public, platform restrictions, and the availability of the configured video provider. Klypza is an independent tool and is not affiliated with the platforms listed here.</div>\n    </section>\n\n    <section class=\"content-section\" id=\"supported-platforms\">\n      <div class=\"section-kicker\">Supported links</div>\n      <h2>One tool for five video platforms</h2>\n      <p>Support is focused on video posts—not photos, profile pages, or private content.</p>\n      <div class=\"platform-info-grid\">\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-tiktok\" aria-hidden=\"true\"></i></span><div><h3>TikTok Video Downloader</h3><p>Process supported public TikTok video links. Availability can vary by post and provider.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-instagram\" aria-hidden=\"true\"></i></span><div><h3>Instagram Reels Downloader</h3><p>Use a direct public Instagram Reel URL. Private or restricted posts are not supported.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-facebook\" aria-hidden=\"true\"></i></span><div><h3>Facebook Reels Downloader</h3><p>Process supported public Facebook Reel links. Some regional or restricted links may fail.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-youtube\" aria-hidden=\"true\"></i></span><div><h3>YouTube Shorts Downloader</h3><p>Paste a supported Shorts URL. Processing depends on the configured provider and applicable restrictions.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-pinterest-p\" aria-hidden=\"true\"></i></span><div><h3>Pinterest Video Downloader</h3><p>Use a direct Pin URL that contains a supported video, not a static image Pin.</p></div></article>\n      </div>\n    </section>\n\n    <section class=\"content-section\" id=\"why-use\">\n      <div class=\"section-kicker\">Designed for simplicity</div>\n      <h2>A clean, practical video-saving workflow</h2>\n      <div class=\"benefit-grid\">\n        <article class=\"info-card\"><h3><i class=\"fa-solid fa-layer-group\" aria-hidden=\"true\" style=\"color:#2878f0;margin-right:7px\"></i>Batch processing</h3><p>Process multiple post links in one session and organize available files into ZIP batches.</p></article>\n        <article class=\"info-card\"><h3><i class=\"fa-solid fa-mobile-screen-button\" aria-hidden=\"true\" style=\"color:#2878f0;margin-right:7px\"></i>Mobile friendly</h3><p>A responsive layout designed to work on phones, tablets, laptops, and desktop browsers.</p></article>\n        <article class=\"info-card\"><h3><i class=\"fa-solid fa-shield-halved\" aria-hidden=\"true\" style=\"color:#2878f0;margin-right:7px\"></i>Use responsibly</h3><p>Save only content you own or have permission to download, and respect creator rights.</p></article>\n      </div>\n    </section>\n\n    <section class=\"content-section faq-list\" id=\"faq\">\n      <div class=\"section-kicker\">Help center</div>\n      <h2>Frequently asked questions</h2>\n      <details><summary>Is Klypza free to use?</summary><p>The website is free to access. Successful video processing depends on the source platform and the availability of the configured download provider.</p></details>\n      <details><summary>Which platforms are supported?</summary><p>The tool is designed for supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts, and Pinterest video Pins.</p></details>\n      <details><summary>Why did my video link fail?</summary><p>A link can fail if a post is private, unavailable, restricted, unsupported, or not supported by the configured provider. Try a public video post URL and check that it belongs to one of the supported platforms.</p></details>\n      <details><summary>Can I download profile links or photos?</summary><p>No. Paste a direct video post URL. Profile links and photo downloads are not supported.</p></details>\n      <details><summary>Can I download any video I find?</summary><p>Only download videos you own or have permission to save. Respect copyright, privacy, and the terms of the source platform. Do not use this tool to bypass access controls or download private content.</p></details>\n      <details><summary>Does Klypza belong to TikTok, Instagram, Facebook, YouTube, or Pinterest?</summary><p>No. Klypza is an independent third-party tool and is not affiliated with, endorsed by, or sponsored by those platforms.</p></details>\n    </section>\n  </div>\n</main>\n\n<section id=\"accountPanel\" class=\"container\" style=\"display:none;padding:42px 0 70px\">\n  <div id=\"authCard\" class=\"content-section\" style=\"max-width:560px;margin:0 auto\">\n    <div class=\"section-kicker\">Klypza account</div>\n    <h2 id=\"authTitle\">Create your account</h2>\n    <p id=\"authIntro\">Sign up with your email to manage your credits and downloads.</p>\n    <form id=\"authForm\" style=\"display:grid;gap:14px;margin-top:22px\">\n      <label id=\"nameField\">Name<input id=\"authName\" name=\"name\" autocomplete=\"name\" maxlength=\"60\" style=\"display:block;width:100%;padding:13px;border:1px solid #d8deea;border-radius:12px;margin-top:6px\"></label>\n      <label>Email address<input id=\"authEmail\" name=\"email\" type=\"email\" autocomplete=\"email\" required maxlength=\"190\" style=\"display:block;width:100%;padding:13px;border:1px solid #d8deea;border-radius:12px;margin-top:6px\"></label>\n      <label>Password<input id=\"authPassword\" name=\"password\" type=\"password\" autocomplete=\"new-password\" required minlength=\"10\" maxlength=\"128\" style=\"display:block;width:100%;padding:13px;border:1px solid #d8deea;border-radius:12px;margin-top:6px\"></label>\n      <button class=\"btn-submit\" id=\"authSubmit\" type=\"submit\">Create account</button>\n      <p id=\"authMessage\" role=\"status\" style=\"font-size:.9rem;color:#566178\"></p>\n    </form>\n    <p id=\"authSwitch\" style=\"margin-top:16px;font-size:.9rem\"></p>\n  </div>\n  <div id=\"dashboardCard\" class=\"content-section\" style=\"display:none;max-width:900px;margin:0 auto\">\n    <div style=\"display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center\">\n      <div><div class=\"section-kicker\">Customer dashboard</div><h2>Welcome, <span id=\"dashName\">member</span></h2><p id=\"dashEmail\"></p></div>\n      <button id=\"logoutButton\" type=\"button\" class=\"btn-download\">Log out</button>\n    </div>\n    <div class=\"steps-grid\" style=\"margin-top:24px\">\n      <article class=\"info-card\"><div class=\"section-kicker\">Daily quota remaining</div><h2 id=\"dashCredits\" style=\"font-size:2.2rem;margin:4px 0\">—</h2><p id=\"dashQuotaText\">Daily downloads remaining.</p></article>\n      <article class=\"info-card\"><div class=\"section-kicker\">Current plan</div><h2 id=\"dashPlan\" style=\"font-size:1.7rem;margin:4px 0\">Free</h2><p id=\"dashSubStatus\">No active paid subscription.</p><p id=\"dashBatchText\">Batch limit: 5 videos</p></article>\n      <article class=\"info-card\"><div class=\"section-kicker\">Account</div><h2 style=\"font-size:1.7rem;margin:4px 0\">Active</h2><p>Your account and credit balance are stored securely.</p></article>\n    </div>\n    <div class=\"dashboard-downloader-intro\"><div class=\"section-kicker\">Video downloader</div><h2 style=\"font-size:1.5rem\">Download your videos</h2><p>Choose a platform and paste public video links. Your plan limits are applied automatically.</p></div>\\n    <section class=\"tool-card\" id=\"video-tool\" aria-labelledby=\"tool-title\">\n      <div class=\"tool-heading\">\n        <span class=\"mini-icon\"><i class=\"fa-solid fa-cloud-arrow-down\" aria-hidden=\"true\"></i></span>\n        <h2 id=\"tool-title\">Download social videos</h2>\n        <p>Choose a platform, paste direct video links, and process up to the batch limit included with your plan.</p>\n      </div>\n      <div id=\"configBanner\" class=\"banner warn\" role=\"status\" hidden></div>\n      <div class=\"platform-grid\" id=\"platformGrid\" role=\"group\" aria-label=\"Choose a video platform\"></div>\n      <label class=\"field-label\" for=\"profileUrl\">Video URLs <span style=\"font-weight:500;color:#64708a\">(one link per line)</span></label>\n      <textarea id=\"profileUrl\" class=\"input-field\" rows=\"4\" spellcheck=\"false\" autocapitalize=\"off\" autocomplete=\"off\" inputmode=\"url\" aria-describedby=\"linkHelp\" placeholder=\"https://www.tiktok.com/@username/video/1234567890\"></textarea>\n      <div class=\"input-hint\" id=\"linkHelp\">\n        <span id=\"linkCount\" aria-live=\"polite\">0 links</span>\n        <span>Use public video post links, not profile URLs.</span>\n      </div>\n      <div class=\"options-row\">\n        <label class=\"check\" for=\"noWatermark\">\n          <input type=\"checkbox\" id=\"noWatermark\" checked>\n          <span><b>Prefer watermark-free video</b><br><span style=\"color:#64708a;font-size:.82rem\">When a clean version is available</span></span>\n        </label>\n        <label class=\"select-wrap\" for=\"batchSize\">\n          <span>Videos per ZIP batch</span>\n          <select id=\"batchSize\" aria-label=\"Videos per ZIP batch\">\n            <option value=\"5\" selected>5</option><option value=\"15\">15</option><option value=\"25\">25</option>\n          </select>\n        </label>\n      </div>\n      <button type=\"button\" class=\"btn-submit\" id=\"btnSubmit\"><i class=\"fa-solid fa-magnifying-glass\" aria-hidden=\"true\"></i> <span id=\"btnSubmitText\">Find Videos</span></button>\n      <div id=\"statusContainer\" class=\"status-container\" hidden>\n        <h2 id=\"statusText\" aria-live=\"polite\">Processing…</h2>\n        <div class=\"progress-bar\" role=\"progressbar\" aria-label=\"Video processing progress\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\" id=\"progressBar\"><div id=\"progressFill\" class=\"progress-fill\"></div></div>\n        <p id=\"statusSub\" class=\"status-sub\"></p>\n        <div id=\"kloterBar\" class=\"kloter-bar\"></div>\n        <div id=\"batchResults\"></div>\n      </div>\n      <p class=\"legal\">Only save videos you own or have permission to download. Copyright remains with the original creator, and each platform’s terms apply.</p>\n    </section>\\n    <aside class=\"ad-slot\" aria-label=\"Advertisement placement\"><span class=\"ad-label\">Advertisement</span><span class=\"ad-placeholder\">Ad placement for Free accounts</span></aside>\\n    <div style=\"display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:28px 0 12px\"><h2 style=\"font-size:1.3rem;margin:0\">Recent activity</h2><a href=\"/plans\" class=\"btn-download\">View plans</a></div>\n    <div id=\"activityList\" style=\"display:grid;gap:9px\"><p>No activity yet.</p></div>\n    <div style=\"margin-top:28px\"><h2 style=\"font-size:1.3rem\">Credit history</h2><div id=\"creditHistory\" style=\"display:grid;gap:8px;margin-top:12px\"></div></div>\n  </div>\n  <div id=\"plansCard\" class=\"content-section\" style=\"display:none;max-width:1000px;margin:0 auto\">\n    <div class=\"section-kicker\">Plans & subscriptions</div>\n    <h2>Choose the Klypza plan that fits your workflow</h2>\n    <p>Test pricing is temporary. Payments are not enabled yet, and no charge will be made from this page.</p>\n    <div class=\"steps-grid pricing-grid\" style=\"margin-top:22px\">\n      <article class=\"info-card pricing-card\"><span class=\"badge\">Available</span><h3>Free</h3><div class=\"plan-price\">$0 <small>/ month</small></div><p class=\"plan-tag\">For occasional downloads</p><ul><li>5 videos per batch</li><li>10 videos per day</li><li>ZIP download</li><li>Basic quality options</li><li>Standard processing queue</li><li>Advertisements shown</li></ul><a class=\"btn-download\" href=\"/register\">Start free</a></article>\n      <article class=\"info-card pricing-card\"><span class=\"badge warn\">Test price</span><h3>Standard</h3><div class=\"plan-price\">$0.10 <small>/ month</small></div><p class=\"plan-tag\">Temporary testing price</p><ul><li>15 videos per batch</li><li>90 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Faster processing queue</li><li>No advertisements</li></ul><button class=\"btn-download plan-disabled\" type=\"button\" disabled>Payments not connected</button></article>\n      <article class=\"info-card pricing-card premium-card\"><span class=\"badge warn\">Test price</span><h3>Premium</h3><div class=\"plan-price\">$0.20 <small>/ month</small></div><p class=\"plan-tag\">Temporary testing price</p><ul><li>25 videos per batch</li><li>150 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Priority processing queue</li><li>No advertisements</li></ul><button class=\"btn-download plan-disabled\" type=\"button\" disabled>Payments not connected</button></article>\n    </div>\n    <p class=\"notice\">The $0.10 and $0.20 amounts are temporary test prices, not the final $4.99 and $8.99 launch prices. Checkout, renewals, cancellations, and automatic plan activation will be added only after a payment provider is connected.</p>\n  </div>\n</section>\n\n<footer class=\"site-footer\">\n  <div class=\"footer-inner\">\n    <div class=\"footer-brand\">\n      <a href=\"/\" class=\"logo\" aria-label=\"Klypza home\"><img class=\"footer-wordmark\" src=\"/hero-wordmark-v2.svg\" alt=\"Klypza — download video\" width=\"240\" height=\"72\"></a>\n      <p>A simple video link tool for supported public posts. Built for clarity, mobile usability, and responsible use.</p>\n    </div>\n    <nav class=\"footer-links\" aria-label=\"Legal and information\">\n      <a href=\"/about\">About</a>\n      <a href=\"/privacy-policy\">Privacy Policy</a>\n      <a href=\"/terms\">Terms of Use</a>\n      <a href=\"/copyright\">Copyright Policy</a>\n      <a href=\"/contact\">Contact</a>\n    </nav>\n  </div>\n  <div class=\"copyright\">© 2026 Klypza. All rights reserved. All third-party names and marks belong to their respective owners.</div>\n</footer>\n\n<script src=\"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js\"></script>\n<script>\n(function () {\n  'use strict';\n\n  var MAX_LINKS = 5;\n  var PLATFORMS = [\n    { name: 'TikTok', icon: 'fa-brands fa-tiktok', label: 'TikTok', hosts: ['tiktok.com'], example: 'https://www.tiktok.com/@username/video/1234567890' },\n    { name: 'Instagram', icon: 'fa-brands fa-instagram', label: 'Instagram Reels', hosts: ['instagram.com', 'instagr.am'], example: 'https://www.instagram.com/reel/AbCdEfGhIjK/' },\n    { name: 'Facebook', icon: 'fa-brands fa-facebook', label: 'Facebook Reels', hosts: ['facebook.com', 'fb.watch', 'fb.com'], example: 'https://www.facebook.com/reel/1234567890' },\n    { name: 'YouTube', icon: 'fa-brands fa-youtube', label: 'YouTube Shorts', hosts: ['youtube.com', 'youtu.be'], example: 'https://www.youtube.com/shorts/AbCdEfGhIjK' },\n    { name: 'Pinterest', icon: 'fa-brands fa-pinterest', label: 'Pinterest', hosts: ['pinterest.com', 'pin.it'], example: 'https://www.pinterest.com/pin/1234567890/' }\n  ];\n\n  var state = { platform: 'TikTok', busy: false, results: [], configured: true, maxBatch: 5 };\n\n  var $ = function (id) { return document.getElementById(id); };\n  var els = {\n    input: $('profileUrl'), count: $('linkCount'), submit: $('btnSubmit'), submitText: $('btnSubmitText'),\n    status: $('statusContainer'), statusText: $('statusText'), statusSub: $('statusSub'),\n    fill: $('progressFill'), bar: $('progressBar'), results: $('batchResults'), kloter: $('kloterBar'),\n    banner: $('configBanner'), noWm: $('noWatermark'), size: $('batchSize'), grid: $('platformGrid')\n  };\n\n  function el(tag, props, children) {\n    var n = document.createElement(tag);\n    props = props || {};\n    Object.keys(props).forEach(function (k) {\n      if (k === 'class') n.className = props[k];\n      else if (k === 'text') n.textContent = props[k];\n      else if (k === 'on') Object.keys(props.on).forEach(function (ev) { n.addEventListener(ev, props.on[ev]); });\n      else n.setAttribute(k, props[k]);\n    });\n    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });\n    return n;\n  }\n  function icon(cls) { return el('i', { 'class': cls, 'aria-hidden': 'true' }); }\n\n  // ---------- link ----------\n  function hostPlatform(host) {\n    host = host.toLowerCase();\n    for (var i = 0; i < PLATFORMS.length; i++) {\n      if (PLATFORMS[i].hosts.some(function (d) { return host === d || host.slice(-d.length - 1) === '.' + d; })) return PLATFORMS[i].name;\n    }\n    return null;\n  }\n  function parseLinks(text) {\n    var seen = {}, out = [];\n    text.split(/[\\s,]+/).forEach(function (t) {\n      t = t.trim();\n      if (t && !seen[t]) { seen[t] = 1; out.push(t); }\n    });\n    return out;\n  }\n  function updateCount() {\n    var n = parseLinks(els.input.value).length;\n    els.count.textContent = n + ' link' + (n === 1 ? '' : 's') + (n > state.maxBatch ? ' (' + state.maxBatch + ' maximum)' : '');\n  }\n  window.klypzaSetPlanLimits = function (batchLimit) { state.maxBatch = Math.max(1, Number(batchLimit) || 5); MAX_LINKS = state.maxBatch; if (els.size) { var allowed = [5,15,25]; els.size.innerHTML = ''; allowed.filter(function(v){return v <= state.maxBatch;}).forEach(function(v){els.size.appendChild(el('option',{value:String(v),text:String(v)}));}); els.size.value = String(state.maxBatch); } updateCount(); };\n\n  // ---------- mode & platform ----------\n  function setPlatform(name) {\n    state.platform = name;\n    var allButton = $('plat-All');\n    if (allButton) {\n      allButton.classList.toggle('active', name === 'All');\n      allButton.setAttribute('aria-pressed', String(name === 'All'));\n    }\n    PLATFORMS.forEach(function (p) {\n      var b = $('plat-' + p.name);\n      b.classList.toggle('active', p.name === name);\n      b.setAttribute('aria-pressed', String(p.name === name));\n      if (p.name === name) els.input.placeholder = p.example;\n    });\n    if (name === 'All') els.input.placeholder = 'Paste video links from any supported platform, one per line';\n  }\n  els.grid.appendChild(el('button', { type: 'button', id: 'plat-All', 'class': 'platform-btn', 'aria-pressed': 'false', on: { click: function () { setPlatform('All'); } } },\n    [icon('fa-solid fa-layer-group'), 'All platforms']));\n  PLATFORMS.forEach(function (p) {\n    els.grid.appendChild(el('button', { type: 'button', id: 'plat-' + p.name, 'class': 'platform-btn', 'aria-pressed': 'false', on: { click: function () { setPlatform(p.name); } } },\n      [icon(p.icon), p.label]));\n  });\n  setPlatform('All');\n  els.noWm.addEventListener('change', renderResults);\n  els.size.addEventListener('change', renderResults);\n  els.input.addEventListener('input', updateCount);\n  els.input.addEventListener('paste', function () { setTimeout(updateCount, 0); });\n  els.submit.addEventListener('click', startScanning);\n\n  // ---------- status ----------\n  function setProgress(pct, isError) {\n    els.fill.style.width = pct + '%';\n    els.fill.classList.toggle('error', !!isError);\n    els.bar.setAttribute('aria-valuenow', String(Math.round(pct)));\n  }\n  function showStatus(title, sub, pct, isError) {\n    els.status.hidden = false;\n    els.statusText.textContent = title;\n    els.statusSub.textContent = sub || '';\n    if (pct != null) setProgress(pct, isError);\n  }\n\n  // ---------- konfigurasi server ----------\n  function checkHealth() {\n    if (location.protocol === 'file:') {\n      state.configured = false;\n      els.banner.hidden = false;\n      els.banner.textContent = 'This page was opened as a local file. Open the hosted website to use video downloads.';\n      return;\n    }\n    fetch('/api/health', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {\n      if (d && d.configured === false) {\n        state.configured = false;\n        els.banner.hidden = false;\n        els.banner.textContent = 'The video service is not available yet. Please try again later.';\n      }\n    }).catch(function () {\n      state.configured = false;\n      els.banner.hidden = false;\n      els.banner.textContent = 'The video service could not be reached. Please try again later.';\n    });\n  }\n\n  // ---------- proses ----------\n  // SaveAPI Free permits 10 requests/minute. Space requests so a 25-link batch\n  // does not fire all requests in the same rate-limit window.\n  var lastSaveApiRequestAt = 0;\n  var MIN_REQUEST_INTERVAL_MS = 6200;\n  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }\n  async function waitForRequestSlot() {\n    var wait = lastSaveApiRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();\n    if (wait > 0) await delay(wait);\n  }\n\n  async function fetchOne(link, batchId) {\n    var maxRateLimitRetries = 2;\n    for (var attempt = 0; attempt <= maxRateLimitRetries; attempt++) {\n      var ctrl = new AbortController();\n      var timer = setTimeout(function () { ctrl.abort(); }, 40000);\n      try {\n        await waitForRequestSlot();\n        lastSaveApiRequestAt = Date.now();\n        var r = await fetch('/api/download?url=' + encodeURIComponent(link) + '&batch_id=' + encodeURIComponent(batchId), { signal: ctrl.signal });\n        var data = null;\n        try { data = await r.json(); } catch (e) { /* bukan JSON */ }\n        var code = data && data.error ? String(data.error).toLowerCase() : '';\n        if (r.status === 429 && code === 'rate_limited' && attempt < maxRateLimitRetries) {\n          var retryAfter = Number(r.headers.get('Retry-After') || 0);\n          var waitMs = Math.max(MIN_REQUEST_INTERVAL_MS, Math.min(60000, retryAfter * 1000 || MIN_REQUEST_INTERVAL_MS));\n          await delay(waitMs);\n          continue;\n        }\n        if (!r.ok || !data) {\n          if (r.status === 429 && code === 'rate_limited') {\n            throw new Error('SaveAPI is still rate-limiting requests after several retries. Wait a minute, then retry the remaining links.');\n          }\n          throw new Error((data && data.message) || 'The server returned an unexpected response (status ' + r.status + ').');\n        }\n        return data;\n      } catch (e) {\n        if (e.name === 'AbortError') throw new Error('The request timed out. Please try again.');\n        if (e instanceof TypeError) throw new Error('Could not connect to the server. Check your internet connection.');\n        throw e;\n      } finally { clearTimeout(timer); }\n    }\n    throw new Error('SaveAPI rate limit reached. Please wait and try again.');\n  }\n\n  async function startScanning() {\n    if (state.busy) return;\n    var all = parseLinks(els.input.value);\n    if (!all.length) {\n      showStatus('No links added', 'Paste at least one video post URL.', 0, true);\n      els.input.focus();\n      return;\n    }\n    var batchInfo;\n    try {\n      var batchResponse = await fetch('/api/batch/start', { method: 'POST' });\n      batchInfo = await batchResponse.json();\n      if (!batchResponse.ok) throw new Error(batchInfo.message || 'Please log in before downloading.');\n    } catch (e) {\n      showStatus('Account required', e.message || 'Please log in to continue.', 0, true);\n      return;\n    }\n    state.maxBatch = Number(batchInfo.maxBatch || 5);\n    MAX_LINKS = state.maxBatch;\n    var links = all.slice(0, MAX_LINKS);\n    updateCount();\n    state.busy = true;\n    state.results = [];\n    els.submit.disabled = true;\n    els.submitText.textContent = 'Processing…';\n    els.kloter.textContent = '';\n    els.results.textContent = '';\n    showStatus('Processing ' + links.length + ' link' + (links.length === 1 ? '' : 's') + '…', 'Contacting the video service.', 3, false);\n\n    var ok = 0;\n    for (var i = 0; i < links.length; i++) {\n      var link = links[i];\n      showStatus('Processing link ' + (i + 1) + ' of ' + links.length, link, 3 + (i / links.length) * 97, false);\n      var entry = { link: link };\n      var valid = true;\n      try { valid = /^https?:$/.test(new URL(link).protocol); } catch (e) { valid = false; }\n      if (!valid) {\n        entry.error = 'Invalid URL. Use a link that starts with https://.';\n      } else {\n        var detected = null;\n        try { detected = hostPlatform(new URL(link).hostname); } catch (e) { detected = null; }\n        if (!detected) {\n          entry.error = 'Unsupported platform. Use a direct video URL from one of the supported platforms.';\n        } else if (state.platform !== 'All' && detected !== state.platform) {\n          entry.error = 'Platform mismatch: this is a ' + detected + ' link, but ' + state.platform + ' is selected. Select the matching platform or choose All platforms.';\n        } else {\n          try {\n            entry.data = await fetchOne(link, batchInfo.batchId);\n            if (entry.data.platform && entry.data.platform !== detected) {\n              entry.error = 'The provider returned a different platform than expected. This link was not added to the download batch.';\n              delete entry.data;\n            } else {\n              ok++;\n            }\n          } catch (e) { entry.error = e.message; }\n        }\n      }\n      state.results.push(entry);\n      renderResults();\n    }\n    var failed = links.length - ok;\n    var extra = all.length > MAX_LINKS ? ' ' + (all.length - MAX_LINKS) + ' additional links ignored (your plan maximum is ' + MAX_LINKS + ').' : '';\n    if (ok === 0) showStatus('No videos could be processed', 'Check the message shown for each link below.' + extra, 100, true);\n    else showStatus('Done: ' + ok + ' link' + (ok === 1 ? '' : 's') + ' processed' + (failed ? ', ' + failed + ' failed' : ''), 'Download individual videos or ZIP batches.' + extra, 100, false);\n    state.busy = false;\n    els.submit.disabled = false;\n    els.submitText.textContent = 'Process Links';\n  }\n\n  // ---------- tampilan hasil ----------\n  function visibleItems(data) {\n    var list = data.items.filter(function (it) { return it.type === 'video'; });\n    var note = null;\n    if (els.noWm.checked && list.length) {\n      var clean = list.filter(function (it) { return !it.watermark; });\n      if (clean.length) list = clean;\n      else note = 'Only a watermarked version is available from the source.';\n    }\n    return { list: list, note: note };\n  }\n\n  function renderResults() {\n    els.results.textContent = '';\n    els.kloter.textContent = '';\n    var flat = [];\n    state.results.forEach(function (entry) {\n      var card = el('div', { 'class': 'batch-card' });\n      if (entry.error) {\n        card.appendChild(el('div', { 'class': 'link-title', text: entry.link }));\n        card.appendChild(el('div', { 'class': 'error-row', text: entry.error }));\n        els.results.appendChild(card);\n        return;\n      }\n      var d = entry.data;\n      var vis = visibleItems(d);\n      var head = el('div', { 'class': 'batch-header' }, [\n        el('div', {}, [\n          el('div', { 'class': 'link-title', text: d.title || 'Video from ' + d.platform }),\n          el('div', { 'class': 'muted', text: d.platform + (d.author ? ' · ' + d.author : '') })\n        ])\n      ]);\n      card.appendChild(head);\n      if (!vis.list.length) {\n        var row = el('div', { 'class': 'note-row', text: 'No supported video was found in this post.' });\n        card.appendChild(row);\n      } else {\n        if (vis.note) card.appendChild(el('div', { 'class': 'note-row', text: vis.note }));\n        var listEl = el('div', { 'class': 'item-list' });\n        vis.list.forEach(function (it) {\n          flat.push({ it: it, title: d.title, source: entry.link });\n          listEl.appendChild(itemRow(it));\n        });\n        card.appendChild(listEl);\n      }\n      els.results.appendChild(card);\n    });\n    renderKloters(flat);\n  }\n\n  function itemRow(it) {\n    var thumb;\n    if (it.thumb) {\n      thumb = el('img', { 'class': 'thumb', src: it.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });\n      thumb.addEventListener('error', function () {\n        var ph = el('div', { 'class': 'thumb' }, [icon('fa-solid fa-film')]);\n        if (thumb.parentNode) thumb.parentNode.replaceChild(ph, thumb);\n      });\n    } else {\n      thumb = el('div', { 'class': 'thumb' }, [icon(it.type === 'video' ? 'fa-solid fa-film' : 'fa-solid fa-image')]);\n    }\n    var label = 'Video' + (it.quality ? ' ' + it.quality : '') + ' · ' + it.ext.toUpperCase();\n    var meta = el('div', { 'class': 'item-meta' }, [\n      el('strong', { text: label }),\n      el('span', { 'class': 'badge ' + (it.watermark ? 'warn' : ''), text: it.watermark ? 'Watermarked' : 'No watermark', style: 'margin-left:0' })\n    ]);\n    var a = el('a', { 'class': 'btn-download', href: it.file, download: it.name }, [icon('fa-solid fa-download'), 'Download']);\n    return el('div', { 'class': 'item-row' }, [thumb, meta, a]);\n  }\n\n  function renderKloters(flat) {\n    if (!flat.length) return;\n    var size = parseInt(els.size.value, 10) || 20;\n    var byQuality = {};\n    flat.forEach(function (entry) {\n      var quality = String(entry.it.quality || 'Standard').trim() || 'Standard';\n      var key = quality.toLowerCase();\n      if (!byQuality[key]) byQuality[key] = { label: quality, items: [], sources: {} };\n      var group = byQuality[key];\n      // A source video can appear only once in a quality group, even if the provider returns duplicate URLs.\n      var sourceKey = String(entry.source || entry.title || '') + '|' + key;\n      if (group.sources[sourceKey]) return;\n      group.sources[sourceKey] = true;\n      group.items.push(entry);\n    });\n    var groups = Object.keys(byQuality).map(function (key) { return byQuality[key]; });\n    groups.sort(function (a, b) {\n      var qa = parseInt(a.label, 10), qb = parseInt(b.label, 10);\n      if (!isNaN(qa) && !isNaN(qb)) return qb - qa;\n      if (!isNaN(qa)) return -1;\n      if (!isNaN(qb)) return 1;\n      return a.label.localeCompare(b.label);\n    });\n    var batchNumber = 0;\n    groups.forEach(function (group) {\n      for (var i = 0; i < group.items.length; i += size) {\n        (function (chunk, qualityLabel, thisBatch) {\n          var btn = el('button', { type: 'button', 'class': 'btn-download' }, [icon('fa-solid fa-file-zipper'), 'Download ' + qualityLabel + ' ZIP ' + thisBatch]);\n          var sub = el('p', { 'class': 'muted', text: chunk.length + ' video' + (chunk.length === 1 ? '' : 's') + ' · one file per source link' });\n          btn.addEventListener('click', function () { downloadZip(chunk, thisBatch, btn, sub, qualityLabel); });\n          els.kloter.appendChild(el('div', { 'class': 'batch-card', style: 'margin-top:0' }, [\n            el('div', { 'class': 'batch-header', style: 'margin-bottom:0.25rem' }, [\n              el('div', {}, [el('strong', { text: qualityLabel + ' · ZIP ' + thisBatch }), el('span', { 'class': 'badge', text: 'Same quality' })]),\n              btn\n            ]),\n            sub\n          ]));\n        })(group.items.slice(i, i + size), group.label, ++batchNumber);\n      }\n    });\n  }\n\n  // ---------- ZIP ----------\n  function triggerSave(blob, name) {\n    var url = URL.createObjectURL(blob);\n    var a = document.createElement('a');\n    a.href = url; a.download = name;\n    document.body.appendChild(a); a.click(); a.remove();\n    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);\n  }\n\n  async function downloadZip(chunk, number, btn, sub, quality) {\n    if (btn.disabled) return;\n    btn.disabled = true;\n    try {\n      if (typeof JSZip === 'undefined') throw new Error('The ZIP library failed to load. Download videos one by one instead.');\n      var zip = new JSZip();\n      var done = 0, failed = 0, next = 0;\n      var used = {};\n      async function worker() {\n        while (next < chunk.length) {\n          var c = chunk[next++];\n          try {\n            var r = await fetch(c.it.file);\n            if (!r.ok) throw new Error('failed');\n            var blob = await r.blob();\n            var name = c.it.name;\n            if (used[name]) name = (used[name]++) + '_' + name; else used[name] = 1;\n            zip.file(name, blob);\n          } catch (e) { failed++; }\n          done++;\n          sub.textContent = 'Downloading ' + done + ' of ' + chunk.length + '…';\n        }\n      }\n      await Promise.all([worker(), worker(), worker()]);\n      if (failed === chunk.length) throw new Error('All files failed to download. Process the links again and retry.');\n      sub.textContent = 'Creating ZIP…';\n      var out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });\n      var qualitySlug = String(quality || 'standard').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');\n      triggerSave(out, 'Klypza_' + qualitySlug + '_batch_' + number + '.zip');\n      sub.textContent = (chunk.length - failed) + ' videos downloaded' + (failed ? ', ' + failed + ' failed' : '') + '.';\n    } catch (e) {\n      sub.textContent = e.message || 'Could not create the ZIP file.';\n    } finally {\n      btn.disabled = false;\n    }\n  }\n\n  updateCount();\n  checkHealth();\n})();\n\n  // ---------- Klypza accounts ----------\n  (function accountApp(){\n    var $ = function(id){ return document.getElementById(id); };\n    var path = location.pathname.endsWith('/') && location.pathname !== '/' ? location.pathname.slice(0,-1) : location.pathname;\n    var panel = $('accountPanel'), authCard = $('authCard'), dash = $('dashboardCard'), plans = $('plansCard');\n    if (!panel) return;\n    var view = path === '/register' ? 'register' : path === '/login' ? 'login' : path === '/dashboard' ? 'dashboard' : path === '/plans' ? 'plans' : 'home';\n    if (view === 'home') { fetch('/api/public-stats').then(function(r){return r.ok?r.json():null;}).then(function(d){if(d){$('publicUsers').textContent=Number(d.users||0).toLocaleString();$('publicDownloads').textContent=Number(d.downloads||0).toLocaleString();}}).catch(function(){}); fetch('/api/account',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(d&&d.quota&&window.klypzaSetPlanLimits){window.klypzaSetPlanLimits(d.quota.maxBatch);}if(d&&d.user&&d.user.plan!=='free')document.querySelectorAll('.ad-slot').forEach(function(n){n.hidden=true;});}).catch(function(){}); return; }\n    panel.style.display = 'block';\n    document.querySelector('.hero').style.display = 'none';\n    document.querySelector('main').style.display = 'none';\n    if (view === 'plans') { document.title='Klypza Plans — Free, Standard & Premium'; document.querySelector('link[rel=canonical]').href='https://klypza.web.id/plans'; authCard.style.display='none'; plans.style.display='block'; }\n    else if (view === 'dashboard') { document.title='Klypza Downloader — Your Account'; document.querySelector('meta[name=robots]').content='noindex,nofollow'; document.querySelector('.hero').style.display='none'; document.querySelector('main').style.display='none'; authCard.style.display='none'; dash.style.display='block'; var downloader=document.getElementById('video-tool'); if(downloader)dash.insertBefore(downloader,dash.querySelector('.dashboard-downloader-intro').nextSibling); loadDashboard(); }\n    else { document.querySelector('meta[name=robots]').content='noindex,nofollow'; document.title=(view==='register'?'Create account':'Log in')+' — Klypza'; authCard.style.display='block'; setAuthMode(view); }\n    function setAuthMode(mode){\n      var isReg = mode === 'register';\n      $('authTitle').textContent = isReg ? 'Create your account' : 'Welcome back';\n      $('authIntro').textContent = isReg ? 'Create an account to get 10 free downloads per day and manage your activity.' : 'Log in to continue to your Klypza dashboard.';\n      $('authSubmit').textContent = isReg ? 'Create account' : 'Log in';\n      $('nameField').style.display = isReg ? 'block' : 'none';\n      $('authPassword').autocomplete = isReg ? 'new-password' : 'current-password';\n      $('authPassword').minLength = isReg ? 10 : 1;\n      $('authSwitch').innerHTML = isReg ? 'Already have an account? <a href=\"/login\">Log in</a>' : 'New to Klypza? <a href=\"/register\">Create an account</a>';\n      $('authForm').onsubmit = async function(ev){\n        ev.preventDefault(); $('authMessage').textContent='Please wait…'; $('authSubmit').disabled=true;\n        try{\n          var payload={email:$('authEmail').value.trim(),password:$('authPassword').value};\n          if(isReg) payload.name=$('authName').value.trim();\n          var res=await fetch('/api/auth/'+(isReg?'register':'login'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});\n          var data=await res.json();\n          if(!res.ok) throw new Error(data.message||'Unable to continue.');\n          location.href='/dashboard';\n        }catch(err){$('authMessage').textContent=err.message;$('authSubmit').disabled=false;}\n      };\n    }\n    async function loadDashboard(){\n      try{\n        var res=await fetch('/api/account',{cache:'no-store'});\n        if(res.status===401){location.href='/login';return;}\n        var d=await res.json(); if(!res.ok) throw new Error(d.message||'Unable to load account.');\n        $('dashName').textContent=d.user.name||'member'; $('dashEmail').textContent=d.user.email;\n        $('dashCredits').textContent=d.quota.remaining + ' / ' + d.quota.dailyLimit; $('dashQuotaText').textContent=d.quota.usedToday + ' used today · Resets at 00:00 UTC.'; $('dashPlan').textContent=(d.user.plan||'free').toUpperCase(); $('dashBatchText').textContent='Batch limit: '+d.quota.maxBatch+' videos';\n        $('dashSubStatus').textContent=d.subscription&&d.subscription.status==='active'?'Subscription active':'No active paid subscription.';\n        var activity=$('activityList'); activity.textContent='';\n        (d.downloads||[]).forEach(function(item){var row=document.createElement('div');row.className='info-card';var title=document.createElement('strong');title.textContent=item.title||item.platform+' video';var meta=document.createElement('p');meta.textContent=item.platform+' · '+item.credits_used+' credit · '+new Date(item.created_at+'Z').toLocaleString();row.append(title,meta);activity.appendChild(row);});\n        if(!activity.children.length) activity.textContent='No downloads yet.';\n        var history=$('creditHistory');history.textContent='';\n        (d.transactions||[]).forEach(function(item){var row=document.createElement('div');row.className='item-row';var desc=document.createElement('span');desc.textContent=item.reason.replace(/_/g,' ');var amount=document.createElement('strong');amount.textContent=(item.amount>0?'+':'')+item.amount+' credits';row.append(desc,amount);history.appendChild(row);});\n        if(!history.children.length) history.textContent='No credit transactions yet.';\n      }catch(err){$('activityList').textContent=err.message;}\n    }\n    $('logoutButton').addEventListener('click',async function(){await fetch('/api/auth/logout',{method:'POST'});location.href='/';});\n  })();\n\n</script>\n</body>\n</html>";

function appPageHtml(path) {
  let html = INDEX_HTML;
  const base = 'https://klypza.web.id' + (path === '/' ? '/' : path);
  const meta = path === '/plans'
    ? { title: 'Klypza Plans — Free, Standard & Premium', description: 'Compare Klypza Free, Standard and Premium plans, including daily download limits, batch sizes and available features.', robots: 'index,follow' }
    : path === '/login'
      ? { title: 'Log In — Klypza', description: 'Log in to your Klypza account to manage downloads, usage and account settings.', robots: 'noindex,nofollow' }
      : path === '/register'
        ? { title: 'Create an Account — Klypza', description: 'Create a free Klypza account to process supported public video links and manage your downloads.', robots: 'noindex,nofollow' }
        : path === '/dashboard'
          ? { title: 'Your Klypza Dashboard', description: 'Manage your Klypza account, plan, daily usage and download activity.', robots: 'noindex,nofollow' }
          : null;
  if (!meta) return html;
  const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const title = escapeAttr(meta.title);
  const description = escapeAttr(meta.description);
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + description + '">');
  html = html.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="' + meta.robots + '">');
  html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + base + '">');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + base + '">');
  html = html.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + title + '">');
  html = html.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + description + '">');
  return html;
}


const SESSION_COOKIE = 'klypza_session';
const SESSION_DAYS = 30;
const FREE_START_CREDITS = 10;
const PLAN_LIMITS = {
  free: { daily: 10, batch: 5, price: 0, ads: true, quality: 'basic', queue: 'standard' },
  standard: { daily: 90, batch: 15, price: 0.10, ads: false, quality: 'expanded', queue: 'faster' },
  premium: { daily: 150, batch: 25, price: 0.20, ads: false, quality: 'expanded', queue: 'priority' },
};
function planLimits(plan){ return PLAN_LIMITS[String(plan||'free').toLowerCase()] || PLAN_LIMITS.free; }
function utcDate(){ return new Date().toISOString().slice(0,10); }

const INFO_PAGES = {
  about: {
    title:'About Klypza',
    description:'Discover Klypza, an independent online tool for processing supported public videos from popular social platforms.',
    heading:'About Klypza',
    intro:'Klypza is an independent browser-based service that helps people process links to supported public videos in one straightforward workflow.',
    sections:[
      {heading:'What Klypza does',text:'Klypza is designed for public video post links from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest video Pins. Depending on the source and provider availability, users can process supported links, select available video files and organize results into ZIP downloads.'},
      {heading:'A simple, transparent experience',text:'The service provides account access, usage information and plan limits so users can understand their available allowance. Features and source compatibility can vary because each social platform controls its own content and access.'},
      {heading:'Independent service',text:'Klypza is not affiliated with, sponsored by or officially endorsed by TikTok, Instagram, Facebook, YouTube or Pinterest. Their names and trademarks belong to their respective owners.'},
      {heading:'Responsible use',text:'Only process content you own or have permission to save. Respect creators, copyright, privacy, platform terms and applicable laws. Klypza is not intended to access private content or bypass access controls.'}
    ]
  },
  contact: {
    title:'Contact Klypza',
    description:'Contact Klypza support for account access, service questions, privacy requests and copyright concerns.',
    heading:'Contact Klypza',
    intro:'For help with Klypza, send a clear description of your question or concern using the support email below.',
    sections:[
      {heading:'General support',text:'For account access, supported-link issues, service availability or questions about features, email klypza.contact@gmail.com. Include the page address and a brief description of what happened. Do not include your password, session cookies or payment card details.'},
      {heading:'Privacy requests',text:'For questions about personal information or a privacy-related request, contact the same address and write “Privacy request” in the subject line. Include only the information needed to identify and understand your request.'},
      {heading:'Copyright concerns',text:'If you believe material or a feature associated with Klypza infringes your rights, email the relevant URL, identify the work, explain your rights and describe the action you are requesting. See our Copyright Policy for further guidance.'},
      {heading:'Email',text:'klypza.contact@gmail.com'}
    ]
  },
  'privacy-policy': {
    title:'Privacy Policy',
    description:'Understand what account and service information Klypza processes, why it is used and how to contact us about privacy.',
    heading:'Privacy Policy',
    intro:'This policy explains the information Klypza processes when you visit the website or use account and video-processing features.',
    sections:[
      {heading:'Information you provide',text:'When you create an account, Klypza processes the name and email address you submit, together with authentication information needed to protect account access. Do not send passwords or sensitive personal information by email.'},
      {heading:'Account, usage and download records',text:'Klypza records account and usage information needed to operate the service, apply daily and batch limits, show account activity and help investigate service issues. This may include the supported platform, submitted public video URL, processing result and usage event. Avoid submitting private links or URLs containing personal or confidential information.'},
      {heading:'Cookies and sessions',text:'Klypza uses a session cookie to keep you signed in and protect account functions. The session cookie is used for authentication and is configured with security attributes. Your browser may allow you to control cookies, but disabling essential session cookies can prevent account features from working.'},
      {heading:'Service providers and infrastructure',text:'Klypza uses Cloudflare infrastructure to deliver the website and process requests, and a configured third-party provider to process supported video links. Information necessary to perform a request may be transmitted to these providers. Their own privacy terms may also apply.'},
      {heading:'Payments and advertising',text:'Paid checkout is not currently enabled. Do not send payment details to Klypza. Advertising or analytics features may change as the service develops; this policy should be updated before any such feature is activated.'},
      {heading:'Retention and security',text:'Information is retained as needed to operate accounts, enforce usage limits, maintain service security and respond to support requests. Klypza uses technical safeguards, but no internet service can guarantee absolute security.'},
      {heading:'Your choices and privacy requests',text:'You can contact klypza.contact@gmail.com to ask a privacy question or request help with account information. We may need to verify your request before taking action. Do not include your password or session credentials.'},
      {heading:'Policy updates',text:'This policy may be updated as Klypza changes. The version published on this page is the current version available on the website.'}
    ]
  },
  terms: {
    title:'Terms of Use',
    description:'Read the rules for using Klypza responsibly, including copyright, account security, supported content and service limitations.',
    heading:'Terms of Use',
    intro:'By accessing or using Klypza, you agree to use the service lawfully and responsibly. If you do not agree with these terms, do not use the service.',
    sections:[
      {heading:'Permitted use and responsibility',text:'Use Klypza only for public content that you own or are authorized to save. You are responsible for ensuring that your use respects copyright, privacy, platform terms and applicable laws.'},
      {heading:'Prohibited activity',text:'Do not use Klypza to access private content, bypass access controls, infringe intellectual-property rights, violate another person’s privacy, misuse another person’s account, interfere with the service or attempt unauthorized access to systems or data.'},
      {heading:'Accounts and security',text:'You are responsible for providing accurate account information and protecting your sign-in credentials. Notify Klypza if you believe your account has been used without permission. Never share your password or session cookie with support.'},
      {heading:'Supported links and availability',text:'Klypza processes only supported public video links. Availability, formats and results depend on the source platform and the configured processing provider. A link may fail because it is private, removed, restricted, unsupported or temporarily unavailable. Klypza does not guarantee uninterrupted service or successful processing of every link.'},
      {heading:'Usage limits and plans',text:'Account limits and available features are displayed on the website and may change. Standard and Premium checkout are not currently enabled, and no paid subscription can currently be purchased through Klypza.'},
      {heading:'Third-party platforms',text:'Klypza is an independent service and is not affiliated with or endorsed by TikTok, Instagram, Facebook, YouTube or Pinterest. Your use of those platforms remains subject to their own terms.'},
      {heading:'Changes and service limitations',text:'Klypza may update, suspend or discontinue features to maintain or improve the service, comply with law or address security and operational concerns.'},
      {heading:'Contact',text:'Questions about these terms can be sent to klypza.contact@gmail.com.'}
    ]
  },
  copyright: {
    title:'Copyright Policy',
    description:'Learn how rights holders can report copyright concerns involving Klypza and what information to include.',
    heading:'Copyright Policy',
    intro:'Klypza respects creators and intellectual-property rights. The service is intended for users to process content they own or are authorized to save.',
    sections:[
      {heading:'Your responsibility',text:'Before processing a video, make sure you own it or have permission to save it. Do not use Klypza to infringe copyright, violate license terms or distribute material unlawfully.'},
      {heading:'Submit a copyright concern',text:'If you believe a URL, feature or material associated with Klypza infringes your rights, email klypza.contact@gmail.com. Include the location of the material, identify the copyrighted work, explain your ownership or authority to act, describe why you believe there is infringement and state the action you are requesting.'},
      {heading:'Good-faith and accurate notices',text:'Please provide accurate information and contact details so the concern can be reviewed. Do not submit passwords, payment card details or unrelated sensitive information. We may request clarification when a report does not contain enough information to assess it.'},
      {heading:'Review',text:'Klypza will review properly submitted concerns and take appropriate action where warranted. Submitting a report does not guarantee a particular outcome or response time.'},
      {heading:'Contact',text:'Copyright concerns should be sent to klypza.contact@gmail.com with “Copyright concern” in the subject line.'}
    ]
  }
};
function infoPageResponse(slug){
  const page=INFO_PAGES[slug]; if(!page)return null;
  const base='https://klypza.web.id/'+slug;
  const esc=(v)=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const paragraphs=(page.sections||[]).map(section=>'<section class="content-section"><h2>'+esc(section.heading)+'</h2><p>'+esc(section.text)+'</p></section>').join('');
  const nav=[['Home','/'],['Plans','/plans'],['About','/about'],['Contact','/contact'],['Privacy','/privacy-policy'],['Terms','/terms'],['Copyright','/copyright']];
  const navHtml=nav.map(([label,path])=>'<a href="'+path+'"'+(path==='/'+slug?' aria-current="page"':'')+'>'+label+'</a>').join('');
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebPage','name':page.title+' | Klypza','url':base,'description':page.description,'isPartOf':{'@type':'WebSite','name':'Klypza','url':'https://klypza.web.id/'}});
  const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(page.title)+' | Klypza</title><meta name="description" content="'+esc(page.description)+'"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+base+'"><meta property="og:type" content="website"><meta property="og:site_name" content="Klypza"><meta property="og:url" content="'+base+'"><meta property="og:title" content="'+esc(page.title)+' | Klypza"><meta property="og:description" content="'+esc(page.description)+'"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="'+esc(page.title)+' | Klypza"><meta name="twitter:description" content="'+esc(page.description)+'"><meta name="theme-color" content="#111936"><link rel="icon" href="/brand-icon.webp?v=2" type="image/webp"><link rel="apple-touch-icon" href="/brand-icon.webp?v=2"><script type="application/ld+json">'+schema+'</script><style>*{box-sizing:border-box}body{margin:0;background:#f7f8fd;color:#111936;font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}.wrap{max-width:900px;margin:0 auto;padding:28px 22px 56px}.brand{display:inline-flex;align-items:center;text-decoration:none}.brand img{display:block;width:190px;height:auto;max-height:56px;object-fit:contain}.nav{display:flex;flex-wrap:wrap;gap:10px 18px;margin:22px 0 34px;padding:14px 0;border-top:1px solid #e5e8f2;border-bottom:1px solid #e5e8f2}.nav a,.back{color:#245fc5;font-weight:650;text-decoration:none}.nav a[aria-current=page]{color:#111936;text-decoration:underline;text-underline-offset:5px}.card,.content-section{background:#fff;border:1px solid #e5e8f2;border-radius:18px;padding:clamp(22px,4vw,38px);box-shadow:0 12px 36px #1d284e0b}.card h1{font-size:clamp(2rem,5vw,2.8rem);line-height:1.15;letter-spacing:-.04em;margin:8px 0 14px}.intro{font-size:1.08rem;color:#46536d}.content-section{margin-top:16px;box-shadow:none}.content-section h2{font-size:1.2rem;line-height:1.3;margin:0 0 8px}.content-section p{margin:0;color:#536078}.back{display:inline-block;margin-top:26px}@media(max-width:520px){.wrap{padding:20px 14px 40px}.nav{gap:9px 13px}.card,.content-section{border-radius:14px}}</style></head><body><main class="wrap"><a class="brand" href="/" aria-label="Klypza home"><img src="/brand-wordmark.webp" alt="Klypza" width="190" height="52"></a><nav class="nav" aria-label="Main navigation">'+navHtml+'</nav><article class="card"><h1>'+esc(page.heading)+'</h1><p class="intro">'+esc(page.intro)+'</p></article>'+paragraphs+'<a class="back" href="/">← Back to Klypza home</a></main></body></html>';
  return new Response(body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
}
async function publicStats(env){if(!env.KLYPZA_DB)return json({users:0,downloads:0});const [u,d]=await Promise.all([env.KLYPZA_DB.prepare('SELECT COUNT(*) AS total FROM users').first(),env.KLYPZA_DB.prepare('SELECT COUNT(*) AS total FROM usage_events').first()]);return json({users:Number(u?.total||0),downloads:Number(d?.total||0)});}
async function accountRouter(request, env, url) {
  const path = url.pathname;
  if (!env.KLYPZA_DB) return json({error:'database_unavailable',message:'Account storage is not configured.'},503);
  if (path === '/api/auth/register' && request.method === 'POST') return registerAccount(request,env);
  if (path === '/api/auth/login' && request.method === 'POST') return loginAccount(request,env);
  if (path === '/api/auth/logout' && request.method === 'POST') return logoutAccount(request,env);
  if (path === '/api/auth/me' && request.method === 'GET') {
    const user=await getSessionUser(request,env);
    return user?json({authenticated:true,user:publicUser(user)}):json({authenticated:false},401);
  }
  if (path === '/api/account' && request.method === 'GET') return accountOverview(request,env);
  if (path === '/api/batch/start' && request.method === 'POST') return startDownloadBatch(request,env);
  if (path === '/api/plans' && request.method === 'GET') return json({currency:'USD',billingPeriod:'month',testPricing:true,plans:[
    {id:'free',name:'Free',price:0,dailyLimit:10,batchLimit:5,zip:true,quality:'Basic',queue:'Standard',ads:true,available:true},
    {id:'standard',name:'Standard',price:0.10,dailyLimit:90,batchLimit:15,zip:true,quality:'Expanded',queue:'Faster',ads:false,available:false},
    {id:'premium',name:'Premium',price:0.20,dailyLimit:150,batchLimit:25,zip:true,quality:'Expanded',queue:'Priority',ads:false,available:false}
  ]});
  return null;
}
async function startDownloadBatch(request,env){
  const user=await getSessionUser(request,env);
  if(!user)return json({error:'login_required',message:'Please log in to start downloading.'},401);
  const limits=planLimits(user.plan);
  const day=utcDate();
  const usedRow=await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first();
  const used=Number(usedRow?.used||0);
  if(used>=limits.daily)return json({error:'daily_limit_reached',message:'Your daily download quota is used up. It resets at 00:00 UTC.'},429);
  const batchId=crypto.randomUUID();
  await env.KLYPZA_DB.prepare('INSERT INTO download_batches(id,user_id,max_videos) VALUES(?,?,?)').bind(batchId,user.id,limits.batch).run();
  return json({ok:true,batchId,maxBatch:limits.batch,dailyLimit:limits.daily,usedToday:used,remaining:limits.daily-used});
}
async function checkDownloadAllowance(user,env,batchId){
  if(!batchId)return {ok:false,error:'batch_required',message:'Start a new download batch and try again.'};
  const batch=await env.KLYPZA_DB.prepare('SELECT id,max_videos FROM download_batches WHERE id=? AND user_id=?').bind(batchId,user.id).first();
  if(!batch)return {ok:false,error:'invalid_batch',message:'This download batch is invalid. Start a new batch.'};
  const day=utcDate();
  const [daily,batchCount]=await Promise.all([
    env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first(),
    env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND batch_id=?').bind(user.id,batchId).first()
  ]);
  const limits=planLimits(user.plan);
  if(Number(daily?.used||0)>=limits.daily)return {ok:false,error:'daily_limit_reached',message:'Your daily download quota is used up. It resets at 00:00 UTC.'};
  if(Number(batchCount?.used||0)>=Number(batch.max_videos))return {ok:false,error:'batch_limit_reached',message:'Your plan allows up to '+batch.max_videos+' videos per batch. Start another batch to continue.'};
  return {ok:true};
}
function publicUser(u){return {id:u.id,email:u.email,name:u.display_name,credits:Number(u.credits),plan:u.plan};}
async function readJson(request){
  try { const data=await request.json(); return data&&typeof data==='object'?data:null; } catch { return null; }
}
function cookieToken(request){
  const raw=request.headers.get('Cookie')||'';
  const found=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='));
  return found?decodeURIComponent(found.slice(SESSION_COOKIE.length+1)):'';
}
function randomToken(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(value));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function passwordHash(password,salt){
  const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function createSession(userId,env){
  const token=randomToken(), tokenHash=await sha256(token);
  const expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
  await env.KLYPZA_DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(tokenHash,userId,expires).run();
  return 'klypza_session='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+(SESSION_DAYS*86400);
}
async function getSessionUser(request,env){
  const token=cookieToken(request); if(!token||!env.KLYPZA_DB)return null;
  const tokenHash=await sha256(token);
  return await env.KLYPZA_DB.prepare('SELECT u.id,u.email,u.display_name,u.credits,u.plan FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(tokenHash,new Date().toISOString()).first();
}
async function registerAccount(request,env){
  const origin=request.headers.get('Origin'); if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const data=await readJson(request); const email=String(data?.email||'').trim().toLowerCase();
  const password=String(data?.password||''); const name=String(data?.name||'').trim().slice(0,60);
  if(!email || email.length>190 || email.includes(' ') || !email.includes('@') || email.lastIndexOf('.')<email.indexOf('@')+2)return json({message:'Enter a valid email address.'},400);
  if(password.length<10||password.length>128)return json({message:'Password must contain 10–128 characters.'},400);
  const existing=await env.KLYPZA_DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
  if(existing)return json({message:'An account with this email already exists. Log in instead.'},409);
  const id=crypto.randomUUID(),salt=randomToken(),hash=await passwordHash(password,salt);
  await env.KLYPZA_DB.prepare('INSERT INTO users(id,email,display_name,password_hash,password_salt,credits,plan) VALUES(?,?,?,?,?,?,?)').bind(id,email,name,hash,salt,FREE_START_CREDITS,'free').run();
  await env.KLYPZA_DB.prepare('INSERT INTO credit_transactions(id,user_id,amount,balance_after,reason) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,FREE_START_CREDITS,FREE_START_CREDITS,'welcome_credits').run();
  const cookie=await createSession(id,env);
  return json({ok:true,user:{id,email,name,credits:FREE_START_CREDITS,plan:'free'}},201,{'set-cookie':cookie});
}
async function loginAccount(request,env){
  const origin=request.headers.get('Origin'); if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const data=await readJson(request); const email=String(data?.email||'').trim().toLowerCase(); const password=String(data?.password||'');
  if(!email||!password)return json({message:'Enter your email and password.'},400);
  const user=await env.KLYPZA_DB.prepare('SELECT id,email,display_name,password_hash,password_salt,credits,plan FROM users WHERE email=?').bind(email).first();
  if(!user)return json({message:'Email or password is incorrect.'},401);
  const actual=await passwordHash(password,user.password_salt);
  if(actual!==user.password_hash)return json({message:'Email or password is incorrect.'},401);
  const cookie=await createSession(user.id,env);
  return json({ok:true,user:publicUser(user)},200,{'set-cookie':cookie});
}
async function logoutAccount(request,env){
  const token=cookieToken(request);
  if(token){await env.KLYPZA_DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();}
  return json({ok:true},200,{'set-cookie':SESSION_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
}
async function accountOverview(request,env){
  const user=await getSessionUser(request,env); if(!user)return json({message:'Please log in to view your dashboard.'},401);
  const day=utcDate();
  const limits=planLimits(user.plan);
  const [downloads,transactions,subscription,usedRow]=await Promise.all([
    env.KLYPZA_DB.prepare('SELECT platform,title,credits_used,status,created_at FROM downloads WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(user.id).all(),
    env.KLYPZA_DB.prepare('SELECT amount,balance_after,reason,created_at FROM credit_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.id).all(),
    env.KLYPZA_DB.prepare("SELECT plan,status,current_period_end FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(user.id).first(),
    env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first()
  ]);
  const used=Number(usedRow?.used||0);
  const safeUser=publicUser(user);
  safeUser.credits=Math.max(0,limits.daily-used);
  return json({user:safeUser,quota:{dailyLimit:limits.daily,maxBatch:limits.batch,usedToday:used,remaining:Math.max(0,limits.daily-used),resetsAt:'00:00 UTC'},downloads:downloads.results||[],transactions:transactions.results||[],subscription:subscription||null});
}
async function chargeDownloadUsage(user,env,platform,sourceUrl,title,batchId){
  const day=utcDate();
  const limits=planLimits(user.plan);
  const eventId=crypto.randomUUID();
  const freshUsed=await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first();
  const balanceAfter=Math.max(0,limits.daily-Number(freshUsed?.used||0)-1);
  const commands=[
    env.KLYPZA_DB.prepare(`INSERT INTO usage_events(id,user_id,batch_id,usage_date,platform,source_url,title)
      SELECT ?,?,?,?,?,?,?
      WHERE (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND usage_date=?) < ?
      AND (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND batch_id=?) < (SELECT max_videos FROM download_batches WHERE id=? AND user_id=?)`)
      .bind(eventId,user.id,batchId,day,platform,sourceUrl,String(title||'').slice(0,200),user.id,day,limits.daily,user.id,batchId,batchId,user.id),
    env.KLYPZA_DB.prepare(`INSERT INTO credit_transactions(id,user_id,amount,balance_after,reason,reference_id)
      SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM usage_events WHERE id=? AND user_id=?)`)
      .bind(crypto.randomUUID(),user.id,-1,balanceAfter,'video_download',eventId,eventId,user.id),
    env.KLYPZA_DB.prepare(`INSERT INTO downloads(id,user_id,platform,source_url,title,credits_used,status)
      SELECT ?,?,?,?,?,1,'completed' WHERE EXISTS(SELECT 1 FROM usage_events WHERE id=? AND user_id=?)`)
      .bind(crypto.randomUUID(),user.id,platform,sourceUrl,String(title||'').slice(0,200),eventId,user.id)
  ];
  const result=await env.KLYPZA_DB.batch(commands);
  return Boolean(result[0]?.meta?.changes===1);
}


export default {
  async fetch(request, env) {
  const url = new URL(request.url);
  try {
    if (url.pathname === '/' || ['/login','/register','/dashboard','/plans'].includes(url.pathname)) {
      return new Response(appPageHtml(url.pathname),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
    }
    if (url.pathname === '/brand-icon.webp' || url.pathname === '/brand-wordmark.webp' || url.pathname === '/footer-wordmark-white.webp') {
      const assetName = url.pathname.slice(1);
      const asset = await fetch('https://raw.githubusercontent.com/Uzumasama/Klypza/main/public/' + assetName, { cf: { cacheTtl: 86400 } });
      if (!asset.ok) return new Response('Brand asset unavailable', { status: 404 });
      return new Response(asset.body, { headers: { 'content-type': 'image/webp', 'cache-control': 'public,max-age=86400' } });
    }
    if (url.pathname === '/hero-wordmark-v2.svg') return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="620" height="124" viewBox="0 0 620 124" role="img" aria-labelledby="title desc">
<title id="title">Klypza</title><desc id="desc">Original Klypza download emblem followed by the white wordmark with a blue violet accent on the K</desc>
<defs>
 <linearGradient id="downloadMark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#08d5ee"/><stop offset=".48" stop-color="#0877f5"/><stop offset="1" stop-color="#a800ed"/></linearGradient>
 <linearGradient id="kAccent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#168bfa"/><stop offset="1" stop-color="#a52be9"/></linearGradient>
</defs>
<g transform="translate(3 7)">
 <path d="M9 37H31 M3 57H31 M10 77H31" fill="none" stroke="url(#downloadMark)" stroke-width="8" stroke-linecap="round"/>
 <path d="M43 12C43 2 54 -4 63 2L111 34C129 46 129 69 111 81L63 113C54 119 43 113 43 103Z" fill="url(#downloadMark)"/>
 <path d="M57 29C57 23 64 20 70 24L99 43C109 50 109 64 99 71L70 90C64 94 57 91 57 84Z" fill="#10204f"/>
 <path d="M78 37V62H67L84 81L101 62H90V37Z" fill="#fff"/>
</g>
<text x="145" y="96" font-family="Manrope,Arial,sans-serif" font-size="96" font-weight="800" letter-spacing="-6" fill="url(#kAccent)">K</text>
<text x="210" y="96" font-family="Manrope,Arial,sans-serif" font-size="96" font-weight="800" letter-spacing="-6" fill="#fff">lypza</text>
</svg>`,{headers:{'content-type':'image/svg+xml; charset=utf-8','cache-control':'no-store, max-age=0'}});
    if (url.pathname === '/footer-wordmark-white.svg') return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="520" height="112" viewBox="0 0 520 112" role="img" aria-labelledby="title desc">
<title id="title">Klypza</title><desc id="desc">Klypza download logo in white with a subtle purple accent on the K</desc>
<defs><linearGradient id="icon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#08D5EE"/><stop offset=".5" stop-color="#0877F5"/><stop offset="1" stop-color="#A800ED"/></linearGradient><linearGradient id="kAccent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#168BFA"/><stop offset="1" stop-color="#9A2AE8"/></linearGradient></defs>
<g transform="translate(4 8) scale(.92)"><path d="M5 31h19M1 48h22M7 65h17" fill="none" stroke="url(#icon)" stroke-width="6" stroke-linecap="round"/><path d="M31 13c0-8 9-13 16-9l44 29c12 8 12 26 0 34L47 96c-7 5-16 0-16-9V13Z" fill="url(#icon)"/><path d="M42 25c0-5 6-8 11-5l30 20c7 5 7 15 0 20L53 80c-5 3-11 0-11-6V25Z" fill="#10204F"/><path d="M60 29v24h-9l16 18 16-18h-9V29H60Z" fill="#fff"/></g>
<text x="112" y="83" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="78" font-weight="900" letter-spacing="-4">K</text><path d="M155 62l34 28h-29l-25-22z" fill="url(#kAccent)"/><text x="194" y="83" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="78" font-weight="900" letter-spacing="-4">lypza</text></svg>`,{headers:{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public,max-age=3600'}});
    if (url.pathname === '/klypza-mark.svg') return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" role=\"img\" aria-label=\"Klypza download logo\">\n<defs><linearGradient id=\"brand\" x1=\"12\" y1=\"12\" x2=\"88\" y2=\"88\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#08D5EE\"/><stop offset=\".48\" stop-color=\"#0877F5\"/><stop offset=\"1\" stop-color=\"#A800ED\"/></linearGradient></defs>\n<path d=\"M5 31h19M1 48h22M7 65h17\" fill=\"none\" stroke=\"url(#brand)\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n<path d=\"M31 13c0-8 9-13 16-9l44 29c12 8 12 26 0 34L47 96c-7 5-16 0-16-9V13Z\" fill=\"url(#brand)\"/>\n<path d=\"M42 25c0-5 6-8 11-5l30 20c7 5 7 15 0 20L53 80c-5 3-11 0-11-6V25Z\" fill=\"#10204F\" opacity=\".96\"/>\n<path d=\"M60 29v24h-9l16 18 16-18h-9V29H60Z\" fill=\"#fff\"/>\n</svg>",{headers:{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public,max-age=3600'}});
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\nSitemap: https://klypza.web.id/sitemap.xml\n',{headers:{'content-type':'text/plain; charset=utf-8'}});
    if (url.pathname === '/sitemap.xml') return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://klypza.web.id/</loc></url><url><loc>https://klypza.web.id/plans</loc></url><url><loc>https://klypza.web.id/about</loc></url><url><loc>https://klypza.web.id/contact</loc></url><url><loc>https://klypza.web.id/privacy-policy</loc></url><url><loc>https://klypza.web.id/terms</loc></url><url><loc>https://klypza.web.id/copyright</loc></url></urlset>',{headers:{'content-type':'application/xml; charset=utf-8'}});
    if (['/about','/contact','/privacy-policy','/terms','/copyright'].includes(url.pathname)) return infoPageResponse(url.pathname.slice(1));
    if (url.pathname === '/api/public-stats' && request.method === 'GET') return await publicStats(env);
    if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/account' || url.pathname === '/api/plans' || url.pathname === '/api/batch/start') {
      const response=await accountRouter(request,env,url); if(response)return response;
    }
    if (url.pathname === '/api/health') return health(env);
    if (url.pathname === '/api/download') return await handleDownload(url, env, request);
    if (url.pathname === '/api/file') return await handleFile(url, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
  } catch (err) {
    console.error('KLYPZA_WORKER_ERROR', err && err.stack ? err.stack : String(err));
    return json({ error: 'server_error', message: 'Something went wrong on the server. Please try again shortly.' }, 500);
  }
  return json({ error: 'not_found' }, 404);
  },
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  });
}

function health(env) {
  return json({ ok: true, configured: Boolean(env.SAVEAPI_KEY), provider: 'saveapi' });
}

function detectPlatform(hostname) {
  const h = hostname.toLowerCase();
  for (const [name, hosts] of Object.entries(PLATFORM_HOSTS)) {
    if (hosts.some((d) => h === d || h.endsWith('.' + d))) return name;
  }
  return null;
}

function isSupportedVideoUrl(platform, u) {
  const path = u.pathname.toLowerCase();
  switch (platform) {
    case 'TikTok':
      return /\/video\/\d+/.test(path) || /^(vm|vt)\.tiktok\.com$/.test(u.hostname.toLowerCase());
    case 'Instagram':
      return /^\/(reel|reels)\//.test(path);
    case 'Facebook':
      return /^\/reel\//.test(path) || /^\/share\/r\//.test(path) || u.hostname.toLowerCase() === 'fb.watch';
    case 'YouTube':
      return /^\/shorts\//.test(path) || u.hostname.toLowerCase() === 'youtu.be' || (path === '/watch' && u.searchParams.has('v'));
    case 'Pinterest':
      return /^\/pin\/\d+/.test(path) || u.hostname.toLowerCase() === 'pin.it';
    default:
      return false;
  }
}

// Accept only direct supported video post URLs; photo links and profile pages are not supported.
function isProfileLink(platform, u) {
  const segs = u.pathname.split('/').filter(Boolean);
  const first = segs[0] || '';
  switch (platform) {
    case 'TikTok':
      return first.startsWith('@') && !segs.includes('video') && !segs.includes('photo');
    case 'Instagram':
      return segs.length === 0 || (segs.length === 1 && !['p', 'reel', 'reels', 'tv', 'stories'].includes(first));
    case 'YouTube':
      return first.startsWith('@') || ['channel', 'c', 'user'].includes(first);
    default:
      return false;
  }
}

async function handleDownload(url, env, request) {
  const user=await getSessionUser(request,env);
  if(!user)return json({error:'login_required',message:'Create a free account or log in to use Klypza downloads.'},401);
  const batchId=url.searchParams.get('batch_id')||'';
  const allowance=await checkDownloadAllowance(user,env,batchId);
  if(!allowance.ok)return json({error:allowance.error,message:allowance.message},allowance.error==='daily_limit_reached'?429:allowance.error==='batch_limit_reached'?429:400);
  if (!env.SAVEAPI_KEY) {
    return json({
      error: 'not_configured',
      message: 'The video service is not available yet. Please try again later.',
    }, 503);
  }
  const target = (url.searchParams.get('url') || '').trim();
  let parsed;
  try {
    parsed = new URL(target);
    if (!/^https?:$/.test(parsed.protocol) || target.length > 2000) throw new Error('bad');
  } catch {
    return json({ error: 'bad_url', message: 'Invalid link. Paste a complete URL beginning with https://' }, 400);
  }
  const platform = detectPlatform(parsed.hostname);
  if (!platform) {
    return json({ error: 'unsupported', message: 'Unsupported platform. Use TikTok, Instagram Reels, Facebook Reels, YouTube Shorts, or Pinterest video links.' }, 400);
  }
  if (!isSupportedVideoUrl(platform, parsed)) {
    return json({ error: 'unsupported_video_url', message: 'Please paste a supported video post URL: TikTok video, Instagram Reel, Facebook Reel, YouTube Short, or Pinterest video Pin.' }, 400);
  }
  if (isProfileLink(platform, parsed)) {
    return json({ error: 'profile_not_supported', message: 'This looks like a profile link. Paste a direct video post URL instead.' }, 422);
  }

  // YouTube uses SaveAPI's dedicated info -> create flow.
  if (platform === 'YouTube') return await handleYouTubeInfo(parsed, env, user, batchId);

  const api = new URL('https://api.saveapi.org/v1/download');
  api.searchParams.set('url', parsed.href);

  let res;
  try {
    res = await fetch(api, {
      headers: {
        authorization: `Bearer ${env.SAVEAPI_KEY}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    return json({ error: 'upstream_timeout', message: 'SaveAPI did not respond. Please try again shortly.' }, 504);
  }

  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* bukan JSON */ }

  if (!data || typeof data !== 'object') {
    return json({ error: 'bad_response', message: 'SaveAPI returned an unreadable response.' }, 502);
  }
  const apiErrorCode = data.error && data.error.code ? String(data.error.code) : '';
  if (!res.ok || data.success === false) {
    let message = (data.error && data.error.message) || data.message || 'SaveAPI could not process this link.';
    let status = res.ok ? 422 : (res.status >= 500 ? 502 : res.status);
    if (res.status === 401 || apiErrorCode === 'INVALID_API_KEY' || apiErrorCode === 'MISSING_API_KEY') {
      message = 'SaveAPI rejected the API key. Check the SAVEAPI_KEY secret in Cloudflare.';
      status = 502;
    } else if (res.status === 429 || apiErrorCode === 'QUOTA_EXCEEDED' || apiErrorCode === 'RATE_LIMITED') {
      message = apiErrorCode === 'RATE_LIMITED'
        ? 'SaveAPI rate limit reached. Please wait and try again.'
        : 'SaveAPI credits are exhausted or the rate limit was reached. Check your SaveAPI balance.';
      status = 429;
    } else if (apiErrorCode === 'PRIVATE_CONTENT') {
      message = 'This post is private or unavailable. Try a public video link.';
      status = 422;
    } else if (apiErrorCode === 'UNSUPPORTED_PLATFORM') {
      message = 'This link is not supported by SaveAPI.';
      status = 400;
    }
    const retryAfter = res.headers.get('Retry-After');
    return json(
      { error: (apiErrorCode || 'upstream_error').toLowerCase(), message: String(message).slice(0, 300) },
      status,
      status === 429 && retryAfter ? { 'Retry-After': retryAfter } : {},
    );
  }

  const result = normalize(data);
  result.items = result.items.filter((item) => item.type === 'video');
  if (!result.items.length) {
    return json({ error: 'no_video', message: 'No supported video was found. Make sure the post is public and contains a supported video.' }, 422);
  }

  const secret = env.SAVEAPI_KEY;
  const expires = Date.now() + 60 * 60 * 1000;
  const items = [];
  let n = 0;
  for (const it of result.items) {
    n += 1;
    const ext = guessExt(it);
    const name = `${platform}_${slug(result.title) || 'media'}_${n}.${ext}`;
    const sig = await hmac(secret, `${it.url}\n${name}\n${expires}\n`);
    const file = `/api/file?u=${encodeURIComponent(it.url)}&n=${encodeURIComponent(name)}&e=${expires}&s=${sig}`;
    items.push({
      type: it.type,
      quality: it.quality,
      watermark: it.watermark,
      ext,
      name,
      thumb: it.type === 'image' ? it.url : result.thumb,
      file,
    });
  }
  const charged=await chargeDownloadUsage(user,env,platform,parsed.href,result.title,batchId);
  if(!charged)return json({error:'insufficient_credits',message:'You have no credits left. Please view plans.'},402);
  return json({ platform, title: result.title, author: result.author, items, credits_remaining: Math.max(0,planLimits(user.plan).daily-Number((await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,utcDate()).first())?.used||0)) });
}

async function handleYouTubeInfo(parsed, env, user, batchId) {
  const api = new URL('https://api.saveapi.org/v1/youtube/info');
  api.searchParams.set('url', parsed.href);
  let res;
  try {
    res = await fetch(api, {
      headers: { authorization: `Bearer ${env.SAVEAPI_KEY}`, accept: 'application/json' },
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    return json({ error: 'upstream_timeout', message: 'SaveAPI did not respond. Please try again shortly.' }, 504);
  }

  let data;
  try { data = await res.json(); } catch {
    return json({ error: 'bad_response', message: 'SaveAPI returned an unreadable response.' }, 502);
  }
  if (!data || typeof data !== 'object') {
    return json({ error: 'bad_response', message: 'SaveAPI returned an unreadable response.' }, 502);
  }
  if (!res.ok || data.success === false) return saveApiError(data, res.status, res.headers.get('Retry-After'));

  const root = data.data && typeof data.data === 'object' ? data.data : data;
  const formats = Array.isArray(root.formats) ? root.formats : (Array.isArray(data.formats) ? data.formats : []);
  const title = String(root.title || data.title || root.meta?.title || 'YouTube video').slice(0, 200);
  const author = String(root.author || data.author || root.author_name || data.author_name || root.meta?.author || '').slice(0, 80);
  const thumb = root.thumbnail || data.thumbnail || root.meta?.thumbnail || '';
  const videoFormats = formats.filter((f) => {
    if (!f || typeof f !== 'object') return false;
    const q = String(f.quality || f.label || f.format || '').trim();
    const type = String(f.type || '').toLowerCase();
    return /^(144|240|360|480|720|1080)p$/i.test(q) || (type === 'video' && /p$/i.test(q));
  });
  if (!videoFormats.length) {
    return json({ error: 'no_video', message: 'SaveAPI did not return downloadable video qualities for this YouTube link.' }, 422);
  }

  const secret = env.SAVEAPI_KEY;
  const expires = Date.now() + 60 * 60 * 1000;
  const items = [];
  const seen = new Set();
  for (const format of videoFormats) {
    const quality = String(format.quality || format.label || format.format || '').trim();
    if (!/^(144|240|360|480|720|1080)p$/i.test(quality) || seen.has(quality)) continue;
    seen.add(quality);
    const name = `YouTube_${slug(title) || 'video'}_${quality}.mp4`;
    const sig = await hmac(secret, `${parsed.href}\n${name}\n${expires}\n${quality}`);
    const file = `/api/file?u=${encodeURIComponent(parsed.href)}&q=${encodeURIComponent(quality)}&n=${encodeURIComponent(name)}&e=${expires}&s=${sig}`;
    items.push({
      type: 'video',
      quality,
      watermark: false,
      ext: 'mp4',
      name,
      thumb: /^https?:\/\//i.test(thumb) ? thumb : '',
      size_mb: typeof format.size_mb === 'number' ? format.size_mb : null,
      file,
    });
  }
  if (!items.length) return json({ error: 'no_video', message: 'No supported YouTube video qualities were found.' }, 422);
  items.sort((a, b) => parseInt(b.quality, 10) - parseInt(a.quality, 10));
  const charged=await chargeDownloadUsage(user,env,'YouTube',parsed.href,title,batchId);
  if(!charged)return json({error:'insufficient_credits',message:'You have no credits left. Please view plans.'},402);
  return json({ platform: 'YouTube', title, author, items, credits_remaining: Math.max(0,Number(user.credits)-1) });
}

function saveApiError(data, upstreamStatus, retryAfter = null) {
  const code = data && data.error && data.error.code ? String(data.error.code) : '';
  let message = (data && data.error && data.error.message) || (data && data.message) || 'SaveAPI could not process this link.';
  let status = upstreamStatus >= 500 ? 502 : (upstreamStatus || 422);
  if (['INVALID_API_KEY', 'MISSING_API_KEY', 'KEY_REVOKED', 'KEY_EXPIRED', 'ACCOUNT_SUSPENDED', 'IP_NOT_ALLOWED'].includes(code)) {
    message = 'SaveAPI rejected the API key or account. Check the SaveAPI key and account status.';
    status = 502;
  } else if (upstreamStatus === 429 || code === 'QUOTA_EXCEEDED' || code === 'RATE_LIMITED') {
    message = code === 'RATE_LIMITED'
      ? 'SaveAPI rate limit reached. Please wait and try again.'
      : 'SaveAPI credits are exhausted or the rate limit was reached. Check your SaveAPI balance.';
    status = 429;
  } else if (code === 'PRIVATE_CONTENT') {
    message = 'This post is private or unavailable. Try a public video link.';
    status = 422;
  } else if (code === 'UNSUPPORTED_PLATFORM' || code === 'INVALID_URL') {
    message = 'SaveAPI could not process this YouTube link. Use a public video or Shorts URL.';
    status = 400;
  } else if (code === 'INVALID_FORMAT') {
    message = 'That YouTube quality is not available. Process the link again and choose another quality.';
    status = 422;
  } else if (code === 'MEDIA_NOT_FOUND') {
    message = 'This YouTube video is unavailable, restricted, or has no downloadable media.';
    status = 422;
  } else if (code === 'PLATFORM_NOT_ALLOWED') {
    message = 'Your SaveAPI plan does not allow YouTube downloads.';
    status = 403;
  }
  return json(
    { error: (code || 'upstream_error').toLowerCase(), message: String(message).slice(0, 300) },
    status,
    status === 429 && retryAfter ? { 'Retry-After': retryAfter } : {},
  );
}

async function handleFile(url, env) {
  if (!env.SAVEAPI_KEY) return json({ error: 'not_configured' }, 503);
  const target = url.searchParams.get('u') || '';
  const name = (url.searchParams.get('n') || 'media').replace(/[^\w.\-]+/g, '_').slice(0, 120);
  const expires = Number(url.searchParams.get('e') || 0);
  const sig = url.searchParams.get('s') || '';
  const quality = (url.searchParams.get('q') || '').trim();

  const expected = await hmac(env.SAVEAPI_KEY, `${target}\n${url.searchParams.get('n')}\n${expires}\n${quality}`);
  if (!safeEqual(sig, expected)) return json({ error: 'forbidden', message: 'The download link is invalid.' }, 403);
  if (!expires || Date.now() > expires) return json({ error: 'expired', message: 'The download link expired. Process the link again.' }, 410);

  let src;
  try {
    src = new URL(target);
    if ((src.protocol !== 'https:' && src.protocol !== 'http:') || src.username || src.password || isPrivateHost(src.hostname)) throw new Error('bad');
  } catch {
    return json({ error: 'bad_url' }, 400);
  }
  if (isPrivateHost(src.hostname)) return json({ error: 'forbidden' }, 403);

  let up;
  let fallbackUrl = src.href;
  try {
    if (detectPlatform(src.hostname) === 'YouTube') {
      if (!/^(144|240|360|480|720|1080)p$/i.test(quality)) {
        return json({ error: 'invalid_quality', message: 'Invalid YouTube quality. Process the link again.' }, 400);
      }
      const createUrl = new URL('https://api.saveapi.org/v1/youtube/create');
      createUrl.searchParams.set('url', src.href);
      createUrl.searchParams.set('quality', quality);
      let createRes;
      try {
        createRes = await fetch(createUrl, {
          headers: { authorization: `Bearer ${env.SAVEAPI_KEY}`, accept: 'application/json' },
          signal: AbortSignal.timeout(60000),
        });
      } catch {
        return json({ error: 'upstream_timeout', message: 'SaveAPI did not respond while preparing the YouTube file. Please try again.' }, 504);
      }
      let made;
      try { made = await createRes.json(); } catch {
        return json({ error: 'bad_response', message: 'SaveAPI returned an unreadable YouTube download response.' }, 502);
      }
      if (!createRes.ok || !made || made.success === false) return saveApiError(made || {}, createRes.status, createRes.headers.get('Retry-After'));
      const madeRoot = made.data && typeof made.data === 'object' ? made.data : made;
      const streamUrl = madeRoot.url || madeRoot.download_url || madeRoot.downloadUrl;
      if (typeof streamUrl !== 'string') {
        return json({ error: 'bad_response', message: 'SaveAPI did not return a YouTube download stream.' }, 502);
      }
      const mediaUrl = new URL(streamUrl);
      if (mediaUrl.protocol !== 'https:' || mediaUrl.username || mediaUrl.password || isPrivateHost(mediaUrl.hostname)) {
        return json({ error: 'bad_response', message: 'SaveAPI returned an invalid YouTube stream URL.' }, 502);
      }
      fallbackUrl = mediaUrl.href;
      up = await fetchSafeMedia(mediaUrl.href);
    } else {
      up = await fetchSafeMedia(src.href);
    }
  } catch {
    return json({ error: 'upstream_error', message: 'Could not retrieve the file.' }, 502);
  }
  if (!up.ok || !up.body) return json({ error: 'upstream_error', message: `Could not retrieve the file (kode ${up.status}).` }, 502);

  const size = Number(up.headers.get('content-length') || 0);
  if (size > Number(env.MAX_PROXY_BYTES || 19500000)) {
    // Terlalu besar untuk diteruskan lewat Cloudflare (batas proxy yang dikonfigurasi): buka langsung dari sumbernya.
    try { await up.body.cancel(); } catch { /* abaikan */ }
    return new Response(null, { status: 302, headers: { location: fallbackUrl, 'cache-control': 'no-store' } });
  }

  const headers = new Headers();
  headers.set('content-type', up.headers.get('content-type') || 'application/octet-stream');
  const len = up.headers.get('content-length');
  if (len) headers.set('content-length', len);
  headers.set('content-disposition', `attachment; filename="${name}"`);
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(up.body, { status: 200, headers });
}

// ---------- merapikan balasan API ----------

function normalize(data) {
  const roots = [data, data.meta, data.data, data.data && data.data.meta, data.result, data.response, data.results].filter((x) => x && typeof x === 'object' && !Array.isArray(x));
  const pick = (keys) => {
    for (const r of roots) for (const k of keys) if (typeof r[k] === 'string' && r[k].trim()) return r[k].trim();
    return '';
  };
  const title = pick(['title', 'desc', 'caption', 'description', 'text', 'name']).slice(0, 200);

  let author = '';
  for (const r of roots) {
    const a = r.author || r.user || r.owner;
    if (typeof a === 'string') { author = a; break; }
    if (a && typeof a === 'object') {
      author = a.nickname || a.name || a.unique_id || a.username || '';
      if (author) break;
    }
  }

  let thumb = pick(['cover', 'thumbnail', 'thumb', 'origin_cover', 'poster', 'preview']);
  if (!/^https?:/i.test(thumb)) thumb = '';

  const items = [];
  const seen = new Set();

  const addUrl = (u, path, sib) => {
    const p = path.join('.').toLowerCase();
    const k = (path[path.length - 1] || '').toLowerCase();
    if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
    const hasMediaExt = IMG_EXT.test(u) || VID_EXT.test(u);
    if (/(cover|thumb|poster|preview|avatar|profile|icon|dynamic)/.test(k)) {
      if (!thumb && /(cover|thumb|poster|preview)/.test(k)) thumb = u;
      return;
    }
    if (/(music|audio|sound|avatar|author|user)/.test(p)) return;
    if (!hasMediaExt && /(share|web_?url|webpage|permalink|embed|original_url|source_url|page_url)/.test(k)) return;
    if (!hasMediaExt && !/(url|download|play|video|image|img|photo|pic|link|src|nowm|hd|sd|wm|media|file)/.test(k)) return;

    const sibType = String(sib.type || sib.media_type || sib.mediaType || '').toLowerCase();
    const ext = String(sib.extension || sib.ext || '').toLowerCase();
    if (sibType.includes('audio') || AUD_EXT.test(u) || ['mp3', 'm4a', 'aac'].includes(ext)) return;

    let type;
    if (VID_EXT.test(u) || sibType.includes('video') || ['mp4', 'mov', 'webm'].includes(ext)) type = 'video';
    else if (IMG_EXT.test(u) || sibType.includes('image') || sibType.includes('photo') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext) || /(image|img|photo|pic)/.test(p)) type = 'image';
    else type = 'video';

    const isWm = (/(^|[^a-z])(wm|watermark)|wmplay|with_?watermark/.test(k) && !/(no_?wm|nowm|without|no_?watermark)/.test(k)) ||
      sib.watermark === true ||
      (/watermark/i.test(String(sib.quality || sib.label || '')) && !/(no|without)/i.test(String(sib.quality || sib.label || '')));

    let quality = String(sib.quality || sib.resolution || sib.label || '').slice(0, 20);
    quality = quality.replace(/[_\- ]?(no[_\- ]?|without[_\- ]?)?water[_\- ]?mark/ig, '').replace(/[_\-]+/g, ' ').trim();
    if (/^hd$/i.test(quality)) quality = 'HD';
    if (!quality && /hd/.test(k)) quality = 'HD';

    seen.add(u);
    items.push({ type, url: u, quality, watermark: Boolean(isWm) });
  };

  const walk = (node, path, depth) => {
    if (depth > 6 || items.length >= 50) return;
    if (Array.isArray(node)) {
      node.forEach((el) => {
        if (typeof el === 'string') addUrl(el, path, {});
        else walk(el, path, depth + 1);
      });
      return;
    }
    if (!node || typeof node !== 'object') return;
    const direct = node.url || node.download_url || node.downloadUrl || node.link || node.src || node.video_url || node.image_url;
    if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) {
      const key = node.url ? 'url' : node.download_url ? 'download_url' : node.downloadUrl ? 'downloadUrl' : node.link ? 'link' : node.src ? 'src' : node.video_url ? 'video_url' : 'image_url';
      addUrl(direct, path.concat(key), node);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string') addUrl(v, path.concat(k), {});
      else if (v && typeof v === 'object') walk(v, path.concat(k), depth + 1);
    }
  };
  walk(data, [], 0);

  items.sort((a, b) => Number(a.watermark) - Number(b.watermark) || Number(/hd|1080|720/i.test(b.quality)) - Number(/hd|1080|720/i.test(a.quality)));
  return { title, author: String(author).slice(0, 80), thumb, items };
}

function guessExt(it) {
  const m = it.url.match(/\.(jpe?g|png|webp|gif|mp4|mov|webm|m4v)(\?|#|$)/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return it.type === 'image' ? 'jpg' : 'mp4';
}

function slug(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

// ---------- keamanan ----------

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function fetchSafeMedia(initialUrl) {
  let current = new URL(initialUrl);
  const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
  for (let i = 0; i < 6; i++) {
    if (!['https:', 'http:'].includes(current.protocol) || current.username || current.password || isPrivateHost(current.hostname)) {
      throw new Error('Blocked unsafe media URL');
    }
    const response = await fetch(current.href, { headers, redirect: 'manual', signal: AbortSignal.timeout(25000) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    try { await response.body?.cancel(); } catch {}
    current = new URL(location, current);
  }
  throw new Error('Too many media redirects');
}

function isPrivateHost(h) {
  h = h.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (h.includes(':')) return true;
  return false;
}
