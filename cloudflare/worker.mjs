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
      return new Response(INDEX_HTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
    }
    if (url.pathname === '/klypza-mark.svg') return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#2878f0"/><stop offset="1" stop-color="#7928ca"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#111936"/><path d="M17 15h9v20l15-14h12L36 35l18 15H42L26 37v13h-9z" fill="url(#g)"/></svg>',{headers:{'content-type':'image/svg+xml','cache-control':'public,max-age=86400'}});
    if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/account' || url.pathname === '/api/plans') {
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
  if (platform === 'YouTube') return await handleYouTubeInfo(parsed, env, user);

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

async function handleYouTubeInfo(parsed, env, user) {
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
