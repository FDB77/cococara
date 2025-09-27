/* Year */
document.getElementById('year').textContent = new Date().getFullYear();

/* Theme toggle with persistence */
const root = document.documentElement;
const btn = document.getElementById('themeBtn');
const saved = localStorage.getItem('theme');
const syncPressed = (theme) => {
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }
};
if (saved) {
  root.setAttribute('data-theme', saved);
  syncPressed(saved);
} else {
  syncPressed(root.getAttribute('data-theme'));
}
if (btn) {
  btn.addEventListener('click', () => {
    const now = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', now);
    localStorage.setItem('theme', now);
    syncPressed(now);
  });
}

/* Shrink header on scroll */
const header = document.getElementById('header');
let last = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  header.classList.toggle('shrink', y > 12 && y > last);
  last = y;
}, { passive: true });

/* Language toggle */
(function initLangSwitch(){
  const buttons = document.querySelectorAll('.lang-btn');
  if (!buttons.length) { return; }
  const root = document.documentElement;
  const STORAGE_KEY = 'lang';

  const applyState = (lang) => {
    const normalized = lang === 'en' ? 'en' : 'ja';
    root.lang = normalized === 'ja' ? 'ja' : 'en';
    root.setAttribute('data-lang', normalized);
    buttons.forEach((btn) => {
      const active = btn.dataset.lang === normalized;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyState(saved);
  } else {
    applyState(root.lang || 'ja');
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      applyState(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    });
  });
})();

/* Scroll reveal */
(function initScrollReveal(){
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target;
      if (entry.isIntersecting) {
        requestAnimationFrame(() => target.classList.add('is-visible'));
      } else {
        target.classList.remove('is-visible');
      }
    });
  }, {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px -10% 0px'
  });

  window.setTimeout(() => {
    targets.forEach((el, index) => {
      el.style.transitionDelay = `${Math.min(index * 0.08, 0.32)}s`;
      observer.observe(el);
    });
  }, 60);
})();

/* Hero slideshow */
const heroImages = [
  'img/hero/heroShop.jpg',
  'img/hero/heroPlate.jpeg'
];

(function initHeroSlideshow(){
  const media = document.querySelector('.hero-media');
  if (!media) { return; }
  const slides = media.querySelectorAll('.hero-slide');
  if (slides.length < 1) { return; }

  const sources = [...new Set(heroImages.filter(Boolean))];
  if (!sources.length) { return; }

  const setBackground = (el, src) => {
    if (!src) { return; }
    el.style.backgroundImage = `url('${src}')`;
  };

  const preloadCache = new Map();
  const preloadImage = (src) => {
    if (!src) { return Promise.resolve(false); }
    if (preloadCache.has(src)) { return preloadCache.get(src); }
    const promise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
    preloadCache.set(src, promise);
    return promise;
  };

  sources.forEach(preloadImage);

  let workingSources = sources.slice();
  let activeSlideIndex = 0;
  let currentImageIndex = 0;
  let timerId;
  const HERO_INTERVAL_MS = 7000;

  const cleanupTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const ensureNextPreloaded = () => {
    if (workingSources.length <= 1) { return; }
    const nextIndex = (currentImageIndex + 1) % workingSources.length;
    preloadImage(workingSources[nextIndex]);
  };

  const initFirstSlides = () => {
    const firstSrc = workingSources[0];
    setBackground(slides[0], firstSrc);
    slides[0].classList.add('is-active');

    if (workingSources.length > 1 && slides.length > 1) {
      const secondSrc = workingSources[1];
      preloadImage(secondSrc).then((ok) => {
        if (ok) { setBackground(slides[1], secondSrc); }
      });
    }

    ensureNextPreloaded();
  };

  initFirstSlides();

  if (workingSources.length <= 1 || slides.length < 2) { return; }

  const scheduleNext = () => {
    timerId = window.setTimeout(runCycle, HERO_INTERVAL_MS);
  };

  const runCycle = () => {
    if (workingSources.length <= 1) { cleanupTimer(); return; }

    const nextIndex = (currentImageIndex + 1) % workingSources.length;
    const nextSrc = workingSources[nextIndex];

    preloadImage(nextSrc).then((ok) => {
      if (!ok) {
        workingSources = workingSources.filter((src) => src !== nextSrc);
        if (workingSources.length <= 1) { cleanupTimer(); return; }
        if (nextIndex < currentImageIndex) {
          currentImageIndex = (currentImageIndex - 1 + workingSources.length) % workingSources.length;
        } else if (currentImageIndex >= workingSources.length) {
          currentImageIndex = 0;
        }
        ensureNextPreloaded();
        scheduleNext();
        return;
      }

      const incomingIndex = 1 - activeSlideIndex;
      const incoming = slides[incomingIndex];
      const outgoing = slides[activeSlideIndex];

      setBackground(incoming, nextSrc);

      requestAnimationFrame(() => {
        incoming.classList.add('is-active');
        outgoing.classList.remove('is-active');
      });

      activeSlideIndex = incomingIndex;
      currentImageIndex = nextIndex;

      ensureNextPreloaded();
      scheduleNext();
    });
  };

  scheduleNext();
})();

