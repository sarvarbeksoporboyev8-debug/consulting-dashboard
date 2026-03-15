export async function onRequest(context) {
  const { request, env } = context;

  // Verify session token
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const expected = await generateToken(env.DASHBOARD_PASSWORD, env.SESSION_SECRET);

  if (!token || token !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');

  if (!filePath) {
    return Response.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const ghHeaders = {
    'Authorization': `Bearer ${env.GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Grant-Consulting-Dashboard/1.0',
  };

  if (request.method === 'GET') {
    const res = await fetch(ghUrl, { headers: ghHeaders });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  }

  if (request.method === 'PUT') {
    const bodyText = await request.text();
    const res = await fetch(ghUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: bodyText,
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  }

  if (request.method === 'DELETE') {
    const bodyText = await request.text();
    const res = await fetch(ghUrl, {
      method: 'DELETE',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: bodyText,
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

async function generateToken(password, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(password));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
