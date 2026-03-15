/* =============================================
   Grant Consulting — Admin Dashboard
   ============================================= */

const TOKEN = localStorage.getItem('gc_token');
if (!TOKEN) window.location.href = '/';

const LANGS = ['en', 'uz', 'uzcyrl', 'ru'];
const SECTIONS = ['overview', 'blog', 'events', 'gallery', 'testimonials'];
const SECTION_TITLES = {
  overview: 'Overview',
  blog: 'Blog Posts',
  events: 'Events',
  gallery: 'Gallery',
  testimonials: 'Testimonials'
};

// ====================================================
// API HELPERS
// ====================================================

async function apiRequest(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`/api/github?path=${encodeURIComponent(path)}`, opts);
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function readJSON(path) {
  const data = await apiRequest(path);
  if (!data) throw new Error('Session expired');
  if (data.message && !data.content) throw new Error(data.message);
  const raw = atob(data.content.replace(/\n/g, ''));
  return { content: JSON.parse(raw), sha: data.sha };
}

async function writeJSON(path, content, sha, message) {
  const json = JSON.stringify(content, null, 2);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return apiRequest(path, 'PUT', { message, content: encoded, sha });
}

async function uploadFile(path, base64, message) {
  return apiRequest(path, 'PUT', { message, content: base64 });
}

async function checkFileSha(path) {
  try {
    const data = await apiRequest(path);
    return data && data.sha ? data.sha : null;
  } catch { return null; }
}

// ====================================================
// NAVIGATION
// ====================================================

function navigate(name) {
  SECTIONS.forEach(s => {
    document.querySelector(`.nav-item[data-section="${s}"]`).classList.toggle('active', s === name);
    document.getElementById(`section-${s}`).classList.toggle('active', s === name);
  });
  document.getElementById('page-title').textContent = SECTION_TITLES[name] || name;

  if (name === 'overview') loadOverview();
  if (name === 'blog') loadBlog();
  if (name === 'events') loadEvents();
  if (name === 'gallery') loadGallery();
  if (name === 'testimonials') loadTestimonials();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.section));
});

// ====================================================
// AUTH / LOGOUT
// ====================================================

function logout() {
  localStorage.removeItem('gc_token');
  window.location.href = '/';
}
document.getElementById('btn-logout').addEventListener('click', logout);

// ====================================================
// UTILS
// ====================================================

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });
}

function setStatus(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'form-status' + (type ? ` ${type}` : '');
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ====================================================
// LANGUAGE TABS
// ====================================================

function switchTab(group, lang) {
  document.querySelectorAll(`.lang-tab[data-group="${group}"]`).forEach(t => {
    t.classList.toggle('active', t.dataset.lang === lang);
  });
  document.querySelectorAll(`.lang-panel[data-group="${group}"]`).forEach(p => {
    p.classList.toggle('active', p.dataset.lang === lang);
  });
}

// ====================================================
// OVERVIEW
// ====================================================

async function loadOverview() {
  const el = document.getElementById('overview-stats');
  el.innerHTML = '<p class="loading">Loading stats…</p>';
  try {
    const [blog, events, gallery, testimonials] = await Promise.all([
      readJSON('src/_data/blog.json'),
      readJSON('src/_data/events.json'),
      readJSON('src/_data/gallery.json'),
      readJSON('src/_data/testimonials.json')
    ]);
    el.innerHTML = `
      <div class="overview-cards">
        <div class="ov-card" onclick="navigate('blog')">
          <div class="ov-num">${(blog.content.en || []).length}</div>
          <div class="ov-label">Blog Posts</div>
        </div>
        <div class="ov-card" onclick="navigate('events')">
          <div class="ov-num">${(events.content.en || []).length}</div>
          <div class="ov-label">Events</div>
        </div>
        <div class="ov-card" onclick="navigate('gallery')">
          <div class="ov-num">${gallery.content.length}</div>
          <div class="ov-label">Gallery Items</div>
        </div>
        <div class="ov-card" onclick="navigate('testimonials')">
          <div class="ov-num">${(testimonials.content.en || []).length}</div>
          <div class="ov-label">Testimonials</div>
        </div>
      </div>`;
  } catch (e) {
    el.innerHTML = `<p class="error-msg">Could not load stats: ${esc(e.message)}</p>`;
  }
}

// ====================================================
// BLOG
// ====================================================

async function loadBlog() {
  const el = document.getElementById('blog-list');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const { content } = await readJSON('src/_data/blog.json');
    const posts = content.en || [];
    if (!posts.length) {
      el.innerHTML = '<p class="muted">No posts yet.</p>';
    } else {
      el.innerHTML = posts.map(p => `
        <div class="list-item">
          <div class="list-item-info">
            <strong>${esc(p.title)}</strong>
            <span class="meta">${esc(p.date)}</span>
          </div>
          <div class="list-item-actions">
            <a href="https://grant-consulting.uz/en/${esc(p.link)}" target="_blank" class="btn-sm">View ↗</a>
          </div>
        </div>`).join('');
    }
  } catch (e) {
    el.innerHTML = `<p class="error-msg">Error: ${esc(e.message)}</p>`;
  }
}

