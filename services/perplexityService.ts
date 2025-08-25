// Appel côté mobile vers le proxy Cloud Function Perplexity (aucune clé côté client)

export interface PerplexitySearchOptions {
  search_mode?: 'web';
  search_domain_filter?: string[];
  search_recency_filter?: 'day' | 'week' | 'month' | 'year';
  last_updated_after_filter?: string;
  last_updated_before_filter?: string;
  search_after_date_filter?: string; // MM/DD/YYYY
  search_before_date_filter?: string; // MM/DD/YYYY
  web_search_options?: { search_context_size?: 'low' | 'medium' | 'high'; [k: string]: any };
}

export interface PerplexitySearchResultItem {
  title?: string;
  url?: string;
  snippet?: string;
  published_at?: string;
}

export interface PerplexitySearchResponse {
  content: string;
  search_results?: PerplexitySearchResultItem[];
  model?: string;
  usage?: any;
}

const PERPLEXITY_PROXY_URL = 'https://us-central1-ia-ctive-projet-1.cloudfunctions.net/perplexitySearch';

export async function perplexitySearch(q: string, options?: PerplexitySearchOptions): Promise<PerplexitySearchResponse> {
  const payload: any = { q, ...(options || {}) };
  const startedAt = Date.now();
  console.log('🔎 [Perplexity] POST', PERPLEXITY_PROXY_URL, 'payload:', JSON.stringify(payload).slice(0, 200));
  const res = await fetch(PERPLEXITY_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('🔎 [Perplexity] HTTP', res.status, text.slice(0, 400));
    throw new Error(`Perplexity proxy error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  console.log('🔎 [Perplexity] OK in', (Date.now() - startedAt) + 'ms');
  return json;
}

// Formate les résultats pour inclusion dans un message système
export function buildWebContextMarkdown(resp: PerplexitySearchResponse): string {
  const sources = (resp.search_results || []).slice(0, 8);
  const lines: string[] = [];
  lines.push('Contexte web (résumé Perplexity) :');
  lines.push('');
  if (resp.content && resp.content.trim()) {
    lines.push(resp.content.trim());
    lines.push('');
  }
  if (sources.length) {
    lines.push('Sources:');
    sources.forEach((s, idx) => {
      const i = idx + 1;
      const title = s.title || s.url || `Source ${i}`;
      const url = s.url || '';
      lines.push(`[${i}] ${title}${url ? ` — ${url}` : ''}`);
    });
  }
  lines.push('');
  lines.push("Consignes: répondez de façon concise, et citez les sources sous la forme [1], [2] si vous vous basez dessus.");
  return lines.join('\n');
}


