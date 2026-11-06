// Server-only, credit-free collection. Never guesses dates or missing contact fields.
import { createHash } from 'node:crypto';
import { getBerhanLinks, parseBerhanBank, getDetailLinks, parseGetChereta, parsePPS, parseTelegram, type ParsedTender } from '@/lib/tender-parser';
import { notifySubscribers } from '@/lib/telegram.server';

async function fetchPage(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['getchereta.com','www.getchereta.com','t.me','pps.gov.et','berhanbanksc.com'].includes(parsed.hostname)) throw new Error('ይህ ምንጭ ለቀጥታ ንባብ ገና አልተዘጋጀም።');
  // Workers reject redirect:'error'; use 'manual' and refuse any redirect response.
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 EliphazTenderReader', Accept: 'text/html', 'Accept-Language':'en,am;q=0.9' } });
  if (response.status >= 300 && response.status < 400) throw new Error('ምንጩ ወደ ሌላ አድራሻ አዛውሯል፤ ደህንነት ሲባል አልተከተልነውም።');
  if (!response.ok) throw new Error(`የምንጩ ገጽ አልተከፈተም [${response.status}]`);
  const html = await response.text();
  if (html.length > 3000000) throw new Error('የምንጩ ገጽ ከመጠን በላይ ነው።');
  return html;
}

export async function runCollector(maxSources = 20) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: run, error: runError } = await supabaseAdmin.from('collector_runs').insert({}).select('id').single();
  if (runError) throw runError;
  const errors: string[] = [];
  const fresh: ParsedTender[] = [];
  let added = 0, notified = 0;
  // Auto-cleanup: drop tenders whose deadline passed (Addis Ababa calendar day, UTC+3).
  const addisToday = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const { error: cleanupError } = await supabaseAdmin.from('tenders').delete().lt('deadline', addisToday);
  if (cleanupError) errors.push(`ማጽዳት፦ ${cleanupError.message}`);
  try {
    const { data: sources, error } = await supabaseAdmin.from('sources').select('*').eq('active',true).order('last_run_at',{ascending:true,nullsFirst:true}).limit(maxSources);
    if (error) throw error;
    // Independent publishers run concurrently so one unavailable site cannot block others.
    await Promise.all((sources ?? []).map(async source => {
      let sourceError: string | null = null;
      try {
        const html = await fetchPage(source.url);
        let items: ParsedTender[] = [];
        if (new URL(source.url).hostname === 'pps.gov.et') {
          items = parsePPS(html, source.url);
          if (!items.length) throw new Error('ክፍት ጨረታ ከግልጽ መዝጊያ ቀን ጋር አልተገኘም።');
        } else if (new URL(source.url).hostname === 'berhanbanksc.com') {
          const links = getBerhanLinks(html, source.url).slice(0, 20);
          for (const link of links) {
            try { const item = parseBerhanBank(await fetchPage(link), link); if (item) items.push(item); }
            catch (e) { sourceError = e instanceof Error ? e.message : String(e); }
          }
          if (!items.length) throw new Error(links.length ? 'ክፍት ጨረታ ከግልጽ መዝጊያ ቀን ጋር አልተገኘም (ያሉት ጊዜያቸው አልፏል)።' : 'የጨረታ ዝርዝር አልተነበበም።');
        } else if (new URL(source.url).hostname === 't.me') {
          items = parseTelegram(html, source.url);
          if (!items.length) throw new Error('የሚነበብ ክፍት ጨረታና ግልጽ መዝጊያ ቀን አልተገኘም፤ ፎቶና ያልተረጋገጡ ቀኖች አልተገመቱም።');
        } else {
          // Read pages 1-3 of each listing so busy days are not cut off.
          const pages = [html];
          for (const n of [2,3]) {
            const u = new URL(source.url); u.searchParams.set('page', String(n));
            try { pages.push(await fetchPage(u.href)); } catch { break; }
          }
          const links = [...new Set(pages.flatMap(p => getDetailLinks(p,source.url)))].slice(0,120);
          if (!links.length) throw new Error('የጨረታ ዝርዝር አልተነበበም።');
          const failures: string[] = [];
          // Small batches avoid overwhelming a publisher.
          for (let i = 0; i < links.length; i += 5) {
            await Promise.all(links.slice(i,i+5).map(async link => {
              try { const item = parseGetChereta(await fetchPage(link),link); if(item) items.push(item); }
              catch (e) { failures.push(e instanceof Error ? e.message : String(e)); }
            }));
          }
          if(failures.length) sourceError = `${failures.length} ዝርዝሮች አልተነበቡም። ${failures[0]}`;
          if(!items.length && failures.length === links.length) throw new Error(sourceError ?? 'ዝርዝሮች አልተነበቡም።');
        }
        const unique = new Map<string,ParsedTender>();
        for(const t of items) {
          const identity = `${t.organization ?? ''}|${t.reference ?? t.title}|${t.deadline}`.toLowerCase().replace(/\s+/g,' ').trim();
          unique.set(createHash('sha256').update(identity).digest('hex'),t);
        }
        for(const [fingerprint,t] of unique) {
          // Preserve attribution and the full announcement; never fabricate absent fields.
          const {data: existing,error: lookupError} = await supabaseAdmin.from('tenders').select('id').eq('source_url',t.link).limit(1);
          if(lookupError) throw lookupError;
          if(existing?.length) continue;
          const {data: inserted,error: insertError} = await supabaseAdmin.from('tenders').upsert({ fingerprint,title:t.title,organization:t.organization,category:t.category,summary:t.summary,posted_date:t.posted_date,deadline:t.deadline,address:t.address,phone:t.phone,email:t.email,source_url:t.link,source_name:source.name },{onConflict:'fingerprint',ignoreDuplicates:true}).select('id');
          if(insertError) throw insertError;
          if(inserted?.length) { added += inserted.length; fresh.push(t); }
        }
      } catch(e) { sourceError = e instanceof Error ? e.message : String(e); }
      if(sourceError) errors.push(`${source.name}: ${sourceError}`);
      const {error: statusError} = await supabaseAdmin.from('sources').update({last_run_at:new Date().toISOString(),last_error:sourceError}).eq('id',source.id);
      if(statusError) errors.push(`${source.name}: ${statusError.message}`);
    }));
    if(fresh.length) {
      try { notified = await notifySubscribers(fresh.map(t => ({...t,source_url:t.link}))); }
      catch(e) { errors.push(`Telegram: ${e instanceof Error ? e.message : String(e)}`); }
    }
  } catch(e) { errors.push(e instanceof Error ? e.message : String(e)); }
  const {error: finishError} = await supabaseAdmin.from('collector_runs').update({finished_at:new Date().toISOString(),added,error:errors.join('\n').slice(0,2000) || null}).eq('id',run.id);
  if(finishError) throw finishError;
  return {added,errors,notified};
}