/* Blog feed (Livedoor) */
(function initBlogFeed(){
  const section = document.querySelector('#blog[data-blog-feed]');
  if (!section) { return; }

  const feedUrl = (section.dataset.blogFeed || '').trim();
  if (!feedUrl || feedUrl.includes('your_blog_id')) { return; }

  const requestUrl = feedUrl.includes('?')
    ? `${feedUrl}&t=${Date.now()}`
    : `${feedUrl}?t=${Date.now()}`;

  const grid = section.querySelector('.blog-grid');
  if (!grid) { return; }

  const cards = Array.from(grid.querySelectorAll('.blog-card'));
  if (!cards.length) { return; }

  const statusEl = section.querySelector('[data-blog-status]');
  const setStatus = (message) => {
    if (!statusEl) { return; }
    statusEl.textContent = message || '';
    statusEl.hidden = !message;
    if (message) {
      statusEl.removeAttribute('aria-hidden');
    }
  };

  const parseDate = (value) => {
    if (!value) { return null; }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) { return parsed; }
    const normalized = value.replace(/-/g, '/');
    const fallback = new Date(normalized);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  };

  const formatDateLabel = (date) => {
    if (!date) { return ''; }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  const firstText = (node, selectors) => {
    for (const selector of selectors) {
      const target = node.querySelector(selector);
      const text = target && target.textContent ? target.textContent.trim() : '';
      if (text) { return text; }
    }
    return '';
  };

  const blogImageRules = [
    {
      keywords: ['栗', 'ロールケーキ', '焼き菓子', 'スイーツ', 'ケーキ', 'タルト', 'お菓子', 'dessert', 'sweets'],
      images: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1513759565286-20e9c5fad06b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80'
      ],
      fallback: 'img/blog/blog-03.jpg',
      alt: '季節のスイーツの写真'
    },
    {
      keywords: ['鎌倉', '散歩', '散策', '江ノ電', '旅', '旅行', '街', '路地', 'スポット', '散策スポット'],
      images: [
        'https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
      ],
      fallback: 'img/blog/blog-02.jpg',
      alt: '鎌倉の街並みの写真'
    },
    {
      keywords: ['豆', '焙煎', 'ドリップ', 'コーヒー', '珈琲', 'ブレンド', 'bean', 'roast'],
      images: [
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80'
      ],
      fallback: 'img/blog/blog-01.jpg',
      alt: '焙煎したコーヒー豆の写真'
    }
  ];

  const blogImageFallbacks = [
    'img/blog/blog-01.jpg',
    'img/blog/blog-02.jpg',
    'img/blog/blog-03.jpg'
  ];

  const defaultImagePools = [
    {
      images: [
        'https://images.unsplash.com/photo-1449247613801-ab06418e2861?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80'
      ],
      fallback: 'img/blog/blog-01.jpg',
      alt: 'カフェのイメージ写真'
    },
    {
      images: [
        'https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80'
      ],
      fallback: 'img/blog/blog-02.jpg',
      alt: '街歩きのイメージ写真'
    }
  ];

  const normalize = (value) => (value || '').toString().normalize('NFKC').toLowerCase();

  const hashString = (value = '') => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = Math.imul(31, hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const selectImageForEntry = (entry, index) => {
    const title = entry && entry.title ? entry.title : '';
    const categories = Array.isArray(entry && entry.categories) ? entry.categories.join(' ') : '';
    const description = entry && entry.description ? entry.description : '';
    const searchableRaw = [title, categories, description]
      .filter(Boolean)
      .join(' ');
    const searchable = normalize(searchableRaw);
    const signature = `${title}|${categories}|${description}|${index}`;
    const baseSeed = hashString(signature);

    for (const rule of blogImageRules) {
      const keywords = rule.keywords || [];
      const match = keywords.some((word) => {
        if (!word) { return false; }
        const normalizedWord = normalize(word);
        return normalizedWord && searchable.includes(normalizedWord);
      });
      if (match) {
        const pool = rule.images || [];
        return {
          remote: pool.length ? pool[baseSeed % pool.length] : '',
          fallback: rule.fallback || blogImageFallbacks[index % blogImageFallbacks.length] || blogImageFallbacks[0] || '',
          alt: rule.alt || title || 'ブログ記事のイメージ写真'
        };
      }
    }

    const fallbackSrc = blogImageFallbacks[index % blogImageFallbacks.length] || blogImageFallbacks[0] || '';
    const pool = defaultImagePools[index % defaultImagePools.length];
    return {
      remote: pool && pool.images && pool.images.length
        ? pool.images[(baseSeed + index) % pool.images.length]
        : '',
      fallback: (pool && pool.fallback) || fallbackSrc,
      alt: (pool && pool.alt) || title || 'ブログ記事のイメージ写真'
    };
  };

  const applyCardImages = (items = []) => {
    cards.forEach((card, index) => {
      const imgEl = card.querySelector('img');
      if (!imgEl) { return; }

      const titleEl = card.querySelector('h3');
      const entry = items[index];
      const title = (entry && entry.title) || (titleEl ? titleEl.textContent.trim() : '');

      const { remote, fallback, alt } = selectImageForEntry(entry, index);

      if (!imgEl.dataset.fallbackBound) {
        imgEl.addEventListener('error', () => {
          const backup = imgEl.dataset.fallbackSrc;
          if (backup && imgEl.src !== backup) {
            imgEl.src = backup;
          }
        });
        imgEl.dataset.fallbackBound = 'true';
      }

      imgEl.dataset.fallbackSrc = fallback || '';

      if (remote) {
        imgEl.src = remote;
      } else if (fallback) {
        imgEl.src = fallback;
      }

      imgEl.alt = alt || title || 'ブログ記事のイメージ写真';
    });
  };

  const updateCard = (card, item) => {
    const linkEl = card.querySelector('.blog-link');
    const titleEl = card.querySelector('h3');
    const timeEl = card.querySelector('time');

    if (linkEl && item.link) {
      linkEl.href = item.link;
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
    }
    if (titleEl && item.title) {
      titleEl.textContent = item.title;
    }
    if (timeEl) {
      if (item.date) {
        timeEl.textContent = formatDateLabel(item.date);
        timeEl.dateTime = item.date.toISOString();
      } else if (item.rawDate) {
        timeEl.textContent = item.rawDate;
        timeEl.removeAttribute('datetime');
      } else {
        timeEl.textContent = '---';
        timeEl.removeAttribute('datetime');
      }
    }
  };

  if (statusEl) {
    statusEl.hidden = true;
  }

  applyCardImages();

  fetch(requestUrl, {
    headers: { Accept: 'application/rss+xml, application/xml' },
    cache: 'no-store',
    credentials: 'omit'
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Feed request failed: ${response.status}`);
      }
      return response.text();
    })
    .then((xmlText) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');
      if (doc.querySelector('parsererror')) {
        throw new Error('Feed parsing error');
      }

      const items = Array.from(doc.querySelectorAll('item')).map((item) => {
        const title = firstText(item, ['title', 'dc\\:title']);
        const link = firstText(item, ['link']);
        const rawDate = firstText(item, ['dc\\:date', 'date', 'pubDate']);
        const date = parseDate(rawDate);
        const categories = Array.from(item.querySelectorAll('category, dc\\:subject, subject'))
          .map((el) => el.textContent ? el.textContent.trim() : '')
          .filter(Boolean);
        const description = firstText(item, ['description', 'content\\:encoded']);

        return { title, link, rawDate, date, categories, description };
      }).filter((entry) => entry.title && entry.link);

      if (!items.length) {
        throw new Error('Feed contained no usable entries');
      }

      cards.forEach((card, index) => {
        const entry = items[index];
        if (!entry) { return; }
        updateCard(card, entry);
      });

      applyCardImages(items);

      setStatus('');
    })
    .catch((error) => {
      console.warn('[blog-feed]', error);
      setStatus('ブログ最新記事を取得できませんでした。ブログ本体をご確認ください。');
    });
})();