// Auto-slug from EN title
document.getElementById('post-title-en').addEventListener('input', function() {
  const slug = document.getElementById('post-slug');
  if (!slug.dataset.manual) slug.value = slugify(this.value);
});
document.getElementById('post-slug').addEventListener('input', function() {
  this.dataset.manual = '1';
});

// Show/hide new post form
document.getElementById('btn-new-post').addEventListener('click', () => {
  document.getElementById('post-form-wrap').style.display = 'block';
  document.getElementById('btn-new-post').style.display = 'none';
});
document.getElementById('btn-cancel-post').addEventListener('click', () => {
  document.getElementById('post-form-wrap').style.display = 'none';
  document.getElementById('btn-new-post').style.display = '';
  document.getElementById('post-form').reset();
  resetSections();
  setStatus('post-status', '', '');
});

document.getElementById('post-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  await publishPost();
});

function resetSections() {
  LANGS.forEach(lang => {
    const builder = document.getElementById(`sections-${lang}`);
    const items = builder.querySelectorAll('.section-item');
    items.forEach((el, i) => { if (i > 0) el.remove(); });
    builder.querySelector('.section-heading').value = '';
    builder.querySelector('.para-input').value = '';
    // Remove extra paras
    const parasDiv = builder.querySelector('.paragraphs');
    parasDiv.querySelectorAll('.para-input').forEach((el, i) => { if (i > 0) el.remove(); });
  });
}

function getSections(lang) {
  const builder = document.getElementById(`sections-${lang}`);
  return Array.from(builder.querySelectorAll('.section-item')).map(item => ({
    heading: item.querySelector('.section-heading').value.trim(),
    content: Array.from(item.querySelectorAll('.para-input'))
      .map(t => t.value.trim()).filter(Boolean)
  })).filter(s => s.content.length > 0);
}

