export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!body.password || body.password !== env.DASHBOARD_PASSWORD) {
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }

  const token = await generateToken(env.DASHBOARD_PASSWORD, env.SESSION_SECRET);
  return Response.json({ token });
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
