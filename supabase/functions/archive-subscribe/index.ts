// supabase/functions/archive-subscribe/index.ts
//
// Public endpoint for the Prompt Archive signup form.
// Writes the contact to Resend (the list of record for sending) and to
// Supabase (the list of record for ownership). Called with the anon key
// from a static page, so it assumes hostile input throughout.
//
// Secrets required:
//   RESEND_API_KEY              server-side only, never in the page
//   RESEND_PROMPT_SEGMENT_ID    the Prompt-page-Leads segment id
//   ARCHIVE_ALLOWED_ORIGIN      https://prompts.incommonhumans.com
//
// Deploy:
//   supabase functions deploy archive-subscribe --no-verify-jwt
//
// [IM-DECOUPLE] No IM dependency. Marketing surface only.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SEGMENT_ID     = Deno.env.get('RESEND_PROMPT_SEGMENT_ID') ?? '';
const ALLOWED_ORIGIN = Deno.env.get('ARCHIVE_ALLOWED_ORIGIN') ?? 'https://prompts.incommonhumans.com';
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cors(origin: string | null) {
  const ok = origin === ALLOWED_ORIGIN || origin === 'http://localhost:8788';
  return {
    'Access-Control-Allow-Origin': ok ? (origin as string) : ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function reply(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' }, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'bad_json' }, origin);
  }

  // Honeypot. The page sends an empty string; a bot fills it in.
  if (typeof body.company === 'string' && body.company.length > 0) {
    return reply(200, { ok: true }, origin);           // look successful, do nothing
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const name  = String(body.first_name ?? '').trim().slice(0, 80) || null;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return reply(400, { error: 'invalid_email' }, origin);
  }

  // ── 1. Supabase, so the list is ours even if Resend goes away ──────────
  let alreadyKnown = false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/prompt_archive_subscribers`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, first_name: name, source: 'archive' }),
    });
    if (r.status === 409) alreadyKnown = true;
    else if (!r.ok) console.error('supabase insert failed', r.status, await r.text());
  } catch (e) {
    console.error('supabase insert threw', e);        // never block the signup on this
  }

  // ── 2. Resend, the list we actually send from ──────────────────────────
  // Contacts are global; segments group them. audience_id is deprecated.
  try {
    const r = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: name,
        unsubscribed: false,
        segments: [{ id: SEGMENT_ID }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      // A contact that already exists is a success from the person's side.
      if (r.status === 409 || detail.includes('already exists')) {
        return reply(200, { ok: true, already: true }, origin);
      }
      console.error('resend contact failed', r.status, detail);
      // Supabase has them, so this is recoverable by hand. Do not fail the user.
      return reply(200, { ok: true, deferred: true }, origin);
    }
  } catch (e) {
    console.error('resend contact threw', e);
    return reply(200, { ok: true, deferred: true }, origin);
  }

  return reply(200, { ok: true, already: alreadyKnown }, origin);
});