async function publishPost() {
  const btn = document.getElementById('btn-publish');
  btn.disabled = true;
  setStatus('post-status', 'Publishing…', '');

  const slug = document.getElementById('post-slug').value.trim();
  const author = document.getElementById('post-author').value.trim() || 'Admin';
  const datetime = document.getElementById('post-datetime').value;
  const imageFile = document.getElementById('post-image').files[0];
  const imageFilename = imageFile ? `${slug}.${imageFile.name.split('.').pop().toLowerCase()}` : '';

  // Basic validation
  if (!slug || !datetime) {
    setStatus('post-status', 'Please fill in Slug and Date.', 'error');
    btn.disabled = false;
    return;
  }
  const enTitle = document.getElementById('post-title-en').value.trim();
  if (!enTitle) {
    setStatus('post-status', 'English title is required.', 'error');
    btn.disabled = false;
    return;
  }

  try {
    // 1. Upload image
    if (imageFile) {
      setStatus('post-status', 'Uploading image…', '');
      const b64 = await fileToBase64(imageFile);
      await uploadFile(`src/img/blog/${imageFilename}`, b64, `Blog image: ${imageFilename}`);
    }

    // 2. Read blogPosts.json
    setStatus('post-status', 'Saving post data…', '');
    const { content: postsArr, sha: postsSha } = await readJSON('src/_data/blogPosts.json');
    const newIndex = postsArr.length;

    const newPost = { id: slug, slug: `blog-${slug}`, image: imageFilename };
    LANGS.forEach(lang => {
      newPost[lang] = {
        title: document.getElementById(`post-title-${lang}`).value.trim() || enTitle,
        excerpt: document.getElementById(`post-excerpt-${lang}`).value.trim(),
        author,
        date: document.getElementById(`post-date-${lang}`).value.trim(),
        datetime,
        sections: getSections(lang)
      };
    });
    postsArr.push(newPost);
    await writeJSON('src/_data/blogPosts.json', postsArr, postsSha, `Blog post: ${enTitle}`);

    // 3. Update blog.json listing
    const { content: blogData, sha: blogSha } = await readJSON('src/_data/blog.json');
    LANGS.forEach(lang => {
      if (!blogData[lang]) blogData[lang] = [];
      blogData[lang].push({
        title: newPost[lang].title,
        excerpt: newPost[lang].excerpt,
        author,
        date: newPost[lang].date,
        datetime,
        link: `blog-${slug}.html`,
        image: imageFilename
      });
    });
    await writeJSON('src/_data/blog.json', blogData, blogSha, `Blog listing: ${enTitle}`);

    // 4. Create .njk template file
    setStatus('post-status', 'Creating page template…', '');
    const njkContent = `---js\n{\n  pagination: { data: "languages", size: 1, alias: "lang" },\n  permalink: function(data) { return data.lang.code + "/blog-${slug}.html"; },\n  layout: "layouts/page.njk",\n  pageCss: "css/blog-post.css",\n  navKey: "Blog",\n  extraFonts: "&family=Merriweather:wght@700",\n  currentPage: "blog-${slug}.html",\n  postIdx: ${newIndex},\n  eleventyComputed: {\n    title: function(data) { var L = data.lang.code; return (data.blogPosts[${newIndex}][L] || data.blogPosts[${newIndex}].en).title + " - Grant Consulting"; },\n    description: function(data) { var L = data.lang.code; return (data.blogPosts[${newIndex}][L] || data.blogPosts[${newIndex}].en).excerpt; },\n    heroTitle: function(data) { var L = data.lang.code; return (data.blogPosts[${newIndex}][L] || data.blogPosts[${newIndex}].en).title; },\n    breadcrumbs: function(data) {\n      var L = data.lang.code;\n      return [\n        { label: (data.ui[L]||data.ui.en).page_blog_hero, url: "blog.html" },\n        { label: (data.blogPosts[${newIndex}][L] || data.blogPosts[${newIndex}].en).title }\n      ];\n    }\n  }\n}\n---\n{%- include "partials/blog-post-content.njk" %}\n`;
    const njkB64 = btoa(unescape(encodeURIComponent(njkContent)));
    await uploadFile(`src/blog-${slug}.njk`, njkB64, `Blog template: blog-${slug}.njk`);

    setStatus('post-status', '✓ Published! Site rebuilds in ~1 minute.', 'success');
    document.getElementById('post-form').reset();
    delete document.getElementById('post-slug').dataset.manual;
    resetSections();
    document.getElementById('post-form-wrap').style.display = 'none';
    document.getElementById('btn-new-post').style.display = '';
    await loadBlog();
  } catch (err) {
    setStatus('post-status', `Error: ${esc(err.message)}`, 'error');
  }
  btn.disabled = false;
}

// Section builder
function addSection(lang) {
  const builder = document.getElementById(`sections-${lang}`);
  const addBtn = builder.lastElementChild; // the "+ Add section" button
  const div = document.createElement('div');
  div.className = 'section-item';
  div.innerHTML = `
    <input type="text" class="section-heading" placeholder="Section heading (optional)">
    <div class="paragraphs" style="margin-top:8px;">
      <textarea class="para-input" placeholder="Write paragraph here…" rows="5"></textarea>
      <div class="section-item-actions">
        <button type="button" class="btn-sm" onclick="addParagraph(this)">+ Add paragraph</button>
        <button type="button" class="btn-sm btn-danger" onclick="this.closest('.section-item').remove()">Remove section</button>
      </div>
    </div>`;
  builder.insertBefore(div, addBtn);
}

function addParagraph(btn) {
  const parasDiv = btn.closest('.paragraphs');
  const ta = document.createElement('textarea');
  ta.className = 'para-input';
  ta.placeholder = 'Write paragraph here…';
  ta.rows = 4;
  parasDiv.insertBefore(ta, btn.closest('.section-item-actions'));
}

// ====================================================
// EVENTS
// ====================================================

