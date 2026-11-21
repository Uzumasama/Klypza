// Klypza production Worker entrypoint. Deploy through Wrangler to retain static assets and bindings.
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
const INDEX_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, viewport-fit=cover\">\n<meta name=\"color-scheme\" content=\"light\">\n<title>Klypza — Download Videos from TikTok, Instagram, Facebook & More</title>\n<meta name=\"description\" content=\"Download supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest with Klypza. Explore features, plans and a simple video-saving workflow.\">\n<meta name=\"robots\" content=\"index, follow, max-image-preview:large\">\n<meta name=\"theme-color\" content=\"#111936\">\n<link rel=\"canonical\" href=\"https://klypza.web.id/\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:site_name\" content=\"Klypza\">\n<meta property=\"og:url\" content=\"https://klypza.web.id/\">\n<meta property=\"og:title\" content=\"Klypza — Download Videos from TikTok, Instagram, Facebook & More\">\n<meta property=\"og:description\" content=\"Download supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest with Klypza. Explore features, plans and a simple video-saving workflow.\">\n<meta name=\"twitter:card\" content=\"summary\">\n<meta name=\"twitter:title\" content=\"Klypza — Social Video Downloader\">\n<meta name=\"twitter:description\" content=\"Download supported public social videos with Klypza in a few simple steps.\">\n<link rel=\"icon\" type=\"image/webp\" href=\"/brand-icon.webp?v=2\">\n<link rel=\"apple-touch-icon\" type=\"image/webp\" href=\"/brand-icon.webp\">\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"preload\" href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap\" as=\"style\" onload=\"this.onload=null;this.rel='stylesheet'\"><noscript><link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap\"></noscript>\n<link rel=\"preload\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css\" as=\"style\" onload=\"this.onload=null;this.rel='stylesheet'\"><noscript><link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css\"></noscript>\n<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"WebApplication\",\n  \"name\": \"Klypza\",\n  \"url\": \"https://klypza.web.id/\",\n  \"applicationCategory\": \"MultimediaApplication\",\n  \"operatingSystem\": \"Any\",\n  \"inLanguage\": \"en\",\n  \"description\": \"Klypza is a simple browser-based tool for processing supported public video links from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest.\",\n  \"offers\": { \"@type\": \"Offer\", \"price\": \"0\", \"priceCurrency\": \"USD\" }\n}\n</script>\n<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": [\n    {\"@type\":\"Question\",\"name\":\"Is Klypza free to use?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"The website is free to access. Successful video processing depends on the source platform and the availability of the configured download provider.\"}},\n    {\"@type\":\"Question\",\"name\":\"Which platforms are supported?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Klypza is designed for supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts and Pinterest video Pins.\"}},\n    {\"@type\":\"Question\",\"name\":\"Why did my video link fail?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"A link can fail when a post is private, unavailable, restricted, unsupported, or not supported by the configured provider. Try a public video post URL.\"}},\n    {\"@type\":\"Question\",\"name\":\"Can I download any video?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Only download videos you own or have permission to save. Respect copyright, privacy and each platform's terms.\"}},\n    {\"@type\":\"Question\",\"name\":\"Can I download profile links?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"No. Paste a direct video post URL rather than a profile or account URL.\"}}\n  ]\n}\n</script>\n<style>\n:root{color-scheme:light;--ink:#111936;--muted:#64708a;--line:#e4e8f2;--paper:#fff;--wash:#f5f7fc;--brand:#1d5fc4;--brand-dark:#1d5fc4;--violet:#7928ca;--navy:#111936;--shadow:0 18px 50px rgba(29,40,78,.09);--radius:24px}\n*{box-sizing:border-box;margin:0;padding:0}\nhtml{scroll-behavior:smooth;-webkit-text-size-adjust:100%}\nbody{font-family:\"DM Sans\",system-ui,-apple-system,\"Segoe UI\",sans-serif;background:var(--wash);color:var(--ink);line-height:1.65;min-height:100vh;min-height:100dvh;overflow-x:hidden}\nbutton,input,textarea,select{font:inherit}button{cursor:pointer}a{color:inherit}img{max-width:100%}\n:focus-visible{outline:3px solid var(--violet);outline-offset:3px}\n.site-header{position:relative;z-index:2;background:rgba(16,21,43,.98);color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}\n.nav-wrap{max-width:1160px;margin:auto;padding:17px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}\n.logo{display:inline-flex;align-items:center;gap:11px;color:#fff;text-decoration:none;font-family:Manrope,sans-serif;font-size:1.12rem;font-weight:800;letter-spacing:-.04em}\n.logo-mark{width:38px;height:38px;display:block;flex:0 0 38px;border-radius:13px;box-shadow:0 8px 22px rgba(40,120,240,.22)}\n.nav-links{display:flex;gap:24px;align-items:center;font-size:.9rem;color:#d8def2}\n.nav-links a{text-decoration:none}.nav-links a:hover{color:#fff}\n.nav-cta{background:#fff;color:var(--navy)!important;padding:9px 15px;border-radius:999px;font-weight:700}\n.container{width:min(1160px,100% - 40px);margin:0 auto}\n.hero{position:relative;isolation:isolate;padding:64px 0 36px;background:radial-gradient(ellipse at 12% 10%,rgba(40,120,240,.20),transparent 35%),radial-gradient(ellipse at 85% 0%,rgba(121,40,202,.14),transparent 30%),var(--navy);color:#fff;overflow:hidden}\n.hero:after{content:\"\";position:absolute;inset:0;z-index:-1;opacity:.18;background-image:radial-gradient(rgba(255,255,255,.45) .7px,transparent .7px);background-size:18px 18px;mask-image:linear-gradient(to bottom,black,transparent)}\n.hero-inner{max-width:850px;margin:auto;text-align:center}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);padding:7px 13px;border-radius:999px;color:#d9d5ff;font-size:.82rem;font-weight:700;letter-spacing:.02em}\n.eyebrow i{color:#b58af0}\n.hero h1{font-family:Manrope,sans-serif;font-size:clamp(2.35rem,6vw,4.55rem);line-height:1.08;letter-spacing:-.065em;margin:22px auto 17px;max-width:850px;font-weight:800;text-wrap:balance}\n.hero h1 .accent{background:linear-gradient(90deg,#83b5ff,#b58af0);-webkit-background-clip:text;background-clip:text;color:transparent}\n.hero-copy{font-size:clamp(1rem,2vw,1.15rem);color:#c6cde1;max-width:690px;margin:0 auto}\n.platform-pills{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;margin:25px auto 0}\n.platform-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);border-radius:999px;padding:8px 12px;color:#f5f6ff;font-size:.84rem;font-weight:600}\n.platform-pill i{font-size:1rem}\nmain{padding-bottom:42px}\n\n.ad-label{font-size:.68rem;text-transform:uppercase;letter-spacing:.14em;font-weight:700}\n.ad-placeholder{font-size:.82rem}\n.tool-card{position:relative;max-width:920px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:28px;padding:clamp(22px,4vw,42px);box-shadow:var(--shadow)}\n.tool-heading{text-align:center;margin-bottom:27px}\n.tool-heading .mini-icon{width:52px;height:52px;border-radius:17px;background:#eaf1ff;color:var(--brand);display:grid;place-items:center;margin:0 auto 14px;font-size:1.25rem}\n.tool-heading h2{font-family:Manrope,sans-serif;font-size:clamp(1.45rem,3vw,2rem);line-height:1.25;letter-spacing:-.04em;margin-bottom:8px}\n.tool-heading p{color:var(--muted);width:100%;max-width:480px;margin:0 auto!important;text-align:center!important;line-height:1.65}\n#configBanner{margin:0 0 18px;border-radius:12px;padding:12px 15px;font-size:.9rem;line-height:1.5}\n.banner.warn{background:#fff7e4;border:1px solid #f2dfab;color:#855700}\n.platform-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:24px 0}\n.platform-btn{min-height:80px;border:1px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:12px 7px;font-size:.8rem;font-weight:700;transition:transform .18s,border-color .18s,background .18s}\n.platform-btn i{font-size:1.35rem}\n.platform-btn:hover{transform:translateY(-2px);border-color:#9bbcff}\n.platform-btn.active{background:#eaf1ff;border-color:var(--brand);color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand)}\n.field-label{display:block;font-weight:700;font-size:.94rem;margin-bottom:8px}\n.input-field{display:block;width:100%;min-height:142px;resize:vertical;padding:16px;border:1px solid #cbd8f0;border-radius:15px;background:#fbfcff;color:var(--ink);font-size:1rem;line-height:1.55;transition:border-color .15s,box-shadow .15s}\n.input-field::placeholder{color:#9aa3b6}.input-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(40,120,240,.12)}\n.input-hint{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:.82rem;margin-top:9px}\n.options-row{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;margin:24px 0}\n.check{display:flex;align-items:flex-start;gap:10px;font-size:.9rem;color:#3b465c}\n.check input{width:18px;height:18px;margin-top:4px;accent-color:var(--brand)}\n.select-wrap{display:flex;align-items:center;gap:10px;color:#3b465c;font-size:.88rem;font-weight:600}\n.select-wrap select{border:1px solid var(--line);border-radius:10px;background:#fff;padding:9px 30px 9px 11px;min-height:42px}\n.btn-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;min-height:56px;border:0;border-radius:15px;background:linear-gradient(100deg,var(--brand),var(--violet));color:#fff;font-weight:800;font-size:1rem;box-shadow:0 10px 24px rgba(40,120,240,.24);transition:transform .15s,filter .15s}\n.btn-submit:hover{filter:brightness(1.04);transform:translateY(-1px)}.btn-submit:disabled{opacity:.65;cursor:wait;transform:none}\n.legal{color:var(--muted);font-size:.82rem;text-align:center;margin:18px auto 0;max-width:690px}\n.status-container{margin-top:28px;padding-top:23px;border-top:1px solid var(--line)}\n.status-container h2{font-family:Manrope,sans-serif;font-size:1.15rem;text-align:center}\n.progress-bar{height:8px;border-radius:999px;background:#eceef7;overflow:hidden;margin:15px 0 8px}\n.progress-fill{height:100%;width:0;background:linear-gradient(90deg,var(--brand),var(--violet));border-radius:inherit;transition:width .2s}\n.status-sub{text-align:center;color:var(--muted);font-size:.86rem;overflow-wrap:anywhere}\n.kloter-bar{display:grid;gap:12px;margin-top:16px}.batch-card{border:1px solid var(--line);border-radius:15px;padding:15px;margin-top:12px;background:#fff}\n.batch-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.link-title{font-weight:700;overflow-wrap:anywhere}.muted{font-size:.84rem;color:var(--muted)}.error-row{margin-top:8px;color:#b42318;font-size:.9rem}.note-row{padding:9px 11px;background:#fff6df;color:#875a00;border-radius:9px;font-size:.85rem;margin-bottom:10px}\n.item-list{display:grid;gap:10px}.item-row{display:flex;align-items:center;gap:12px;min-width:0;padding:10px;border:1px solid #edf0f7;border-radius:12px}\n.thumb{width:62px;height:62px;flex:0 0 62px;object-fit:cover;border-radius:10px;background:#f0f2f9;display:grid;place-items:center;color:#7c83a0}\n.item-meta{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;font-size:.86rem;overflow-wrap:anywhere}.badge{display:inline-flex;align-self:flex-start;padding:3px 8px;border-radius:999px;background:#e6faf4;color:#087d69;font-size:.73rem;font-weight:700}.badge.warn{background:#fff0d2;color:#8b5900}\n.btn-download{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #c6d9ff;border-radius:10px;background:#eef4ff;color:#1d5fc4;text-decoration:none;font-size:.85rem;font-weight:800;padding:10px 13px;white-space:nowrap}.btn-download:hover{background:#dceaff}\n.content-section{max-width:920px;margin:26px auto 0;background:#fff;border:1px solid var(--line);border-radius:24px;padding:clamp(22px,4vw,38px)}\n.section-kicker{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--brand);margin-bottom:8px}\n.content-section h2{font-family:Manrope,sans-serif;font-size:clamp(1.35rem,3vw,1.8rem);line-height:1.25;letter-spacing:-.035em;margin-bottom:12px}\n.content-section h3{font-family:Manrope,sans-serif;font-size:1.02rem;line-height:1.35;margin:20px 0 6px}\n.content-section p{color:#566178;margin:8px 0}.steps-grid,.platform-info-grid,.benefit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-top:20px}\n.info-card{border:1px solid var(--line);border-radius:16px;padding:17px;background:#fcfcff}\n.info-card .step-num{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#eaf1ff;color:var(--brand);font-weight:800;margin-bottom:12px}\n.info-card h3{margin:0 0 7px}.info-card p{font-size:.9rem;margin:0}\n.platform-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\n.platform-info{display:flex;gap:13px;align-items:flex-start;border-bottom:1px solid #eef0f6;padding:14px 0}.platform-info:last-child{border-bottom:0}\n.platform-info .platform-symbol{width:40px;height:40px;flex:0 0 40px;border-radius:12px;background:#eaf1ff;color:var(--brand);display:grid;place-items:center;font-size:1.1rem}\n.platform-info h3{margin:0 0 4px}.platform-info p{font-size:.9rem;margin:0}\n.faq-list details{border-top:1px solid var(--line);padding:16px 0}.faq-list details:first-child{margin-top:12px}.faq-list summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:14px}.faq-list summary::-webkit-details-marker{display:none}.faq-list summary:after{content:\"+\";color:var(--brand);font-size:1.2rem;font-weight:700}.faq-list details[open] summary:after{content:\"−\"}.faq-list details p{padding-right:25px;margin-top:8px}\n.notice{padding:15px 17px;border-radius:14px;background:#f2ebff;border:1px solid #e6d8f7;color:#5b347d;margin-top:16px;font-size:.9rem}\n.site-footer{margin-top:48px;background:var(--navy);color:#d6dced;padding:34px 20px calc(28px + env(safe-area-inset-bottom))}\n.footer-inner{max-width:1160px;margin:auto;display:flex;align-items:flex-start;justify-content:space-between;gap:26px;flex-wrap:wrap}\n.footer-brand{max-width:390px}.footer-brand .logo{margin-bottom:12px}.footer-brand p{font-size:.88rem;color:#aeb8d0}\n.footer-links{display:flex;gap:12px 20px;flex-wrap:wrap;font-size:.88rem}.footer-links a{color:#d6dced;text-decoration:none}.footer-links a:hover{color:#fff;text-decoration:underline}\n.copyright{max-width:1160px;margin:24px auto 0;padding-top:17px;border-top:1px solid rgba(255,255,255,.12);font-size:.8rem;color:#98a3bd}\n.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n@media(max-width:760px){.nav-wrap{padding:14px 18px}.nav-links{gap:14px}.nav-links a:not(.nav-cta){display:none}.nav-links a[href='/login']{display:inline-block}.hero{padding:48px 0 30px}.container{width:min(100% - 28px,1160px)}.platform-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.platform-btn{min-height:74px}.steps-grid,.benefit-grid{grid-template-columns:1fr}.platform-info-grid{grid-template-columns:1fr}.content-section,.tool-card{border-radius:20px}}\n@media(max-width:430px){.container{width:calc(100% - 20px)}.logo{font-size:1rem}.logo-mark{width:34px;height:34px;flex-basis:34px}.nav-cta{padding:8px 11px;font-size:.82rem}.hero h1{font-size:2.25rem}.hero-copy{font-size:.96rem}.platform-pills{gap:7px}.platform-pill{font-size:.76rem;padding:7px 9px}.tool-card,.content-section{padding:19px}.platform-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.platform-btn:last-child{grid-column:span 2}.input-hint{font-size:.78rem}.options-row{align-items:flex-start}.select-wrap{width:100%;justify-content:space-between}.item-row{flex-wrap:wrap}.item-meta{min-width:calc(100% - 80px)}.item-row .btn-download{width:100%}.batch-header{align-items:flex-start;flex-direction:column}.footer-links{gap:12px 15px}}\n.pricing-grid{align-items:stretch}.pricing-card{display:flex;flex-direction:column;gap:8px}.pricing-card h3{font-size:1.25rem;margin:8px 0 0}.plan-price{font-family:Manrope,sans-serif;font-size:2.2rem;font-weight:800;letter-spacing:-.05em}.plan-price small{font-family:\"DM Sans\",sans-serif;font-size:.85rem;font-weight:500;letter-spacing:0;color:#64708a}.plan-tag{font-size:.86rem;color:#64708a!important}.pricing-card ul{list-style:none;display:grid;gap:9px;padding:10px 0 18px;flex:1}.pricing-card li{font-size:.9rem;color:#3b465c;padding-left:23px;position:relative}.pricing-card li:before{content:\"✓\";position:absolute;left:0;color:#2878f0;font-weight:900}.pricing-card .btn-download{width:100%;margin-top:auto}.premium-card{border-color:#bba3e8;box-shadow:0 10px 30px rgba(121,40,202,.08)}.plan-disabled{opacity:.65;cursor:not-allowed}\n#accountPanel input:focus{outline:3px solid rgba(40,120,240,.18);border-color:#2878f0}\n#accountPanel .steps-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n@media(max-width:760px){#accountPanel .steps-grid{grid-template-columns:1fr}}\n@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important;animation:none!important}}\nbody{background:#f8f9ff;color:#111936}.site-header{background:rgba(255,255,255,.96);color:#111936;border-bottom:1px solid #e8eaf4;backdrop-filter:blur(14px)}.logo{color:#111936}.nav-links{color:#303854}.nav-cta{background:linear-gradient(100deg,#1681f5,#8328e6);color:white!important;border-radius:12px}.public-hero{background:linear-gradient(110deg,#f8fbff,#f0f2ff 58%,#f7efff);color:#111936;padding:65px 0 45px}.public-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:32px;align-items:center}.public-hero-copy{text-align:left;max-width:620px}.public-hero .eyebrow{background:#eeeaff;color:#592bd4;border-color:#ddd3ff}.public-hero h1{font-size:clamp(2.5rem,5vw,4.2rem);color:#111936;margin:20px 0 16px;max-width:650px}.public-hero h1 .accent{background:linear-gradient(90deg,#087cf2,#8629df);-webkit-background-clip:text;background-clip:text;color:transparent}.public-hero .hero-copy{color:#5c6680;margin:0}.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.hero-primary,.hero-secondary{display:inline-flex;align-items:center;gap:9px;text-decoration:none;border-radius:13px;padding:13px 20px;font-weight:800}.hero-primary{background:linear-gradient(100deg,#167df4,#7b2ce1);color:white}.hero-secondary{border:1px solid #bbaaf3;background:white;color:#5429d2}.hero-benefits{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px;font-size:.86rem;font-weight:700}.hero-benefits i{color:#0aa978}.public-hero .platform-pills{justify-content:flex-start;margin:22px 0 0}.public-hero .platform-pill{background:#fff;color:#35405c;border:1px solid #e3e6f2}.public-hero .platform-pill i{color:#7132e4}.hero-visual{position:relative;min-height:360px;display:grid;place-items:center;background:radial-gradient(ellipse,#d4d5ff 0%,transparent 68%)}.visual-window{width:min(420px,90%);height:275px;border:9px solid #fff;border-radius:30px;background:linear-gradient(140deg,#17358d,#5e2bdc 75%,#a32ce5);box-shadow:0 25px 60px #5942aa40;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;transform:rotate(-4deg)}.visual-brand{display:flex;align-items:center;gap:10px;font-size:2rem}.visual-progress{width:65%;height:11px;border-radius:99px;background:#ffffff55;margin-top:30px;overflow:hidden}.visual-progress span{display:block;width:65%;height:100%;background:linear-gradient(90deg,#05d6ef,#fff)}.visual-download{position:absolute;right:13%;bottom:18%;width:55px;height:55px;border-radius:18px;background:white;color:#642bdd;display:grid;place-items:center;font-size:1.3rem}.visual-window p{color:#eeeaff;margin-top:18px}.float-platform{position:absolute;width:50px;height:50px;border-radius:16px;background:#fff;display:grid;place-items:center;box-shadow:0 10px 25px #20205022;font-size:1.6rem}.float-platform.youtube{top:8%;left:7%;color:#f22}.float-platform.tiktok{top:7%;right:6%;color:#111}.float-platform.instagram{bottom:14%;left:6%;color:#d32ca4}.float-platform.facebook{bottom:9%;right:9%;color:#1877f2}.float-platform.pinterest{top:46%;right:0;color:#bd081c}.public-main{padding-top:14px}.public-main .tool-card,.public-main .public-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:center;max-width:1100px}.stat-item{display:grid;grid-template-columns:45px 1fr;column-gap:10px;align-items:center}.stat-item i{grid-row:span 2;width:44px;height:44px;border-radius:14px;background:#f0eaff;color:#6b30e3;display:grid;place-items:center;font-size:1.2rem}.stat-item strong{font-size:1.45rem}.stat-item span{font-size:.85rem;color:#64708a}.stats-note{grid-column:1/-1;text-align:center;font-size:.76rem!important;color:#68738a!important;margin:0!important;min-width:0;width:100%;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}.public-stats{min-width:0;max-width:100%;box-sizing:border-box}.public-stats>*{min-width:0;max-width:100%;box-sizing:border-box}.public-features,.public-pricing,.public-reviews{max-width:1100px}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}.feature-tile{border:1px solid #e6e8f3;border-radius:17px;padding:21px;background:#fff}.feature-tile>i{font-size:1.65rem;color:#7031e5;margin-bottom:12px}.feature-tile h3{margin:0 0 7px}.feature-tile p{font-size:.9rem;margin:0}.standard-card{border-color:#aa9af0;box-shadow:0 10px 30px #6c3cd219}.review-promise{display:flex;gap:15px;align-items:center;padding:18px;background:#f5f1ff;border:1px solid #e7ddff;border-radius:15px;margin-top:16px}.review-promise>i{font-size:1.8rem;color:#edb500}.review-promise div{display:grid}.review-promise span{font-size:.88rem;color:#68718a}.dashboard-downloader-intro{margin:28px 0 14px}.dashboard-downloader-intro p{color:#64708a}#dashboardCard #video-tool{max-width:none;margin:0 0 24px}@media(max-width:850px){.public-hero-grid{grid-template-columns:1fr}.public-hero-copy{text-align:center;margin:auto}.public-hero .hero-copy{margin:auto}.public-hero .platform-pills,.hero-benefits{justify-content:center}.hero-visual{min-height:280px}.public-stats{grid-template-columns:1fr}.stat-item{max-width:300px;width:100%;margin:auto}}@media(max-width:650px){.public-hero{padding:45px 0 30px}.public-hero h1{font-size:2.45rem}.hero-visual{min-height:230px}.visual-window{height:210px;width:78%}.float-platform{width:42px;height:42px;font-size:1.35rem}.feature-grid{grid-template-columns:1fr}} \n/* Brand lockup and visual system based on the approved Klypza reference */\n:root{--klypza-navy:#09143d;--klypza-blue:#087cf5;--klypza-purple:#7825e9;--klypza-cyan:#06c9ee}\n.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.82);backdrop-filter:blur(18px);box-shadow:0 5px 28px rgba(26,36,91,.045)}\n.nav-wrap{max-width:1280px}.brand-wordmark{display:block;width:150px;height:auto;max-height:44px;object-fit:contain}.logo{display:flex;align-items:center;min-width:160px}.nav-links{align-items:center;gap:clamp(12px,2vw,28px)}.nav-links a{font-weight:650;color:#111936;text-decoration:none}.nav-links .nav-home{color:#5525d9;background:#f0eaff;padding:9px 15px;border-radius:30px}.nav-links .nav-login{border:1px solid #7951ee;border-radius:12px;padding:10px 20px}.nav-links .nav-cta{padding:12px 22px;box-shadow:0 8px 22px rgba(99,43,221,.2)}\n.public-hero{padding:38px 0 28px;background:radial-gradient(ellipse at 78% 45%,rgba(142,127,255,.20),transparent 38%),linear-gradient(110deg,#f9fbff 0%,#f0f2ff 56%,#f8f1ff 100%);overflow:hidden}\n.public-hero-grid{max-width:1280px;grid-template-columns:1fr 1fr;gap:34px;min-height:390px}\n.public-hero-copy{text-align:left}.public-hero .eyebrow{display:inline-flex;align-items:center;gap:8px;background:#eeeaff;border:1px solid #e0d7ff;color:#33218d;border-radius:30px;padding:8px 14px;font-size:.85rem;font-weight:750}\n.public-hero h1{font-size:clamp(2.65rem,4.2vw,3.8rem);line-height:1.04;letter-spacing:-.055em;max-width:650px;margin:20px 0 16px;color:#07143d}\n.public-hero .hero-copy{font-size:1.08rem;line-height:1.58;max-width:580px;color:#465273}\n.hero-primary{padding:15px 27px;border-radius:13px;background:linear-gradient(105deg,#5524e9,#7925e9);box-shadow:0 12px 28px rgba(101,40,220,.22)}\n.hero-secondary{padding:14px 25px;border-radius:13px;border:1.4px solid #7854f1;color:#4422cf;background:rgba(255,255,255,.62)}\n.hero-benefits{gap:24px;margin-top:25px;font-size:.9rem;font-weight:650;color:#172347}.hero-benefits span{display:flex;align-items:center;gap:7px}.hero-benefits i{font-size:1.05rem;color:#0d9c86}\n.public-hero .platform-pills{display:none}\n.hero-visual{min-height:380px;background:radial-gradient(ellipse,rgba(173,173,255,.34),transparent 68%)}\n.visual-window{width:min(460px,88%);height:290px;border:10px solid rgba(255,255,255,.94);border-radius:34px;background:linear-gradient(140deg,#5141d6 0%,#3026a5 50%,#7825e9 100%);box-shadow:0 28px 55px rgba(73,54,190,.24);transform:rotate(-4deg)}\n.visual-brand{display:flex;align-items:center;gap:10px;font-size:2rem}.visual-brand img{width:116px;height:82px;object-fit:contain;filter:drop-shadow(0 5px 8px rgba(13,11,70,.2))}.footer-wordmark{display:block;width:240px;height:auto;max-height:76px;object-fit:contain}\n.visual-progress{width:60%;margin-top:24px}.visual-download{width:62px;height:62px;border-radius:50%;right:12%;bottom:15%;font-size:1.4rem}\n.float-platform{width:62px;height:62px;border-radius:20px;font-size:1.9rem;box-shadow:0 13px 30px rgba(40,37,100,.16)}\n.float-platform.youtube{top:3%;left:6%}.float-platform.tiktok{top:4%;right:4%}.float-platform.instagram{bottom:20%;right:0;left:auto}.float-platform.facebook{bottom:17%;left:2%;right:auto}.float-platform.pinterest{top:62%;right:10%}\n.public-main{max-width:none;padding-top:8px}.public-main>.container{max-width:1280px}\n.public-stats{max-width:1280px;margin:0 auto 12px;padding:17px 26px;grid-template-columns:repeat(3,1fr);background:rgba(255,255,255,.8);border:1px solid #e5e7f2;border-radius:18px;box-shadow:0 12px 32px rgba(39,44,103,.06)}\n.stat-item{grid-template-columns:50px 1fr;column-gap:12px}.stat-item i{width:45px;height:45px;border-radius:50%;background:transparent;color:#6327df;font-size:1.8rem}.stat-item strong{font-size:1.42rem;color:#0c1741}.stat-item span{color:#58627d}.stats-note{margin-top:4px!important}\n.public-features{max-width:1280px;padding-top:12px}.public-features h2{font-size:1.85rem;color:#0b1742}.feature-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.feature-tile{min-height:168px;border-radius:18px;background:rgba(255,255,255,.83);box-shadow:0 10px 25px rgba(31,40,90,.045);padding:20px}.feature-tile>i{font-size:1.65rem;color:#6b2be8}.feature-tile h3{font-size:1.02rem;color:#111b43}.feature-tile p{line-height:1.45;color:#53607e}\n.public-pricing{max-width:1280px}.public-pricing h2,.public-reviews h2{color:#0b1742}\n.public-pricing .pricing-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n.public-pricing .pricing-card{border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 12px 28px rgba(34,41,92,.06)}\n.public-pricing .premium-card{background:linear-gradient(145deg,#6953ef,#7421d8);color:#fff}.public-pricing .premium-card h3,.public-pricing .premium-card li,.public-pricing .premium-card .plan-price,.public-pricing .premium-card .plan-price small{color:#fff!important}\n.public-reviews{max-width:1280px}\n.review-promise{background:#fff;border-color:#e7e4f6}\n#dashboardCard .brand-wordmark{width:135px}\n@media(max-width:900px){.public-hero-grid{grid-template-columns:1fr 1fr;gap:14px}.public-hero h1{font-size:clamp(2.3rem,5vw,3.1rem)}.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nav-links{gap:10px}.nav-links .nav-login{padding:8px 12px}.nav-links .nav-cta{padding:9px 13px}}\n@media(max-width:650px){.nav-wrap{gap:10px;padding:10px 14px}.brand-wordmark{width:118px}.logo{min-width:120px}.nav-links{gap:7px}.nav-links a:not(.nav-cta):not(.nav-login){display:none}.nav-links .nav-login{padding:8px 10px;font-size:.82rem}.nav-links .nav-cta{padding:9px 11px;font-size:.82rem}.public-hero{padding:36px 0 16px}.public-hero-grid{grid-template-columns:1fr}.public-hero-copy{text-align:left}.public-hero h1{font-size:2.65rem;line-height:1.02}.public-hero .hero-copy{font-size:1rem}.hero-actions{gap:9px}.hero-primary,.hero-secondary{padding:12px 15px}.hero-benefits{gap:12px;font-size:.78rem}.hero-visual{min-height:260px}.visual-window{height:220px;width:76%}.float-platform{width:45px;height:45px;border-radius:15px;font-size:1.4rem}.public-stats{grid-template-columns:1fr;padding:15px;gap:8px}.stat-item{max-width:100%;margin:0}.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.feature-tile{padding:15px;min-height:160px}.public-pricing .pricing-grid{grid-template-columns:1fr}}\n/* Refined Klypza wordmark and hero composition */\n.visual-brand{width:min(78%,300px);justify-content:center;position:relative;z-index:4}\n.visual-brand img{display:block;width:100%;height:auto;max-height:none;object-fit:contain}\n.visual-window{position:relative;z-index:2;padding:22px 18px;box-sizing:border-box}\n.visual-window p{position:relative;z-index:5;text-align:center;width:100%;max-width:85%;margin:22px auto 0;line-height:1.35;font-size:clamp(.82rem,1.8vw,1rem);white-space:normal}\n.visual-progress{position:relative;z-index:3;margin-top:25px}\n.visual-download{z-index:4;right:7%;bottom:26%;width:48px;height:48px;border-radius:50%;box-shadow:0 8px 24px #17114a35}\n.float-platform{z-index:1}\n.float-platform.youtube{top:1%;left:4%}\n.float-platform.tiktok{top:0;right:4%}\n.float-platform.instagram{bottom:4%;left:2%}\n.float-platform.facebook{bottom:2%;right:5%}\n.float-platform.pinterest{top:37%;right:-1%}\n@media(max-width:650px){\n .visual-brand{width:76%;max-width:250px}\n .visual-window{padding:18px 14px}\n .visual-window p{max-width:78%;font-size:.78rem;margin-top:17px}\n .visual-progress{margin-top:20px}\n .visual-download{right:5%;bottom:28%;width:42px;height:42px}\n .float-platform.pinterest{top:32%;right:-2%}\n}\n\n/* Keep the hero slogan clear of the download badge */\n.visual-window{position:relative}\n.visual-window p{\n  width:72%;\n  max-width:72%;\n  align-self:flex-start;\n  margin:20px 0 0 8%;\n  text-align:left;\n  line-height:1.28;\n  position:relative;\n  z-index:6;\n  overflow-wrap:normal;\n}\n.visual-download{\n  right:6%;\n  bottom:12%;\n  top:auto;\n  z-index:4;\n}\n@media(max-width:650px){\n  .visual-window p{\n    width:70%;\n    max-width:70%;\n    margin:16px 0 0 7%;\n    font-size:.76rem;\n    line-height:1.25;\n  }\n  .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n}\n\n\n/* Keep the hero slogan clear of the download badge */\n.visual-window p{\n  width:72%;\n  max-width:72%;\n  align-self:flex-start;\n  margin:20px 0 0 8%;\n  text-align:left;\n  line-height:1.28;\n  position:relative;\n  z-index:6;\n  overflow-wrap:normal;\n}\n.visual-download{\n  right:6%;\n  bottom:12%;\n  top:auto;\n  z-index:4;\n}\n@media(max-width:650px){\n  .visual-window p{\n    width:70%;\n    max-width:70%;\n    margin:16px 0 0 7%;\n    font-size:.76rem;\n    line-height:1.25;\n  }\n  .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n}\n\n\n/* Final hero composition: social platform badges remain fully visible */\n.hero-visual{isolation:isolate;overflow:visible}\n.visual-window{position:relative;z-index:2}\n.float-platform{z-index:5}\n.visual-brand{width:min(78%,300px);display:flex;justify-content:center;align-items:center}\n.visual-brand img{width:100%;height:auto;max-height:none;object-fit:contain}\n.visual-window p{width:72%;max-width:72%;margin:20px 0 0 7%;align-self:flex-start;text-align:left;position:relative;z-index:6;line-height:1.28}\n.visual-download{right:6%;bottom:12%;top:auto;z-index:4}\n@media(max-width:650px){\n .hero-visual{min-height:300px;margin:10px 0 18px}\n .visual-window{width:76%;height:220px;padding:18px 14px}\n .visual-brand{width:78%;max-width:250px}\n .visual-progress{width:60%;margin-top:20px}\n .visual-window p{width:70%;max-width:70%;margin:16px 0 0 6%;font-size:.76rem;line-height:1.25}\n .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n .float-platform{z-index:5;width:45px;height:45px;border-radius:15px;font-size:1.4rem}\n .float-platform.youtube{top:0;left:0}\n .float-platform.tiktok{top:0;right:0}\n .float-platform.facebook{bottom:0;left:0}\n .float-platform.instagram{bottom:0;right:0;left:auto}\n .float-platform.pinterest{top:43%;right:-1%}\n}\n\n\n/* Klypza hero: one authoritative responsive layout */\n.hero-visual{position:relative;overflow:visible;isolation:isolate}\n.visual-window{position:relative;z-index:2}\n.visual-brand{width:min(86%,340px);display:flex;align-items:center;justify-content:center;position:relative;z-index:4}\n.visual-brand img{display:block;width:100%;height:auto;max-height:none;object-fit:contain}\n.visual-download{z-index:4;right:7%;bottom:12%;top:auto}\n.float-platform{position:absolute;z-index:6;width:52px;height:52px;border-radius:16px}\n.float-platform.youtube{top:1%;left:2%;right:auto;bottom:auto}\n.float-platform.tiktok{top:1%;right:2%;left:auto;bottom:auto}\n.float-platform.pinterest{top:43%;right:-1%;left:auto;bottom:auto}\n.float-platform.facebook{bottom:1%;left:2%;right:auto;top:auto}\n.float-platform.instagram{bottom:1%;right:2%;left:auto;top:auto}\n@media(max-width:650px){\n .hero-visual{min-height:300px;margin:10px 0 18px}\n .visual-window{width:76%;height:220px;padding:18px 14px}\n .visual-brand{width:88%;max-width:270px}\n .visual-progress{width:60%;margin-top:20px}\n .visual-window p{width:70%;max-width:70%;margin:16px 0 0 6%;font-size:.76rem;line-height:1.25}\n .visual-download{right:5%;bottom:11%;width:42px;height:42px}\n .float-platform{z-index:6;width:45px;height:45px;border-radius:15px;font-size:1.4rem}\n .float-platform.youtube{top:0;left:0}\n .float-platform.tiktok{top:0;right:0}\n .float-platform.pinterest{top:43%;right:-1%}\n .float-platform.facebook{bottom:0;left:0}\n .float-platform.instagram{bottom:0;right:0}\n}\n\n\n/* Hero tagline: align its visual center with the loading bar */\n.visual-window p{width:72%;max-width:72%;margin:20px auto 0;align-self:center;text-align:center;line-height:1.28;position:relative;z-index:6;overflow-wrap:normal}\n@media(max-width:650px){.visual-window p{width:76%;max-width:76%;margin:16px auto 0;align-self:center;text-align:center;font-size:.76rem;line-height:1.25}}\n\n/* Keep dashboard tab panels explicitly hidden until selected */\n#dashboardCard [hidden]{display:none!important}#dashboardCard .profile-panel{display:block}#dashboardCard #overviewPanel[hidden],#dashboardCard #profilePanel[hidden],#dashboardCard #plansPanel[hidden]{display:none!important}\n/* Dashboard profile navigation */\n.profile-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 18px;padding:6px;border:1px solid #e5e9f2;border-radius:14px;background:#f8faff}.profile-tab{border:0;background:transparent;color:#566178;padding:10px 15px;border-radius:10px;font:inherit;font-weight:650;cursor:pointer}.profile-tab.active{background:#fff;color:#245fc5;box-shadow:0 2px 10px rgba(20,35,70,.08)}.profile-panel{padding:22px;border:1px solid #e5e9f2;border-radius:16px;background:#fff;margin-bottom:20px}.profile-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0 24px}.profile-details>div{display:grid;gap:5px;padding:13px;border:1px solid #edf0f5;border-radius:12px;min-width:0}.profile-details span{font-size:.82rem;color:#68748b}.profile-details strong{overflow-wrap:anywhere}.profile-security{border-top:1px solid #edf0f5;padding-top:20px}.profile-form{display:grid;gap:12px;max-width:520px}.profile-form label{display:grid;gap:6px;font-weight:600}.profile-form input{width:100%;padding:12px;border:1px solid #d8deea;border-radius:10px;font:inherit}.profile-plan-actions{padding:16px;border:1px solid #e8ebf4;border-radius:14px;background:#fbfcff}.profile-plan-actions p{color:#64708a;font-size:.9rem;margin-bottom:0}.password-input-row{display:flex;gap:8px;align-items:stretch}.password-input-row input{flex:1;min-width:0}.password-toggle{border:1px solid #d8deea;border-radius:10px;background:#fff;color:#245fc5;padding:0 14px;font:inherit;font-weight:650;cursor:pointer}.membership-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}.membership-grid>div{display:grid;gap:5px;padding:14px;border:1px solid #edf0f5;border-radius:12px;min-width:0}.membership-grid span{font-size:.82rem;color:#68748b}.membership-grid strong{overflow-wrap:anywhere}.profile-plan-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.profile-plan-actions p{flex-basis:100%}.profile-plan-actions button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:600px){.membership-grid{grid-template-columns:1fr}.password-toggle{padding:0 11px}}@media(max-width:600px){.profile-panel{padding:16px}.profile-details{grid-template-columns:1fr}.profile-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.profile-tab{padding:10px 6px;font-size:.86rem}}\n/* Dashboard ads and mobile layout refinements */\n#dashboardCard \n\n\n\n#dashboardCard{overflow:hidden}\n#dashboardCard .dashboard-downloader-intro,#dashboardCard .content-section{min-width:0}\n@media(max-width:600px){\n  .nav-wrap{padding:12px 14px;gap:10px}\n  .nav-links{gap:8px}\n  .container{width:calc(100% - 20px)}\n  #dashboardCard{padding:18px 14px;border-radius:18px}\n  #dashboardCard h1,#dashboardCard h2{overflow-wrap:anywhere}\n  #dashboardCard \n  \n  #dashboardCard .btn-download{min-height:42px;padding:9px 12px}\n  #dashboardCard .item-row{min-width:0}\n  #dashboardCard .item-meta{overflow-wrap:anywhere}\n}\n/* Klypza dashboard refresh — unified blue/violet workspace */\n#dashboardCard{width:min(1280px,calc(100% - 40px));max-width:1280px!important;margin:34px auto 64px!important;padding:clamp(18px,3vw,34px)!important;border:1px solid #e6eaf5;border-radius:28px;background:linear-gradient(145deg,#fff 0%,#fbfcff 65%,#f7f4ff 100%);box-shadow:0 22px 65px rgba(20,34,82,.08);display:grid;grid-template-columns:220px minmax(0,1fr);grid-template-rows:auto auto auto;gap:0 26px}\n#dashboardCard>.dashboard-welcome{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:clamp(22px,3.5vw,38px);margin:-1px -1px 22px;border-radius:22px;background:radial-gradient(circle at 85% 12%,rgba(177,143,255,.28),transparent 30%),linear-gradient(115deg,#09143d 0%,#172d70 55%,#5525d9 100%);color:#fff;overflow:hidden;position:relative}\n#dashboardCard .dashboard-welcome:after{content:\"\";position:absolute;width:250px;height:250px;border:1px solid rgba(255,255,255,.13);border-radius:50%;right:13%;top:-155px;box-shadow:0 0 0 28px rgba(255,255,255,.035),0 0 0 58px rgba(255,255,255,.025)}\n#dashboardCard .dashboard-welcome-copy,#dashboardCard .dashboard-welcome-actions{position:relative;z-index:1}\n#dashboardCard .dashboard-welcome .section-kicker{color:#bfcaff;letter-spacing:.16em}\n#dashboardCard .dashboard-welcome h1{font-family:Manrope,sans-serif;font-size:clamp(1.65rem,3.5vw,2.45rem);line-height:1.15;letter-spacing:-.045em;margin:4px 0 8px;color:#fff}\n#dashboardCard .dashboard-welcome p{color:#d9e1ff;margin:0;overflow-wrap:anywhere}\n#dashboardCard .dashboard-welcome-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}\n#dashboardCard .dashboard-live-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.1);border-radius:999px;padding:9px 13px;font-size:.82rem;color:#fff;white-space:nowrap}\n#dashboardCard .dashboard-live-pill i{color:#7ce4bd}\n#dashboardCard #logoutButton{background:#fff;color:#18275a;border:0;border-radius:12px;padding:11px 16px;box-shadow:none}\n#dashboardCard #emailVerifyNotice{grid-column:1/-1;margin:0 0 20px!important}\n#dashboardCard .profile-tabs{grid-column:1;grid-row:3;align-self:start;position:sticky;top:92px;display:flex;flex-direction:column;gap:7px;margin:0;padding:10px;border:1px solid #e7eaf4;border-radius:18px;background:#f6f8ff}\n#dashboardCard .profile-tab{display:flex;align-items:center;text-align:left;gap:10px;width:100%;min-height:48px;padding:12px 14px;border-radius:12px;color:#59647e}\n#dashboardCard .profile-tab:before{font-family:\"Font Awesome 6 Free\";font-weight:900;width:20px;text-align:center;color:#8c83c9}\n#dashboardCard .profile-tab[data-panel=\"overview\"]:before{content:\"\\f0e4\"}\n#dashboardCard .profile-tab[data-panel=\"profile\"]:before{content:\"\\f2bd\"}\n#dashboardCard .profile-tab[data-panel=\"plans\"]:before{content:\"\\f09d\"}\n#dashboardCard .profile-tab.active{background:linear-gradient(110deg,#e9f1ff,#f1eaff);color:#4525bb;box-shadow:inset 3px 0 #6d42e8,0 5px 16px rgba(48,52,130,.06)}\n#dashboardCard .profile-panel,#dashboardCard #overviewPanel{grid-column:2;grid-row:3;min-width:0}\n#dashboardCard .profile-panel{padding:clamp(18px,2.5vw,28px);border:1px solid #e7eaf4;border-radius:20px;background:#fff;box-shadow:0 10px 28px rgba(25,38,85,.045);margin:0}\n#dashboardCard #overviewPanel .steps-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:0 0 28px!important}\n#dashboardCard #overviewPanel .info-card{min-width:0;padding:20px;border-radius:18px;background:#fff;border-color:#e7eaf4;box-shadow:0 8px 24px rgba(22,36,82,.045)}\n#dashboardCard #overviewPanel .info-card:first-child{background:linear-gradient(145deg,#f0f5ff,#f5efff);border-color:#e2ddfb}\n#dashboardCard #overviewPanel .info-card h2{font-family:Manrope,sans-serif;color:#111936;font-weight:800}\n#dashboardCard #overviewPanel .info-card p{color:#68738c;line-height:1.55}\n#dashboardCard .dashboard-downloader-intro{margin:10px 0 15px}\n#dashboardCard .dashboard-downloader-intro h2,#dashboardCard .profile-panel h2{font-family:Manrope,sans-serif;letter-spacing:-.035em}\n#dashboardCard .profile-details{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\n#dashboardCard .profile-details>div,#dashboardCard .membership-grid>div{padding:17px;border:1px solid #e9edf6;border-radius:15px;background:linear-gradient(145deg,#fff,#fafbff)}\n#dashboardCard .profile-details span,#dashboardCard .membership-grid span{font-size:.78rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#7a849b}\n#dashboardCard .profile-details strong,#dashboardCard .membership-grid strong{font-size:1rem;color:#18234b}\n#dashboardCard .profile-security{margin-top:8px}\n#dashboardCard .profile-security h3{font-family:Manrope,sans-serif;font-size:1.2rem}\n#dashboardCard .profile-form input{border-radius:12px;background:#fbfcff}\n#dashboardCard .profile-form input:focus{border-color:#7651e9;box-shadow:0 0 0 3px rgba(118,81,233,.12);outline:0}\n#dashboardCard .membership-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}\n#dashboardCard .profile-plan-actions{border:1px solid #e4e1f8;border-radius:16px;background:linear-gradient(110deg,#f5f8ff,#f7f1ff);padding:18px}\n#dashboardCard .profile-panel .btn-download{border-radius:12px}\n@media(max-width:900px){#dashboardCard{grid-template-columns:1fr;gap:18px;padding:18px!important}#dashboardCard .profile-tabs{grid-column:1;grid-row:auto;position:static;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex-direction:row}#dashboardCard .profile-tab{justify-content:center;text-align:center;padding:11px 8px;font-size:.88rem}#dashboardCard .profile-tab:before{display:none}#dashboardCard .profile-panel,#dashboardCard #overviewPanel{grid-column:1;grid-row:auto}}\n@media(max-width:620px){#dashboardCard{width:calc(100% - 20px);margin:16px auto 40px!important;padding:12px!important;border-radius:20px}#dashboardCard>.dashboard-welcome{padding:22px 18px;align-items:flex-start;flex-direction:column;border-radius:16px}#dashboardCard .dashboard-welcome-actions{width:100%;justify-content:space-between}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:1fr;gap:10px}#dashboardCard .profile-details,#dashboardCard .membership-grid{grid-template-columns:1fr}#dashboardCard .profile-tabs{gap:4px;padding:5px}#dashboardCard .profile-tab{font-size:.78rem;min-height:44px;padding:8px 4px}#dashboardCard .profile-panel{padding:17px}}\n\n/* Dashboard sidebar layout refinement: keep account sections beside content */\n@media(min-width:901px){#dashboardCard{display:grid!important;grid-template-columns:220px minmax(0,1fr);column-gap:24px;row-gap:20px;max-width:1280px!important;width:min(100% - 48px,1280px)!important;margin:28px auto 56px!important;padding:28px!important;align-items:start}#dashboardCard>.dashboard-welcome,#dashboardCard>#emailVerifyNotice{grid-column:1/-1}#dashboardCard>.profile-tabs{grid-column:1;grid-row:3;display:flex;flex-direction:column;position:sticky;top:24px;align-self:start}#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{grid-column:2;grid-row:3;min-width:0}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\n@media(min-width:621px) and (max-width:900px){#dashboardCard{display:grid!important;grid-template-columns:190px minmax(0,1fr);gap:16px;padding:20px!important}#dashboardCard>.dashboard-welcome,#dashboardCard>#emailVerifyNotice{grid-column:1/-1}#dashboardCard>.profile-tabs{grid-column:1;grid-row:3;display:flex;flex-direction:column;position:sticky;top:16px;align-self:start}#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{grid-column:2;grid-row:3;min-width:0}#dashboardCard .profile-tab{justify-content:flex-start;text-align:left}#dashboardCard .profile-tab:before{display:inline-block}}\n@media(max-width:620px){#dashboardCard{display:block!important}#dashboardCard>.profile-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:18px 0}}\n\n/* Collapsible account menu below dashboard navigation */\n#dashboardCard .sidebar-account-menu{grid-column:1;grid-row:4;align-self:start;margin-top:12px;padding:8px;border:1px solid #e7eaf4;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(25,38,85,.035)}\n#dashboardCard .account-menu-toggle{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:10px 12px;border:0;border-radius:11px;background:#f7f8ff;color:#4d5874;font:inherit;font-weight:700;text-align:left;cursor:pointer}\n#dashboardCard .account-menu-toggle>i:first-child{color:#7861d8;width:20px;text-align:center}\n#dashboardCard .account-menu-chevron{margin-left:auto;transition:transform .18s ease;color:#8790a6}\n#dashboardCard .account-menu-toggle[aria-expanded=\"true\"] .account-menu-chevron{transform:rotate(180deg)}\n#dashboardCard .account-menu-content{padding:8px 0 0}\n#dashboardCard .account-logout-button{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:10px;background:#fff5f5;color:#b42332;font:inherit;font-weight:700;text-align:left;cursor:pointer}\n#dashboardCard .account-logout-button:hover{background:#ffe9eb}\n@media(min-width:901px){#dashboardCard #overviewPanel,#dashboardCard .profile-panel{grid-row:3 / span 2}}\n@media(min-width:621px) and (max-width:900px){#dashboardCard .sidebar-account-menu{grid-column:1;grid-row:4;margin-top:10px}#dashboardCard #overviewPanel,#dashboardCard .profile-panel{grid-row:3 / span 2}}\n@media(max-width:620px){#dashboardCard .sidebar-account-menu{margin:0 0 16px}#dashboardCard #overviewPanel,#dashboardCard .profile-panel{grid-row:auto}}\n/* One collapsible sidebar menu for all dashboard destinations and logout */\n#dashboardCard .dashboard-side-menu{grid-column:1;grid-row:3;align-self:start;position:sticky;top:92px;min-width:0;padding:10px;border:1px solid #e7eaf4;border-radius:18px;background:#f6f8ff}\n#dashboardCard .dashboard-side-menu>.account-menu-toggle{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:12px 14px;border:0;border-radius:12px;background:#fff;color:#39466b;font:inherit;font-weight:750;text-align:left;cursor:pointer}\n#dashboardCard .dashboard-side-menu .account-menu-toggle>i:first-child{width:20px;text-align:center;color:#7250dc}\n#dashboardCard .dashboard-side-menu .account-menu-chevron{margin-left:auto;transition:transform .18s ease}\n#dashboardCard .dashboard-side-menu .account-menu-toggle[aria-expanded=\"true\"] .account-menu-chevron{transform:rotate(180deg)}\n#dashboardCard .dashboard-side-menu .account-menu-content{display:flex;flex-direction:column;gap:7px;margin:8px 0 0;padding:0;border:0;background:transparent}\n#dashboardCard .dashboard-side-menu .account-menu-content[hidden]{display:none!important}\n#dashboardCard .dashboard-side-menu .profile-tab{justify-content:flex-start;text-align:left}\n#dashboardCard .dashboard-side-menu .profile-tab>i{width:20px;text-align:center;color:#8c83c9}\n#dashboardCard .dashboard-side-menu .profile-tab.account-logout-nav{margin-top:8px;border-top:1px solid #e4e8f2;border-radius:0 0 10px 10px;color:#b42332}\n#dashboardCard .dashboard-side-menu .profile-tab.account-logout-nav>i{color:#b42332}\n#dashboardCard #overviewPanel,#dashboardCard .profile-panel{grid-column:2;grid-row:3;min-width:0}\n@media(max-width:900px){#dashboardCard .dashboard-side-menu{grid-column:1;grid-row:3;position:static}#dashboardCard .dashboard-side-menu .profile-tabs{position:static;grid-column:auto;grid-row:auto;margin:8px 0 0}#dashboardCard #overviewPanel,#dashboardCard .profile-panel{grid-column:1;grid-row:4}}\n@media(max-width:620px){#dashboardCard .dashboard-side-menu{margin:0 0 16px}#dashboardCard #overviewPanel,#dashboardCard .profile-panel{grid-column:1;grid-row:auto}}\n\n/* Final dashboard layout: content on the left, collapsible dashboard menu on the right */\n@media(min-width:901px){#dashboardCard{grid-template-columns:minmax(0,1fr) 230px!important;column-gap:26px!important}#dashboardCard>.dashboard-welcome,#dashboardCard>#emailVerifyNotice{grid-column:1/-1!important}#dashboardCard>.dashboard-side-menu{grid-column:2!important;grid-row:3!important;position:sticky;top:24px;align-self:start}#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{grid-column:1!important;grid-row:3!important;min-width:0}}\n@media(min-width:621px) and (max-width:900px){#dashboardCard{grid-template-columns:minmax(0,1fr) 205px!important;column-gap:16px!important}#dashboardCard>.dashboard-welcome,#dashboardCard>#emailVerifyNotice{grid-column:1/-1!important}#dashboardCard>.dashboard-side-menu{grid-column:2!important;grid-row:3!important;position:static}#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{grid-column:1!important;grid-row:3!important;min-width:0}#dashboardCard .dashboard-side-menu .profile-tab{justify-content:flex-start;text-align:left;font-size:.84rem;padding:10px 9px}#dashboardCard .dashboard-side-menu .profile-tab>i{display:inline-block!important}}\n@media(max-width:620px){#dashboardCard{display:flex!important;flex-direction:column!important}#dashboardCard>.dashboard-welcome,#dashboardCard>#emailVerifyNotice,#dashboardCard>.dashboard-side-menu,#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{width:100%;grid-column:auto!important;grid-row:auto!important}#dashboardCard>.dashboard-side-menu{order:1;margin:0 0 16px}#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{order:2}}\n#dashboardCard .dashboard-side-menu>.account-menu-toggle{background:linear-gradient(115deg,#eef3ff,#f4edff);border:1px solid #e3e6f4;color:#18234b}\n#dashboardCard .dashboard-side-menu .account-menu-content[hidden]{display:none!important}\n\n\n/* Klypza dashboard visual refresh */\n#dashboardCard{max-width:1120px!important;width:100%;padding:clamp(18px,3vw,34px)!important;border:1px solid #e7ebf3;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(20,32,65,.07);overflow:visible}\n#dashboardCard .dashboard-welcome{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:clamp(20px,3vw,30px);border:1px solid #e2e9fb;border-radius:20px;background:linear-gradient(120deg,#f4f7ff 0%,#f8f6ff 55%,#f4fbff 100%);margin-bottom:18px}\n#dashboardCard .dashboard-welcome h1{font-size:clamp(1.55rem,3vw,2.15rem);line-height:1.15;letter-spacing:-.035em;margin:7px 0}\n#dashboardCard .dashboard-welcome-copy p{margin:0;color:#64708a;overflow-wrap:anywhere}\n#dashboardCard .dashboard-side-menu{position:relative;z-index:5;margin:0 0 20px!important}\n#dashboardCard .account-menu-toggle{width:100%;display:flex;align-items:center;gap:11px;padding:13px 16px;border:1px solid #e4e9f3;border-radius:14px;background:#fff;color:#263453;font:inherit;font-weight:700;text-align:left;box-shadow:0 4px 14px rgba(20,32,65,.04)}\n#dashboardCard .account-menu-toggle .account-menu-chevron{margin-left:auto;transition:transform .2s}\n#dashboardCard .account-menu-toggle[aria-expanded=\"true\"] .account-menu-chevron{transform:rotate(180deg)}\n#dashboardCard .account-menu-content{position:absolute;top:calc(100% + 8px);left:0;right:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0;padding:8px;background:#fff;border:1px solid #e5eaf3;border-radius:16px;box-shadow:0 16px 38px rgba(20,32,65,.13)}\n#dashboardCard .account-menu-content .profile-tab{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 12px;border-radius:10px;font-size:.9rem}\n#dashboardCard .account-menu-content .profile-tab.active{background:#eef3ff;color:#245fc5;box-shadow:none}\n#dashboardCard .account-menu-content .account-logout-nav{color:#a23d48}\n#dashboardCard #overviewPanel{display:block}\n#dashboardCard #overviewPanel .steps-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:0 0 24px!important}\n#dashboardCard #overviewPanel .info-card{border:1px solid #e8edf5;border-radius:16px;padding:18px;background:#fff;box-shadow:none;min-width:0}\n#dashboardCard .dashboard-downloader-intro{margin:22px 0 14px}\n#dashboardCard .dashboard-downloader-intro h2{font-size:1.55rem!important;letter-spacing:-.025em}\n#dashboardCard #video-tool{border:1px solid #e5eaf3;border-radius:20px;box-shadow:0 8px 28px rgba(20,32,65,.045);padding:clamp(16px,2.5vw,26px)}\n#dashboardCard .profile-panel{border:1px solid #e5eaf3;border-radius:20px;box-shadow:0 8px 28px rgba(20,32,65,.045)}\n#dashboardCard .profile-details{grid-template-columns:repeat(2,minmax(0,1fr))}\n#dashboardCard .profile-details>div,#dashboardCard .membership-grid>div{background:#fbfcff}\n#dashboardCard .profile-form input{min-height:46px}\n#dashboardCard \n@media(max-width:760px){#dashboardCard{padding:14px!important;border-radius:18px}#dashboardCard .dashboard-welcome{align-items:flex-start;flex-direction:column;padding:18px;margin-bottom:14px}#dashboardCard .dashboard-welcome-actions{width:100%}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:1fr;gap:10px}#dashboardCard .account-menu-content{grid-template-columns:repeat(2,minmax(0,1fr))}#dashboardCard .account-menu-content .profile-tab{justify-content:flex-start}#dashboardCard .profile-panel{padding:16px}#dashboardCard .profile-details{grid-template-columns:1fr}#dashboardCard #video-tool{padding:15px}#dashboardCard .dashboard-live-pill{display:inline-flex;max-width:100%;white-space:normal}}\n@media(max-width:380px){#dashboardCard .account-menu-content{grid-template-columns:1fr}#dashboardCard .dashboard-welcome h1{font-size:1.45rem}}\n\n\n/* Klypza dashboard correction: real page stylesheet, task-first layout */\n#dashboardCard{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto!important;gap:0!important;width:min(1320px,calc(100% - 40px))!important;max-width:1320px!important;margin:28px auto 60px!important;padding:clamp(16px,3vw,34px)!important}\n#dashboardCard>.dashboard-welcome{grid-column:1/-1!important;grid-row:auto!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:20px!important;min-height:190px!important;margin:0 0 18px!important;padding:clamp(24px,3.5vw,42px)!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:22px!important;background:radial-gradient(circle at 88% 15%,rgba(135,111,255,.28),transparent 30%),linear-gradient(112deg,#101b43 0%,#1b3478 58%,#4d2bbd 100%)!important;color:#fff!important;box-shadow:0 16px 38px rgba(19,32,79,.16)!important}\n#dashboardCard .dashboard-welcome-copy,#dashboardCard .dashboard-welcome-actions{position:relative!important;z-index:1!important}\n#dashboardCard .dashboard-welcome .section-kicker{color:#cbd5ff!important;font-weight:800!important}\n#dashboardCard .dashboard-welcome h1{color:#fff!important;font-family:Manrope,sans-serif!important;font-size:clamp(1.65rem,3.5vw,2.45rem)!important;line-height:1.16!important;letter-spacing:-.04em!important}\n#dashboardCard .dashboard-welcome p{color:#e5ebff!important}\n#dashboardCard .dashboard-live-pill{color:#fff!important;background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.28)!important}\n#dashboardCard>.dashboard-side-menu{grid-column:1/-1!important;grid-row:auto!important;position:relative!important;top:auto!important;justify-self:end!important;align-self:auto!important;width:min(100%,320px)!important;margin:0 0 18px!important;padding:8px!important;border:1px solid #e5e9f3!important;border-radius:16px!important;background:#f7f8fd!important}\n#dashboardCard>.dashboard-side-menu>.account-menu-toggle{min-height:48px!important;background:#fff!important;border:1px solid #e5e9f3!important;border-radius:12px!important;color:#202c4c!important}\n#dashboardCard>.dashboard-side-menu .account-menu-content{z-index:30!important;background:#fff!important;border:1px solid #e4e8f2!important;border-radius:14px!important;box-shadow:0 16px 36px rgba(22,34,70,.14)!important;padding:8px!important}\n#dashboardCard>.dashboard-side-menu .profile-tab{color:#4b5874!important;border-radius:10px!important}\n#dashboardCard>.dashboard-side-menu .profile-tab.active{background:#edf2ff!important;color:#245fc5!important}\n#dashboardCard>#overviewPanel,#dashboardCard>#profilePanel,#dashboardCard>#plansPanel{grid-column:1/-1!important;grid-row:auto!important;width:100%!important;min-width:0!important}\n#dashboardCard #overviewPanel .steps-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important;margin-top:0!important}\n#dashboardCard #overviewPanel .info-card{min-width:0!important;padding:22px!important;border:1px solid #e4e9f3!important;border-radius:18px!important;background:#fff!important;box-shadow:0 8px 24px rgba(20,34,82,.045)!important}\n#dashboardCard #overviewPanel .info-card:first-child{background:linear-gradient(145deg,#f2f0ff,#f7f8ff)!important;border-color:#e4defe!important}\n#dashboardCard .profile-panel{grid-column:1/-1!important;grid-row:auto!important;width:100%!important;min-width:0!important;border:1px solid #e6eaf2!important;border-radius:20px!important;background:#fff!important;box-shadow:0 10px 30px rgba(20,34,82,.045)!important}\n#dashboardCard .profile-panel input,#dashboardCard .profile-panel select,#dashboardCard .profile-panel textarea{max-width:100%!important;border-color:#dce2ee!important}\n#dashboardCard .dashboard-downloader-intro{margin:28px 0 14px!important}\n#dashboardCard #video-tool{width:100%!important;max-width:none!important;min-width:0!important}\n@media(min-width:621px) and (max-width:900px){#dashboardCard{width:calc(100% - 32px)!important;padding:22px!important}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}\n@media(max-width:620px){#dashboardCard{display:block!important;width:calc(100% - 20px)!important;margin:18px auto 36px!important;padding:14px!important;border-radius:18px!important}#dashboardCard>.dashboard-welcome{min-height:0!important;padding:22px 18px!important;margin:0 0 16px!important;align-items:flex-start!important;flex-direction:column!important;gap:14px!important;border-radius:16px!important}#dashboardCard>.dashboard-welcome h1{font-size:clamp(1.45rem,7vw,1.9rem)!important}#dashboardCard>.dashboard-side-menu{width:100%!important;max-width:none!important;margin:0 0 16px!important}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:minmax(0,1fr)!important;gap:12px!important}#dashboardCard .profile-panel{padding:16px!important}}\n\n\n\n/* Klypza profile: clearer hierarchy, balanced information cards, comfortable forms */\n#dashboardCard #profilePanel{padding:clamp(20px,3vw,34px)!important;border:1px solid #e5eaf3!important;border-radius:22px!important;background:linear-gradient(180deg,#fff 0%,#fcfdff 100%)!important;box-shadow:0 14px 36px rgba(22,35,78,.055)!important}\n#dashboardCard #profilePanel>.section-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 8px!important;color:#3479d5!important;font-size:.78rem!important;font-weight:800!important;letter-spacing:.14em!important}\n#dashboardCard #profilePanel>h2{margin:0 0 22px!important;color:#17213f!important;font-size:clamp(1.65rem,3vw,2.15rem)!important;line-height:1.2!important;letter-spacing:-.035em!important}\n#dashboardCard #profilePanel .profile-details{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;margin:0 0 26px!important}\n#dashboardCard #profilePanel .profile-details>div{position:relative;min-height:96px!important;align-content:center!important;gap:8px!important;padding:18px 20px!important;border:1px solid #e7ebf3!important;border-radius:16px!important;background:#f9fbff!important;transition:border-color .18s ease,transform .18s ease}\n#dashboardCard #profilePanel .profile-details>div:hover{border-color:#cbd8f4!important;transform:translateY(-1px)}\n#dashboardCard #profilePanel .profile-details>div:last-child{grid-column:1/-1!important;min-height:82px!important;background:linear-gradient(110deg,#f6f8ff,#fbfaff)!important}\n#dashboardCard #profilePanel .profile-details span{color:#78839a!important;font-size:.76rem!important;font-weight:750!important;letter-spacing:.055em!important;text-transform:uppercase!important}\n#dashboardCard #profilePanel .profile-details strong{color:#202c4c!important;font-size:1.04rem!important;font-weight:750!important;line-height:1.4!important;overflow-wrap:anywhere}\n#dashboardCard #profilePanel .profile-security{margin-top:4px!important;padding-top:24px!important;border-top:1px solid #e9edf4!important}\n#dashboardCard #profilePanel .profile-security h3{margin:0 0 8px!important;color:#17213f!important;font-size:1.2rem!important}\n#dashboardCard #profilePanel .profile-security>p{max-width:680px;color:#69758d!important;line-height:1.65!important}\n#dashboardCard #profilePanel .profile-form{width:100%!important;max-width:620px!important;gap:15px!important}\n#dashboardCard #profilePanel .profile-form label{gap:8px!important;color:#35415e!important;font-size:.92rem!important}\n#dashboardCard #profilePanel .profile-form input{min-height:48px!important;background:#fff!important;border:1px solid #dce3ef!important;border-radius:12px!important;outline:none!important}\n#dashboardCard #profilePanel .profile-form input:focus{border-color:#668be8!important;box-shadow:0 0 0 3px rgba(74,117,220,.12)!important}\n#dashboardCard #profilePanel .password-toggle{min-width:74px!important;border-radius:12px!important}\n#dashboardCard #profilePanel #changePasswordButton{min-height:48px!important;border-radius:12px!important}\n#dashboardCard .dashboard-side-menu>.account-menu-toggle{font-weight:750!important;letter-spacing:.01em}\n#dashboardCard .dashboard-side-menu>.account-menu-toggle span{font-size:1rem!important}\n@media(max-width:620px){\n #dashboardCard #profilePanel{padding:18px!important;border-radius:18px!important}\n #dashboardCard #profilePanel .profile-details{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}\n #dashboardCard #profilePanel .profile-details>div,#dashboardCard #profilePanel .profile-details>div:last-child{grid-column:1!important;min-height:78px!important;padding:15px 16px!important}\n #dashboardCard #profilePanel .profile-security{padding-top:20px!important}\n #dashboardCard #profilePanel .password-input-row{gap:6px!important}\n #dashboardCard #profilePanel .password-toggle{min-width:66px!important;padding:0 10px!important}\n}\n\n\n\n/* Final dashboard and membership polish */\n#dashboardCard #plansPanel{padding:clamp(20px,3vw,34px)!important;background:linear-gradient(180deg,#fff,#fcfdff)!important;border:1px solid #e5eaf3!important;border-radius:22px!important;box-shadow:0 14px 36px rgba(22,35,78,.055)!important}\n#dashboardCard #plansPanel>.section-kicker{color:#3479d5!important;font-size:.78rem!important;font-weight:800!important;letter-spacing:.14em!important}\n#dashboardCard #plansPanel>h2{margin:0 0 10px!important;color:#17213f!important;font-size:clamp(1.65rem,3vw,2.1rem)!important;letter-spacing:-.035em!important}\n#dashboardCard #plansPanel>.membership-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:13px!important;margin:22px 0!important}\n#dashboardCard #plansPanel .membership-grid>div{min-height:86px!important;align-content:center!important;gap:7px!important;padding:17px 19px!important;border:1px solid #e7ebf3!important;border-radius:15px!important;background:#f9fbff!important}\n#dashboardCard #plansPanel .membership-grid>div:last-child{grid-column:1/-1!important;background:linear-gradient(110deg,#f4f7ff,#faf8ff)!important}\n#dashboardCard #plansPanel .membership-grid span{color:#78839a!important;font-size:.75rem!important;font-weight:750!important;letter-spacing:.05em!important;text-transform:uppercase!important}\n#dashboardCard #plansPanel .membership-grid strong{color:#202c4c!important;font-size:1.02rem!important}\n#dashboardCard #plansPanel .profile-plan-actions{display:flex!important;align-items:center!important;gap:12px!important;padding:19px!important;border:1px solid #e4e7f2!important;border-radius:16px!important;background:linear-gradient(115deg,#f5f8ff,#f8f4ff)!important}\n#dashboardCard #plansPanel .profile-plan-actions>a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:46px!important;padding:0 20px!important;border-radius:12px!important;text-decoration:none!important}\n#dashboardCard #plansPanel .profile-plan-actions>button{min-height:46px!important;padding:0 16px!important;border:1px solid #dfe4ef!important;border-radius:12px!important;background:#fff!important;color:#68738a!important}\n#dashboardCard #plansPanel #membershipNotice{flex-basis:100%!important;margin:0!important;color:#68738a!important;font-size:.88rem!important;line-height:1.6!important}\n#plansCard{max-width:1120px!important;padding:clamp(20px,3vw,34px)!important;border:1px solid #e6eaf3!important;border-radius:22px!important;background:#fff!important;box-shadow:0 14px 36px rgba(22,35,78,.05)!important}\n#plansCard>.section-kicker{color:#3479d5!important;font-weight:800!important;letter-spacing:.14em!important}\n#plansCard>h2{color:#17213f!important;font-size:clamp(1.7rem,3vw,2.2rem)!important;letter-spacing:-.035em!important}\n#plansCard>.pricing-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:17px!important;align-items:stretch!important}\n#plansCard .pricing-card{position:relative!important;min-width:0!important;padding:23px!important;border:1px solid #e4e9f2!important;border-radius:18px!important;background:linear-gradient(180deg,#fff,#fbfcff)!important;box-shadow:0 8px 24px rgba(22,36,82,.045)!important}\n#plansCard .pricing-card h3{color:#17213f!important;font-size:1.35rem!important}\n#plansCard .pricing-card .plan-price{color:#17213f!important;font-size:2.3rem!important}\n#plansCard .pricing-card .badge{align-self:flex-start!important}\n#plansCard .pricing-card.premium-card{border-color:#c9b8f2!important;background:linear-gradient(180deg,#fbf9ff,#fff)!important;box-shadow:0 12px 28px rgba(104,67,196,.09)!important}\n#plansCard .pricing-card ul{gap:11px!important;padding:12px 0 20px!important}\n#plansCard .pricing-card li{line-height:1.45!important}\n#plansCard .pricing-card .btn-download{display:flex!important;align-items:center!important;justify-content:center!important;min-height:46px!important;border-radius:12px!important;text-decoration:none!important}\n#plansCard .pricing-card .plan-disabled{border:1px solid #e1e5ee!important;background:#f2f4f8!important;color:#7a8498!important}\n#plansCard>.notice{margin-top:20px!important;padding:15px 18px!important;border:1px solid #e8eaf2!important;border-radius:14px!important;background:#f8f9fd!important;color:#626e84!important;line-height:1.65!important}\n@media(max-width:1050px){#plansCard>.pricing-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}\n@media(max-width:620px){\n #dashboardCard #plansPanel .membership-grid{grid-template-columns:minmax(0,1fr)!important}\n #dashboardCard #plansPanel .membership-grid>div:last-child{grid-column:1!important}\n #dashboardCard #plansPanel .profile-plan-actions{align-items:stretch!important;flex-direction:column!important}\n #dashboardCard #plansPanel .profile-plan-actions>a,#dashboardCard #plansPanel .profile-plan-actions>button{width:100%!important}\n #plansCard{width:calc(100% - 20px)!important;margin:18px auto!important;padding:18px!important;border-radius:18px!important}\n #plansCard>.pricing-grid{grid-template-columns:minmax(0,1fr)!important;gap:13px!important}\n #plansCard .pricing-card{padding:19px!important}\n}\n\n\n#dashboardCard #plansPanel .membership-available{margin-top:28px;padding-top:24px;border-top:1px solid #e7ebf3}\n#dashboardCard #plansPanel .membership-available>h3{margin:5px 0 6px;color:#17213f;font-size:clamp(1.25rem,2.5vw,1.65rem)}\n#dashboardCard #plansPanel .membership-pricing-note{margin:0 0 16px;color:#748097;font-size:.9rem}\n#dashboardCard #plansPanel .membership-pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;align-items:stretch}\n#dashboardCard #plansPanel .membership-pricing-grid .pricing-card{display:flex;flex-direction:column;min-width:0;padding:20px;border:1px solid #e4e9f2;border-radius:17px;background:linear-gradient(180deg,#fff,#fbfcff)}\n#dashboardCard #plansPanel .membership-pricing-grid .pricing-card h3{margin:12px 0 5px;color:#17213f;font-size:1.25rem}\n#dashboardCard #plansPanel .membership-pricing-grid .plan-price{color:#17213f;font-size:2rem;font-weight:800}\n#dashboardCard #plansPanel .membership-pricing-grid .plan-price small{font-size:.78rem;font-weight:500;color:#64708a}\n#dashboardCard #plansPanel .membership-pricing-grid .plan-tag{color:#64708a;font-size:.86rem}\n#dashboardCard #plansPanel .membership-pricing-grid ul{list-style:none;display:grid;gap:8px;padding:10px 0 18px;flex:1}\n#dashboardCard #plansPanel .membership-pricing-grid li{position:relative;padding-left:21px;color:#3b465c;font-size:.87rem}\n#dashboardCard #plansPanel .membership-pricing-grid li:before{content:\"✓\";position:absolute;left:0;color:#2878f0;font-weight:900}\n#dashboardCard #plansPanel .membership-pricing-grid .btn-download{width:100%;margin-top:auto}\n#dashboardCard #plansPanel .membership-pricing-grid .premium-card{border-color:#c9b8f2;background:linear-gradient(180deg,#fbf9ff,#fff)}\n#dashboardCard #plansPanel .membership-available>.notice{margin-top:16px}\n@media(max-width:760px){#dashboardCard #plansPanel .membership-pricing-grid{grid-template-columns:minmax(0,1fr)}#dashboardCard #plansPanel .membership-pricing-grid .pricing-card{padding:19px}}\n#editProfileForm input{width:100%;min-height:46px;padding:12px;border:1px solid #d8deea;border-radius:10px;background:#fff;font:inherit;box-sizing:border-box}#editProfileForm input:focus{outline:0;border-color:#7651e9;box-shadow:0 0 0 3px rgba(118,81,233,.12)}#editProfileForm button{width:100%;max-width:100%}#editProfileMessage{font-size:.9rem}\n/* Dashboard Overview follows the approved Klypza reference layout. */\n#dashboardCard{display:block!important;width:min(900px,calc(100% - 32px))!important;max-width:900px!important;margin:0 auto!important;box-sizing:border-box!important}\n#dashboardCard>.dashboard-welcome{display:none!important}\n#dashboardCard>#emailVerifyNotice{margin:12px 0 18px!important}\n#dashboardCard>.dashboard-side-menu{display:block!important;width:100%!important;margin:0 0 18px!important;position:relative!important;top:auto!important}\n#dashboardCard .account-menu-toggle{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;min-height:54px!important;padding:12px 16px!important;border:1px solid #e7eaf4!important;border-radius:15px!important;background:#fff!important;color:#25345c!important;font:inherit!important;font-weight:700!important;cursor:pointer!important;box-shadow:0 5px 18px rgba(20,34,82,.05)!important}\n#dashboardCard .account-menu-content{display:flex!important;flex-direction:column!important;gap:7px!important;position:relative!important;inset:auto!important;width:100%!important;margin:8px 0 0!important;padding:10px!important;border:1px solid #e7eaf4!important;border-radius:15px!important;background:#fff!important;box-shadow:0 12px 28px rgba(20,34,82,.08)!important}\n#dashboardCard .account-menu-content[hidden]{display:none!important}\n#dashboardCard>.profile-panel,#dashboardCard>#overviewPanel{display:block;position:relative!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;box-sizing:border-box!important}\n#dashboardCard #overviewPanel[hidden],#dashboardCard #profilePanel[hidden],#dashboardCard #plansPanel[hidden]{display:none!important}\n#dashboardCard #overviewPanel>.steps-grid:first-child{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;margin:18px 0 24px!important}\n#dashboardCard #overviewPanel .info-card{min-width:0!important}\n#dashboardCard #video-tool{width:100%!important;max-width:none!important;min-width:0!important;margin:16px auto 0!important}\n#dashboardCard .dashboard-downloader-intro{margin:22px 0 14px!important}\n#dashboardCard #plansPanel .membership-pricing-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}\n@media(max-width:760px){\n #dashboardCard{width:calc(100% - 24px)!important;padding:16px!important}\n #dashboardCard #overviewPanel>.steps-grid:first-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}\n #dashboardCard #overviewPanel>.steps-grid:first-child>.info-card:first-child{grid-column:1/-1!important}\n #dashboardCard #video-tool{padding:22px!important}\n #dashboardCard #plansPanel .membership-pricing-grid{grid-template-columns:1fr!important}\n}\n@media(max-width:480px){\n #dashboardCard{width:calc(100% - 16px)!important;padding:12px!important}\n #dashboardCard #overviewPanel>.steps-grid:first-child{grid-template-columns:1fr!important}\n #dashboardCard #overviewPanel>.steps-grid:first-child>.info-card:first-child{grid-column:auto!important}\n #dashboardCard #video-tool{padding:18px!important}\n}\n/* Approved Klypza dashboard reference: compact menu, quota cards, downloader, recent activity; no ad slots. */\n#dashboardCard{display:block!important;width:min(1280px,calc(100% - 40px))!important;max-width:1280px!important;margin:28px auto 56px!important;padding:24px!important;border:1px solid #e7eaf4!important;border-radius:24px!important;background:#fff!important;box-shadow:0 16px 48px rgba(22,36,82,.06)!important;box-sizing:border-box!important}\n#dashboardCard>.dashboard-welcome{display:none!important}\n#dashboardCard>#emailVerifyNotice{margin:0 0 16px!important}\n#dashboardCard>.dashboard-side-menu{display:block!important;width:100%!important;margin:0 0 18px!important;padding:0!important;border:1px solid #e7eaf4!important;border-radius:16px!important;background:#fff!important;box-shadow:0 5px 18px rgba(25,38,85,.04)!important;position:relative!important;top:auto!important}\n#dashboardCard .account-menu-toggle{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;min-height:54px!important;padding:12px 18px!important;border:0!important;border-radius:15px!important;background:#fff!important;color:#273453!important;font:inherit!important;font-weight:700!important;text-align:left!important;cursor:pointer!important}\n#dashboardCard .account-menu-toggle>i:first-child{color:#7861d8!important}\n#dashboardCard .account-menu-chevron{margin-left:auto!important}\n#dashboardCard .account-menu-content{display:flex!important;flex-direction:column!important;gap:6px!important;margin:0!important;padding:8px!important;border:0!important;border-top:1px solid #edf0f6!important;border-radius:0 0 15px 15px!important;background:#fff!important;box-shadow:none!important}\n#dashboardCard .account-menu-content[hidden]{display:none!important}\n#dashboardCard .profile-tab{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;width:100%!important;min-height:44px!important;padding:10px 14px!important;border:0!important;border-radius:11px!important;background:transparent!important;color:#566178!important;text-align:left!important}\n#dashboardCard .profile-tab.active{background:#edf3ff!important;color:#2865b8!important;box-shadow:none!important}\n#dashboardCard #overviewPanel{display:block!important;width:100%!important;min-width:0!important;margin:0!important}\n#dashboardCard #overviewPanel .steps-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;margin:0 0 26px!important}\n#dashboardCard #overviewPanel .info-card{min-width:0!important;padding:20px!important;border:1px solid #e7eaf4!important;border-radius:18px!important;background:#fff!important;box-shadow:0 7px 22px rgba(22,36,82,.045)!important}\n#dashboardCard #overviewPanel .info-card:first-child{background:linear-gradient(145deg,#f3f2ff,#f8f7ff)!important;border-color:#e9e4fb!important}\n#dashboardCard #overviewPanel .info-card h2{font-family:Manrope,sans-serif!important;color:#151d3b!important}\n#dashboardCard #overviewPanel .info-card p{color:#788196!important;line-height:1.55!important}\n#dashboardCard .dashboard-downloader-intro{margin:24px 0 14px!important}\n#dashboardCard #video-tool{width:100%!important;max-width:none!important;margin:0 0 22px!important}\n#dashboardCard #activityList{margin-top:10px!important}\n#dashboardCard #creditHistory{margin-top:10px!important}\n#dashboardCard .sidebar-account-menu{display:none!important}\n@media(max-width:760px){#dashboardCard{width:calc(100% - 20px)!important;margin:16px auto 36px!important;padding:16px!important;border-radius:20px!important}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important}#dashboardCard #overviewPanel .info-card{padding:13px!important}#dashboardCard #overviewPanel .info-card h2{font-size:1.35rem!important}#dashboardCard #overviewPanel .info-card p{font-size:.82rem!important}}\n@media(max-width:520px){#dashboardCard #overviewPanel .steps-grid{grid-template-columns:1fr!important;gap:10px!important}#dashboardCard #overviewPanel .info-card{padding:17px!important}}\n</style>\n</head>\n<body>\n<header class=\"site-header\">\n  <div class=\"nav-wrap\">\n    <a href=\"/\" class=\"logo\" aria-label=\"Klypza home\"><img class=\"brand-wordmark\" src=\"/brand-wordmark.webp\" alt=\"Klypza\" width=\"150\" height=\"41\"></a>\n    <nav class=\"nav-links\" aria-label=\"Main navigation\">\n      <a href=\"/\" class=\"nav-home\">Home</a>\n      <a href=\"/#features\">Features</a>\n      <a href=\"/plans\">Plans</a>\n      <a href=\"/#reviews\">Reviews</a>\n      <a href=\"/#faq\">Help</a>\n      <a href=\"/login\" class=\"nav-login\">Log in</a>\n      <a href=\"/register\" class=\"nav-cta\">Create Account</a>\n    </nav>\n  </div>\n</header>\n\n<section class=\"hero public-hero\"><div class=\"container public-hero-grid\"><div class=\"public-hero-copy\"><span class=\"eyebrow\"><i class=\"fa-solid fa-cloud-arrow-down\"></i> ⚡ All-in-One Media Downloader</span><h1>Download videos from your favorite platforms <span class=\"accent\">in one place.</span></h1><p class=\"hero-copy\">Klypza helps you download supported public social media videos quickly, safely, and in high quality. Simple, fast, and reliable.</p><div class=\"hero-actions\"><a class=\"hero-primary\" href=\"/register\">Get started free <i class=\"fa-solid fa-arrow-right\"></i></a><a class=\"hero-secondary\" href=\"/plans\">Explore plans</a></div><div class=\"hero-benefits\"><span><i class=\"fa-solid fa-check\"></i> Safe &amp; Secure</span><span><i class=\"fa-solid fa-bolt\"></i> Fast Processing</span><span><i class=\"fa-solid fa-infinity\"></i> Quality options</span></div><div class=\"platform-pills\"><span class=\"platform-pill\"><i class=\"fa-brands fa-tiktok\"></i> TikTok</span><span class=\"platform-pill\"><i class=\"fa-brands fa-instagram\"></i> Instagram</span><span class=\"platform-pill\"><i class=\"fa-brands fa-facebook\"></i> Facebook</span><span class=\"platform-pill\"><i class=\"fa-brands fa-youtube\"></i> YouTube</span><span class=\"platform-pill\"><i class=\"fa-brands fa-pinterest-p\"></i> Pinterest</span></div></div><div class=\"hero-visual\"><div class=\"visual-window\"><div class=\"visual-brand\"><img src=\"/hero-wordmark-v2.svg\" alt=\"Klypza\" width=\"260\" height=\"72\"></div><div class=\"visual-progress\"><span></span></div><div class=\"visual-download\"><i class=\"fa-solid fa-download\"></i></div><p>Your videos. One simple place.</p></div><span class=\"float-platform youtube\"><i class=\"fa-brands fa-youtube\"></i></span><span class=\"float-platform tiktok\"><i class=\"fa-brands fa-tiktok\"></i></span><span class=\"float-platform instagram\"><i class=\"fa-brands fa-instagram\"></i></span><span class=\"float-platform facebook\"><i class=\"fa-brands fa-facebook-f\"></i></span><span class=\"float-platform pinterest\"><i class=\"fa-brands fa-pinterest-p\"></i></span></div></div></section>\n\n<main class=\"public-main\">\n  <div class=\"container\">\n    <section class=\"content-section public-stats\"><div class=\"stat-item\"><i class=\"fa-solid fa-users\"></i><strong id=\"publicUsers\">—</strong><span>Registered members</span></div><div class=\"stat-item\"><i class=\"fa-solid fa-download\"></i><strong id=\"publicDownloads\">—</strong><span>Video links processed</span></div><div class=\"stat-item\"><i class=\"fa-solid fa-layer-group\"></i><strong>Free</strong><span>To get started</span></div><p class=\"stats-note\">Live figures are based on recorded Klypza account and download activity.</p></section>\n<section class=\"content-section public-features\" id=\"features\"><div class=\"section-kicker\">Why Klypza</div><h2>Why Choose Klypza?</h2><p>A complete, simple, and reliable solution for downloading supported social media videos.</p><div class=\"feature-grid\"><article class=\"feature-tile\"><i class=\"fa-solid fa-bolt\"></i><h3>Simple workflow</h3><p>Choose a platform, add a public video link and process it from your account.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-layer-group\"></i><h3>Batch processing</h3><p>Process several links in one batch, with limits matched to your plan.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-file-zipper\"></i><h3>ZIP downloads</h3><p>Group available video files into ZIP archives for convenient saving.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-sliders\"></i><h3>Quality options</h3><p>Choose from video qualities returned by the supported provider.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-shield-halved\"></i><h3>Account controls</h3><p>View your plan, daily usage and recent activity in a private dashboard.</p></article><article class=\"feature-tile\"><i class=\"fa-solid fa-mobile-screen\"></i><h3>Mobile friendly</h3><p>Use Klypza from a phone, tablet, laptop or desktop browser.</p></article></div></section>\n\n<section class=\"content-section public-reviews\" id=\"reviews\"><div class=\"section-kicker\">Community feedback</div><h2>Built around real user experience</h2><p>Verified ratings and testimonials will appear here as genuine user feedback is collected. Klypza does not publish invented review counts or star ratings.</p><div class=\"review-promise\"><i class=\"fa-solid fa-star\"></i><div><strong>Verified reviews only</strong><span>Feedback will be tied to genuine accounts and moderated for spam.</span></div></div></section><section class=\"content-section\" id=\"how-it-works\">\n      <div class=\"section-kicker\">Getting started</div>\n      <h2>How to download a social media video</h2>\n      <p>Klypza is built for supported public video posts. You do not need to paste an entire profile: use the direct link to the video you want to save.</p>\n      <div class=\"steps-grid\">\n        <article class=\"info-card\"><span class=\"step-num\">01</span><h3>Copy a video link</h3><p>Open a public TikTok, Reel, Short, or video Pin and copy its post URL.</p></article>\n        <article class=\"info-card\"><span class=\"step-num\">02</span><h3>Paste and process</h3><p>Choose the matching platform, paste the URL, then select <strong>Find Videos</strong>.</p></article>\n        <article class=\"info-card\"><span class=\"step-num\">03</span><h3>Save your video</h3><p>Download an available video individually or group multiple results into ZIP batches.</p></article>\n      </div>\n      <div class=\"notice\"><strong>Good to know:</strong> Results depend on the source post being public, platform restrictions, and the availability of the configured video provider. Klypza is an independent tool and is not affiliated with the platforms listed here.</div>\n    </section>\n\n    <section class=\"content-section\" id=\"supported-platforms\">\n      <div class=\"section-kicker\">Supported links</div>\n      <h2>One tool for five video platforms</h2>\n      <p>Support is focused on video posts—not photos, profile pages, or private content.</p>\n      <div class=\"platform-info-grid\">\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-tiktok\" aria-hidden=\"true\"></i></span><div><h3>TikTok Video Downloader</h3><p>Process supported public TikTok video links. Availability can vary by post and provider.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-instagram\" aria-hidden=\"true\"></i></span><div><h3>Instagram Reels Downloader</h3><p>Use a direct public Instagram Reel URL. Private or restricted posts are not supported.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-facebook\" aria-hidden=\"true\"></i></span><div><h3>Facebook Reels Downloader</h3><p>Process supported public Facebook Reel links. Some regional or restricted links may fail.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-youtube\" aria-hidden=\"true\"></i></span><div><h3>YouTube Shorts Downloader</h3><p>Paste a supported Shorts URL. Processing depends on the configured provider and applicable restrictions.</p></div></article>\n        <article class=\"platform-info\"><span class=\"platform-symbol\"><i class=\"fa-brands fa-pinterest-p\" aria-hidden=\"true\"></i></span><div><h3>Pinterest Video Downloader</h3><p>Use a direct Pin URL that contains a supported video, not a static image Pin.</p></div></article>\n      </div>\n    </section>\n\n    <section class=\"content-section\" id=\"why-use\">\n      <div class=\"section-kicker\">Designed for simplicity</div>\n      <h2>A clean, practical video-saving workflow</h2>\n      <div class=\"benefit-grid\">\n        <article class=\"info-card\"><h3><i class=\"fa-solid fa-layer-group\" aria-hidden=\"true\" style=\"color:#2878f0;margin-right:7px\"></i>Batch processing</h3><p>Process multiple post links in one session and organize available files into ZIP batches.</p></article>\n        <article class=\"info-card\"><h3><i class=\"fa-solid fa-mobile-screen-button\" aria-hidden=\"true\" style=\"color:#2878f0;margin-right:7px\"></i>Mobile friendly</h3><p>A responsive layout designed to work on phones, tablets, laptops, and desktop browsers.</p></article>\n        <article class=\"info-card\"><h3><i class=\"fa-solid fa-shield-halved\" aria-hidden=\"true\" style=\"color:#2878f0;margin-right:7px\"></i>Use responsibly</h3><p>Save only content you own or have permission to download, and respect creator rights.</p></article>\n      </div>\n    </section>\n\n    <section class=\"content-section faq-list\" id=\"faq\">\n      <div class=\"section-kicker\">Help center</div>\n      <h2>Frequently asked questions</h2>\n      <details><summary>Is Klypza free to use?</summary><p>The website is free to access. Successful video processing depends on the source platform and the availability of the configured download provider.</p></details>\n      <details><summary>Which platforms are supported?</summary><p>The tool is designed for supported public videos from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts, and Pinterest video Pins.</p></details>\n      <details><summary>Why did my video link fail?</summary><p>A link can fail if a post is private, unavailable, restricted, unsupported, or not supported by the configured provider. Try a public video post URL and check that it belongs to one of the supported platforms.</p></details>\n      <details><summary>Can I download profile links or photos?</summary><p>No. Paste a direct video post URL. Profile links and photo downloads are not supported.</p></details>\n      <details><summary>Can I download any video I find?</summary><p>Only download videos you own or have permission to save. Respect copyright, privacy, and the terms of the source platform. Do not use this tool to bypass access controls or download private content.</p></details>\n      <details><summary>Does Klypza belong to TikTok, Instagram, Facebook, YouTube, or Pinterest?</summary><p>No. Klypza is an independent third-party tool and is not affiliated with, endorsed by, or sponsored by those platforms.</p></details>\n    </section>\n  </div>\n</main>\n\n<section id=\"accountPanel\" class=\"container\" style=\"display:none;padding:42px 0 70px\">\n  <div id=\"authCard\" class=\"content-section\" style=\"max-width:560px;margin:0 auto\">\n    <div class=\"section-kicker\">Klypza account</div>\n    <h2 id=\"authTitle\">Create your account</h2>\n    <p id=\"authIntro\">Sign up with your email to manage your credits and downloads.</p>\n    <form id=\"authForm\" style=\"display:grid;gap:14px;margin-top:22px\">\n      <label id=\"nameField\">Name<input id=\"authName\" name=\"name\" autocomplete=\"name\" maxlength=\"60\" required style=\"display:block;width:100%;padding:13px;border:1px solid #d8deea;border-radius:12px;margin-top:6px\"></label>\n      <label>Email address<input id=\"authEmail\" name=\"email\" type=\"email\" autocomplete=\"email\" required maxlength=\"190\" style=\"display:block;width:100%;padding:13px;border:1px solid #d8deea;border-radius:12px;margin-top:6px\"></label>\n      <label>Password<span style=\"display:flex;gap:8px;align-items:center;margin-top:6px\"><input id=\"authPassword\" name=\"password\" type=\"password\" autocomplete=\"new-password\" required minlength=\"10\" maxlength=\"128\" style=\"display:block;flex:1;min-width:0;width:100%;padding:13px;border:1px solid #d8deea;border-radius:12px\"><button id=\"togglePassword\" type=\"button\" aria-label=\"Show password\" aria-pressed=\"false\" style=\"padding:0 13px;min-height:46px;border:1px solid #d8deea;border-radius:12px;background:#fff;color:#33415f\">Show</button></span></label>\n      <button class=\"btn-submit\" id=\"authSubmit\" type=\"submit\">Create account</button>\n      <p id=\"authMessage\" role=\"status\" style=\"font-size:.9rem;color:#566178\"></p>\n    </form>\n    <p id=\"authSwitch\" style=\"margin-top:16px;font-size:.9rem\"></p><div id=\"forgotPanel\" hidden style=\"margin-top:18px;padding:16px;border:1px solid #e4e8f2;border-radius:14px;background:#fbfcff\"><h3>Reset your password</h3><p>Enter your account email. If it exists, we will send a reset link.</p><form id=\"forgotForm\" style=\"display:grid;gap:10px\"><input id=\"forgotEmail\" type=\"email\" required maxlength=\"190\" placeholder=\"Email address\" style=\"width:100%;padding:12px;border:1px solid #d8deea;border-radius:10px\"><button id=\"forgotSubmit\" class=\"btn-download\" type=\"submit\">Send reset link</button><p id=\"forgotMessage\" role=\"status\"></p></form></div>\n  </div>\n  <div id=\"dashboardCard\" class=\"content-section\" style=\"display:none;max-width:900px;margin:0 auto\">\n    <div id=\"emailVerifyNotice\" class=\"notice\" hidden style=\"margin-top:20px;background:#fff7e4;border-color:#f2dfab;color:#855700\"><strong>Verify your email to unlock downloads.</strong><p style=\"margin:6px 0 12px\">We sent a verification link to <span id=\"verifyEmailAddress\"></span>. The link expires in 30 minutes. You will receive 10 free credits after verification.</p><button id=\"resendVerifyButton\" type=\"button\" class=\"btn-download\">Resend verification email</button><span id=\"resendVerifyMessage\" role=\"status\" style=\"display:block;margin-top:8px\"></span></div>\n    <div class=\"dashboard-side-menu\"><button type=\"button\" id=\"accountMenuToggle\" class=\"account-menu-toggle\" aria-expanded=\"false\" aria-controls=\"accountMenuContent\"><i class=\"fa-solid fa-gauge-high\"></i><span>Menu</span><i class=\"fa-solid fa-chevron-down account-menu-chevron\"></i></button><nav id=\"accountMenuContent\" class=\"profile-tabs account-menu-content\" aria-label=\"Menu sections\" hidden><button type=\"button\" class=\"profile-tab active\" data-panel=\"overview\" onclick=\"window.klypzaShowPanel('overview')\"><i class=\"fa-solid fa-gauge-high\"></i> Overview</button><button type=\"button\" class=\"profile-tab\" data-panel=\"profile\" onclick=\"window.klypzaShowPanel('profile')\"><i class=\"fa-solid fa-user\"></i> My Profile</button><button type=\"button\" class=\"profile-tab\" data-panel=\"plans\" onclick=\"window.klypzaShowPanel('plans')\"><i class=\"fa-solid fa-credit-card\"></i> Plans &amp; Upgrade</button><button type=\"button\" id=\"logoutButton\" class=\"profile-tab account-logout-nav\"><i class=\"fa-solid fa-arrow-right-from-bracket\"></i> Log out</button></nav></div>\n    <div id=\"profilePanel\" class=\"profile-panel\" hidden><div class=\"section-kicker\">Personal information</div><h2>My profile</h2><div class=\"profile-identity\" id=\"profileIdentityCard\"><div class=\"profile-avatar\" id=\"profileAvatar\" aria-hidden=\"true\">K</div><div class=\"profile-identity-copy\"><strong id=\"profileIdentityName\">Klypza member</strong><span id=\"profileIdentityEmail\">Account details</span></div><span class=\"profile-identity-badge\"><i class=\"fa-solid fa-shield-halved\"></i> Account</span></div><form id=\"editProfileForm\" class=\"profile-form\" style=\"width:100%;max-width:100%;margin:18px 0 22px;padding:18px;border:1px solid #e7eaf2;border-radius:14px;background:#fbfcff\"><div><h3 style=\"margin:0 0 5px\">Edit profile</h3><p style=\"margin:0;color:#778196;font-size:.92rem\">Update the name shown on your Klypza account. Your email address stays unchanged.</p></div><label for=\"editProfileName\">Display name<input id=\"editProfileName\" name=\"name\" type=\"text\" minlength=\"2\" maxlength=\"60\" autocomplete=\"name\" required placeholder=\"Enter your name\"></label><button class=\"btn-download\" id=\"saveProfileButton\" type=\"submit\">Save changes</button><p id=\"editProfileMessage\" role=\"status\" aria-live=\"polite\" style=\"margin:0\"></p></form><div class=\"profile-details\"><div><span>Name</span><strong id=\"profileName\">—</strong></div><div><span>Email address</span><strong id=\"profileEmail\">—</strong></div><div><span>Customer level</span><strong id=\"profileLevel\">Free</strong></div><div><span>Account status</span><strong id=\"profileStatus\">—</strong></div><div><span>Member since</span><strong id=\"profileJoined\">—</strong></div></div><div class=\"profile-security\"><h3>Change password</h3><p>Use your current password to set a new one. Passwords must contain 10–128 characters.</p><form id=\"changePasswordForm\" class=\"profile-form\"><label>Current password<span class=\"password-input-row\"><input id=\"currentPassword\" type=\"password\" autocomplete=\"current-password\" required><button type=\"button\" class=\"password-toggle\" data-toggle-password=\"currentPassword\" aria-pressed=\"false\">Show</button></span></label><label>New password<span class=\"password-input-row\"><input id=\"newPassword\" type=\"password\" minlength=\"10\" maxlength=\"128\" autocomplete=\"new-password\" required><button type=\"button\" class=\"password-toggle\" data-toggle-password=\"newPassword\" aria-pressed=\"false\">Show</button></span></label><label>Confirm new password<span class=\"password-input-row\"><input id=\"confirmPassword\" type=\"password\" minlength=\"10\" maxlength=\"128\" autocomplete=\"new-password\" required><button type=\"button\" class=\"password-toggle\" data-toggle-password=\"confirmPassword\" aria-pressed=\"false\">Show</button></span></label><button class=\"btn-download\" id=\"changePasswordButton\" type=\"submit\">Update password</button><p id=\"changePasswordMessage\" role=\"status\"></p></form></div></div>\n    <div id=\"plansPanel\" class=\"profile-panel\" hidden><div class=\"section-kicker\">Membership</div><h2>Plans &amp; subscription</h2><div class=\"membership-grid\"><div><span>Current plan</span><strong id=\"plansCurrentLevel\">Free</strong></div><div><span>Subscription status</span><strong id=\"membershipStatus\">No paid subscription</strong></div><div><span>Daily allowance</span><strong id=\"membershipDaily\">10 videos</strong></div><div><span>Maximum batch</span><strong id=\"membershipBatch\">5 videos</strong></div><div><span>Next renewal / end date</span><strong id=\"membershipEnd\">Not applicable</strong></div></div><div class=\"profile-plan-actions\"><button type=\"button\" class=\"btn-download\" id=\"billingPortalButton\" data-billing-action=\"overview\" hidden>Open billing portal</button><button type=\"button\" class=\"btn-download\" id=\"updatePaymentMethodButton\" data-billing-action=\"payment_method\" hidden>Update payment method</button><button type=\"button\" class=\"btn-download\" id=\"cancelSubscriptionButton\" data-billing-action=\"cancel\" hidden>Cancel subscription</button><p id=\"membershipNotice\">Your subscription status is synchronized with Paddle. Choose a plan below to upgrade.</p></div><div class=\"membership-available\"><div class=\"section-kicker\">Available plans</div><h3>Choose the plan that fits your needs</h3><p class=\"membership-pricing-note\">Weekly $1/week, Standard $5.99/month and Premium $9.99/month. Checkout activates only after the matching Paddle price is configured.</p><div class=\"membership-pricing-grid\"><article class=\"info-card pricing-card\"><span class=\"badge\">Weekly plan</span><h3>Weekly</h3><div class=\"plan-price\">$1 <small>/ week</small></div><p class=\"plan-tag\">Flexible weekly access</p><ul><li>5 videos per batch</li><li>25 videos per day</li><li>ZIP download</li><li>Basic quality options</li></ul><button class=\"btn-download\" type=\"button\" data-paddle-plan=\"weekly\">Choose Weekly</button></article><article class=\"info-card pricing-card\"><span class=\"badge\">Monthly plan</span><h3>Standard</h3><div class=\"plan-price\">$5.99 <small>/ month</small></div><p class=\"plan-tag\">Monthly subscription</p><ul><li>15 videos per batch</li><li>60 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Faster processing queue</li></ul><button class=\"btn-download\" type=\"button\" data-paddle-plan=\"standard\">Choose Standard</button></article><article class=\"info-card pricing-card premium-card\"><span class=\"badge\">Monthly plan</span><h3>Premium</h3><div class=\"plan-price\">$9.99 <small>/ month</small></div><p class=\"plan-tag\">Monthly subscription</p><ul><li>25 videos per batch</li><li>100 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Priority processing queue</li></ul><button class=\"btn-download\" type=\"button\" data-paddle-plan=\"premium\">Choose Premium</button></article></div><p class=\"notice\">Your subscription is activated only after Klypza verifies a completed payment notification from Paddle. Standard is $5.99/month and Premium is $9.99/month.</p></div></div>\n    <div id=\"overviewPanel\">\n    <div class=\"steps-grid\" style=\"margin-top:24px\">\n      <article class=\"info-card\"><div class=\"section-kicker\">Daily quota remaining</div><h2 id=\"dashCredits\" style=\"font-size:2.2rem;margin:4px 0\">—</h2><p id=\"dashQuotaText\">Daily downloads remaining.</p></article>\n      <article class=\"info-card\"><div class=\"section-kicker\">Current plan</div><h2 id=\"dashPlan\" style=\"font-size:1.7rem;margin:4px 0\">Free</h2><p id=\"dashSubStatus\">No active paid subscription.</p><p id=\"dashBatchText\">Batch limit: 5 videos</p></article>\n      <article class=\"info-card\"><div class=\"section-kicker\">Account</div><h2 style=\"font-size:1.7rem;margin:4px 0\">Active</h2><p>Your account and credit balance are stored securely.</p></article>\n    </div>\n    <div id=\"trialNotice\" class=\"notice\" role=\"status\" hidden style=\"margin:18px 0;padding:14px 18px;border:1px solid #d9e3f5;border-radius:14px;background:#f4f7ff;color:#24426f;font-weight:600\"><span id=\"trialNoticeText\"></span> <a href=\"/plans\" style=\"margin-left:8px;font-weight:800;color:#245fc5\">View plans</a></div>\n    <div class=\"dashboard-downloader-intro\"><div class=\"section-kicker\">Video downloader</div><h2 style=\"font-size:1.5rem\">Download your videos</h2><p>Choose a platform and paste public video links. Your plan limits are applied automatically.</p></div>\n    <section class=\"tool-card\" id=\"video-tool\" aria-labelledby=\"tool-title\">\n      <div class=\"tool-heading\">\n        <span class=\"mini-icon\"><i class=\"fa-solid fa-cloud-arrow-down\" aria-hidden=\"true\"></i></span>\n        <h2 id=\"tool-title\">Choose your platform</h2>\n        <p>Paste one public video link per line. Your plan limits are applied automatically.</p>\n      </div>\n      <div id=\"configBanner\" class=\"banner warn\" role=\"status\" hidden></div>\n      <div class=\"platform-grid\" id=\"platformGrid\" role=\"group\" aria-label=\"Choose a video platform\"></div>\n      <label class=\"field-label\" for=\"profileUrl\">Video URLs <span style=\"font-weight:500;color:#64708a\">(one link per line)</span></label>\n      <textarea id=\"profileUrl\" class=\"input-field\" rows=\"4\" spellcheck=\"false\" autocapitalize=\"off\" autocomplete=\"off\" inputmode=\"url\" aria-describedby=\"linkHelp\" placeholder=\"https://www.tiktok.com/@username/video/1234567890\"></textarea>\n      <div class=\"input-hint\" id=\"linkHelp\">\n        <span id=\"linkCount\" aria-live=\"polite\">0 links</span>\n        <span>Use public video post links, not profile URLs.</span>\n      </div>\n      <div class=\"options-row\">\n        <label class=\"check\" for=\"noWatermark\">\n          <input type=\"checkbox\" id=\"noWatermark\" checked>\n          <span><b>Prefer watermark-free video</b><br><span style=\"color:#64708a;font-size:.82rem\">When a clean version is available</span></span>\n        </label>\n        <label class=\"select-wrap\" for=\"batchSize\">\n          <span>Videos per ZIP batch</span>\n          <select id=\"batchSize\" aria-label=\"Videos per ZIP batch\">\n            <option value=\"5\" selected>5</option><option value=\"10\" disabled>10 videos 🔒 — Standard</option><option value=\"15\" disabled>15 videos 🔒 — Standard</option><option value=\"20\" disabled>20 videos 🔒 — Premium</option><option value=\"25\" disabled>25 videos 🔒 — Premium</option>\n          </select>\n        </label>\n      </div>\n      <button type=\"button\" class=\"btn-submit\" id=\"btnSubmit\"><i class=\"fa-solid fa-magnifying-glass\" aria-hidden=\"true\"></i> <span id=\"btnSubmitText\">Find Videos</span></button>\n      <div id=\"statusContainer\" class=\"status-container\" hidden>\n        <h2 id=\"statusText\" aria-live=\"polite\">Processing…</h2>\n        <div class=\"progress-bar\" role=\"progressbar\" aria-label=\"Video processing progress\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\" id=\"progressBar\"><div id=\"progressFill\" class=\"progress-fill\"></div></div>\n        <p id=\"statusSub\" class=\"status-sub\"></p>\n        <div id=\"kloterBar\" class=\"kloter-bar\"></div>\n        <div id=\"batchResults\"></div>\n      </div>\n      <p class=\"legal\">Only save videos you own or have permission to download. Copyright remains with the original creator, and each platform’s terms apply.</p>\n    </section>\n    <div style=\"display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:28px 0 12px\"><h2 style=\"font-size:1.3rem;margin:0\">Recent activity</h2><a href=\"/plans\" class=\"btn-download\">View plans</a></div>\n    <div id=\"activityList\" style=\"display:grid;gap:9px\"><p>No activity yet.</p></div>\n    <div style=\"margin-top:28px\"><h2 style=\"font-size:1.3rem\">Credit history</h2><div id=\"creditHistory\" style=\"display:grid;gap:8px;margin-top:12px\"></div></div>\n    </div>\n  </div>\n  <div id=\"plansCard\" class=\"content-section\" style=\"display:none;max-width:1000px;margin:0 auto\">\n    <div class=\"section-kicker\">Plans & subscriptions</div>\n    <h2>Choose the Klypza plan that fits your workflow</h2>\n    <p>Weekly is $1/week, Standard is $5.99/month and Premium is $9.99/month. Secure checkout is enabled only after Paddle credentials and matching price IDs are configured.</p>\n    <div class=\"steps-grid pricing-grid\" style=\"margin-top:22px\">\n      <article class=\"info-card pricing-card\"><span class=\"badge\">Weekly plan</span><h3>Weekly</h3><div class=\"plan-price\">$1 <small>/ week</small></div><p class=\"plan-tag\">Flexible weekly access</p><ul><li>5 videos per batch</li><li>25 videos per day</li><li>ZIP download</li><li>Basic quality options</li></ul><button class=\"btn-download\" type=\"button\" data-paddle-plan=\"weekly\">Choose Weekly</button></article><article class=\"info-card pricing-card\"><span class=\"badge\">Monthly plan</span><h3>Standard</h3><div class=\"plan-price\">$5.99 <small>/ month</small></div><p class=\"plan-tag\">Monthly subscription</p><ul><li>15 videos per batch</li><li>60 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Faster processing queue</li></ul><button class=\"btn-download\" type=\"button\" data-paddle-plan=\"standard\">Choose Standard</button></article>\n      <article class=\"info-card pricing-card premium-card\"><span class=\"badge\">Monthly plan</span><h3>Premium</h3><div class=\"plan-price\">$9.99 <small>/ month</small></div><p class=\"plan-tag\">Monthly subscription</p><ul><li>25 videos per batch</li><li>100 videos per day</li><li>ZIP download</li><li>More quality options</li><li>Priority processing queue</li></ul><button class=\"btn-download\" type=\"button\" data-paddle-plan=\"premium\">Choose Premium</button></article>\n    </div>\n    <p class=\"notice\">Launch pricing: Weekly $1/week, Standard $5.99/month and Premium $9.99/month. Your plan is activated only after Klypza verifies a completed payment notification from Paddle.</p>\n  </div>\n</section>\n\n<footer class=\"site-footer\">\n  <div class=\"footer-inner\">\n    <div class=\"footer-brand\">\n      <a href=\"/\" class=\"logo\" aria-label=\"Klypza home\"><img class=\"footer-wordmark\" src=\"/hero-wordmark-v2.svg\" alt=\"Klypza — download video\" width=\"240\" height=\"72\"></a>\n      <p>A simple video link tool for supported public posts. Built for clarity, mobile usability, and responsible use.</p>\n    </div>\n    <nav class=\"footer-links\" aria-label=\"Legal and information\">\n      <a href=\"/about\">About</a>\n      <a href=\"/privacy-policy\">Privacy Policy</a>\n      <a href=\"/terms\">Terms of Use</a>\n      <a href=\"/copyright\">Copyright Policy</a>\n      <a href=\"/contact\">Contact</a>\n    </nav>\n  </div>\n  <div class=\"copyright\">© 2026 Klypza. All rights reserved. All third-party names and marks belong to their respective owners.</div>\n</footer>\n\n<script src=\"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js\"></script>\n<script>\n(function () {\n  'use strict';\n\n  var MAX_LINKS = 5;\n  var PLATFORMS = [\n    { name: 'TikTok', icon: 'fa-brands fa-tiktok', label: 'TikTok', hosts: ['tiktok.com'], example: 'https://www.tiktok.com/@username/video/1234567890' },\n    { name: 'Instagram', icon: 'fa-brands fa-instagram', label: 'Instagram Reels', hosts: ['instagram.com', 'instagr.am'], example: 'https://www.instagram.com/reel/AbCdEfGhIjK/' },\n    { name: 'Facebook', icon: 'fa-brands fa-facebook', label: 'Facebook Reels', hosts: ['facebook.com', 'fb.watch', 'fb.com'], example: 'https://www.facebook.com/reel/1234567890' },\n    { name: 'YouTube', icon: 'fa-brands fa-youtube', label: 'YouTube Shorts', hosts: ['youtube.com', 'youtu.be'], example: 'https://www.youtube.com/shorts/AbCdEfGhIjK' },\n    { name: 'Pinterest', icon: 'fa-brands fa-pinterest', label: 'Pinterest', hosts: ['pinterest.com', 'pin.it'], example: 'https://www.pinterest.com/pin/1234567890/' }\n  ];\n\n  var state = { platform: 'TikTok', busy: false, results: [], configured: true, maxBatch: 5 };\n\n  var $ = function (id) { return document.getElementById(id); };\n  var els = {\n    input: $('profileUrl'), count: $('linkCount'), submit: $('btnSubmit'), submitText: $('btnSubmitText'),\n    status: $('statusContainer'), statusText: $('statusText'), statusSub: $('statusSub'),\n    fill: $('progressFill'), bar: $('progressBar'), results: $('batchResults'), kloter: $('kloterBar'),\n    banner: $('configBanner'), noWm: $('noWatermark'), size: $('batchSize'), grid: $('platformGrid')\n  };\n\n  function el(tag, props, children) {\n    var n = document.createElement(tag);\n    props = props || {};\n    Object.keys(props).forEach(function (k) {\n      if (k === 'class') n.className = props[k];\n      else if (k === 'text') n.textContent = props[k];\n      else if (k === 'on') Object.keys(props.on).forEach(function (ev) { n.addEventListener(ev, props.on[ev]); });\n      else n.setAttribute(k, props[k]);\n    });\n    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });\n    return n;\n  }\n  function icon(cls) { return el('i', { 'class': cls, 'aria-hidden': 'true' }); }\n\n  // ---------- link ----------\n  function hostPlatform(host) {\n    host = host.toLowerCase();\n    for (var i = 0; i < PLATFORMS.length; i++) {\n      if (PLATFORMS[i].hosts.some(function (d) { return host === d || host.slice(-d.length - 1) === '.' + d; })) return PLATFORMS[i].name;\n    }\n    return null;\n  }\n  // Klypza concatenated URL detection: split even when clipboard joins URLs directly.\n  function parseLinks(text) {\n    var seen = {}, out = [];\n    String(text || '').split(/(?=https?:\\/\\/)/i).join('\\n').split(/[\\s,]+/).forEach(function (t) {\n      t = t.trim().replace(/[)\\]}>.;]+$/, '');\n      if (t && !seen[t]) { seen[t] = 1; out.push(t); }\n    });\n    return out;\n  }\n  function updateCount() {\n    var n = parseLinks(els.input.value).length;\n    var selected = Number(els.size && els.size.value || 5);\n    els.count.textContent = n + ' link' + (n === 1 ? '' : 's') + (n > selected ? ' (' + selected + ' per batch)' : '');\n  }\n  window.klypzaSetPlanLimits = function (plan) {\n    var tier = String(plan || 'free').toLowerCase();\n    var unlocked = tier === 'premium' ? [5,10,15,20,25] : tier === 'standard' ? [5,10,15] : [5];\n    state.plan = tier; state.maxBatch = unlocked[unlocked.length - 1]; MAX_LINKS = state.maxBatch;\n    if (els.size) { var current=Number(els.size.value||5); els.size.innerHTML=''; [5,10,15,20,25].forEach(function(v){var open=unlocked.indexOf(v)!==-1;var suffix=v<=5?'':(v<=15?' — Standard':' — Premium');var opt=el('option',{value:String(v),text:String(v)+' videos'+(open?'':' 🔒'+suffix)});if(!open)opt.disabled=true;els.size.appendChild(opt);});els.size.value=unlocked.indexOf(current)!==-1?String(current):'5'; }\n    updateCount();\n  };\n\n  // Resolve the signed-in plan before allowing larger batch sizes. Default options remain locked until this succeeds.\n  fetch('/api/account', { cache: 'no-store', credentials: 'same-origin' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){\n    if(!d || !d.user) return;\n    var sub=d.subscription && String(d.subscription.status||'').toLowerCase()==='active' ? d.subscription : null;\n    var plan=String((sub&&sub.plan)||d.plan||d.user.plan||'free').toLowerCase();\n    var max=Number(d.quota&&d.quota.maxBatch);\n    if(max>=25) plan='premium'; else if(max>=15 && plan==='free') plan='standard';\n    if(['free','weekly','standard','premium'].indexOf(plan)<0) plan='free';\n    window.klypzaSetPlanLimits(plan);\n  }).catch(function(){});\n\n  // ---------- mode & platform ----------\n  function setPlatform(name) {\n    state.platform = name;\n    var allButton = $('plat-All');\n    if (allButton) {\n      allButton.classList.toggle('active', name === 'All');\n      allButton.setAttribute('aria-pressed', String(name === 'All'));\n    }\n    PLATFORMS.forEach(function (p) {\n      var b = $('plat-' + p.name);\n      b.classList.toggle('active', p.name === name);\n      b.setAttribute('aria-pressed', String(p.name === name));\n      if (p.name === name) els.input.placeholder = p.example;\n    });\n    if (name === 'All') els.input.placeholder = 'Paste video links from any supported platform, one per line';\n  }\n  els.grid.appendChild(el('button', { type: 'button', id: 'plat-All', 'class': 'platform-btn', 'aria-pressed': 'false', on: { click: function () { setPlatform('All'); } } },\n    [icon('fa-solid fa-layer-group'), 'All platforms']));\n  PLATFORMS.forEach(function (p) {\n    els.grid.appendChild(el('button', { type: 'button', id: 'plat-' + p.name, 'class': 'platform-btn', 'aria-pressed': 'false', on: { click: function () { setPlatform(p.name); } } },\n      [icon(p.icon), p.label]));\n  });\n  setPlatform('All');\n  els.noWm.addEventListener('change', renderResults);\n  els.size.addEventListener('change', renderResults);\n  // Klypza multiline paste formatter: place each pasted URL on its own line.\n  els.input.addEventListener('input', function () {\n    // Normalize pasted or inserted concatenated URLs into actual textarea lines.\n    var normalized = String(this.value || '').replace(/\\s*(https?:\\/\\/)/gi, '\\n$1').replace(/^\\s+|\\s+$/g, '').replace(/\\n+/g, '\\n');\n    if (normalized !== this.value) { var caret = this.selectionStart; this.value = normalized; this.setSelectionRange(Math.min(caret + 1, normalized.length), Math.min(caret + 1, normalized.length)); }\n    updateCount();\n    this.style.height = 'auto';\n    this.style.height = Math.min(Math.max(this.scrollHeight, 142), 360) + 'px';\n  });\n  els.input.addEventListener('paste', function (event) {\n    var clip = event.clipboardData || window.clipboardData;\n    if (!clip) return;\n    var pasted = String(clip.getData('text') || '').trim();\n    if (!pasted) return;\n    event.preventDefault();\n    var urls = pasted.split(/(?=https?:\\/\\/)/i).map(function (v) { return v.trim(); }).filter(Boolean);\n    if (!urls.length) return;\n    var start = this.selectionStart, finish = this.selectionEnd;\n    var before = this.value.slice(0, start), after = this.value.slice(finish);\n    var prefix = before && !/[\\r\\n]$/.test(before) ? '\\n' : '';\n    var suffix = after && !/^[\\r\\n]/.test(after) ? '\\n' : '';\n    var inserted = prefix + urls.join('\\n') + suffix;\n    this.setRangeText(inserted, start, finish, 'end');\n    this.dispatchEvent(new Event('input', { bubbles: true }));\n  });\n  els.submit.addEventListener('click', startScanning);\n\n  // ---------- status ----------\n  function setProgress(pct, isError) {\n    els.fill.style.width = pct + '%';\n    els.fill.classList.toggle('error', !!isError);\n    els.bar.setAttribute('aria-valuenow', String(Math.round(pct)));\n  }\n  function showStatus(title, sub, pct, isError) {\n    els.status.hidden = false;\n    els.statusText.textContent = title;\n    els.statusSub.textContent = sub || '';\n    if (pct != null) setProgress(pct, isError);\n  }\n\n  // ---------- konfigurasi server ----------\n  function checkHealth() {\n    if (location.protocol === 'file:') {\n      state.configured = false;\n      els.banner.hidden = false;\n      els.banner.textContent = 'This page was opened as a local file. Open the hosted website to use video downloads.';\n      return;\n    }\n    fetch('/api/health', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {\n      if (d && d.configured === false) {\n        state.configured = false;\n        els.banner.hidden = false;\n        els.banner.textContent = 'The video service is not available yet. Please try again later.';\n      }\n    }).catch(function () {\n      state.configured = false;\n      els.banner.hidden = false;\n      els.banner.textContent = 'The video service could not be reached. Please try again later.';\n    });\n  }\n\n  // ---------- proses ----------\n  // SaveAPI Free permits 10 requests/minute. Space requests so a 25-link batch\n  // does not fire all requests in the same rate-limit window.\n  var lastSaveApiRequestAt = 0;\n  var MIN_REQUEST_INTERVAL_MS = 6200;\n  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }\n  async function waitForRequestSlot() {\n    var wait = lastSaveApiRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();\n    if (wait > 0) await delay(wait);\n  }\n\n  async function fetchOne(link, batchId) {\n    var maxRateLimitRetries = 2;\n    for (var attempt = 0; attempt <= maxRateLimitRetries; attempt++) {\n      var ctrl = new AbortController();\n      var timer = setTimeout(function () { ctrl.abort(); }, 40000);\n      try {\n        await waitForRequestSlot();\n        lastSaveApiRequestAt = Date.now();\n        var r = await fetch('/api/download?url=' + encodeURIComponent(link) + '&batch_id=' + encodeURIComponent(batchId), { signal: ctrl.signal });\n        var data = null;\n        try { data = await r.json(); } catch (e) { /* bukan JSON */ }\n        var code = data && data.error ? String(data.error).toLowerCase() : '';\n        if (r.status === 429 && code === 'rate_limited' && attempt < maxRateLimitRetries) {\n          var retryAfter = Number(r.headers.get('Retry-After') || 0);\n          var waitMs = Math.max(MIN_REQUEST_INTERVAL_MS, Math.min(60000, retryAfter * 1000 || MIN_REQUEST_INTERVAL_MS));\n          await delay(waitMs);\n          continue;\n        }\n        if (!r.ok || !data) {\n          if (r.status === 429 && code === 'rate_limited') {\n            throw new Error('SaveAPI is still rate-limiting requests after several retries. Wait a minute, then retry the remaining links.');\n          }\n          throw new Error((data && data.message) || 'The server returned an unexpected response (status ' + r.status + ').');\n        }\n        return data;\n      } catch (e) {\n        if (e.name === 'AbortError') throw new Error('The request timed out. Please try again.');\n        if (e instanceof TypeError) throw new Error('Could not connect to the server. Check your internet connection.');\n        throw e;\n      } finally { clearTimeout(timer); }\n    }\n    throw new Error('SaveAPI rate limit reached. Please wait and try again.');\n  }\n\n  async function startScanning() {\n    if (state.busy) return;\n    var all = parseLinks(els.input.value);\n    if (!all.length) {\n      showStatus('No links added', 'Paste at least one video post URL.', 0, true);\n      els.input.focus();\n      return;\n    }\n    var batchInfo;\n    try {\n      var requestedBatchSize=Number(els.size&&els.size.value||5);\n      var batchResponse = await fetch('/api/batch/start', { method: 'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({batchSize:requestedBatchSize}) });\n      batchInfo = await batchResponse.json();\n      if (!batchResponse.ok) throw new Error(batchInfo.message || 'Please log in before downloading.');\n    } catch (e) {\n      showStatus('Account required', e.message || 'Please log in to continue.', 0, true);\n      return;\n    }\n    state.maxBatch = Number(batchInfo.maxBatch || 5);\n    MAX_LINKS = state.maxBatch;\n    var links = all.slice(0, MAX_LINKS);\n    updateCount();\n    state.busy = true;\n    state.results = [];\n    els.submit.disabled = true;\n    els.submitText.textContent = 'Processing…';\n    els.kloter.textContent = '';\n    els.results.textContent = '';\n    showStatus('Processing ' + links.length + ' link' + (links.length === 1 ? '' : 's') + '…', 'Contacting the video service.', 3, false);\n\n    var ok = 0;\n    for (var i = 0; i < links.length; i++) {\n      var link = links[i];\n      showStatus('Processing link ' + (i + 1) + ' of ' + links.length, link, 3 + (i / links.length) * 97, false);\n      var entry = { link: link };\n      var valid = true;\n      try { valid = /^https?:$/.test(new URL(link).protocol); } catch (e) { valid = false; }\n      if (!valid) {\n        entry.error = 'Invalid URL. Use a link that starts with https://.';\n      } else {\n        var detected = null;\n        try { detected = hostPlatform(new URL(link).hostname); } catch (e) { detected = null; }\n        if (!detected) {\n          entry.error = 'Unsupported platform. Use a direct video URL from one of the supported platforms.';\n        } else if (state.platform !== 'All' && detected !== state.platform) {\n          entry.error = 'Platform mismatch: this is a ' + detected + ' link, but ' + state.platform + ' is selected. Select the matching platform or choose All platforms.';\n        } else {\n          try {\n            entry.data = await fetchOne(link, batchInfo.batchId);\n            if (entry.data.platform && entry.data.platform !== detected) {\n              entry.error = 'The provider returned a different platform than expected. This link was not added to the download batch.';\n              delete entry.data;\n            } else {\n              ok++;\n            }\n          } catch (e) { entry.error = e.message; }\n        }\n      }\n      state.results.push(entry);\n      renderResults();\n    }\n    var failed = links.length - ok;\n    var extra = all.length > MAX_LINKS ? ' ' + (all.length - MAX_LINKS) + ' additional links ignored (your plan maximum is ' + MAX_LINKS + ').' : '';\n    if (ok === 0) showStatus('No videos could be processed', 'Check the message shown for each link below.' + extra, 100, true);\n    else showStatus('Done: ' + ok + ' link' + (ok === 1 ? '' : 's') + ' processed' + (failed ? ', ' + failed + ' failed' : ''), 'Download individual videos or ZIP batches.' + extra, 100, false);\n    state.busy = false;\n    els.submit.disabled = false;\n    els.submitText.textContent = 'Process Links';\n  }\n\n  // ---------- tampilan hasil ----------\n  function visibleItems(data) {\n    var list = data.items.filter(function (it) { return it.type === 'video'; });\n    var note = null;\n    if (els.noWm.checked && list.length) {\n      var clean = list.filter(function (it) { return !it.watermark; });\n      if (clean.length) list = clean;\n      else note = 'Only a watermarked version is available from the source.';\n    }\n    return { list: list, note: note };\n  }\n\n  function renderResults() {\n    els.results.textContent = '';\n    els.kloter.textContent = '';\n    var flat = [];\n    state.results.forEach(function (entry) {\n      var card = el('div', { 'class': 'batch-card' });\n      if (entry.error) {\n        card.appendChild(el('div', { 'class': 'link-title', text: entry.link }));\n        card.appendChild(el('div', { 'class': 'error-row', text: entry.error }));\n        els.results.appendChild(card);\n        return;\n      }\n      var d = entry.data;\n      var vis = visibleItems(d);\n      var head = el('div', { 'class': 'batch-header' }, [\n        el('div', {}, [\n          el('div', { 'class': 'link-title', text: d.title || 'Video from ' + d.platform }),\n          el('div', { 'class': 'muted', text: d.platform + (d.author ? ' · ' + d.author : '') })\n        ])\n      ]);\n      card.appendChild(head);\n      if (!vis.list.length) {\n        var row = el('div', { 'class': 'note-row', text: 'No supported video was found in this post.' });\n        card.appendChild(row);\n      } else {\n        if (vis.note) card.appendChild(el('div', { 'class': 'note-row', text: vis.note }));\n        var listEl = el('div', { 'class': 'item-list' });\n        vis.list.forEach(function (it) {\n          flat.push({ it: it, title: d.title, source: entry.link });\n          listEl.appendChild(itemRow(it));\n        });\n        card.appendChild(listEl);\n      }\n      els.results.appendChild(card);\n    });\n    renderKloters(flat);\n  }\n\n  // ---------- task manager ----------\n  var taskRecords = {};\n  var taskPanel = null;\n  function ensureTaskPanel(){\n    if(taskPanel)return taskPanel;\n    taskPanel=el('section',{'class':'batch-card',style:'margin:16px 0;padding:16px;border:1px solid #dfe6f2;border-radius:16px;background:#fbfcff'},[el('div',{'class':'batch-header'},[el('strong',{text:'Download task manager'}),el('span',{'class':'badge',text:'Live status'})]),el('p',{'class':'muted',text:'Ready tasks do not use quota. Quota is recorded by the secure file endpoint when a download starts.'}),el('div',{id:'klypzaTaskList',style:'display:grid;gap:9px'})]);\n    var anchor=els.kloter.parentNode; if(anchor)anchor.insertBefore(taskPanel,els.kloter); return taskPanel;\n  }\n  function setTaskStatus(task,status,detail){\n    task.status=status;task.detail=detail||'';if(task.statusNode)task.statusNode.textContent=status+(detail?' · '+detail:'');\n    if(task.cancelButton){var terminal=status==='Completed'||status==='Cancelled'||status==='Failed';task.cancelButton.disabled=terminal;task.cancelButton.hidden=terminal;task.cancelButton.textContent=status==='Downloading'?'Stop':'Cancel';}\n  }\n  function registerTask(it){\n    if(!it.completionId)return null;\n    if(taskRecords[it.completionId])return taskRecords[it.completionId];\n    ensureTaskPanel();var row=el('div',{'class':'item-row',style:'display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #e8edf5;border-radius:12px;background:#fff'});\n    var title=el('strong',{text:('Video '+(it.quality||'Standard')+' · '+(it.ext||'mp4').toUpperCase()),style:'flex:1;min-width:0'});\n    var status=el('span',{'class':'muted',text:'Ready',style:'font-size:.82rem'});\n    var cancel=el('button',{type:'button','class':'btn-download',style:'background:#f1f3f8;color:#35415d;border:1px solid #e0e5ee;padding:8px 11px'},['Cancel']);\n    var task={id:it.completionId,item:it,status:'Ready',statusNode:status,cancelButton:cancel,controller:null};taskRecords[task.id]=task;\n    cancel.addEventListener('click',async function(){\n      if(task.status==='Ready'){cancel.disabled=true;try{var r=await fetch('/api/download/cancel',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({id:task.id})});var d=await r.json();if(!r.ok)throw new Error(d.message||'The task can no longer be cancelled.');setTaskStatus(task,'Cancelled','No quota used');}catch(e){cancel.disabled=false;status.textContent=task.status+' · '+(e.message||'Cancel failed');}}\n      else if(task.status==='Downloading'&&task.controller){task.controller.abort();setTaskStatus(task,'Stopping','The server may already have recorded usage');}\n    });\n    row.append(title,status,cancel);$('klypzaTaskList').appendChild(row);return task;\n  }\n  async function fetchTask(entry,saveDirect){\n    var it=entry.it||entry;var task=registerTask(it);if(!task)throw new Error('This download task is missing its secure ID. Process the link again.');\n    if(task.status==='Cancelled')throw new Error('This task was cancelled. Process the link again.');\n    var controller=new AbortController();task.controller=controller;setTaskStatus(task,'Downloading','Connecting to secure file service');\n    try{var response=await fetch(it.file,{signal:controller.signal,credentials:'same-origin'});if(!response.ok){var body=null;try{body=await response.json()}catch(e){}throw new Error(body&&body.message||'The file could not be downloaded (HTTP '+response.status+').');}\n      var blob=await response.blob();if(!blob||!blob.size)throw new Error('The downloaded file is empty.');\n      setTaskStatus(task,'Completed','Transfer received by browser');window.dispatchEvent(new Event('klypza:download-complete'));if(saveDirect)triggerSave(blob,it.name);return blob;\n    }catch(e){if(e.name==='AbortError'){try{var cancelResponse=await fetch('/api/download/cancel',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({id:task.id})});var cancelData=await cancelResponse.json();if(cancelResponse.ok){setTaskStatus(task,'Cancelled','No quota used');}else{setTaskStatus(task,'Cancelled',cancelData&&cancelData.status==='completed'?'Quota used for the completed download':'The server may already have recorded usage');}}catch(cancelError){setTaskStatus(task,'Cancelled','Cancellation could not be confirmed; check your quota');}}else{setTaskStatus(task,'Failed',e.message||'Download failed');}throw e;}finally{task.controller=null;}\n  }\n\n  function itemRow(it) {\n    var thumb;\n    if (it.thumb) {\n      thumb = el('img', { 'class': 'thumb', src: it.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });\n      thumb.addEventListener('error', function () {var ph=el('div',{'class':'thumb'},[icon('fa-solid fa-film')]);if(thumb.parentNode)thumb.parentNode.replaceChild(ph,thumb);});\n    } else { thumb=el('div',{'class':'thumb'},[icon('fa-solid fa-film')]); }\n    var label='Video'+(it.quality?' '+it.quality:'')+' · '+String(it.ext||'mp4').toUpperCase();\n    var meta=el('div',{'class':'item-meta'},[el('strong',{text:label}),el('span',{'class':'badge '+(it.watermark?'warn':''),text:it.watermark?'Watermarked':'No watermark',style:'margin-left:0'})]);\n    var task=registerTask(it);var a=el('button',{type:'button','class':'btn-download'},[icon('fa-solid fa-download'),' Download']);\n    a.addEventListener('click',async function(){if(a.disabled)return;a.disabled=true;try{await fetchTask(it,true);}catch(err){alert(err.message||'Download failed.');}finally{a.disabled=false;}});\n    return el('div',{'class':'item-row'},[thumb,meta,a]);\n  }\n\n  function renderKloters(flat) {\n    if (!flat.length) return;\n    var size = parseInt(els.size.value, 10) || 20;\n    var byQuality = {};\n    flat.forEach(function (entry) {\n      var quality = String(entry.it.quality || 'Standard').trim() || 'Standard';\n      var key = quality.toLowerCase();\n      if (!byQuality[key]) byQuality[key] = { label: quality, items: [], sources: {} };\n      var group = byQuality[key];\n      // A source video can appear only once in a quality group, even if the provider returns duplicate URLs.\n      var sourceKey = String(entry.source || entry.title || '') + '|' + key;\n      if (group.sources[sourceKey]) return;\n      group.sources[sourceKey] = true;\n      group.items.push(entry);\n    });\n    var groups = Object.keys(byQuality).map(function (key) { return byQuality[key]; });\n    groups.sort(function (a, b) {\n      var qa = parseInt(a.label, 10), qb = parseInt(b.label, 10);\n      if (!isNaN(qa) && !isNaN(qb)) return qb - qa;\n      if (!isNaN(qa)) return -1;\n      if (!isNaN(qb)) return 1;\n      return a.label.localeCompare(b.label);\n    });\n    var batchNumber = 0;\n    groups.forEach(function (group) {\n      for (var i = 0; i < group.items.length; i += size) {\n        (function (chunk, qualityLabel, thisBatch) {\n          var btn = el('button', { type: 'button', 'class': 'btn-download' }, [icon('fa-solid fa-file-zipper'), 'Download ' + qualityLabel + ' ZIP ' + thisBatch]);\n          var sub = el('p', { 'class': 'muted', text: chunk.length + ' video' + (chunk.length === 1 ? '' : 's') + ' · one file per source link' });\n          btn.addEventListener('click', function () { downloadZip(chunk, thisBatch, btn, sub, qualityLabel); });\n          els.kloter.appendChild(el('div', { 'class': 'batch-card', style: 'margin-top:0' }, [\n            el('div', { 'class': 'batch-header', style: 'margin-bottom:0.25rem' }, [\n              el('div', {}, [el('strong', { text: qualityLabel + ' · ZIP ' + thisBatch }), el('span', { 'class': 'badge', text: 'Same quality' })]),\n              btn\n            ]),\n            sub\n          ]));\n        })(group.items.slice(i, i + size), group.label, ++batchNumber);\n      }\n    });\n  }\n\n  // ---------- ZIP ----------\n  function triggerSave(blob, name) {\n    var url = URL.createObjectURL(blob);\n    var a = document.createElement('a');\n    a.href = url; a.download = name;\n    document.body.appendChild(a); a.click(); a.remove();\n    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);\n  }\n\n  async function downloadZip(chunk, number, btn, sub, quality) {\n    if (btn.disabled) return;\n    btn.disabled = true;\n    try {\n      if (typeof JSZip === 'undefined') throw new Error('The ZIP library failed to load. Download videos one by one instead.');\n      var zip = new JSZip();\n      var done = 0, failed = 0, next = 0;\n      var used = {};\n      async function worker() {\n        while (next < chunk.length) {\n          var c = chunk[next++];\n          try {\n            var blob = await fetchTask(c, false);\n            var name = c.it.name;\n            if (used[name]) name = (used[name]++) + '_' + name; else used[name] = 1;\n            zip.file(name, blob);\n          } catch (e) { failed++; }\n          done++;\n          sub.textContent = 'Downloading ' + done + ' of ' + chunk.length + '…';\n        }\n      }\n      await Promise.all([worker(), worker(), worker()]);\n      if (failed === chunk.length) throw new Error('All files failed to download. Process the links again and retry.');\n      sub.textContent = 'Creating ZIP…';\n      var out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });\n      var qualitySlug = String(quality || 'standard').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');\n      triggerSave(out, 'Klypza_' + qualitySlug + '_batch_' + number + '.zip');\n      sub.textContent = (chunk.length - failed) + ' videos downloaded' + (failed ? ', ' + failed + ' failed' : '') + '.';\n    } catch (e) {\n      sub.textContent = e.message || 'Could not create the ZIP file.';\n    } finally {\n      btn.disabled = false;\n    }\n  }\n\n  updateCount();\n  checkHealth();\n})();\n\n  // ---------- Klypza accounts ----------\n  (function accountApp(){\n    var $ = function(id){ return document.getElementById(id); };\n    var path = location.pathname.endsWith('/') && location.pathname !== '/' ? location.pathname.slice(0,-1) : location.pathname;\n    var panel = $('accountPanel'), authCard = $('authCard'), dash = $('dashboardCard'), plans = $('plansCard');\n    if (!panel) return;\n    var nav=document.querySelector('.nav-links');\n    fetch('/api/account',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(d){\n      if(!d||!d.user)return;\n      if(nav){\n        nav.querySelectorAll('.nav-login,.nav-cta').forEach(function(n){n.remove();});\n        var dashboardLink=document.createElement('a');dashboardLink.href='/dashboard';dashboardLink.className='nav-login';dashboardLink.textContent='Dashboard';\n        var logoutLink=document.createElement('a');logoutLink.href='#logout';logoutLink.className='nav-cta';logoutLink.textContent='Log out';\n        logoutLink.addEventListener('click',async function(ev){ev.preventDefault();await fetch('/api/auth/logout',{method:'POST'});location.href='/';});\n        if(path==='/dashboard'){nav.append(dashboardLink);}else{nav.append(dashboardLink,logoutLink);}\n      }\n      if(view==='register'||view==='login')location.replace('/dashboard');\n    }).catch(function(){});\n    var view = path === '/register' ? 'register' : path === '/login' ? 'login' : path === '/dashboard' ? 'dashboard' : path === '/plans' ? 'plans' : 'home';\n    if (view === 'home') { fetch('/api/public-stats').then(function(r){return r.ok?r.json():null;}).then(function(d){if(d){$('publicUsers').textContent=Number(d.users||0).toLocaleString();$('publicDownloads').textContent=Number(d.downloads||0).toLocaleString();}}).catch(function(){}); fetch('/api/account',{cache:'no-store',credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(!d)return;var q=Number(d.quota&&d.quota.dailyLimit);var p=String(d.plan||d.user&&d.user.plan||(q>=100?'premium':q>=60?'standard':'free')).toLowerCase();if(!['free','weekly','standard','premium'].includes(p))p=q>=100?'premium':q>=60?'standard':'free';if(window.klypzaSetPlanLimits)window.klypzaSetPlanLimits(p);document.body.classList.toggle('paid-account',p!=='free');}).catch(function(){}); return; }\n    panel.style.display = 'block';\n    document.querySelector('.hero').style.display = 'none';\n    document.querySelector('main').style.display = 'none';\n    if (view === 'plans') { document.title='Klypza Plans — 7-Day Trial, Weekly, Standard & Premium'; document.querySelector('link[rel=canonical]').href='https://klypza.web.id/plans'; authCard.style.display='none'; plans.style.display='block'; }\n    else if (view === 'dashboard') { document.title='Klypza Downloader — Your Account'; document.querySelector('meta[name=robots]').content='noindex,nofollow'; document.querySelector('.hero').style.display='none'; document.querySelector('main').style.display='none'; authCard.style.display='none'; dash.style.display='block'; var downloader=document.getElementById('video-tool'); if(downloader)dash.insertBefore(downloader,dash.querySelector('.dashboard-downloader-intro').nextSibling); }\n    else { document.body.classList.add('klypza-auth-route'); var routeStyle=document.getElementById('klypza-auth-route-style'); if(!routeStyle){routeStyle=document.createElement('style');routeStyle.id='klypza-auth-route-style';routeStyle.textContent='body.klypza-auth-route #dashboardCard,body.klypza-auth-route #plansCard,body.klypza-auth-route #video-tool{display:none!important}body.klypza-auth-route #authCard{display:block!important}';document.head.appendChild(routeStyle);} document.querySelector('meta[name=robots]').content='noindex,nofollow'; document.title=(view==='register'?'Create account':'Log in')+' — Klypza'; authCard.style.setProperty('display','block','important'); if(dash)dash.style.setProperty('display','none','important'); if(plans)plans.style.setProperty('display','none','important'); setAuthMode(view); }\n    function setAuthMode(mode){\n      var isReg = mode === 'register';\n      $('authTitle').textContent = isReg ? 'Create your account' : 'Welcome back';\n      $('authIntro').textContent = isReg ? 'Create an account to get 10 free downloads per day and manage your activity.' : 'Log in to continue to your Klypza dashboard.';\n      $('authSubmit').textContent = isReg ? 'Create account' : 'Log in';\n      $('nameField').style.display = isReg ? 'block' : 'none';\n      $('authName').required = isReg;\n      $('authName').minLength = isReg ? 2 : 0;\n      $('authPassword').autocomplete = isReg ? 'new-password' : 'current-password';\n      $('authPassword').minLength = isReg ? 10 : 1;\n      $('authSwitch').innerHTML = isReg ? 'Already have an account? <a href=\"/login\">Log in</a>' : 'New to Klypza? <a href=\"/register\">Create an account</a> · <a href=\"#\" id=\"forgotPasswordLink\">Forgot password?</a>';\n      $('forgotPanel').hidden=true;$('forgotEmail').value=$('authEmail').value;\n      $('forgotPasswordLink')?.addEventListener('click',function(e){e.preventDefault();$('forgotPanel').hidden=!$('forgotPanel').hidden;if(!$('forgotPanel').hidden)$('forgotEmail').focus();});\n      $('togglePassword').onclick=function(){var x=$('authPassword'),b=$('togglePassword'),show=x.type==='password';x.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password');};\n      $('authForm').onsubmit = async function(ev){\n        ev.preventDefault(); $('authMessage').textContent='Please wait…'; $('authSubmit').disabled=true;\n        try{\n          var payload={email:$('authEmail').value.trim(),password:$('authPassword').value};\n          if(isReg){payload.name=$('authName').value.trim();if(payload.name.length<2){throw new Error('Please enter your name (at least 2 characters).');}}\n          var res=await fetch('/api/auth/'+(isReg?'register':'login'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});\n          var data=await res.json();\n          if(!res.ok) throw new Error(data.message||'Unable to continue.');\n          location.href='/dashboard';\n        }catch(err){$('authMessage').textContent=err.message;$('authSubmit').disabled=false;}\n      };\n    }\n    $('forgotForm').addEventListener('submit',async function(e){e.preventDefault();var b=$('forgotSubmit');b.disabled=true;$('forgotMessage').textContent='Sending…';try{var r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('forgotEmail').value.trim()})}),d=await r.json();if(!r.ok)throw Error(d.message||'Unable to request reset.');$('forgotMessage').textContent=d.message;}catch(x){$('forgotMessage').textContent=x.message;}finally{b.disabled=false;}});\n    window.klypzaShowPanel=function(target){['overview','profile','plans'].forEach(function(name){var panel=document.getElementById(name==='overview'?'overviewPanel':name==='profile'?'profilePanel':'plansPanel');if(panel){panel.hidden=name!==target;panel.style.display=name===target?'block':'none';}});document.querySelectorAll('.profile-tab').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-panel')===target);});};\n    document.addEventListener('click',function(ev){var tab=ev.target.closest&&ev.target.closest('.profile-tab');if(!tab)return;ev.preventDefault();var target=tab.getAttribute('data-panel');['overview','profile','plans'].forEach(function(name){var panel=document.getElementById(name==='overview'?'overviewPanel':name==='profile'?'profilePanel':'plansPanel');if(panel){panel.hidden=name!==target;panel.style.display=name===target?'block':'none';}});document.querySelectorAll('.profile-tab').forEach(function(x){x.classList.toggle('active',x===tab);});});\n    document.addEventListener('click',function(ev){var toggle=ev.target.closest('[data-toggle-password]');if(!toggle)return;var input=$(toggle.getAttribute('data-toggle-password'));if(!input)return;var visible=input.type==='password';input.type=visible?'text':'password';toggle.textContent=visible?'Hide':'Show';toggle.setAttribute('aria-pressed',visible?'true':'false');toggle.setAttribute('aria-label',(visible?'Hide':'Show')+' '+(input.id==='currentPassword'?'current password':input.id==='newPassword'?'new password':'password confirmation'));});\n    $('changePasswordForm').addEventListener('submit',async function(ev){ev.preventDefault();var b=$('changePasswordButton'),m=$('changePasswordMessage'),p=$('newPassword').value,c=$('confirmPassword').value;if(p!==c){m.textContent='The new passwords do not match.';return;}b.disabled=true;m.textContent='Updating password…';try{var r=await fetch('/api/account/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({currentPassword:$('currentPassword').value,newPassword:p})}),d=await r.json();if(!r.ok)throw Error(d.message||'Unable to update password.');m.textContent=d.message;$('changePasswordForm').reset();}catch(e){m.textContent=e.message;}finally{b.disabled=false;}});\n    async function loadDashboard(){\n      \n      try{\n        var res=await fetch('/api/account',{cache:'no-store'});\n        if(res.status===401){location.href='/login';return;}\n        var d=await res.json(); if(!res.ok) throw new Error(d.message||'Unable to load account.');\n        d.user=d.user||{}; var activeSub=d.subscription&&String(d.subscription.status||'').toLowerCase()==='active'?d.subscription:null; var quotaPlan=Number(d.quota&&d.quota.dailyLimit)>=100?'premium':Number(d.quota&&d.quota.dailyLimit)>=60?'standard':'free'; var effectivePlan=String((activeSub&&activeSub.plan)||d.plan||d.user.plan||quotaPlan||'free').toLowerCase(); if(['free','weekly','standard','premium'].indexOf(effectivePlan)<0)effectivePlan=quotaPlan; if(quotaPlan!=='free'&&effectivePlan==='free')effectivePlan=quotaPlan; d.user.plan=effectivePlan; d.plan=effectivePlan; document.body.classList.toggle('paid-account',effectivePlan!=='free');  var earlyName=String(d.user.name||d.user.display_name||'').trim()||String(d.user.email||'').split('@')[0]||'Klypza user'; var earlyIds={dashName:earlyName,dashEmail:d.user.email||'',dashPlan:effectivePlan.toUpperCase(),profileName:earlyName,profileEmail:d.user.email||'',profileLevel:effectivePlan.toUpperCase(),plansCurrentLevel:effectivePlan.toUpperCase(),membershipStatus:activeSub?'Active':'No paid subscription',membershipDaily:String(d.quota&&d.quota.dailyLimit!==undefined?d.quota.dailyLimit:(effectivePlan==='premium'?100:effectivePlan==='standard'?60:effectivePlan==='weekly'?25:0))+' videos per day',membershipBatch:String(d.quota&&d.quota.maxBatch!==undefined?d.quota.maxBatch:(effectivePlan==='premium'?25:effectivePlan==='standard'?15:effectivePlan==='weekly'?5:0))+' videos per batch'}; Object.keys(earlyIds).forEach(function(id){var node=document.getElementById(id);if(node)node.textContent=earlyIds[id];});var identityName=document.getElementById('profileIdentityName'),identityEmail=document.getElementById('profileIdentityEmail'),identityAvatar=document.getElementById('profileAvatar');if(identityName)identityName.textContent=earlyName;if(identityEmail)identityEmail.textContent=d.user.email||'Email not available';if(identityAvatar){var initials=earlyName.split(/\\s+/).filter(Boolean).slice(0,2).map(function(part){return part.charAt(0).toUpperCase();}).join('');identityAvatar.textContent=initials||'K';} var planHeading=document.getElementById('dashPlan'); if(planHeading)planHeading.textContent=effectivePlan.toUpperCase(); var batchHeading=document.getElementById('dashBatchText'); if(batchHeading)batchHeading.textContent='Batch limit: '+(effectivePlan==='premium'?25:effectivePlan==='standard'?15:5)+' videos'; var subHeading=document.getElementById('dashSubStatus'); if(subHeading)subHeading.textContent=activeSub?'Subscription active':(d.trial&&d.trial.status==='active'?'7-day free trial · '+d.trial.daysRemaining+' days remaining':(d.trial&&d.trial.status==='expired'?'Free trial ended · Upgrade to continue':'No active paid subscription.')); var trialNotice=document.getElementById('trialNotice'),trialNoticeText=document.getElementById('trialNoticeText'); if(trialNotice&&trialNoticeText){if(d.trial&&d.trial.status==='active'){trialNotice.hidden=false;trialNoticeText.textContent='Your 7-day free trial is active. '+d.trial.daysRemaining+' day(s) remaining · 10 downloads/day · 5 videos/batch.';}else if(d.trial&&d.trial.status==='expired'){trialNotice.hidden=false;trialNoticeText.textContent='Your 7-day free trial has ended. Downloads are paused. Choose Weekly for $1/week or another subscription to continue.';trialNotice.classList.add('trial-expired');}else{trialNotice.hidden=true;}} if(d.trial&&d.trial.status==='expired'){var submit=document.getElementById('btnSubmit');if(submit){submit.disabled=true;submit.title='Your free trial has ended. Upgrade to continue.';}var input=document.getElementById('profileUrl');if(input)input.disabled=true;var batch=document.getElementById('batchSize');if(batch)batch.disabled=true;}\n        var quotaPlan=String(d.user&&d.user.plan||'free').toLowerCase();var quotaDaily=Number(d.quota&&d.quota.dailyLimit);if(!Number.isFinite(quotaDaily)||quotaDaily<0)quotaDaily=quotaPlan==='premium'?100:quotaPlan==='standard'?60:quotaPlan==='weekly'?25:0;var quotaUsed=Number(d.quota&&d.quota.usedToday);if(!Number.isFinite(quotaUsed)||quotaUsed<0)quotaUsed=0;var quotaRemaining=Number(d.quota&&d.quota.remaining);if(!Number.isFinite(quotaRemaining)||quotaRemaining<0)quotaRemaining=Math.max(0,quotaDaily-quotaUsed);var quotaValue=document.getElementById('dashCredits');if(quotaValue)quotaValue.textContent=quotaRemaining+' / '+quotaDaily;var quotaCaption=document.getElementById('dashQuotaText');if(quotaCaption)quotaCaption.textContent=quotaRemaining+' downloads remaining · '+quotaUsed+' used today · Resets at 00:00 UTC.';var quotaCard=document.getElementById('dashCredits')&&document.getElementById('dashCredits').closest('.info-card');if(quotaCard){var pct=quotaDaily>0?Math.max(0,Math.min(100,Math.round(quotaUsed/quotaDaily*100))):0;var meter=quotaCard.querySelector('.quota-usage-meter');if(!meter){meter=document.createElement('div');meter.className='quota-usage-meter';meter.setAttribute('role','progressbar');meter.setAttribute('aria-label','Daily download quota used');meter.style.cssText='height:8px;border-radius:99px;background:#e9eef8;overflow:hidden;margin:14px 0 8px;width:100%;box-sizing:border-box';var fill=document.createElement('div');fill.className='quota-usage-fill';fill.style.cssText='height:100%;width:0;background:linear-gradient(90deg,#2d7bf0,#7134ce);border-radius:99px;transition:width .25s ease';meter.appendChild(fill);var note=document.createElement('small');note.className='quota-usage-note';note.style.cssText='display:block;color:#7b8496;font-size:12px';quotaCard.append(meter,note);}meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.setAttribute('aria-valuenow',String(pct));meter.firstElementChild.style.width=pct+'%';quotaCard.querySelector('.quota-usage-note').textContent=pct+'% of daily quota used';}\n        var displayName=String(d.user.name||d.user.display_name||'').trim()||String(d.user.email||'').split('@')[0]||'Klypza user';$('dashName').textContent=displayName;$('dashEmail').textContent=d.user.email; var verifyNotice=$('emailVerifyNotice'); if(verifyNotice){verifyNotice.hidden=!!d.user.emailVerified; $('verifyEmailAddress').textContent=d.user.email;}\n        if(window.klypzaSetPlanLimits)window.klypzaSetPlanLimits(d.user.plan);\n        $('profileName').textContent=displayName;$('profileEmail').textContent=d.user.email;$('profileLevel').textContent=(d.user.plan||'free').toUpperCase();$('plansCurrentLevel').textContent=(d.user.plan||'free').toUpperCase();$('profileStatus').textContent=d.user.emailVerified?'Verified':'Email not verified';$('profileJoined').textContent=d.user.createdAt?new Date(d.user.createdAt).toLocaleDateString():'Not available';$('membershipDaily').textContent=d.quota.dailyLimit+' videos per day';$('membershipBatch').textContent=d.quota.maxBatch+' videos per batch';var sub=d.subscription||null;var active=!!(sub&&sub.status==='active');var portalBtn=document.getElementById('billingPortalButton'),cancelBtn=document.getElementById('cancelSubscriptionButton');if(portalBtn)portalBtn.hidden=!active;if(cancelBtn)cancelBtn.hidden=!active;$('membershipStatus').textContent=active?'Active':'No paid subscription';$('membershipEnd').textContent=sub&&sub.current_period_end?new Date(sub.current_period_end).toLocaleDateString():'Not applicable';$('membershipNotice').textContent=active?'Your paid subscription is active and synchronized with Paddle. You can review available plans; cancellation and billing-portal controls are not enabled yet.':'Your subscription status is synchronized with Paddle. Use the plans page to review available tiers. Subscription cancellation and billing-portal controls are not enabled yet.';\n        var activeSubscription=d.subscription&&String(d.subscription.status||'').toLowerCase()==='active'?d.subscription:null;var displayPlan=String((activeSubscription&&activeSubscription.plan)||d.plan||d.user.plan||'free').toLowerCase();if(['free','weekly','standard','premium'].indexOf(displayPlan)<0)displayPlan='free';d.user.plan=displayPlan;var fallbackDaily=displayPlan==='premium'?100:displayPlan==='standard'?60:displayPlan==='weekly'?25:0;var fallbackBatch=displayPlan==='premium'?25:displayPlan==='standard'?15:displayPlan==='weekly'?5:0;var dailyLimit=d.quota&&d.quota.dailyLimit!==undefined?Number(d.quota.dailyLimit):fallbackDaily;var maxBatch=d.quota&&d.quota.maxBatch!==undefined?Number(d.quota.maxBatch):fallbackBatch;var usedToday=Number(d.quota&&d.quota.usedToday)||0;var remaining=d.quota&&d.quota.remaining!==undefined?Number(d.quota.remaining):Math.max(0,dailyLimit-usedToday);$('dashCredits').textContent=remaining+' / '+dailyLimit;$('dashQuotaText').textContent=remaining+' downloads remaining · '+usedToday+' used today · Resets at 00:00 UTC.';$('dashPlan').textContent=displayPlan.toUpperCase();$('profileLevel').textContent=displayPlan.toUpperCase();$('plansCurrentLevel').textContent=displayPlan.toUpperCase();$('dashBatchText').textContent='Batch limit: '+maxBatch+' videos';$('dashSubStatus').textContent=activeSubscription?'Subscription active':'No active paid subscription.';var cancellationScheduled=!!(activeSubscription&&activeSubscription.scheduled_change_action==='cancel');$('membershipStatus').textContent=cancellationScheduled?'Cancellation scheduled':activeSubscription?'Active':'No paid subscription';$('membershipDaily').textContent=dailyLimit+' videos per day';$('membershipBatch').textContent=maxBatch+' videos per batch';$('membershipEnd').textContent=cancellationScheduled&&activeSubscription.scheduled_change_effective_at?new Date(activeSubscription.scheduled_change_effective_at).toLocaleString():activeSubscription&&activeSubscription.current_period_end?new Date(activeSubscription.current_period_end).toLocaleDateString():'Not applicable';var billingPortalBtn=document.getElementById('billingPortalButton'),updatePaymentMethodBtn=document.getElementById('updatePaymentMethodButton'),cancelSubscriptionBtn=document.getElementById('cancelSubscriptionButton');if(billingPortalBtn)billingPortalBtn.hidden=!activeSubscription;if(updatePaymentMethodBtn)updatePaymentMethodBtn.hidden=!activeSubscription;if(cancelSubscriptionBtn)cancelSubscriptionBtn.hidden=!activeSubscription||cancellationScheduled;$('membershipNotice').textContent=cancellationScheduled?'Your subscription cancellation is scheduled. Your '+displayPlan.toUpperCase()+' access remains active until '+new Date(activeSubscription.scheduled_change_effective_at||activeSubscription.current_period_end).toLocaleString()+'. You can use the billing portal if you want to reverse the cancellation.':activeSubscription?'Your paid subscription is active and synchronized with Paddle. Use Open billing portal to manage billing details, or Cancel subscription to review cancellation in Paddle.':d.trial&&d.trial.status==='active'?'Your free trial has '+d.trial.daysRemaining+' day(s) remaining. We recommend choosing Weekly, Standard or Premium before it ends so your downloads continue without interruption.':d.trial&&d.trial.status==='expired'?'Your free trial has ended. Choose Weekly, Standard or Premium to restore downloads.':'Choose a subscription below to continue using Klypza.';\n        var activity=$('activityList'); activity.textContent='';\n        (d.downloads||[]).forEach(function(item){var row=document.createElement('div');row.className='info-card';var title=document.createElement('strong');title.textContent=item.title||item.platform+' video';var meta=document.createElement('p');meta.textContent=item.platform+' · '+item.credits_used+' credit · '+new Date(item.created_at+'Z').toLocaleString();row.append(title,meta);activity.appendChild(row);});\n        if(!activity.children.length) activity.textContent='No downloads yet.';\n        var history=$('creditHistory');history.textContent='';\n        (d.transactions||[]).forEach(function(item){var row=document.createElement('div');row.className='item-row';var desc=document.createElement('span');desc.textContent=item.reason.replace(/_/g,' ');var amount=document.createElement('strong');amount.textContent=(item.amount>0?'+':'')+item.amount+' credits';row.append(desc,amount);history.appendChild(row);});\n        if(!history.children.length) history.textContent='No credit transactions yet.';\n      }catch(err){var q=document.getElementById('dashCredits');if(q&&q.textContent==='—')q.textContent='Unavailable';var qc=document.getElementById('dashQuotaText');if(qc)qc.textContent='Unable to load quota: '+(err&&err.message?err.message:'Please refresh and try again.');$('activityList').textContent=err.message;}\n    }\n    if(view==='dashboard') loadDashboard();\n    window.addEventListener('klypza:download-complete',loadDashboard);\n    $('resendVerifyButton').addEventListener('click',async function(){var btn=$('resendVerifyButton');btn.disabled=true;$('resendVerifyMessage').textContent='Sending…';try{var r=await fetch('/api/auth/resend-verification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('dashEmail').textContent})});var d=await r.json();if(!r.ok)throw new Error(d.message||'Unable to send email.');$('resendVerifyMessage').textContent=d.message||'If verification is still needed, a new link has been sent.';}catch(e){$('resendVerifyMessage').textContent=e.message;}finally{btn.disabled=false;}});\n    $('logoutButton').addEventListener('click',async function(){await fetch('/api/auth/logout',{method:'POST'});location.href='/';});\n  })();\n\n</script>\n<script>\n(function(){\n if(window.__klypzaLogoutHandlerInstalled)return;\n window.__klypzaLogoutHandlerInstalled=true;\n document.addEventListener('click',async function(event){\n  var target=event.target;\n  var button=target&&target.closest?target.closest('#logoutButton,.account-logout-button,.account-logout-nav'):null;\n  if(!button)return;\n  event.preventDefault();event.stopPropagation();\n  if(event.stopImmediatePropagation)event.stopImmediatePropagation();\n  if(button.dataset.logoutPending==='true')return;\n  button.dataset.logoutPending='true';\n  var originalText=button.textContent;\n  button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Signing out…';\n  try{\n   var response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Accept':'application/json'}});\n   if(!response.ok)throw new Error('Sign out failed ('+response.status+'). Please try again.');\n   var result=await response.json().catch(function(){return {ok:true};});\n   if(result&&result.ok===false)throw new Error(result.message||'Sign out failed. Please try again.');\n   window.location.replace('/');\n  }catch(error){\n   button.disabled=false;button.removeAttribute('aria-busy');button.dataset.logoutPending='false';button.textContent=originalText;\n   var status=document.getElementById('logoutStatusMessage');\n   if(!status){status=document.createElement('p');status.id='logoutStatusMessage';status.setAttribute('role','alert');status.style.cssText='margin:8px 0;color:#b42332;font-size:.85rem;line-height:1.45';button.insertAdjacentElement('afterend',status);}\n   status.textContent=error&&error.message?error.message:'Unable to sign out. Please check your connection and try again.';\n  }\n },true);\n})();\n</script>\n<script src=\"https://cdn.paddle.com/paddle/v2/paddle.js\"></script>\n<script>\n(function(){\n var token=\"\";\n var initialized=false;\n async function initPaddle(){if(initialized)return true;if(!window.Paddle)return false;try{var cfg=await fetch('/api/billing/config',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('Billing configuration unavailable');return r.json();});if(!cfg.clientToken)return false;window.Paddle.Environment.set(cfg.environment || 'production');window.Paddle.Initialize({token:cfg.clientToken});initialized=true;return true;}catch(e){console.error('Paddle initialization failed',e);return false;}}\n document.addEventListener('click',async function(ev){var button=ev.target.closest('[data-paddle-plan]');if(!button)return;ev.preventDefault();var plan=button.getAttribute('data-paddle-plan');if(!['weekly','standard','premium'].includes(plan))return;var old=button.textContent;button.disabled=true;button.textContent='Preparing secure checkout…';try{var response=await fetch('/api/billing/checkout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({plan:plan})});var data=await response.json();if(response.status===401){location.href='/login?next=%2Fplans';return;}if(!response.ok)throw new Error(data.message||'Unable to start checkout.');if(!await initPaddle())throw new Error('Paddle Checkout could not be initialized. Please refresh and try again.');window.Paddle.Checkout.open({transactionId:data.transactionId,customer:{email:data.email},settings:{displayMode:'overlay',theme:'light',locale:'en',allowLogout:false,successUrl:'https://klypza.web.id/dashboard?payment=processing'}});}catch(err){alert(err.message||'Checkout could not be opened.');}finally{button.disabled=false;button.textContent=old;} });\n})();\n</script><script>document.addEventListener('click',async function(e){var b=e.target.closest('[data-billing-action]');if(!b)return;var action=b.getAttribute('data-billing-action'),notice=document.getElementById('membershipNotice');b.disabled=true;var label=b.textContent;b.textContent=action==='cancel'?'Opening cancellation…':action==='payment_method'?'Opening payment method settings…':'Opening billing portal…';try{var r=await fetch('/api/billing/portal',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action})});var d=await r.json();if(!r.ok||!d.url)throw new Error(d.message||'Billing portal is temporarily unavailable.');window.location.assign(d.url);}catch(err){if(notice)notice.textContent=err.message||'Unable to open Paddle billing portal.';b.disabled=false;b.textContent=label;}});</script><style id=\"klypza-history-polish\">\n#activityList,#creditHistory{display:grid;gap:10px}\n#activityList .history-entry{border:1px solid #e8ebf2;border-radius:16px;padding:15px 17px;background:#fff;box-shadow:0 5px 18px rgba(20,35,75,.035)}\n#activityList .history-entry strong{display:block;color:#17213b;font-size:15px;line-height:1.45;font-weight:700}\n#activityList .history-entry p{margin:5px 0 0;color:#778093;font-size:13px;line-height:1.45}\n#creditHistory .credit-entry{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e8ebf2;border-radius:13px;padding:12px 14px;background:#fff}\n#creditHistory .credit-entry span{color:#505a6e;font-size:14px;text-transform:capitalize}\n#creditHistory .credit-entry strong{white-space:nowrap;font-size:14px;color:#17213b}\n#creditHistory .credit-entry strong.credit-positive{color:#16836e}\n.history-more{margin-top:12px;border:1px solid #d9e3f4;border-radius:11px;padding:9px 15px;background:#f1f6ff;color:#2863b8;font-weight:700;cursor:pointer}\n.history-count{color:#8790a1;font-size:12px;font-weight:500;margin-left:6px}\n\n#dashboardCard .steps-grid .info-card{min-width:0;border:1px solid #e8ebf3;border-radius:18px;box-shadow:0 8px 24px rgba(23,35,70,.045)}\n\n/* Paid dashboard accounts must never see free-tier ad placeholders. */\n/* Klypza dashboard/profile refinement */\n#dashboardCard{width:min(1320px,calc(100% - 40px))!important;max-width:1320px!important}\n#dashboardCard>.dashboard-welcome{grid-column:1/-1!important;background:radial-gradient(circle at 88% 15%,rgba(124,92,255,.28),transparent 31%),linear-gradient(112deg,#101b43 0%,#1b3478 58%,#4d2bbd 100%)!important;color:#fff!important;min-height:190px;padding:clamp(24px,3.5vw,42px)!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:22px!important;box-shadow:0 16px 38px rgba(19,32,79,.16)}\n#dashboardCard>.dashboard-welcome h1{color:#fff!important}\n#dashboardCard>.dashboard-welcome p{color:#e2e9ff!important}\n#dashboardCard>.dashboard-side-menu{grid-column:1!important;grid-row:2!important;align-self:start!important;position:relative!important;top:auto!important;width:100%;max-width:260px;margin:0!important}\n#dashboardCard>.dashboard-main-content,#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{grid-column:2!important;grid-row:2!important;width:100%;min-width:0!important;max-width:none!important}\n#dashboardCard .profile-panel{border:1px solid #e6eaf2!important;border-radius:20px!important;background:#fff!important;box-shadow:0 10px 30px rgba(20,34,82,.045);padding:clamp(20px,2.6vw,34px)!important}\n#dashboardCard #overviewPanel .steps-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important}\n@media(max-width:900px){#dashboardCard{width:calc(100% - 32px)!important;grid-template-columns:minmax(0,1fr)!important}#dashboardCard>.dashboard-welcome,#dashboardCard>.dashboard-side-menu,#dashboardCard>.dashboard-main-content,#dashboardCard>#overviewPanel,#dashboardCard>.profile-panel{grid-column:1!important;grid-row:auto!important}#dashboardCard>.dashboard-side-menu{max-width:none!important;margin:0 0 16px!important}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}\n@media(max-width:620px){#dashboardCard{width:calc(100% - 20px)!important;margin:18px auto 36px!important;padding:14px!important}#dashboardCard>.dashboard-welcome{min-height:0;padding:22px 18px!important;margin-bottom:16px!important}#dashboardCard #overviewPanel .steps-grid{grid-template-columns:minmax(0,1fr)!important;gap:12px!important}#dashboardCard .profile-panel{padding:16px!important}}\n</style>\n<script>\n(function(){\n  var PAGE_SIZE=6,activityExpanded=false,creditsExpanded=false;\n  function dateLabel(value){\n    if(!value)return 'Date unavailable';\n    var raw=String(value).trim();\n    var parsed=new Date(raw.includes('T')?raw:raw.replace(' ','T')+'Z');\n    if(Number.isNaN(parsed.getTime()))return raw;\n    return new Intl.DateTimeFormat(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(parsed);\n  }\n  function addMoreButton(container,total,expanded,onToggle){\n    if(total<=PAGE_SIZE)return;\n    var button=document.createElement('button');button.type='button';button.className='history-more';\n    button.textContent=expanded?'Show less':'View all ('+total+')';\n    button.addEventListener('click',onToggle);container.appendChild(button);\n  }\n  async function refreshAccountHistory(){\n    if(!/\\/dashboard\\/?$/.test(location.pathname))return;\n    var activity=document.getElementById('activityList'),credits=document.getElementById('creditHistory');\n    if(!activity||!credits)return;\n    try{\n      var response=await fetch('/api/account',{cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json'}});\n      if(response.status===401){activity.textContent='Please log in to view download activity.';credits.textContent='Please log in to view credit history.';return;}\n      var data=await response.json();\n      if(!response.ok)throw new Error(data.message||('Account request failed (HTTP '+response.status+').'));\n      activity.replaceChildren();\n      var downloads=Array.isArray(data.downloads)?data.downloads:[];\n      downloads.slice(0,activityExpanded?downloads.length:PAGE_SIZE).forEach(function(item){\n        var row=document.createElement('div');row.className='history-entry';\n        var title=document.createElement('strong');title.textContent=item.title||((item.platform||'Video')+' download');\n        var meta=document.createElement('p'),used=Number(item.credits_used||0);\n        meta.textContent=(item.platform||'Unknown platform')+' · '+used+' '+(Math.abs(used)===1?'credit':'credits')+' · '+dateLabel(item.created_at);\n        row.append(title,meta);activity.appendChild(row);\n      });\n      if(!downloads.length)activity.textContent='No downloads yet.';\n      addMoreButton(activity,downloads.length,activityExpanded,function(){activityExpanded=!activityExpanded;refreshAccountHistory();});\n      credits.replaceChildren();\n      var transactions=Array.isArray(data.transactions)?data.transactions:[];\n      transactions.slice(0,creditsExpanded?transactions.length:PAGE_SIZE).forEach(function(item){\n        var row=document.createElement('div');row.className='credit-entry';\n        var info=document.createElement('div'),desc=document.createElement('span');desc.textContent=String(item.reason||'Credit transaction').replace(/_/g,' ');\n        var stamp=document.createElement('small');stamp.textContent=dateLabel(item.created_at);stamp.style.cssText='display:block;margin-top:4px;color:#8790a1;font-size:12px';info.append(desc,stamp);\n        var amount=document.createElement('strong'),value=Number(item.amount||0),unit=Math.abs(value)===1?'credit':'credits';\n        amount.textContent=(value>0?'+':'')+value+' '+unit;\n        if(value>0)amount.className='credit-positive';\n        row.append(info,amount);credits.appendChild(row);\n      });\n      if(!transactions.length)credits.textContent='No credit transactions yet.';\n      addMoreButton(credits,transactions.length,creditsExpanded,function(){creditsExpanded=!creditsExpanded;refreshAccountHistory();});\n    }catch(error){\n      activity.textContent='Unable to load activity: '+(error&&error.message?error.message:'Please refresh and try again.');\n      credits.textContent='Unable to load credit history.';console.error('KLYPZA_DASHBOARD_HISTORY',error);\n    }\n  }\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshAccountHistory,{once:true});else refreshAccountHistory();\n  window.addEventListener('klypza:download-complete',refreshAccountHistory);\n})();\n</script>\n<script>(function(){function apply(d){if(!d)return;var sub=d.subscription&&String(d.subscription.status||'').toLowerCase();var plan=String((['active','past_due','paused'].indexOf(sub)>=0&&d.subscription.plan)||d.plan||d.user&&d.user.plan||'free').toLowerCase();if(!['free','weekly','standard','premium'].includes(plan))plan='free';var paid=plan==='weekly'||plan==='standard'||plan==='premium';document.body.classList.toggle('klypza-paid-account',paid);document.querySelectorAll('.ad-slot,aside[aria-label*=\"Advertisement\"]').forEach(function(el){el.hidden=paid;el.setAttribute('aria-hidden',paid?'true':'false');el.style.setProperty('display',paid?'none':'','important');});}function run(){fetch('/api/account',{method:'GET',cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok)return null;return r.json();}).then(apply).catch(function(){});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();window.addEventListener('pageshow',run);})();</script><script>\n(function(){\n if(window.__klypzaAuthSubmitFallback)return;\n window.__klypzaAuthSubmitFallback=true;\n var path=window.location.pathname;\n if(path!=='/login'&&path!=='/register')return;\n var isRegister=path==='/register';\n var byId=function(id){return document.getElementById(id);};\n var form=byId('authForm'),name=byId('authName'),nameField=byId('nameField'),email=byId('authEmail'),password=byId('authPassword'),button=byId('authSubmit'),message=byId('authMessage');\n if(!form||!name||!nameField||!email||!password||!button||!message)return;\n var title=byId('authTitle'),intro=byId('authIntro'),switcher=byId('authSwitch');\n if(title)title.textContent=isRegister?'Create your account':'Welcome back';\n if(intro)intro.textContent=isRegister?'Create an account to get 10 free downloads per day and manage your activity.':'Log in to continue to your Klypza dashboard.';\n nameField.style.display=isRegister?'block':'none';name.required=isRegister;name.minLength=isRegister?2:0;\n password.autocomplete=isRegister?'new-password':'current-password';password.minLength=isRegister?10:1;\n button.textContent=isRegister?'Create account':'Log in';button.disabled=false;\n if(switcher)switcher.innerHTML=isRegister?'Already have an account? <a href=\"/login\">Log in</a>':'New to Klypza? <a href=\"/register\">Create an account</a> · <a href=\"#\" id=\"forgotPasswordLink\">Forgot password?</a>';\n var toggle=byId('togglePassword');\n if(toggle)toggle.onclick=function(){var visible=password.type==='password';password.type=visible?'text':'password';toggle.textContent=visible?'Hide':'Show';toggle.setAttribute('aria-label',visible?'Hide password':'Show password');};\n var forgotLink=byId('forgotPasswordLink'),forgotPanel=byId('forgotPanel');\n if(forgotLink&&forgotPanel)forgotLink.onclick=function(e){e.preventDefault();forgotPanel.hidden=!forgotPanel.hidden;var fi=byId('forgotEmail');if(fi){fi.value=email.value;if(!forgotPanel.hidden)fi.focus();}};\n form.onsubmit=async function(ev){\n  ev.preventDefault();if(button.disabled)return;\n  var payload={email:email.value.trim(),password:password.value};\n  if(isRegister){payload.name=name.value.trim();if(payload.name.length<2){message.textContent='Please enter your name (at least 2 characters).';name.focus();return;}}\n  if(!payload.email||!payload.password){message.textContent='Enter your email and password.';return;}\n  button.disabled=true;button.textContent=isRegister?'Creating account…':'Signing in…';message.textContent='Please wait…';\n  try{\n   var response=await fetch('/api/auth/'+(isRegister?'register':'login'),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});\n   var data=await response.json().catch(function(){return {};});\n   if(!response.ok)throw new Error(data.message||'Unable to sign in. Please try again.');\n   if(!data.ok)throw new Error(data.message||'The server did not confirm sign-in.');\n   message.textContent='Signed in successfully. Opening your dashboard…';window.location.assign('/dashboard');\n  }catch(error){message.textContent=error&&error.message?error.message:'Connection error. Please try again.';button.disabled=false;button.textContent=isRegister?'Create account':'Log in';}\n };\n})();\n</script>\n</body>\n</html>"

function appPageHtml(path) {
  let html = INDEX_HTML;
  const base = 'https://klypza.web.id' + (path === '/' ? '/' : path);
  const meta = path === '/plans'
    ? { title: 'Klypza Plans — Weekly, Standard & Premium', description: 'Compare Klypza subscriptions: $1 weekly, Standard and Premium plans, daily download limits and batch sizes.', robots: 'index,follow' }
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
  if (path === '/dashboard') {
    // Isolated dashboard-tab controller: it remains available even if another dashboard
    // initializer fails, and is installed after the dashboard markup has been parsed.
    const tabController = `<script>
(function () {
  function showKlypzaPanel(target) {
    var ids = { overview: 'overviewPanel', profile: 'profilePanel', plans: 'plansPanel' };
    if (!Object.prototype.hasOwnProperty.call(ids, target)) return;
    Object.keys(ids).forEach(function (key) {
      var panel = document.getElementById(ids[key]);
      if (!panel) return;
      panel.hidden = key !== target;
      panel.style.display = key === target ? 'block' : 'none';
    });
    document.querySelectorAll('#dashboardCard .profile-tab').forEach(function (tab) {
      var active = tab.getAttribute('data-panel') === target;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }
  var accountToggle = document.getElementById('accountMenuToggle');
  var accountContent = document.getElementById('accountMenuContent');
  if (accountToggle && accountContent) {
    accountToggle.addEventListener('click', function () {
      var expanded = accountToggle.getAttribute('aria-expanded') === 'true';\n      accountToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');\n      accountContent.hidden = expanded;\n    });\n  }\n  window.klypzaShowPanel = showKlypzaPanel;
  document.addEventListener('click', function (event) {
    var node = event.target;
    var tab = node && node.closest ? node.closest('#dashboardCard .profile-tab') : null;
    if (!tab) return;
    event.preventDefault();
    showKlypzaPanel(tab.getAttribute('data-panel'));
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    showKlypzaPanel('overview');
  });
  if (document.readyState !== 'loading') showKlypzaPanel('overview');
})();
</script>`;
    const profileDataController = `<script>
(function () {
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null || value === '' ? 'Not available' : String(value);
  }
  function loadProfileData() {
    fetch('/api/account', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Account data could not be loaded (' + response.status + ').');
        return response.json();
      })
      .then(function (data) {
        var user = data && data.user;
        if (!user) throw new Error('Account information is missing from the server response.');
        var quota = data.quota || {};
        var access = data.access || {};
        var sub = data.subscription || null;
        var activeSub = sub && String(sub.status || '').toLowerCase() === 'active' && sub.provider === 'paddle' ? sub : null;
        var trialActive = !!(data.trial && data.trial.status === 'active' && access.canDownload === true);
        var canDownload = access.canDownload === true;
        var dailyLimit = canDownload ? (trialActive ? 10 : Number(quota.dailyLimit)) : 0;
        var plan = trialActive ? 'trial' : String((activeSub && activeSub.plan) || data.plan || user.plan || (dailyLimit >= 100 ? 'premium' : dailyLimit >= 60 ? 'standard' : dailyLimit >= 25 ? 'weekly' : 'free')).toLowerCase();
        if (!['free','trial','weekly','standard','premium'].includes(plan)) plan = trialActive ? 'trial' : dailyLimit >= 100 ? 'premium' : dailyLimit >= 60 ? 'standard' : dailyLimit >= 25 ? 'weekly' : 'free';
        if (!Number.isFinite(dailyLimit) || dailyLimit < 0) dailyLimit = canDownload ? (plan === 'premium' ? 100 : plan === 'standard' ? 60 : plan === 'weekly' ? 25 : plan === 'trial' ? 10 : 0) : 0;
        var maxBatch = canDownload ? (quota.maxBatch !== undefined ? Number(quota.maxBatch) : (plan === 'premium' ? 25 : plan === 'standard' ? 15 : (plan === 'weekly' || plan === 'trial') ? 5 : 0)) : 0;
        if (!Number.isFinite(maxBatch) || maxBatch < 0) maxBatch = 0;
        var usedToday = Number(quota.usedToday);
        if (!Number.isFinite(usedToday) || usedToday < 0) usedToday = 0;
        var remaining = canDownload ? Number(quota.remaining) : 0;
        if (!Number.isFinite(remaining) || remaining < 0) remaining = Math.max(0, dailyLimit - usedToday);
        var displayName = String(user.name || user.display_name || user.email || 'Klypza user').trim();
        setText('profileName', displayName);
        setText('dashName', displayName);
        setText('profileIdentityName', displayName);
        setText('profileIdentityEmail', user.email);
        var avatar = document.getElementById('profileAvatar');
        if (avatar) avatar.textContent = (displayName.trim().charAt(0) || 'K').toUpperCase();
        var editName = document.getElementById('editProfileName');
        if (editName && document.activeElement !== editName) editName.value = displayName;
        setText('profileEmail', user.email);
        setText('profileLevel', plan.toUpperCase());
        setText('plansCurrentLevel', plan.toUpperCase());
        setText('dashPlan', plan.toUpperCase());
        setText('dashBatchText', 'Batch limit: ' + maxBatch + ' videos');
        setText('dashSubStatus', activeSub ? 'Subscription active' : trialActive ? 'Free trial active' : 'No active paid subscription.');
        setText('profileStatus', user.emailVerified === true || user.email_verified === 1 ? 'Verified' : 'Email not verified');
        var joined = user.createdAt || user.created_at;
        setText('profileJoined', joined ? new Date(joined).toLocaleDateString() : 'Not available');
        setText('dashCredits', remaining + ' / ' + dailyLimit);
        setText('dashQuotaText', remaining + ' downloads remaining · ' + usedToday + ' used today · Resets at 00:00 UTC.');
        setText('membershipDaily', dailyLimit + ' videos per day');
        setText('membershipBatch', maxBatch + ' videos per batch');
        setText('membershipStatus', activeSub ? 'Active' : trialActive ? 'Free trial active' : 'No paid subscription');
        setText('membershipEnd', activeSub && activeSub.current_period_end ? new Date(activeSub.current_period_end).toLocaleDateString() : 'Not applicable');
      })
      .catch(function (error) {
        setText('profileStatus', error.message || 'Unable to load account status');
      });
  }
  var editForm = document.getElementById('editProfileForm');
  if (editForm) editForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    var input = document.getElementById('editProfileName');
    var button = document.getElementById('saveProfileButton');
    var message = document.getElementById('editProfileMessage');
    var name = String(input && input.value || '').trim();
    if (name.length < 2 || name.length > 60) { if (message) message.textContent = 'Please enter a name containing 2–60 characters.'; return; }
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    if (message) message.textContent = 'Saving your profile…';
    try {
      var response = await fetch('/api/account/profile', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ name: name }) });
      var result = await response.json();
      if (!response.ok || !result.ok || !result.user) throw new Error(result.message || 'Your name could not be saved.');
      var savedName = result.user.name || name;
      if (input) input.value = savedName;
      setText('profileName', savedName); setText('profileIdentityName', savedName);
      var avatar = document.getElementById('profileAvatar'); if (avatar) avatar.textContent = (savedName.charAt(0) || 'K').toUpperCase();
      if (message) { message.textContent = 'Your name has been saved successfully.'; message.style.color = '#16834a'; }
    } catch (error) { if (message) { message.textContent = error.message || 'Unable to save your name.'; message.style.color = '#c03945'; } }
    finally { if (button) { button.disabled = false; button.textContent = 'Save changes'; } }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadProfileData);
  else loadProfileData();
})();
</script>`;
    const passwordToggleController = `<script>
(function () {
  function handlePasswordToggle(event) {
    var button = event.target && event.target.closest ? event.target.closest('button[data-toggle-password]') : null;
    if (!button) return;
    var id = button.getAttribute('data-toggle-password');
    var input = document.getElementById(id);
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    var show = input.getAttribute('type') === 'password';
    input.setAttribute('type', show ? 'text' : 'password');
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', show ? 'true' : 'false');
    button.setAttribute('aria-label', (show ? 'Hide' : 'Show') + ' password');
  }
  document.addEventListener('click', handlePasswordToggle, true);
})();
</script>`;
    const passwordChangeController = `<script>
(function () {
  function showMessage(message, isError) {
    var node = document.getElementById('changePasswordMessage');
    if (node) {
      node.textContent = message;
      node.setAttribute('role', 'alert');
      node.style.color = isError ? '#b42318' : '#167647';
    }
  }
  async function submitPasswordChange(event) {
    var form = event.target && event.target.closest ? event.target.closest('#changePasswordForm') : null;
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    var current = document.getElementById('currentPassword');
    var next = document.getElementById('newPassword');
    var confirm = document.getElementById('confirmPassword');
    var button = document.getElementById('changePasswordButton');
    if (!current || !next || !confirm || !button) return;
    if (next.value !== confirm.value) {
      showMessage('The new passwords do not match.', true);
      return;
    }
    button.disabled = true;
    showMessage('Saving your new password…', false);
    try {
      var response = await fetch('/api/account/password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: current.value, newPassword: next.value })
      });
      var rawResponse = await response.text();
      var data = {};
      try { data = rawResponse ? JSON.parse(rawResponse) : {}; }
      catch (parseError) {
        throw new Error('Password request returned an unreadable response (HTTP ' + response.status + '). Please reload the page and try again.');
      }
      if (!response.ok || !data.ok) {
        var serverMessage = typeof data.message === 'string' && data.message.trim() ? data.message.trim() : 'The server did not provide an error description.';
        throw new Error('Request failed (HTTP ' + response.status + '): ' + serverMessage);
      }
      form.reset();
      showMessage('Password changed successfully. Redirecting to login…', false);
      button.disabled = true;
      window.setTimeout(function () { window.location.replace('/login?password_changed=1'); }, 1200);
    } catch (error) {
      showMessage(error.message || 'Password could not be changed. Please try again.', true);
      button.disabled = false;
    }
  }
  document.addEventListener('submit', submitPasswordChange, true);
})();
</script>`;
        const billingControlsController = `<script>
(function () {
  async function syncBillingControls() {
    var portal = document.getElementById('billingPortalButton');
    var updatePayment = document.getElementById('updatePaymentMethodButton');
    var cancel = document.getElementById('cancelSubscriptionButton');
    if (!portal || !updatePayment || !cancel) return;
    try {
      var response = await fetch('/api/account', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Account status unavailable');
      var data = await response.json();
      var sub = data && data.subscription;
      var status = String(sub && sub.status || '').toLowerCase();
      var active = status === 'active';
      var pastDue = status === 'past_due';
      var manageable = active || pastDue;
      var cancellationScheduled = !!(active && String(sub.scheduled_change_action || '').toLowerCase() === 'cancel');
      portal.hidden = !manageable;
      portal.style.display = manageable ? 'inline-flex' : 'none';
      portal.setAttribute('aria-hidden', manageable ? 'false' : 'true');
      updatePayment.hidden = !manageable;
      updatePayment.style.display = manageable ? 'inline-flex' : 'none';
      updatePayment.setAttribute('aria-hidden', manageable ? 'false' : 'true');
      cancel.hidden = !manageable || cancellationScheduled;
      cancel.style.display = manageable && !cancellationScheduled ? 'inline-flex' : 'none';
      cancel.setAttribute('aria-hidden', manageable && !cancellationScheduled ? 'false' : 'true');
      var notice = document.getElementById('membershipNotice');
      if (notice) {
        if (pastDue) {
          notice.textContent = 'Your subscription payment is past due. Update your payment method in the billing portal to restore normal billing. Your access remains available only while the current paid period is valid.';
        } else if (cancellationScheduled) {
          var effectiveAt = sub.scheduled_change_effective_at || sub.current_period_end;
          notice.textContent = 'Your subscription cancellation is scheduled. Your paid access remains active until ' + (effectiveAt ? new Date(effectiveAt).toLocaleString() : 'the end of the current billing period') + '. You can use the billing portal if you want to reverse the cancellation.';
        } else if (active) {
          notice.textContent = 'Your paid subscription is active and synchronized with Paddle. Use Open billing portal to manage billing details, Update payment method to change your payment method, or Cancel subscription to review cancellation in Paddle.';
        }
      }
    } catch (error) {
      console.error('KLYPZA_BILLING_CONTROLS', error);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncBillingControls);
  else syncBillingControls();
})();
</script>`;

const planStateController = "<script>\n(function () {\n function applyPlanState(data) {\n  if (!data || !data.user) return;\n  var sub=data.subscription&&['active','past_due'].includes(String(data.subscription.status||'').toLowerCase())&&data.subscription.provider==='paddle'?data.subscription:null;\n  var trialActive=!!(data.trial&&data.trial.status==='active'&&data.access&&data.access.canDownload===true);\n  var plan=trialActive?'trial':String((sub&&sub.plan)||data.plan||data.user.plan||'free').toLowerCase();\n  if (!['trial','weekly','standard','premium'].includes(plan)) plan='free';\n  document.querySelectorAll('#dashboardCard #plansPanel .membership-pricing-grid .pricing-card').forEach(function(card){\n   var h=card.querySelector('h3'), name=String(h&&h.textContent||'').trim().toLowerCase();\n   if(!['weekly','standard','premium'].includes(name))return;\n   var current=name===plan; card.classList.toggle('current-plan-card',current); card.setAttribute('data-plan-state',current?'current':'available');\n   var badge=card.querySelector('.badge'); if(badge){badge.textContent=current?'Current plan':'Paid plan';badge.classList.toggle('current-plan-badge',current);}\n   var action=card.querySelector('a.btn-download,button[data-paddle-plan]'); if(!action)return;\n   if(current){action.textContent='Current Plan';action.classList.add('plan-current-button');action.setAttribute('aria-current','true');action.setAttribute('aria-disabled','true');action.setAttribute('tabindex','-1');action.removeAttribute('href');action.removeAttribute('data-paddle-plan');action.disabled=true;}\n   else {action.classList.remove('plan-current-button');action.removeAttribute('aria-current');action.removeAttribute('aria-disabled');action.removeAttribute('tabindex');if(sub){action.disabled=true;action.textContent='Manage in billing portal';action.removeAttribute('data-paddle-plan');action.setAttribute('aria-label','Manage your existing subscription in the billing portal');}else{action.disabled=false;action.textContent='Choose '+(name==='weekly'?'Weekly':name==='standard'?'Standard':'Premium');action.setAttribute('data-paddle-plan',name);}}\n  });\n  var status=document.getElementById('membershipStatus'),notice=document.getElementById('membershipNotice'),end=document.getElementById('membershipEnd');\n  var cancel=!!(sub&&String(sub.scheduled_change_action||'').toLowerCase()==='cancel');\n  if(status)status.textContent=cancel?'Cancellation scheduled':sub?'Active':trialActive?'Free trial active':'Trial expired';\n  if(end){var date=cancel?sub.scheduled_change_effective_at:(sub&&sub.current_period_end)||(trialActive&&data.trial.endsAt);end.textContent=date?new Date(date).toLocaleDateString():'Not applicable';var label=end.parentElement&&end.parentElement.querySelector('span');if(label)label.textContent=cancel?'Access ends':sub?'Next renewal':trialActive?'Trial ends':'Trial ended';}\n  if(notice){if(cancel)notice.textContent='Your subscription cancellation is scheduled. Your paid access remains active until the date shown above.';else if(sub)notice.textContent='Your '+plan.charAt(0).toUpperCase()+plan.slice(1)+' subscription is active. To change plans, review available options in the Open billing portal. Klypza prevents a second checkout while a paid subscription is active.';else if(trialActive)notice.textContent='Your 7-day free trial is active: 10 downloads per day and up to 5 videos per batch. Choose a paid plan whenever you are ready to continue after the trial.';else notice.textContent='Your 7-day free trial has ended. Downloads are paused. Choose Weekly for $1/week or another paid plan to continue.';}\n }\n function load(){fetch('/api/account',{cache:'no-store',credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('Account status unavailable');return r.json();}).then(applyPlanState).catch(function(e){console.warn('KLYPZA_PLAN_STATE',e);});}\n if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();\n})();\n</script>";
html = html.replace('</body>', tabController + profileDataController + passwordToggleController + passwordChangeController + billingControlsController + planStateController + '</body>');
  }
  if (path === '/plans' || path === '/dashboard') {
    const planAvailabilityController = `<script>
(function () {
  function disablePaidButtons() {
    document.querySelectorAll('[data-paddle-plan]').forEach(function (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Payments unavailable';
    });
  }
  function sync() {
    disablePaidButtons();
    fetch('/api/plans', { cache: 'no-store' })
      .then(function (response) { if (!response.ok) throw new Error('Plan availability unavailable'); return response.json(); })
      .then(function (data) {
        var plans = {};
        (data.plans || []).forEach(function (plan) { plans[plan.id] = plan; });
        document.querySelectorAll('[data-paddle-plan]').forEach(function (button) {
          var id = button.getAttribute('data-paddle-plan');
          var plan = plans[id];
          var available = !!(plan && plan.available === true);
          button.disabled = !available;
          button.setAttribute('aria-disabled', String(!available));
          button.textContent = available ? 'Choose ' + (id === 'weekly' ? 'Weekly' : id === 'standard' ? 'Standard' : 'Premium') : 'Payments unavailable';
          if (!available) button.title = 'Live Paddle billing is not configured yet.';
          else button.removeAttribute('title');
        });
      })
      .catch(disablePaidButtons);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();
</script>`;
    html = html.replace('</body>', planAvailabilityController + '</body>');
  }
  return html;
}


const SESSION_COOKIE = 'klypza_session';
const SESSION_DAYS = 30;
const FREE_START_CREDITS = 10;
const PLAN_LIMITS = {
  free: { daily: 10, batch: 5, price: 0, ads: false, quality: 'basic', queue: 'standard' },
  trial: { daily: 10, batch: 5, price: 0, ads: false, quality: 'basic', queue: 'standard' },
  standard: { daily: 60, batch: 15, price: 5.99, ads: false, quality: 'expanded', queue: 'faster' },
  weekly: { daily: 25, batch: 5, price: 1, quality: 'basic', queue: 'standard' },
  premium: { daily: 100, batch: 25, price: 9.99, ads: false, quality: 'expanded', queue: 'priority' },
};
export function resolvePaddleSubscriptionPlan(subscription,env,fallback=''){
 const items=Array.isArray(subscription?.items)?subscription.items:[];
 const priceIds=items.map(item=>String(item?.price?.id||item?.price_id||'')).filter(Boolean);
 for(const plan of ['weekly','standard','premium']){
  const configured=String(env?.['PADDLE_'+plan.toUpperCase()+'_PRICE_ID']||'');
  if(configured&&priceIds.includes(configured))return plan;
 }
 const safeFallback=String(fallback||'').toLowerCase();
 return ['weekly','standard','premium'].includes(safeFallback)?safeFallback:null;
}
export function isPaddleEventNewer(incoming,stored){
 if(!stored)return true;
 const next=Date.parse(incoming||''),previous=Date.parse(stored||'');
 return Number.isFinite(next)&&Number.isFinite(previous)&&next>=previous;
}
export function paddleSubscriptionRowId(existingId,paddleId){ return String(existingId||paddleId||'')||null; }
export function planLimits(plan){ return PLAN_LIMITS[String(plan||'free').toLowerCase()] || PLAN_LIMITS.free; }
export function selectEligiblePaidSubscription(rows,now=Date.now()){
  const priority={premium:3,standard:2,weekly:1};
  return (Array.isArray(rows)?rows:[]).filter(row=>{
    const status=String(row?.status||'').toLowerCase();
    if(['active','trialing'].includes(status))return true;
    if(status!=='past_due')return false;
    const end=row?.current_period_end?Date.parse(row.current_period_end):0;
    return Number.isFinite(end)&&end>now;
  }).sort((a,b)=>{
    const tier=(priority[String(b?.plan||'').toLowerCase()]||0)-(priority[String(a?.plan||'').toLowerCase()]||0);
    if(tier)return tier;
    const aEnd=Date.parse(a?.current_period_end||'')||0,bEnd=Date.parse(b?.current_period_end||'')||0;
    return bEnd-aEnd;
  })[0]||null;
}
export function dashboardPaidSubscription(access){ return access?.subscription?.provider==='paddle'?access.subscription:null; }
export function resolveAccountAccess(paid,trial,now=Date.now()){
  const paidStatus=String(paid?.status||'').toLowerCase(),paidEnd=paid?.current_period_end?Date.parse(paid.current_period_end):0;
  if(['active','trialing'].includes(paidStatus)||(paidStatus==='past_due'&&paidEnd>now))return {plan:String(paid.plan||'free').toLowerCase(),subscription:paid,trial:null,trialExpired:false,canDownload:true};
  if(trial){
    const end=trial.current_period_end?Date.parse(trial.current_period_end):0,active=String(trial.status||'').toLowerCase()==='trialing'&&end>now;
    return {plan:active?'trial':'free',subscription:trial,trial:{status:active?'active':'expired',startsAt:trial.current_period_start||null,endsAt:trial.current_period_end||null,daysRemaining:active?Math.max(0,Math.ceil((end-now)/86400000)):0},trialExpired:!active,canDownload:active};
  }
  // Klypza has no permanent free-download tier: every account needs an active trial or paid subscription.
  return {plan:'free',subscription:null,trial:{status:'expired',startsAt:null,endsAt:null,daysRemaining:0},trialExpired:true,canDownload:false};
}
async function getAccountAccess(user,env){
  const now=Date.now();
  const paidRows=await env.KLYPZA_DB.prepare("SELECT plan,status,current_period_end,provider,provider_subscription_id,scheduled_change_action,scheduled_change_effective_at,paddle_checked_at,updated_at,created_at,id FROM subscriptions WHERE user_id=? AND provider='paddle' AND status IN ('active','trialing','past_due')").bind(user.id).all();
  const paid=selectEligiblePaidSubscription(paidRows.results||[],now);
  const trial=await env.KLYPZA_DB.prepare("SELECT plan,status,current_period_start,current_period_end,provider FROM subscriptions WHERE user_id=? AND provider='klypza_trial' ORDER BY created_at ASC LIMIT 1").bind(user.id).first();
  return resolveAccountAccess(paid,trial,now);
}
function utcDate(){ return new Date().toISOString().slice(0,10); }
function paddleEnvironment(env){ return String(env.PADDLE_ENV||'production').toLowerCase()==='sandbox'?'sandbox':'production'; }
function paddleApiBase(env){ return paddleEnvironment(env)==='production'?'https://api.paddle.com':'https://sandbox-api.paddle.com'; }
function paddleApiKey(env){ return String(paddleEnvironment(env)==='production'?(env.PADDLE_LIVE_API_KEY||''):(env.PADDLE_API_KEY||'')); }
function paddleClientToken(env){ return String(paddleEnvironment(env)==='production'?(env.PADDLE_LIVE_CLIENT_TOKEN||''):(env.PADDLE_CLIENT_TOKEN||'')); }
function paddleWebhookSecret(env){ return String(paddleEnvironment(env)==='production'?(env.PADDLE_LIVE_WEBHOOK_SECRET||''):(env.PADDLE_WEBHOOK_SECRET||'')); }
function paddleBillingReady(env){ return Boolean(paddleApiKey(env)&&paddleClientToken(env)&&paddleWebhookSecret(env)); }

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
      {heading:'Cookies and sessions',text:'Klypza uses a session cookie to keep you signed in and a separate secure device cookie to help enforce the one-Free-account-per-device limit. A hashed device identifier is stored with the Free account; Klypza does not read email accounts stored on your device or use invasive device fingerprinting for this feature. Clearing cookies, changing browsers or using private browsing may cause a device to be treated as new. Standard and Premium accounts are not subject to this Free-plan device limit. Disabling essential cookies can prevent account features from working.'},
      {heading:'Service providers and infrastructure',text:'Klypza uses Cloudflare infrastructure to deliver the website and process requests, and a configured third-party provider to process supported video links. Information necessary to perform a request may be transmitted to these providers. Their own privacy terms may also apply.'},
      {heading:'Payments and advertising',text:'Weekly is $1/week, Standard is $5.99/month and Premium is $9.99/month. New verified accounts receive a 7-day trial with 10 video downloads per day and a 5-video batch limit. Paddle checkout is available only when the matching price is configured. Paddle processes payment and subscription information through its hosted checkout under Paddle’s own privacy terms; Klypza receives transaction and subscription status needed to provide account access. Klypza does not use third-party advertising.'},
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
      {heading:'Usage limits and plans',text:'Account limits and available features are displayed on the website. New verified accounts receive a 7-day trial with 10 video downloads per day and a 5-video batch limit. After the trial expires, downloads are paused until a paid plan is activated. Weekly is $1/week, Standard is $5.99/month and Premium is $9.99/month. Paid checkout is available only when the matching Paddle price is configured. A paid plan is activated only after Klypza verifies a signed, completed Paddle payment notification.'},
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
  return new Response(body,{headers:securityHeaders({'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=3600'})});
}
async function publicStats(env){if(!env.KLYPZA_DB)return json({users:0,downloads:0});const [u,d]=await Promise.all([env.KLYPZA_DB.prepare('SELECT COUNT(*) AS total FROM users').first(),env.KLYPZA_DB.prepare('SELECT COUNT(*) AS total FROM usage_events').first()]);return json({users:Number(u?.total||0),downloads:Number(d?.total||0)});}
export function isValidPaddleTimestamp(value){ return /^\d{1,12}$/.test(String(value)); }
export function isValidPaddleOrderTransaction(order,transaction,env){
  if(!order||!transaction||String(transaction.status||'').toLowerCase()!=='completed')return false;
  if(order.provider_reference&&String(transaction.id||'')!==String(order.provider_reference))return false;
  const custom=transaction.custom_data||{};
  if(String(custom.klypza_order_id||'')!==String(order.id||''))return false;
  if(String(custom.klypza_user_id||'')!==String(order.user_id||''))return false;
  if(String(custom.klypza_plan||'').toLowerCase()!==String(order.plan||'').toLowerCase())return false;
  const priceIds={weekly:env.PADDLE_WEEKLY_PRICE_ID,standard:env.PADDLE_STANDARD_PRICE_ID,premium:env.PADDLE_PREMIUM_PRICE_ID};
  const expectedPrice=String(priceIds[String(order.plan||'').toLowerCase()]||'');
  const items=Array.isArray(transaction.items)?transaction.items:[];
  if(!expectedPrice||items.length!==1)return false;
  const item=items[0]||{},priceId=String(item.price?.id||item.price_id||'');
  if(priceId!==expectedPrice||Number(item.quantity)!==1)return false;
  const totals=transaction.details?.totals||{};
  return String(transaction.currency_code||'').toUpperCase()==='USD'
    &&/^\d+$/.test(String(totals.subtotal||''))
    &&Number(totals.subtotal)===Number(order.amount_minor);
}

export function canActivatePaddleOrder(order,transaction,env){
  return Boolean(order&&order.status==='pending'&&String(order.currency||'').toUpperCase()==='USD'&&isValidPaddleOrderTransaction(order,transaction,env));
}

async function handlePaddleWebhook(request,env){
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,{'allow':'POST'});
 if(!paddleWebhookSecret(env))return json({error:'webhook_not_configured'},503);
 const sig=request.headers.get('Paddle-Signature')||'';const p=Object.fromEntries(sig.split(';').map(v=>{const i=v.indexOf('=');return i>0?[v.slice(0,i).trim(),v.slice(i+1).trim()]:['',''];}).filter(v=>v[0]));const ts=p.ts||'',h=p.h1||'';
 if(!isValidPaddleTimestamp(ts)||! /^[a-f0-9]{64}$/i.test(h)||Math.abs(Math.floor(Date.now()/1000)-Number(ts))>300)return json({error:'invalid_signature'},401);
 const raw=await request.text();if(raw.length>1048576)return json({error:'payload_too_large'},413);const key=await crypto.subtle.importKey('raw',enc.encode(paddleWebhookSecret(env)),{name:'HMAC',hash:'SHA-256'},false,['sign']);const mac=await crypto.subtle.sign('HMAC',key,enc.encode(ts+':'+raw));const expected=Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^h.toLowerCase().charCodeAt(i);if(diff)return json({error:'invalid_signature'},401);
 let e;try{e=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}const id=String(e.event_id||''),type=String(e.event_type||''),d=e.data||{};if(!id||!type)return json({error:'invalid_event'},400);if(!env.KLYPZA_DB)return json({error:'database_unavailable'},503);const c=d.custom_data||{},oid=String(c.klypza_order_id||''),occurredAt=String(e.occurred_at||'');
 try{await env.KLYPZA_DB.prepare('INSERT INTO payment_events(provider,event_id,order_id,event_type,occurred_at) VALUES(?,?,?,?,?)').bind('paddle',id,oid||null,type,occurredAt||null).run()}catch(err){const dup=await env.KLYPZA_DB.prepare('SELECT event_id FROM payment_events WHERE provider=? AND event_id=?').bind('paddle',id).first();if(dup)return json({ok:true,duplicate:true});throw err}
 try{
  if(type==='transaction.completed'){
   if(oid){
    const o=await env.KLYPZA_DB.prepare("SELECT id,user_id,plan,amount_minor,currency,status,provider_reference FROM payment_orders WHERE id=? AND provider='paddle'").bind(oid).first();
    if(o){
     if(!canActivatePaddleOrder(o,d,env)){
      console.error('PADDLE_TRANSACTION_VALIDATION_FAILED',id,oid);
     }else{
     const sid=String(d.subscription_id||''),bp=d.billing_period||{},start=bp.starts_at||d.billed_at||occurredAt||new Date().toISOString(),end=bp.ends_at||null;
     const existingSub=sid?await env.KLYPZA_DB.prepare("SELECT id,paddle_event_occurred_at FROM subscriptions WHERE user_id=? AND provider='paddle' AND provider_subscription_id=? ORDER BY updated_at DESC,id DESC LIMIT 1").bind(o.user_id,sid).first():null;
     const subscriptionRowId=paddleSubscriptionRowId(existingSub?.id,sid);
     const applyEvent=isPaddleEventNewer(occurredAt,existingSub?.paddle_event_occurred_at);
     const statements=[env.KLYPZA_DB.prepare("UPDATE payment_orders SET status='completed',provider_reference=?,period_start=?,period_end=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND provider='paddle'").bind(String(d.id||''),start,end,oid)];
     if(applyEvent&&subscriptionRowId)statements.push(env.KLYPZA_DB.prepare("UPDATE users SET plan=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(o.plan,o.user_id));
     if(subscriptionRowId)statements.push(env.KLYPZA_DB.prepare("INSERT INTO subscriptions(id,user_id,plan,status,provider,provider_subscription_id,current_period_start,current_period_end,paddle_event_occurred_at) VALUES(?,?,?,'active','paddle',?,?,?,?) ON CONFLICT(id) DO UPDATE SET plan=CASE WHEN subscriptions.paddle_event_occurred_at IS NULL OR (excluded.paddle_event_occurred_at IS NOT NULL AND excluded.paddle_event_occurred_at>=subscriptions.paddle_event_occurred_at) THEN excluded.plan ELSE subscriptions.plan END,status=CASE WHEN subscriptions.paddle_event_occurred_at IS NULL OR (excluded.paddle_event_occurred_at IS NOT NULL AND excluded.paddle_event_occurred_at>=subscriptions.paddle_event_occurred_at) THEN 'active' ELSE subscriptions.status END,provider_subscription_id=COALESCE(excluded.provider_subscription_id,subscriptions.provider_subscription_id),current_period_start=CASE WHEN subscriptions.paddle_event_occurred_at IS NULL OR (excluded.paddle_event_occurred_at IS NOT NULL AND excluded.paddle_event_occurred_at>=subscriptions.paddle_event_occurred_at) THEN COALESCE(excluded.current_period_start,subscriptions.current_period_start) ELSE subscriptions.current_period_start END,current_period_end=CASE WHEN subscriptions.paddle_event_occurred_at IS NULL OR (excluded.paddle_event_occurred_at IS NOT NULL AND excluded.paddle_event_occurred_at>=subscriptions.paddle_event_occurred_at) THEN COALESCE(excluded.current_period_end,subscriptions.current_period_end) ELSE subscriptions.current_period_end END,paddle_event_occurred_at=CASE WHEN subscriptions.paddle_event_occurred_at IS NULL OR (excluded.paddle_event_occurred_at IS NOT NULL AND excluded.paddle_event_occurred_at>=subscriptions.paddle_event_occurred_at) THEN COALESCE(excluded.paddle_event_occurred_at,subscriptions.paddle_event_occurred_at) ELSE subscriptions.paddle_event_occurred_at END,updated_at=CURRENT_TIMESTAMP").bind(subscriptionRowId,o.user_id,o.plan,sid||null,start,end,occurredAt||null));
     await env.KLYPZA_DB.batch(statements);
     }
    }
   }
  }else if(type.startsWith('subscription.')){
   const sid=String(d.id||''),uid=String(c.klypza_user_id||''),plan=String(c.klypza_plan||''),bp=d.current_billing_period||{},sc=d.scheduled_change||{},scheduledAction=String(sc.action||''),scheduledAt=sc.effective_at||null,status=String(d.status||'active').toLowerCase();
   if(sid){
    const old=await env.KLYPZA_DB.prepare("SELECT id,user_id,plan,paddle_event_occurred_at FROM subscriptions WHERE provider='paddle' AND provider_subscription_id=? ORDER BY updated_at DESC,id DESC LIMIT 1").bind(sid).first();
    const userId=old?.user_id||uid,pl=resolvePaddleSubscriptionPlan(d,env,old?.plan||plan);
    const applyEvent=isPaddleEventNewer(occurredAt,old?.paddle_event_occurred_at);
    if(userId&&pl&&applyEvent){
     await env.KLYPZA_DB.batch([
      env.KLYPZA_DB.prepare("INSERT INTO subscriptions(id,user_id,plan,status,provider,provider_subscription_id,current_period_start,current_period_end,scheduled_change_action,scheduled_change_effective_at,paddle_event_occurred_at) VALUES(?,?,?,?,'paddle',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET plan=excluded.plan,status=excluded.status,current_period_start=COALESCE(excluded.current_period_start,subscriptions.current_period_start),current_period_end=COALESCE(excluded.current_period_end,subscriptions.current_period_end),scheduled_change_action=excluded.scheduled_change_action,scheduled_change_effective_at=excluded.scheduled_change_effective_at,paddle_event_occurred_at=COALESCE(excluded.paddle_event_occurred_at,subscriptions.paddle_event_occurred_at),updated_at=CURRENT_TIMESTAMP").bind(paddleSubscriptionRowId(old?.id,sid),userId,pl,status,sid,bp.starts_at||null,bp.ends_at||null,scheduledAction||null,scheduledAt,occurredAt||null),
      env.KLYPZA_DB.prepare("UPDATE users SET plan=? WHERE id=?").bind((['active','trialing'].includes(status)||(status==='past_due'&&bp.ends_at&&Date.parse(bp.ends_at)>Date.now()))?pl:'free',userId)
     ]);
    }
   }
  }
 }catch(err){await env.KLYPZA_DB.prepare('DELETE FROM payment_events WHERE provider=? AND event_id=?').bind('paddle',id).run();throw err}
 return json({ok:true,received:true});
}
async function createPaddleCheckout(request,env){
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,{'allow':'POST'});
 if(!paddleBillingReady(env))return json({error:'billing_not_configured',message:'Paddle billing is not fully configured for this environment.'},503);
 const user=await getSessionUser(request,env);if(!user)return json({error:'login_required',message:'Please log in before choosing a paid plan.'},401);
 if(Number(user.email_verified)!==1)return json({error:'email_not_verified',message:'Verify your email address before purchasing a subscription.'},403);
 const existing=await env.KLYPZA_DB.prepare("SELECT id,plan,status FROM subscriptions WHERE user_id=? AND provider='paddle' AND (status IN ('active','trialing','paused') OR (status='past_due' AND current_period_end>?)) ORDER BY CASE WHEN status IN ('active','trialing') THEN 3 WHEN status='past_due' THEN 2 ELSE 1 END DESC,CASE plan WHEN 'premium' THEN 3 WHEN 'standard' THEN 2 WHEN 'weekly' THEN 1 ELSE 0 END DESC,updated_at DESC LIMIT 1").bind(user.id,new Date().toISOString()).first();
 if(existing)return json({error:'subscription_exists',message:'You already have a paid subscription. Manage or change it from your billing portal to avoid duplicate charges.'},409);
 const body=await readJson(request);const plan=String(body?.plan||'').toLowerCase();
 const mode=paddleEnvironment(env);
 const catalog={weekly:{priceId:String(env.PADDLE_WEEKLY_PRICE_ID||''),amount:100},standard:{priceId:String(env.PADDLE_STANDARD_PRICE_ID||''),amount:599},premium:{priceId:String(env.PADDLE_PREMIUM_PRICE_ID||''),amount:999}};
 const selected=catalog[plan];if(!selected)return json({error:'invalid_plan',message:'Choose Weekly, Standard or Premium.'},400);
 if(!selected.priceId)return json({error:'billing_not_configured',message:'The Paddle price ID for this plan is not configured yet.'},503);
 {
   let priceResponse,pricePayload;try{priceResponse=await fetch(paddleApiBase(env)+'/prices/'+encodeURIComponent(selected.priceId),{headers:{'Authorization':'Bearer '+paddleApiKey(env),'Paddle-Version':'1','Accept':'application/json'}});pricePayload=await priceResponse.json();}catch(err){console.error('PADDLE_PRICE_CHECK',plan,String(err));return json({error:'price_validation_unavailable',message:'Klypza could not verify this plan price. Please try again.'},502);}
   const price=pricePayload?.data||{},cycle=price.billing_cycle||{},unit=price.unit_price||{};
   const expectedInterval=plan==='weekly'?'week':'month';
   const expectedAmount=String(selected.amount);
   if(!priceResponse.ok||cycle.interval!==expectedInterval||Number(cycle.frequency)!==1||String(unit.amount)!==expectedAmount||String(unit.currency_code||'').toUpperCase()!=='USD'){
     console.error('PADDLE_PRICE_MISMATCH',plan,{interval:cycle.interval,frequency:cycle.frequency,amount:String(unit.amount||''),currency:String(unit.currency_code||'')});
     return json({error:'price_mismatch',message:'The configured Paddle price does not match the selected Klypza plan. Checkout is paused to prevent an incorrect charge.'},503);
   }
 }
 const orderId=crypto.randomUUID();
 await env.KLYPZA_DB.prepare("INSERT INTO payment_orders(id,user_id,plan,amount_minor,currency,status,provider) VALUES(?,?,?,?,'USD','pending','paddle')").bind(orderId,user.id,plan,selected.amount).run();
 let response,data;try{response=await fetch(paddleApiBase(env)+'/transactions',{method:'POST',headers:{'Authorization':'Bearer '+paddleApiKey(env),'Paddle-Version':'1','Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({items:[{price_id:selected.priceId,quantity:1}],collection_mode:'automatic',enable_checkout:true,custom_data:{klypza_order_id:orderId,klypza_user_id:user.id,klypza_plan:plan}})});data=await response.json();}catch(err){await env.KLYPZA_DB.prepare("UPDATE payment_orders SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(orderId).run();console.error('PADDLE_CREATE_TRANSACTION',String(err));return json({error:'checkout_unavailable',message:'Unable to contact the payment provider. Please try again.'},502);}
 const txn=data?.data;if(!response.ok||!txn?.id){await env.KLYPZA_DB.prepare("UPDATE payment_orders SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(orderId).run();console.error('PADDLE_CREATE_TRANSACTION_FAILED',response.status,JSON.stringify(data).slice(0,1200));return json({error:'checkout_unavailable',message:'Paddle could not create the checkout. Please try again.'},502);}
 await env.KLYPZA_DB.prepare("UPDATE payment_orders SET provider_reference=?,checkout_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(txn.id,txn.checkout?.url||null,orderId).run();
 return json({ok:true,transactionId:txn.id,orderId,plan,email:user.email,environment:mode});
}
async function createPaddlePortalLink(request,env){
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,{'allow':'POST'});
 if(!paddleApiKey(env))return json({error:'billing_not_configured',message:'Billing management is not configured.'},503);
 const user=await getSessionUser(request,env);if(!user)return json({error:'login_required',message:'Please log in again.'},401);
 const body=await readJson(request);const action=String(body?.action||'overview');if(!['overview','cancel','payment_method'].includes(action))return json({error:'invalid_action'},400);
 const subscriptionRows=await env.KLYPZA_DB.prepare("SELECT provider_subscription_id,plan,status FROM subscriptions WHERE user_id=? AND provider='paddle' AND provider_subscription_id IS NOT NULL ORDER BY CASE WHEN status='active' THEN 3 WHEN status='past_due' THEN 2 WHEN status='paused' THEN 1 ELSE 0 END DESC,CASE plan WHEN 'premium' THEN 3 WHEN 'standard' THEN 2 WHEN 'weekly' THEN 1 ELSE 0 END DESC,updated_at DESC,current_period_end DESC,id DESC").bind(user.id).all();
 const manageable=(subscriptionRows.results||[]).filter(row=>['active','past_due','paused'].includes(String(row.status||'').toLowerCase()));
 const subscriptionIds=[...new Set(manageable.map(row=>String(row.provider_subscription_id||'')).filter(Boolean))];
 const sub=manageable[0];
 if(!sub?.provider_subscription_id||!subscriptionIds.length)return json({error:'subscription_not_manageable',message:'No manageable Paddle subscription was found for this account.'},404);
 const base=paddleApiBase(env);const headers={'Authorization':'Bearer '+paddleApiKey(env),'Paddle-Version':'1','Content-Type':'application/json','Accept':'application/json'};
 let sr,sd;try{sr=await fetch(base+'/subscriptions/'+encodeURIComponent(sub.provider_subscription_id),{headers});sd=await sr.json();}catch(err){console.error('PADDLE_SUBSCRIPTION_LOOKUP',String(err));return json({error:'paddle_unavailable',message:'Unable to contact Paddle. Please try again.'},502);}
 if(!sr.ok||!sd?.data?.customer_id){console.error('PADDLE_SUBSCRIPTION_LOOKUP_FAILED',sr.status,JSON.stringify(sd).slice(0,800));return json({error:'paddle_subscription_lookup_failed',message:'Paddle could not verify this subscription. Check API key permissions.'},502);}
 let pr,pd;try{pr=await fetch(base+'/customers/'+encodeURIComponent(sd.data.customer_id)+'/portal-sessions',{method:'POST',headers,body:JSON.stringify({subscription_ids:subscriptionIds})});pd=await pr.json();}catch(err){console.error('PADDLE_PORTAL_SESSION',String(err));return json({error:'paddle_unavailable',message:'Unable to create a secure billing portal session.'},502);}
 if(!pr.ok){console.error('PADDLE_PORTAL_SESSION_FAILED',pr.status,JSON.stringify(pd).slice(0,1000));return json({error:'portal_unavailable',message:pr.status===403?'Paddle API key needs Customer portal session (Write) permission.':'Paddle could not create the billing portal session.'},502);}
 const urls=pd?.data?.urls||{};const subscriptionLinks=(urls.subscriptions||[]).find(x=>x.id===sub.provider_subscription_id);const target=action==='cancel'?subscriptionLinks?.cancel_subscription:action==='payment_method'?subscriptionLinks?.update_subscription_payment_method:urls.general?.overview;
 if(!target)return json({error:'portal_link_missing',message:'Paddle did not return the requested portal link.'},502);
 return json({ok:true,url:target,action,environment:paddleEnvironment(env)});
}
async function accountRouter(request, env, url) {
  const path = url.pathname;
  if (!env.KLYPZA_DB) return json({error:'database_unavailable',message:'Account storage is not configured.'},503);
  if (path === '/api/auth/register' && request.method === 'POST') return registerAccount(request,env);
  if (path === '/api/auth/resend-verification' && request.method === 'POST') return resendVerificationEmail(request,env);
  if (path === '/api/auth/login' && request.method === 'POST') return loginAccount(request,env);
  if (path === '/api/auth/forgot-password' && request.method === 'POST') return requestPasswordReset(request,env);
  if (path === '/api/auth/reset-password' && request.method === 'POST') return completePasswordReset(request,env);
  if (path === '/api/auth/logout' && request.method === 'POST') return logoutAccount(request,env);
  if (path === '/api/auth/me' && request.method === 'GET') {
    const user=await getSessionUser(request,env);
    return user?json({authenticated:true,user:publicUser(user)}):json({authenticated:false},401);
  }
  if (path === '/api/account' && request.method === 'GET') return accountOverview(request,env);
  if (path === '/api/account/profile' && request.method === 'POST') return updateAccountProfile(request,env);
  if (path === '/api/account/password' && request.method === 'POST') return changeAccountPassword(request,env);
  if (path === '/api/batch/start' && request.method === 'POST') return startDownloadBatch(request,env);
  if (path === '/api/billing/config' && request.method === 'GET') return paddleBillingReady(env) ? json({clientToken:paddleClientToken(env),environment:paddleEnvironment(env)}) : json({error:'billing_not_configured'},503);
  if (path === '/api/billing/checkout' && request.method === 'POST') return createPaddleCheckout(request,env);
  if (path === '/api/billing/portal' && request.method === 'POST') return createPaddlePortalLink(request,env);
  if (path === '/api/plans' && request.method === 'GET') { const billingReady=paddleBillingReady(env); return json({currency:'USD',billingPeriod:'mixed',testPricing:paddleEnvironment(env)==='sandbox',plans:[
    {id:'weekly',name:'Weekly',price:1,billingPeriod:'week',dailyLimit:25,batchLimit:5,zip:true,quality:'Basic',queue:'Standard',available:billingReady&&Boolean(env.PADDLE_WEEKLY_PRICE_ID)},
    {id:'standard',name:'Standard',price:5.99,billingPeriod:'month',dailyLimit:60,batchLimit:15,zip:true,quality:'Expanded',queue:'Faster',available:billingReady&&Boolean(env.PADDLE_STANDARD_PRICE_ID)},
    {id:'premium',name:'Premium',price:9.99,billingPeriod:'month',dailyLimit:100,batchLimit:25,zip:true,quality:'Expanded',queue:'Priority',available:billingReady&&Boolean(env.PADDLE_PREMIUM_PRICE_ID)}
  ]}); }
  return null;
}
async function startDownloadBatch(request,env){
  let user=await getSessionUser(request,env);
  if(!user)return json({error:'login_required',message:'Please log in to start downloading.'},401);
  if(Number(user.email_verified)!==1)return json({error:'email_not_verified',message:'Verify your email address before downloading. Check your inbox or request a new verification link from your dashboard.'},403);
  const access=await getAccountAccess(user,env);if(!access.canDownload)return json({error:'trial_expired',message:'Your 7-day free trial has ended. Choose a paid Klypza plan to continue downloading.'},402);
  user={...user,plan:access.plan};const limits=planLimits(user.plan);
  const body=await readJson(request);
  const requested=Number(body?.batchSize || 5);
  const tier=String(user.plan||'free').toLowerCase();
  const allowed=tier==='premium'?[5,10,15,20,25]:tier==='standard'?[5,10,15]:[5];
  if(!allowed.includes(requested))return json({error:'batch_option_locked',message:'This batch size is not included in your current plan. Please upgrade to unlock it.'},403);
  const day=utcDate();
  const usedRow=await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first();
  const used=Number(usedRow?.used||0);
  if(used>=limits.daily)return json({error:'daily_limit_reached',message:'Your daily download quota is used up. It resets at 00:00 UTC.'},429);
  const batchId=crypto.randomUUID();
  await env.KLYPZA_DB.prepare('INSERT INTO download_batches(id,user_id,max_videos) VALUES(?,?,?)').bind(batchId,user.id,requested).run();
  return json({ok:true,batchId,maxBatch:requested,planMaxBatch:limits.batch,dailyLimit:limits.daily,usedToday:used,remaining:limits.daily-used});
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
function publicUser(u){return {id:u.id,email:u.email,name:u.display_name,credits:Number(u.credits),plan:u.plan,emailVerified:Number(u.email_verified)===1,createdAt:u.created_at||null};}
async function readJson(request){
  try {
    const declared=Number(request.headers.get('Content-Length')||0);
    if(declared>16384)return null;
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>16384)return null;
    const data=JSON.parse(raw);
    return data&&typeof data==='object'&&!Array.isArray(data)?data:null;
  } catch { return null; }
}
function cookieToken(request){
  const raw=request.headers.get('Cookie')||'';
  const found=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='));
  if(!found)return '';
  try { return decodeURIComponent(found.slice(SESSION_COOKIE.length+1)); }
  catch { return ''; }
}
const DEVICE_COOKIE='klypza_device';
function cookieValue(request,name){
  const raw=request.headers.get('Cookie')||'';
  const found=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  if(!found)return '';
  try{return decodeURIComponent(found.slice(name.length+1));}catch{return '';}
}
function deviceCookie(token){
  return DEVICE_COOKIE+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000';
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
  return await env.KLYPZA_DB.prepare('SELECT u.id,u.email,u.display_name,u.credits,u.plan,u.email_verified,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(tokenHash,new Date().toISOString()).first();
}
async function registerAccount(request,env){
  const origin=request.headers.get('Origin'); if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const data=await readJson(request); const email=String(data?.email||'').trim().toLowerCase();
  const password=String(data?.password||''); const name=String(data?.name||'').trim();
  if(name.length<2||name.length>60)return json({message:'Please enter your name (2–60 characters).'},400);
  if(!email || email.length>190 || email.includes(' ') || !email.includes('@') || email.lastIndexOf('.')<email.indexOf('@')+2)return json({message:'Enter a valid email address.'},400);
  if(password.length<10||password.length>128)return json({message:'Password must contain 10–128 characters.'},400);
  if(!env.RESEND_API_KEY)return json({message:'Email verification is temporarily unavailable. Please try again later.'},503);
  const existing=await env.KLYPZA_DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
  if(existing)return json({message:'An account with this email already exists. Log in instead.'},409);
  const deviceToken=cookieValue(request,DEVICE_COOKIE)||randomToken();
  const deviceHash=await sha256(deviceToken);
  const claimed=await env.KLYPZA_DB.prepare("SELECT c.user_id FROM free_device_claims c JOIN users u ON u.id=c.user_id WHERE c.device_hash=? AND u.plan='free'").bind(deviceHash).first();
  if(claimed)return json({message:'This device already has a Free account. Please log in to your existing account. Standard and Premium accounts are not subject to this device limit.'},409,{'set-cookie':deviceCookie(deviceToken)});
  const id=crypto.randomUUID(),salt=randomToken(),hash=await passwordHash(password,salt);
  try {
    await env.KLYPZA_DB.batch([
      env.KLYPZA_DB.prepare('INSERT INTO users(id,email,display_name,password_hash,password_salt,credits,plan,email_verified) VALUES(?,?,?,?,?,?,?,0)').bind(id,email,name,hash,salt,0,'free'),
      env.KLYPZA_DB.prepare('INSERT INTO free_device_claims(device_hash,user_id,created_at) VALUES(?,?,?)').bind(deviceHash,id,new Date().toISOString())
    ]);
  } catch(err) {
    const duplicate=await env.KLYPZA_DB.prepare("SELECT c.user_id FROM free_device_claims c JOIN users u ON u.id=c.user_id WHERE c.device_hash=? AND u.plan='free'").bind(deviceHash).first();
    if(duplicate)return json({message:'This device already has a Free account. Please log in to your existing account.'},409,{'set-cookie':deviceCookie(deviceToken)});
    throw err;
  }
  const sent=await issueVerificationEmail(id,email,env,new URL(request.url).origin);
  const sessionCookie=await createSession(id,env);
  const response=json({ok:true,pendingVerification:true,message:sent?'Account created. Check your inbox for the verification link.':'Your account was created, but the verification email could not be sent. Log in and request a new link from your dashboard.'},201,{'set-cookie':sessionCookie});
  response.headers.append('set-cookie',deviceCookie(deviceToken));
  return response;
}
async function issueVerificationEmail(userId,email,env,siteOrigin='https://klypza.web.id'){
  const token=randomToken(), tokenHash=await sha256(token);
  const expires=new Date(Date.now()+30*60*1000).toISOString();
  await env.KLYPZA_DB.prepare('DELETE FROM email_verification_tokens WHERE user_id=?').bind(userId).run();
  await env.KLYPZA_DB.prepare('INSERT INTO email_verification_tokens(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(tokenHash,userId,expires).run();
  const safeOrigin=/^https:\/\/(?:klypza\.web\.id|klypza-staging\.cokso344\.workers\.dev)$/.test(siteOrigin)?siteOrigin:'https://klypza.web.id';
  const verifyUrl=safeOrigin+'/api/auth/verify-email?token='+encodeURIComponent(token);
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({
      from:'Klypza <verify@klypza.web.id>',
      to:[email],
      subject:'Verify your Klypza email address',
      html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;color:#111936;border:1px solid #e5e8f2;border-radius:18px"><h1 style="margin-top:0">Verify your email</h1><p>Thanks for creating a Klypza account. Confirm your email address to activate your account and start your 7-day Klypza trial: 10 video downloads per day, up to 5 videos per batch.</p><p style="margin:28px 0"><a href="'+verifyUrl+'" style="display:inline-block;padding:13px 20px;background:#2878f0;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold">Verify email address</a></p><p>This link expires in 30 minutes and can only be used once. If you did not create this account, you can ignore this email.</p><p style="color:#64708a;font-size:13px">Klypza · klypza.web.id</p></div>',
      text:'Verify your Klypza email address: '+verifyUrl+'\nThis link expires in 30 minutes and can only be used once.'
    })});
    if(!response.ok){console.error('RESEND_EMAIL_ERROR',response.status,await response.text());return false;}
    return true;
  }catch(err){console.error('RESEND_EMAIL_ERROR',String(err));return false;}
}
async function resendVerificationEmail(request,env){
  const origin=request.headers.get('Origin'); if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const data=await readJson(request); const email=String(data?.email||'').trim().toLowerCase();
  if(!email||email.length>190)return json({ok:true,message:'If the account needs verification, a new email will be sent.'});
  const user=await env.KLYPZA_DB.prepare('SELECT id,email,email_verified FROM users WHERE email=?').bind(email).first();
  if(user&&Number(user.email_verified)!==1){
    const recent=await env.KLYPZA_DB.prepare("SELECT created_at FROM email_verification_tokens WHERE user_id=? AND created_at>datetime('now','-60 seconds') LIMIT 1").bind(user.id).first();
    if(!recent){
      const sent=await issueVerificationEmail(user.id,user.email,env,new URL(request.url).origin);
      if(!sent)return json({message:'The verification email could not be sent. Please try again later.'},502);
    }
  }
  return json({ok:true,message:'If the account needs verification, a new email will be sent.'});
}
async function verifyEmailToken(url,env){
  const token=String(url.searchParams.get('token')||'');
  if(!/^[A-Za-z0-9_-]{40,60}$/.test(token))return verificationResultPage(false,'This verification link is invalid or incomplete.',url.origin);
  const tokenHash=await sha256(token);
  const row=await env.KLYPZA_DB.prepare('SELECT user_id FROM email_verification_tokens WHERE token_hash=? AND expires_at>?').bind(tokenHash,new Date().toISOString()).first();
  if(!row)return verificationResultPage(false,'This verification link has expired or has already been used. Log in and request a new link.',url.origin);
  await env.KLYPZA_DB.batch([
    env.KLYPZA_DB.prepare('UPDATE users SET email_verified=1,credits=? WHERE id=? AND email_verified=0').bind(FREE_START_CREDITS,row.user_id),
    env.KLYPZA_DB.prepare("INSERT INTO credit_transactions(id,user_id,amount,balance_after,reason) SELECT ?,?,?,?,'welcome_credits' WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND email_verified=1 AND credits=?) AND NOT EXISTS(SELECT 1 FROM credit_transactions WHERE user_id=? AND reason='welcome_credits')").bind(crypto.randomUUID(),row.user_id,FREE_START_CREDITS,FREE_START_CREDITS,row.user_id,FREE_START_CREDITS,row.user_id),
    env.KLYPZA_DB.prepare("INSERT INTO subscriptions(id,user_id,plan,status,provider,current_period_start,current_period_end) SELECT ?,?,'weekly','trialing','klypza_trial',?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND email_verified=1) AND NOT EXISTS(SELECT 1 FROM subscriptions WHERE user_id=? AND provider='klypza_trial')").bind(crypto.randomUUID(),row.user_id,new Date().toISOString(),new Date(Date.now()+7*86400000).toISOString(),row.user_id,row.user_id),
    env.KLYPZA_DB.prepare('DELETE FROM email_verification_tokens WHERE token_hash=?').bind(tokenHash)
  ]);
  const user=await env.KLYPZA_DB.prepare('SELECT email_verified FROM users WHERE id=?').bind(row.user_id).first();
  return verificationResultPage(Number(user?.email_verified)===1,'Your email address is verified. Your 7-day Klypza trial is now active: 10 video downloads per day and up to 5 videos per batch.',url.origin);
}
function verificationResultPage(ok,message,siteOrigin='https://klypza.web.id'){
  const safeOrigin=/^https:\/\/(?:klypza\.web\.id|klypza-staging\.cokso344\.workers\.dev)$/.test(siteOrigin)?siteOrigin:'https://klypza.web.id';
  const safe=String(message).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const body='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Email verification | Klypza</title><body style="margin:0;background:#f5f7fc;color:#111936;font:16px/1.6 Arial,sans-serif"><main style="max-width:540px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e4e8f2;border-radius:20px"><h1>'+(ok?'Email verified':'Verification link unavailable')+'</h1><p>'+safe+'</p><a href="https://klypza.web.id/login" style="display:inline-block;margin-top:16px;padding:12px 18px;border-radius:10px;background:#2878f0;color:white;text-decoration:none;font-weight:bold">Continue to Klypza</a></main></body></html>';
  return new Response(body,{status:200,headers:securityHeaders({'content-type':'text/html; charset=utf-8','cache-control':'no-store'})});
}
async function requestPasswordReset(request,env){
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
 const data=await readJson(request),email=String(data?.email||'').trim().toLowerCase(),generic='If an account with that email exists, a reset link will be sent shortly.';
 if(!email||email.length>190||!email.includes('@'))return json({ok:true,message:generic});
 await env.KLYPZA_DB.prepare("CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
 const user=await env.KLYPZA_DB.prepare('SELECT id,email FROM users WHERE email=?').bind(email).first();
 if(user&&env.RESEND_API_KEY){
  const recent=await env.KLYPZA_DB.prepare("SELECT token_hash FROM password_reset_tokens WHERE user_id=? AND created_at>datetime('now','-60 seconds') LIMIT 1").bind(user.id).first();
  if(!recent){
   const token=randomToken(),hash=await sha256(token),expires=new Date(Date.now()+30*60*1000).toISOString();
   await env.KLYPZA_DB.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').bind(user.id).run();
   await env.KLYPZA_DB.prepare('INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(hash,user.id,expires).run();
   const link='https://klypza.web.id/reset-password?token='+encodeURIComponent(token);
   try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:'Klypza <verify@klypza.web.id>',to:[user.email],subject:'Reset your Klypza password',html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;color:#111936;border:1px solid #e5e8f2;border-radius:18px"><h1>Reset your password</h1><p>Use the link below to choose a new password for your Klypza account.</p><p><a href="'+link+'" style="display:inline-block;padding:13px 20px;background:#2878f0;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold">Choose a new password</a></p><p>This link expires in 30 minutes and can only be used once. Ignore this email if you did not request it.</p></div>',text:'Reset your Klypza password: '+link+'\nExpires in 30 minutes.'})});if(!r.ok)console.error('PASSWORD_RESET_EMAIL_ERROR',r.status,await r.text());}catch(e){console.error('PASSWORD_RESET_EMAIL_ERROR',String(e));}
  }
 }
 return json({ok:true,message:generic});
}
async function completePasswordReset(request,env){
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
 const data=await readJson(request),token=String(data?.token||''),password=String(data?.password||'');
 if(!/^[A-Za-z0-9_-]{40,60}$/.test(token))return json({message:'Reset link invalid or expired. Request a new link.'},400);
 if(password.length<10||password.length>128)return json({message:'Password must contain 10–128 characters.'},400);
 await env.KLYPZA_DB.prepare("CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
 const hash=await sha256(token),row=await env.KLYPZA_DB.prepare('SELECT user_id FROM password_reset_tokens WHERE token_hash=? AND expires_at>?').bind(hash,new Date().toISOString()).first();
 if(!row)return json({message:'Reset link expired or already used. Request a new link.'},400);
 const salt=randomToken(),passwordHashValue=await passwordHash(password,salt);
 const results=await env.KLYPZA_DB.batch([
  env.KLYPZA_DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=(SELECT user_id FROM password_reset_tokens WHERE token_hash=? AND expires_at>?)').bind(passwordHashValue,salt,hash,new Date().toISOString()),
  env.KLYPZA_DB.prepare('DELETE FROM sessions WHERE user_id=(SELECT user_id FROM password_reset_tokens WHERE token_hash=? AND expires_at>?)').bind(hash,new Date().toISOString()),
  env.KLYPZA_DB.prepare('DELETE FROM password_reset_tokens WHERE token_hash=?').bind(hash)
 ]);
 if(!results[0] || Number(results[0].meta?.changes||0)!==1)return json({message:'Reset link expired or already used. Request a new link.'},400);
 return json({ok:true,message:'Password updated. Please log in with your new password.'});
}
function resetPasswordPage(url){
 const token=String(url.searchParams.get('token')||'').replace(/[^A-Za-z0-9_-]/g,'');
 const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Reset password | Klypza</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f5f7fc;color:#111936;font:16px/1.5 system-ui,sans-serif}.card{max-width:460px;margin:8vh auto;padding:28px;background:white;border:1px solid #e4e8f2;border-radius:18px}label{display:block;margin:16px 0 6px;font-weight:650}input{width:100%;padding:13px;border:1px solid #d8deea;border-radius:10px;font:inherit}.password-row{display:flex;align-items:center;gap:10px}.password-row input{flex:1;min-width:0}.toggle{flex:0 0 auto;padding:12px 16px;border:1px solid #d8deea;border-radius:10px;background:#fff;color:#245fc5;font:inherit;font-weight:650;cursor:pointer;min-width:76px}button{padding:13px;border:0;border-radius:10px;background:#2878f0;color:white;font-weight:700;cursor:pointer}.message{font-size:.9rem}\n\n</style></head><body><main class="card"><h1>Choose a new password</h1><p>Use at least 10 characters.</p><form id="form"><label for="p">New password</label><div class="password-row"><input id="p" type="password" minlength="10" maxlength="128" autocomplete="new-password" required><button class="toggle" type="button" id="showp" aria-label="Show new password" aria-pressed="false">Show</button></div><label for="c">Confirm new password</label><div class="password-row"><input id="c" type="password" minlength="10" maxlength="128" autocomplete="new-password" required><button class="toggle" type="button" id="showc" aria-label="Show password confirmation" aria-pressed="false">Show</button></div><button type="submit" id="submit">Save new password</button><p id="msg" class="message" role="status"></p></form><a href="/login">Back to login</a></main><script>const token='+JSON.stringify(token)+';function toggle(id,b){const x=document.getElementById(id);const visible=x.type==="password";x.type=visible?"text":"password";b.textContent=visible?"Hide":"Show";b.setAttribute("aria-pressed",String(visible));b.setAttribute("aria-label",(visible?"Hide ":"Show ")+(id==="p"?"new password":"password confirmation"))}document.getElementById("showp").onclick=e=>toggle("p",e.currentTarget);document.getElementById("showc").onclick=e=>toggle("c",e.currentTarget);document.getElementById("form").onsubmit=async e=>{e.preventDefault();const p=document.getElementById("p").value,c=document.getElementById("c").value,m=document.getElementById("msg"),b=document.getElementById("submit");if(p!==c){m.textContent="Passwords do not match.";return}b.disabled=true;m.textContent="Saving…";try{const r=await fetch("/api/auth/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,password:p})}),d=await r.json();if(!r.ok)throw Error(d.message);m.textContent=d.message;document.getElementById("form").reset()}catch(x){m.textContent=x.message}finally{b.disabled=false}};</script></body></html>';
 return new Response(body,{headers:securityHeaders({'content-type':'text/html; charset=utf-8','cache-control':'no-store'})});
}
async function loginAccount(request,env){
  const origin=request.headers.get('Origin'); if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const data=await readJson(request); const email=String(data?.email||'').trim().toLowerCase(); const password=String(data?.password||'');
  if(!email||!password)return json({message:'Enter your email and password.'},400);
  await env.KLYPZA_DB.prepare("CREATE TABLE IF NOT EXISTS auth_login_attempts (ip_hash TEXT PRIMARY KEY, window_started_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)").run();
  const ip= request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash=await sha256('klypza-login:'+ip);
  const now=Date.now(), windowStart=new Date(now-15*60*1000).toISOString();
  const attempt=await env.KLYPZA_DB.prepare('SELECT window_started_at,attempts FROM auth_login_attempts WHERE ip_hash=?').bind(ipHash).first();
  if(attempt && new Date(attempt.window_started_at).getTime()>now-15*60*1000 && Number(attempt.attempts)>=10){
    return json({message:'Too many unsuccessful login attempts. Please wait 15 minutes before trying again.'},429);
  }
  const user=await env.KLYPZA_DB.prepare('SELECT id,email,display_name,password_hash,password_salt,credits,plan,email_verified FROM users WHERE email=?').bind(email).first();
  const actual=user?await passwordHash(password,user.password_salt):'';
  if(!user||actual!==user.password_hash){
    const timestamp=new Date(now).toISOString();
    await env.KLYPZA_DB.prepare("INSERT INTO auth_login_attempts(ip_hash,window_started_at,attempts) VALUES(?,?,1) ON CONFLICT(ip_hash) DO UPDATE SET attempts=CASE WHEN auth_login_attempts.window_started_at<=? THEN 1 ELSE auth_login_attempts.attempts+1 END,window_started_at=CASE WHEN auth_login_attempts.window_started_at<=? THEN excluded.window_started_at ELSE auth_login_attempts.window_started_at END").bind(ipHash,timestamp,windowStart,windowStart).run();
    return json({message:'Email or password is incorrect.'},401);
  }
  await env.KLYPZA_DB.prepare('DELETE FROM auth_login_attempts WHERE ip_hash=?').bind(ipHash).run();
  await env.KLYPZA_DB.prepare('DELETE FROM sessions WHERE user_id=? AND expires_at<=?').bind(user.id,new Date().toISOString()).run();
  const cookie=await createSession(user.id,env);
  return json({ok:true,user:publicUser(user)},200,{'set-cookie':cookie});
}
async function logoutAccount(request,env){
  const origin=request.headers.get('Origin');
  if(origin && origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const token=cookieToken(request);
  if(token){await env.KLYPZA_DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();}
  return json({ok:true},200,{'set-cookie':SESSION_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
}
async function changeAccountPassword(request,env){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return json({message:'Request origin rejected.'},403);
  const user=await getSessionUser(request,env); if(!user)return json({message:'Please log in again.'},401);
  const data=await readJson(request),current=String(data?.currentPassword||''),next=String(data?.newPassword||'');
  if(!current||!next)return json({message:'Enter your current and new password.'},400);
  if(next.length<10||next.length>128)return json({message:'New password must be between 10 and 128 characters.'},400);
  if(current===next)return json({message:'Choose a different password.'},400);
  const row=await env.KLYPZA_DB.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').bind(user.id).first();
  if(!row||await passwordHash(current,row.password_salt)!==row.password_hash)return json({message:'Your current password is incorrect.'},401);
  const salt=randomToken(),hash=await passwordHash(next,salt);
  await env.KLYPZA_DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(hash,salt,user.id).run();
  const saved=await env.KLYPZA_DB.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').bind(user.id).first();
  if(!saved || saved.password_hash!==hash || saved.password_salt!==salt) {
    console.error('Password update verification failed for account', user.id);
    return json({message:'The password change was not confirmed by the database. No sessions were ended. Please try again.'},500);
  }
  await env.KLYPZA_DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id).run();
  return json({ok:true,message:'Your password has been changed successfully. Please log in again using your new password.'},200,{'set-cookie':SESSION_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
}
async function updateAccountProfile(request,env){
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return json({ok:false,message:'Request origin rejected.'},403);
  const user=await getSessionUser(request,env);
  if(!user)return json({ok:false,message:'Please log in to update your profile.'},401);
  const body=await readJson(request);
  const name=String(body&&body.name||'').trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>60)return json({ok:false,message:'Please enter a name containing 2–60 characters.'},400);
  try {
    await env.KLYPZA_DB.prepare('UPDATE users SET display_name=? WHERE id=?').bind(name,user.id).run();
    const updated=await env.KLYPZA_DB.prepare('SELECT id,email,display_name,credits,plan,email_verified,created_at FROM users WHERE id=? LIMIT 1').bind(user.id).first();
    if(!updated)return json({ok:false,message:'The profile record could not be found after saving.'},404);
    return json({ok:true,user:publicUser(updated)});
  } catch(error) {
    console.error('KLYPZA_PROFILE_UPDATE_FAILED',error&&error.stack||error);
    return json({ok:false,message:'The server could not save your profile. Please try again.'},500);
  }
}
async function accountOverview(request,env){
  const user=await getSessionUser(request,env); if(!user)return json({message:'Please log in to view your dashboard.'},401);
  const day=utcDate();
  const [downloads,transactions,latestSubscription,usedRow]=await Promise.all([
    env.KLYPZA_DB.prepare('SELECT platform,title,credits_used,status,created_at FROM downloads WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(user.id).all(),
    env.KLYPZA_DB.prepare('SELECT amount,balance_after,reason,created_at FROM credit_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.id).all(),
    env.KLYPZA_DB.prepare("SELECT plan,status,current_period_end,provider,provider_subscription_id,scheduled_change_action,scheduled_change_effective_at,paddle_checked_at FROM subscriptions WHERE user_id=? ORDER BY CASE WHEN provider='paddle' THEN 1 ELSE 0 END DESC,CASE plan WHEN 'premium' THEN 3 WHEN 'standard' THEN 2 WHEN 'weekly' THEN 1 ELSE 0 END DESC,updated_at DESC, created_at DESC,CASE WHEN provider_subscription_id IS NOT NULL THEN 1 ELSE 0 END DESC,current_period_end DESC,id DESC LIMIT 1").bind(user.id).first(),
    env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first()
  ]);
  if(paddleApiKey(env)){
    const paddleRows=await env.KLYPZA_DB.prepare("SELECT provider_subscription_id,MAX(paddle_checked_at) AS paddle_checked_at FROM subscriptions WHERE user_id=? AND provider='paddle' AND provider_subscription_id IS NOT NULL GROUP BY provider_subscription_id").bind(user.id).all();
    for(const row of paddleRows.results||[]){
      if(row.paddle_checked_at&&Date.now()-Date.parse(row.paddle_checked_at)<=600000)continue;
      try{
        const rr=await fetch(paddleApiBase(env)+'/subscriptions/'+encodeURIComponent(row.provider_subscription_id),{headers:{'Authorization':'Bearer '+paddleApiKey(env),'Paddle-Version':'1','Accept':'application/json'}});
        const jj=await rr.json();
        if(!rr.ok||!jj?.data)continue;
        const sc=jj.data.scheduled_change||{};
        const periodEnd=jj.data.current_billing_period?.ends_at||null;
        await env.KLYPZA_DB.prepare("UPDATE subscriptions SET status=?,current_period_end=COALESCE(?,current_period_end),scheduled_change_action=?,scheduled_change_effective_at=?,paddle_checked_at=CURRENT_TIMESTAMP WHERE provider='paddle' AND provider_subscription_id=?").bind(String(jj.data.status||'unknown'),periodEnd,sc.action||null,sc.effective_at||null,row.provider_subscription_id).run();
      }catch(syncErr){console.error('PADDLE_SUBSCRIPTION_SYNC',String(syncErr));}
    }
  }
  let access=await getAccountAccess(user,env);
  const subscription=dashboardPaidSubscription(access);
  const effectivePlan=access.plan;
  if(subscription?.provider==='paddle'&&String(user.plan||'free').toLowerCase()!==effectivePlan)await env.KLYPZA_DB.prepare('UPDATE users SET plan=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(effectivePlan,user.id).run();
  const limits=access.trialExpired?{daily:0,batch:0}:planLimits(effectivePlan);
  const used=Number(usedRow?.used||0),safeUser=publicUser(user);
  safeUser.plan=effectivePlan;safeUser.credits=Math.max(0,limits.daily-used);
  return json({user:safeUser,plan:effectivePlan,trial:access.trial,access:{canDownload:access.canDownload,trialExpired:access.trialExpired},quota:{dailyLimit:limits.daily,maxBatch:limits.batch,usedToday:used,remaining:Math.max(0,limits.daily-used),resetsAt:'00:00 UTC'},downloads:downloads.results||[],transactions:transactions.results||[],subscription:subscription||null});
}
async function quotaLimitResponse(user,env,batchId){
 const limits=planLimits(user.plan),day=utcDate(),now=Date.now();
 const batch=await env.KLYPZA_DB.prepare('SELECT max_videos FROM download_batches WHERE id=? AND user_id=?').bind(batchId,user.id).first();
 if(!batch)return json({error:'invalid_batch',message:'This download batch is invalid. Start a new batch.'},400);
 const [du,dp,bu,bp]=await Promise.all([
  env.KLYPZA_DB.prepare('SELECT COUNT(*) AS n FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first(),
  env.KLYPZA_DB.prepare("SELECT COUNT(*) AS n FROM pending_downloads WHERE user_id=? AND status='pending' AND expires_at>?").bind(user.id,now).first(),
  env.KLYPZA_DB.prepare('SELECT COUNT(*) AS n FROM usage_events WHERE user_id=? AND batch_id=?').bind(user.id,batchId).first(),
  env.KLYPZA_DB.prepare("SELECT COUNT(*) AS n FROM pending_downloads WHERE user_id=? AND batch_id=? AND status='pending' AND expires_at>?").bind(user.id,batchId,now).first()
 ]);
 const daily=Number(du?.n||0)+Number(dp?.n||0),batchUsed=Number(bu?.n||0)+Number(bp?.n||0);
 if(daily>=limits.daily)return json({error:'daily_limit_reached',message:'Your daily download quota has been used up. It resets at 00:00 UTC.',limit:limits.daily,used:daily},429);
 if(batchUsed>=Number(batch.max_videos))return json({error:'batch_limit_reached',message:'This batch has reached its '+batch.max_videos+'-video limit. Start a new batch to continue.',limit:Number(batch.max_videos),used:batchUsed},429);
 return json({error:'quota_unavailable',message:'Klypza could not reserve this download. Please start a new batch and try again.'},429);
}
async function createPendingDownload(user,env,platform,sourceUrl,title,batchId){
 const id=crypto.randomUUID(),limits=planLimits(user.plan),now=Date.now(),expires=now+3600000,day=utcDate();
 const sql="INSERT INTO pending_downloads(id,user_id,batch_id,platform,source_url,title,status,expires_at) SELECT ?,?,?,?,?,?,'ready',? WHERE (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND usage_date=?) + (SELECT COUNT(*) FROM pending_downloads WHERE user_id=? AND status='pending' AND expires_at>?) < ? AND (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND batch_id=?) + (SELECT COUNT(*) FROM pending_downloads WHERE user_id=? AND batch_id=? AND status='pending' AND expires_at>?) < (SELECT max_videos FROM download_batches WHERE id=? AND user_id=?)";
 const r=await env.KLYPZA_DB.prepare(sql).bind(id,user.id,batchId,platform,sourceUrl,String(title||'').slice(0,200),expires,user.id,day,user.id,now,limits.daily,user.id,batchId,user.id,batchId,now,batchId,user.id).run();return r.meta?.changes===1?id:null;
}
async function activatePendingDownload(user,env,id){
 const limits=planLimits(user.plan),day=utcDate(),now=Date.now();
 const sql="UPDATE pending_downloads SET status='pending' WHERE id=? AND user_id=? AND status='ready' AND expires_at>? AND (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND usage_date=?) + (SELECT COUNT(*) FROM pending_downloads WHERE user_id=? AND status='pending' AND expires_at>?) < ? AND (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND batch_id=(SELECT batch_id FROM pending_downloads WHERE id=? AND user_id=?)) + (SELECT COUNT(*) FROM pending_downloads WHERE user_id=? AND batch_id=(SELECT batch_id FROM pending_downloads WHERE id=? AND user_id=?) AND status='pending' AND expires_at>?) < (SELECT max_videos FROM download_batches WHERE id=(SELECT batch_id FROM pending_downloads WHERE id=? AND user_id=?) AND user_id=?)";
 const r=await env.KLYPZA_DB.prepare(sql).bind(id,user.id,now,user.id,day,user.id,now,limits.daily,user.id,id,user.id,user.id,id,user.id,now,id,user.id,user.id).run();
 return Number(r.meta?.changes||0)===1;
}

async function cancelPendingDownload(user,env,id){
 await env.KLYPZA_DB.prepare("UPDATE pending_downloads SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'").bind(id,user.id).run();
}

export function finalizeOnStreamCompletion(body,onComplete,onCancel=async()=>{}) {
 const reader=body.getReader();
 let settled=false;
 return new ReadableStream({
  async pull(controller){
   try{
    const part=await reader.read();
    if(part.done){
     const completed=await onComplete();
     if(completed===false)throw new Error('Download could not be finalized');
     settled=true;
     controller.close();
     return;
    }
    controller.enqueue(part.value);
   }catch(error){
    if(!settled){settled=true;try{await onCancel(error);}catch{}}
    controller.error(error);
   }
  },
  async cancel(reason){
   if(settled)return;
   settled=true;
   try{await reader.cancel(reason);}finally{await onCancel(reason);}
  },
 });
}

async function consumePendingDownload(user,env,id){
 const p=await env.KLYPZA_DB.prepare('SELECT * FROM pending_downloads WHERE id=? AND user_id=?').bind(id,user.id).first();if(!p||p.status!=='pending'||Number(p.expires_at)<=Date.now())return false;
 const limits=planLimits(user.plan),day=utcDate(),now=Date.now();
 const batch=await env.KLYPZA_DB.batch([
 env.KLYPZA_DB.prepare("INSERT OR IGNORE INTO usage_events(id,user_id,batch_id,usage_date,platform,source_url,title) SELECT id,user_id,batch_id,?,platform,source_url,title FROM pending_downloads WHERE id=? AND user_id=? AND status='pending' AND expires_at>? AND (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND usage_date=?) + (SELECT COUNT(*) FROM pending_downloads WHERE user_id=? AND status='pending' AND id<>? AND expires_at>?) < ? AND (SELECT COUNT(*) FROM usage_events WHERE user_id=? AND batch_id=?) + (SELECT COUNT(*) FROM pending_downloads WHERE user_id=? AND batch_id=? AND status='pending' AND id<>? AND expires_at>?) < (SELECT max_videos FROM download_batches WHERE id=? AND user_id=?)").bind(day,id,user.id,now,user.id,day,user.id,id,now,limits.daily,user.id,p.batch_id,user.id,p.batch_id,id,now,p.batch_id,user.id),
 env.KLYPZA_DB.prepare("UPDATE pending_downloads SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND status='pending' AND EXISTS(SELECT 1 FROM usage_events WHERE id=? AND user_id=?)").bind(id,user.id,id,user.id),
 env.KLYPZA_DB.prepare("INSERT INTO credit_transactions(id,user_id,amount,balance_after,reason,reference_id) SELECT ?,?,-1,MAX(0,?-(SELECT COUNT(*) FROM usage_events WHERE user_id=? AND usage_date=?)),'video_download',? WHERE EXISTS(SELECT 1 FROM usage_events WHERE id=? AND user_id=?) AND NOT EXISTS(SELECT 1 FROM credit_transactions WHERE reference_id=?)").bind(crypto.randomUUID(),user.id,limits.daily,user.id,day,id,id,user.id,id),
 env.KLYPZA_DB.prepare("INSERT OR IGNORE INTO downloads(id,user_id,platform,source_url,title,credits_used,status) SELECT id,user_id,platform,source_url,title,1,'completed' FROM pending_downloads WHERE id=? AND user_id=? AND EXISTS(SELECT 1 FROM usage_events WHERE id=? AND user_id=?)").bind(id,user.id,id,user.id)
 ]);return Number(batch[0]?.meta?.changes||0)===1;
}

async function handleDownloadComplete(request,env){
 let user=await getSessionUser(request,env);
 if(!user)return json({error:'login_required'},401);
 if(Number(user.email_verified)!==1)return json({error:'email_not_verified',message:'Verify your email address before completing downloads.'},403);
 const access=await getAccountAccess(user,env);
 if(!access.canDownload)return json({error:'trial_expired',message:'Your free trial has ended. Choose a paid Klypza plan to continue downloading.'},402);
 let body;
 try{body=await request.json()}catch{return json({error:'bad_request'},400)}
 const id=String(body?.id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'invalid_download'},400);
 user={...user,plan:access.plan};
 const completed=await consumePendingDownload(user,env,id);
 if(!completed){
  const current=await env.KLYPZA_DB.prepare('SELECT status FROM pending_downloads WHERE id=? AND user_id=?').bind(id,user.id).first();
  if(current?.status==='completed')return json({ok:true,alreadyCompleted:true});
  return json({error:'quota_unavailable',message:'Daily quota or batch limit has been reached.'},429);
 }
 const day=utcDate(),limits=planLimits(user.plan);
 const after=await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,day).first();
 return json({ok:true,usedToday:Number(after?.used||0),remaining:Math.max(0,limits.daily-Number(after?.used||0))});
}

async function notifyExpiredTrials(env){
  if(!env.KLYPZA_DB||!env.RESEND_API_KEY)return;
  await env.KLYPZA_DB.prepare("CREATE TABLE IF NOT EXISTS trial_notifications (user_id TEXT NOT NULL, notification_type TEXT NOT NULL, sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,notification_type))").run();
  const now=new Date().toISOString();
  const rows=await env.KLYPZA_DB.prepare("SELECT s.id AS trial_id,s.user_id,u.email,u.display_name FROM subscriptions s JOIN users u ON u.id=s.user_id LEFT JOIN subscriptions p ON p.user_id=s.user_id AND p.provider='paddle' AND p.status IN ('active','trialing','past_due') AND (p.status!='past_due' OR p.current_period_end>?) LEFT JOIN trial_notifications n ON n.user_id=s.user_id AND n.notification_type='trial_expired' WHERE s.provider='klypza_trial' AND s.status='trialing' AND s.current_period_end<=? AND p.id IS NULL AND n.user_id IS NULL ORDER BY s.current_period_end ASC LIMIT 100").bind(now,now).all();
  for(const user of rows.results||[]){
    const name='there';
    const link='https://klypza.web.id/plans';
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({
        from:'Klypza <verify@klypza.web.id>',to:[user.email],subject:'Your Klypza free trial has ended',
        html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;color:#111936;border:1px solid #e5e8f2;border-radius:18px"><h1>Your free trial has ended</h1><p>Hello '+name+',</p><p>Your 7-day Klypza trial has ended. Downloads are now paused, but your account and download history remain available.</p><p>Continue with the Weekly plan for <strong>$1 per week</strong> (25 downloads per day, up to 5 videos per batch), or choose Standard or Premium.</p><p style="margin:26px 0"><a href="'+link+'" style="display:inline-block;padding:13px 20px;background:#2878f0;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold">View subscription plans</a></p><p style="color:#64708a;font-size:13px">Klypza · klypza.web.id</p></div>',
        text:'Hello '+name+',\nYour 7-day Klypza trial has ended and downloads are paused. Continue with Weekly for $1/week (25 videos/day, 5 per batch), or choose Standard or Premium: '+link
      })});
      if(!response.ok){console.error('KLYPZA_TRIAL_EXPIRY_EMAIL',response.status,await response.text());continue;}
      await env.KLYPZA_DB.batch([
        env.KLYPZA_DB.prepare("INSERT OR IGNORE INTO trial_notifications(user_id,notification_type) VALUES(?,'trial_expired')").bind(user.user_id),
        env.KLYPZA_DB.prepare("UPDATE subscriptions SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=? AND provider='klypza_trial' AND status='trialing'").bind(user.trial_id)
      ]);
    }catch(err){console.error('KLYPZA_TRIAL_EXPIRY_EMAIL',String(err));}
  }
}

export default {
  async fetch(request, env) {
  const url = new URL(request.url);
  try {
    if (url.pathname === '/sw.js' && request.method === 'GET') return new Response("self.addEventListener('install',function(event){event.waitUntil(self.skipWaiting());});\\nself.addEventListener('activate',function(event){event.waitUntil((async function(){await self.registration.unregister();var clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});clients.forEach(function(client){client.navigate(client.url);});})());});\\n",{headers:securityHeaders({'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','service-worker-allowed':'/'})});
    if (url.pathname === '/api/paddle/webhook') return await handlePaddleWebhook(request,env);
    if (url.pathname === '/reset-password' && request.method === 'GET') return resetPasswordPage(url);
    if (url.pathname === '/' || ['/login','/register','/dashboard','/plans'].includes(url.pathname)) {
      let pageHtml = appPageHtml(url.pathname);
      return new Response(pageHtml,{headers:securityHeaders({'content-type':'text/html; charset=utf-8','cache-control':'no-cache'})});
    }
    if (url.pathname === '/brand-icon.webp' || url.pathname === '/brand-wordmark.webp' || url.pathname === '/footer-wordmark-white.webp') {
      const assetName = url.pathname.slice(1);
      const asset = await fetch('https://raw.githubusercontent.com/Uzumasama/Klypza/main/public/' + assetName, { cf: { cacheTtl: 86400 } });
      if (!asset.ok) return new Response('Brand asset unavailable', { status: 404 });
      return new Response(asset.body, { headers: securityHeaders({ 'content-type': 'image/webp', 'cache-control': 'public,max-age=86400' }) });
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
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\nSitemap: https://klypza.web.id/sitemap.xml\n',{headers:securityHeaders({'content-type':'text/plain; charset=utf-8','cache-control':'public,max-age=3600'})});
    if (url.pathname === '/sitemap.xml') return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://klypza.web.id/</loc></url><url><loc>https://klypza.web.id/plans</loc></url><url><loc>https://klypza.web.id/about</loc></url><url><loc>https://klypza.web.id/contact</loc></url><url><loc>https://klypza.web.id/privacy-policy</loc></url><url><loc>https://klypza.web.id/terms</loc></url><url><loc>https://klypza.web.id/copyright</loc></url></urlset>',{headers:{'content-type':'application/xml; charset=utf-8'}});
    if (['/about','/contact','/privacy-policy','/terms','/copyright'].includes(url.pathname)) return infoPageResponse(url.pathname.slice(1));
    if (url.pathname === '/api/public-stats' && request.method === 'GET') return await publicStats(env);
    if(url.pathname==='/api/auth/verify-email' && request.method==='GET') return await verifyEmailToken(url,env);
    if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/account' || url.pathname === '/api/account/profile' || url.pathname === '/api/account/password' || url.pathname === '/api/plans' || url.pathname === '/api/billing/config' || url.pathname === '/api/billing/checkout' || url.pathname === '/api/billing/portal' || url.pathname === '/api/batch/start') {
      const response=await accountRouter(request,env,url); if(response)return response;
    }
    if (url.pathname === '/api/health') return health(env);
    if (url.pathname === '/api/download') return await handleDownload(url, env, request);
    if (url.pathname === '/api/download/cancel' && request.method === 'POST') return await handleCancelDownload(request, env);
    if (url.pathname === '/api/download/complete' && request.method === 'POST') return json({error:'deprecated',message:'Downloads are now charged automatically by the secure file endpoint.'},410);
    if (url.pathname === '/api/file') return await handleFile(url, env, request);
    if (env.ASSETS) return env.ASSETS.fetch(request);
  } catch (err) {
    console.error('KLYPZA_WORKER_ERROR', err && err.stack ? err.stack : String(err));
    return json({ error: 'server_error', message: 'Something went wrong on the server. Please try again shortly.' }, 500);
  }
  return json({ error: 'not_found' }, 404);
  },
  async scheduled(controller,env,ctx){ctx.waitUntil(notifyExpiredTrials(env));},
};

function securityHeaders(extra = {}) { return { 'x-content-type-options':'nosniff', 'x-frame-options':'DENY', 'referrer-policy':'strict-origin-when-cross-origin', 'permissions-policy':'camera=(), microphone=(), geolocation=()', 'strict-transport-security':'max-age=31536000', ...extra }; }

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: securityHeaders({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders }),
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

async function handleCancelDownload(request,env){
 const user=await getSessionUser(request,env);if(!user)return json({error:'login_required'},401);
 let body;try{body=await request.json()}catch{return json({error:'bad_request'},400)}
 const id=String(body?.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'invalid_download'},400);
 const r=await env.KLYPZA_DB.prepare("UPDATE pending_downloads SET status='cancelled' WHERE id=? AND user_id=? AND status IN ('ready','pending') AND expires_at>?").bind(id,user.id,Date.now()).run();
 if(Number(r.meta?.changes||0)===1)return json({ok:true,status:'cancelled'});
 const current=await env.KLYPZA_DB.prepare('SELECT status FROM pending_downloads WHERE id=? AND user_id=?').bind(id,user.id).first();
 if(!current)return json({error:'not_found'},404);
 return json({error:'not_cancellable',status:current.status,message:'This task has already started, completed, or expired.'},409);
}

async function handleDownload(url, env, request) {
  let user=await getSessionUser(request,env);
  if(!user)return json({error:'login_required',message:'Create a free account or log in to use Klypza downloads.'},401);
  if(Number(user.email_verified)!==1)return json({error:'email_not_verified',message:'Verify your email address before downloading.'},403);
  const access=await getAccountAccess(user,env);if(!access.canDownload)return json({error:'trial_expired',message:'Your 7-day free trial has ended. Choose a paid Klypza plan to continue downloading.'},402);user={...user,plan:access.plan};
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
    const completionId=await createPendingDownload(user,env,platform,parsed.href,result.title,batchId);if(!completionId){for(const item of items)if(item.completionId)await env.KLYPZA_DB.prepare("UPDATE pending_downloads SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'").bind(item.completionId,user.id).run();return await quotaLimitResponse(user,env,batchId);}
    const sig = await hmac(secret, `${it.url}\n${name}\n${expires}\n\n${completionId}`);
    const file = `/api/file?u=${encodeURIComponent(it.url)}&n=${encodeURIComponent(name)}&e=${expires}&d=${completionId}&s=${sig}`;
    items.push({type:it.type,quality:it.quality,watermark:it.watermark,ext,name,thumb:it.type==='image'?it.url:result.thumb,file,completionId});
  }
  const used=Number((await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,utcDate()).first())?.used||0);return json({platform,title:result.title,author:result.author,items,credits_remaining:Math.max(0,planLimits(user.plan).daily-used)});
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
    const completionId=await createPendingDownload(user,env,'YouTube',parsed.href,title,batchId);if(!completionId){for(const item of items)if(item.completionId)await env.KLYPZA_DB.prepare("UPDATE pending_downloads SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'").bind(item.completionId,user.id).run();return await quotaLimitResponse(user,env,batchId);}
    const sig = await hmac(secret, `${parsed.href}\n${name}\n${expires}\n${quality}\n${completionId}`);
    const file = `/api/file?u=${encodeURIComponent(parsed.href)}&q=${encodeURIComponent(quality)}&n=${encodeURIComponent(name)}&e=${expires}&d=${completionId}&s=${sig}`;
    items.push({type:'video',quality,watermark:false,ext:'mp4',name,thumb:/^https?:\/\//i.test(thumb)?thumb:'',size_mb:typeof format.size_mb==='number'?format.size_mb:null,file,completionId});
  }
  if (!items.length) return json({ error: 'no_video', message: 'No supported YouTube video qualities were found.' }, 422);
  items.sort((a, b) => parseInt(b.quality, 10) - parseInt(a.quality, 10));
  const used=Number((await env.KLYPZA_DB.prepare('SELECT COUNT(*) AS used FROM usage_events WHERE user_id=? AND usage_date=?').bind(user.id,utcDate()).first())?.used||0);return json({platform:'YouTube',title,author,items,credits_remaining:Math.max(0,planLimits(user.plan).daily-used)});
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

async function handleFile(url, env, request) {
  if (!env.SAVEAPI_KEY) return json({ error: 'not_configured' }, 503);
  let user=await getSessionUser(request,env);if(!user)return json({error:'login_required'},401);
  if(Number(user.email_verified)!==1)return json({error:'email_not_verified',message:'Verify your email address before downloading.'},403);
  const access=await getAccountAccess(user,env);if(!access.canDownload)return json({error:'trial_expired',message:'Your 7-day free trial has ended. Choose a paid Klypza plan to continue downloading.'},402);user={...user,plan:access.plan};
  const downloadId=url.searchParams.get('d')||'';if(!/^[0-9a-f-]{36}$/i.test(downloadId))return json({error:'invalid_download'},400);
  let pending=await env.KLYPZA_DB.prepare("SELECT status,expires_at,batch_id FROM pending_downloads WHERE id=? AND user_id=?").bind(downloadId,user.id).first();if(!pending||!['ready','pending'].includes(pending.status)||Number(pending.expires_at)<=Date.now())return json({error:'download_token_used_or_expired',message:'This download link has expired or has already been used. Process the link again.'},410);
  const target = url.searchParams.get('u') || '';
  const name = (url.searchParams.get('n') || 'media').replace(/[^\w.\-]+/g, '_').slice(0, 120);
  const expires = Number(url.searchParams.get('e') || 0);
  const sig = url.searchParams.get('s') || '';
  const quality = (url.searchParams.get('q') || '').trim();

  const expected = await hmac(env.SAVEAPI_KEY, `${target}\n${url.searchParams.get('n')}\n${expires}\n${quality}\n${downloadId}`);
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

  if(pending.status==='ready'){
    const activated=await activatePendingDownload(user,env,downloadId);
    if(!activated)return await quotaLimitResponse(user,env,pending.batch_id);
    pending.status='pending';
  }

  let up;
  let fallbackUrl = src.href;
  try {
    if (detectPlatform(src.hostname) === 'YouTube') {
      if (!/^(144|240|360|480|720|1080)p$/i.test(quality)) {
        await cancelPendingDownload(user,env,downloadId);
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
        await cancelPendingDownload(user,env,downloadId); return json({ error: 'upstream_timeout', message: 'SaveAPI did not respond while preparing the YouTube file. Please try again.' }, 504);
      }
      let made;
      try { made = await createRes.json(); } catch {
        await cancelPendingDownload(user,env,downloadId);
        return json({ error: 'bad_response', message: 'SaveAPI returned an unreadable YouTube download response.' }, 502);
      }
      if (!createRes.ok || !made || made.success === false) { await cancelPendingDownload(user,env,downloadId); return saveApiError(made || {}, createRes.status, createRes.headers.get('Retry-After')); }
      const madeRoot = made.data && typeof made.data === 'object' ? made.data : made;
      const streamUrl = madeRoot.url || madeRoot.download_url || madeRoot.downloadUrl;
      if (typeof streamUrl !== 'string') {
        await cancelPendingDownload(user,env,downloadId);
        return json({ error: 'bad_response', message: 'SaveAPI did not return a YouTube download stream.' }, 502);
      }
      const mediaUrl = new URL(streamUrl);
      if (mediaUrl.protocol !== 'https:' || mediaUrl.username || mediaUrl.password || isPrivateHost(mediaUrl.hostname)) {
        await cancelPendingDownload(user,env,downloadId);
        return json({ error: 'bad_response', message: 'SaveAPI returned an invalid YouTube stream URL.' }, 502);
      }
      fallbackUrl = mediaUrl.href;
      up = await fetchSafeMedia(mediaUrl.href);
    } else {
      up = await fetchSafeMedia(src.href);
    }
  } catch {
    await cancelPendingDownload(user,env,downloadId);
    return json({ error: 'upstream_error', message: 'Could not retrieve the file.' }, 502);
  }
  if (!up.ok || !up.body) { await cancelPendingDownload(user,env,downloadId); return json({ error: 'upstream_error', message: `Could not retrieve the file (kode ${up.status}).` }, 502); }

  const size = Number(up.headers.get('content-length') || 0);
  if (size > Number(env.MAX_PROXY_BYTES || 19500000)) {
    try { await up.body.cancel(); } catch { /* ignore */ }
    await cancelPendingDownload(user,env,downloadId);
    return json({error:'file_too_large',message:"This file exceeds Klypza's secure transfer limit. No quota was deducted."},413);
  }
  // Keep the reservation pending while bytes are streamed. Consume the credit only after EOF.
  const headers = new Headers();
  headers.set('content-type', up.headers.get('content-type') || 'application/octet-stream');
  const len = up.headers.get('content-length');
  if (len) headers.set('content-length', len);
  headers.set('content-disposition', `attachment; filename="${name}"`);
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  const completedBody=finalizeOnStreamCompletion(
    up.body,
    async()=>consumePendingDownload(user,env,downloadId),
    async()=>cancelPendingDownload(user,env,downloadId),
  );
  return new Response(completedBody, { status: 200, headers });
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