async function loadEvents() {
  const el = document.getElementById('events-list');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const { content } = await readJSON('src/_data/events.json');
    const items = content.en || [];
    if (!items.length) {
      el.innerHTML = '<p class="muted">No events yet. Use the form above to add one.</p>';
    } else {
      el.innerHTML = items.map((ev, i) => `
        <div class="list-item">
          <div class="list-item-info">
            <strong>${esc(ev.title)}</strong>
            <span class="meta">${esc(ev.date)} · ${esc(ev.location)}</span>
          </div>
          <div class="list-item-actions">
            <button class="btn-sm btn-danger" onclick="deleteEvent(${i})">Delete</button>
          </div>
        </div>`).join('');
    }
  } catch (e) {
    el.innerHTML = `<p class="error-msg">Error: ${esc(e.message)}</p>`;
  }
}

document.getElementById('event-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type="submit"]');
  btn.disabled = true;
  setStatus('event-status', 'Saving…', '');

  const dateVal = document.getElementById('event-date').value;
  if (!dateVal || !document.getElementById('event-title-en').value.trim()) {
    setStatus('event-status', 'Date and English title are required.', 'error');
    btn.disabled = false;
    return;
  }

  try {
    const { content: evData, sha } = await readJSON('src/_data/events.json');
    LANGS.forEach(lang => {
      if (!evData[lang]) evData[lang] = [];
      evData[lang].push({
        title: document.getElementById(`event-title-${lang}`).value.trim() ||
               document.getElementById('event-title-en').value.trim(),
        location: document.getElementById(`event-location-${lang}`).value.trim() ||
                  document.getElementById('event-location-en').value.trim(),
        description: document.getElementById(`event-desc-${lang}`).value.trim(),
        date: dateVal
      });
    });
    await writeJSON('src/_data/events.json', evData, sha,
      `Add event: ${document.getElementById('event-title-en').value.trim()}`);
    setStatus('event-status', '✓ Event added! Site rebuilds in ~1 minute.', 'success');
    this.reset();
    await loadEvents();
  } catch (err) {
    setStatus('event-status', `Error: ${esc(err.message)}`, 'error');
  }
  btn.disabled = false;
});

async function deleteEvent(index) {
  if (!confirm('Delete this event from all languages?')) return;
  try {
    const { content: evData, sha } = await readJSON('src/_data/events.json');
    LANGS.forEach(lang => { if (evData[lang]) evData[lang].splice(index, 1); });
    await writeJSON('src/_data/events.json', evData, sha, 'Delete event');
    await loadEvents();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ====================================================
// GALLERY
// ====================================================

async function loadGallery() {
  const el = document.getElementById('gallery-list');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const { content } = await readJSON('src/_data/gallery.json');
    if (!content.length) {
      el.innerHTML = '<p class="muted">Gallery is empty.</p>';
    } else {
      el.innerHTML = `<div class="gallery-admin-grid">${content.map((item, i) => `
        <div class="gallery-admin-item">
          ${item.type === 'video'
            ? `<div class="video-thumb">▶<br>${esc(item.file)}</div>`
            : `<img src="https://raw.githubusercontent.com/sarvarbeksoporboyev8-debug/consulting-website/main/src/img/gallery/${esc(item.file)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          }
          <div class="gallery-admin-label">${esc(item.file)}</div>
          <button class="btn-del" onclick="deleteGalleryItem(${i})" title="Remove">✕</button>
        </div>`).join('')}</div>`;
    }
  } catch (e) {
    el.innerHTML = `<p class="error-msg">Error: ${esc(e.message)}</p>`;
  }
}

document.getElementById('gallery-upload-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fileInput = document.getElementById('gallery-file');
  const file = fileInput.files[0];
  if (!file) return;
  const btn = this.querySelector('button[type="submit"]');
  btn.disabled = true;
  setStatus('gallery-status', 'Uploading…', '');

  try {
    const b64 = await fileToBase64(file);
    const filename = file.name.replace(/\s+/g, '-');
    const type = file.type.startsWith('video/') ? 'video' : 'image';

    // Check if file exists (need SHA to overwrite)
    const existingSha = await checkFileSha(`src/img/gallery/${filename}`);
    const putBody = { message: `Gallery: add ${filename}`, content: b64 };
    if (existingSha) putBody.sha = existingSha;
    await apiRequest(`src/img/gallery/${filename}`, 'PUT', putBody);

    const { content: galleryData, sha } = await readJSON('src/_data/gallery.json');
    galleryData.push({ type, file: filename });
    await writeJSON('src/_data/gallery.json', galleryData, sha, `Gallery: add ${filename}`);

    setStatus('gallery-status', '✓ Uploaded! Site rebuilds in ~1 minute.', 'success');
    fileInput.value = '';
    await loadGallery();
  } catch (err) {
    setStatus('gallery-status', `Error: ${esc(err.message)}`, 'error');
  }
  btn.disabled = false;
});

async function deleteGalleryItem(index) {
  if (!confirm('Remove this item from the gallery display? (File stays in repo)')) return;
  try {
    const { content: galleryData, sha } = await readJSON('src/_data/gallery.json');
    galleryData.splice(index, 1);
    await writeJSON('src/_data/gallery.json', galleryData, sha, 'Gallery: remove item');
    await loadGallery();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ====================================================
// TESTIMONIALS
// ====================================================

async function loadTestimonials() {
  const el = document.getElementById('testimonials-list');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const { content } = await readJSON('src/_data/testimonials.json');
    const items = content.en || [];
    if (!items.length) {
      el.innerHTML = '<p class="muted">No testimonials yet.</p>';
    } else {
      el.innerHTML = items.map((t, i) => `
        <div class="list-item">
          <div class="list-item-info">
            <strong>${esc(t.name)}</strong>
            <span class="meta">${esc(t.title)}</span>
            <p class="quote-preview">"${esc(t.quote.substring(0, 100))}${t.quote.length > 100 ? '…' : ''}"</p>
          </div>
          <div class="list-item-actions">
            <button class="btn-sm btn-danger" onclick="deleteTestimonial(${i})">Delete</button>
          </div>
        </div>`).join('');
    }
  } catch (e) {
    el.innerHTML = `<p class="error-msg">Error: ${esc(e.message)}</p>`;
  }
}

document.getElementById('testimonial-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type="submit"]');
  btn.disabled = true;
  setStatus('testimonial-status', 'Saving…', '');

  const name = document.getElementById('t-name').value.trim();
  const role = document.getElementById('t-title').value.trim();
  if (!name || !role || !document.getElementById('t-quote-en').value.trim()) {
    setStatus('testimonial-status', 'Name, title, and English quote are required.', 'error');
    btn.disabled = false;
    return;
  }

  const avatarFile = document.getElementById('t-avatar').files[0];
  const avatarFilename = avatarFile ? avatarFile.name.replace(/\s+/g, '-') : '';

  try {
    if (avatarFile) {
      setStatus('testimonial-status', 'Uploading avatar…', '');
      const b64 = await fileToBase64(avatarFile);
      const existingSha = await checkFileSha(`src/img/team/${avatarFilename}`);
      const putBody = { message: `Avatar: ${avatarFilename}`, content: b64 };
      if (existingSha) putBody.sha = existingSha;
      await apiRequest(`src/img/team/${avatarFilename}`, 'PUT', putBody);
    }

    const { content: testData, sha } = await readJSON('src/_data/testimonials.json');
    LANGS.forEach(lang => {
      if (!testData[lang]) testData[lang] = [];
      testData[lang].push({
        quote: document.getElementById(`t-quote-${lang}`).value.trim() ||
               document.getElementById('t-quote-en').value.trim(),
        name,
        title: role,
        avatar: avatarFilename
      });
    });
    await writeJSON('src/_data/testimonials.json', testData, sha, `Add testimonial: ${name}`);
    setStatus('testimonial-status', '✓ Added! Site rebuilds in ~1 minute.', 'success');
    this.reset();
    await loadTestimonials();
  } catch (err) {
    setStatus('testimonial-status', `Error: ${esc(err.message)}`, 'error');
  }
  btn.disabled = false;
});

async function deleteTestimonial(index) {
  if (!confirm('Delete this testimonial from all languages?')) return;
  try {
    const { content: testData, sha } = await readJSON('src/_data/testimonials.json');
    LANGS.forEach(lang => { if (testData[lang]) testData[lang].splice(index, 1); });
    await writeJSON('src/_data/testimonials.json', testData, sha, 'Delete testimonial');
    await loadTestimonials();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ====================================================
// INIT
// ====================================================
navigate('overview');
