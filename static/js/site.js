(function () {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    root.classList.remove('no-js');
    root.classList.add('js');

    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    function setMenu(open) {
        hamburger.classList.toggle('active', open);
        navLinks.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
    }

    if (hamburger && navLinks) {
        navLinks.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));
        hamburger.addEventListener('click', () => setMenu(!navLinks.classList.contains('active')));
        navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) setMenu(false);
        });
    }

    const header = document.getElementById('siteHeader');
    const wordmark = document.querySelector('.footer-wordmark');
    let ticking = false;

    function onScroll() {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
        if (header) header.classList.toggle('is-scrolled', y > 24);

        if (wordmark) {
            const r = wordmark.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 0.6)));
            wordmark.style.setProperty('--fill', (p * 100).toFixed(1) + '%');
        }
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });
    onScroll();

    document.querySelectorAll('[data-split]').forEach(el => {
        let index = 0;
        const wrap = node => {
            const word = document.createElement('span');
            word.className = 'word';
            const inner = document.createElement('span');
            inner.style.setProperty('--wi', index++);
            inner.appendChild(node);
            word.appendChild(inner);
            return word;
        };
        Array.from(el.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
                    else frag.appendChild(wrap(document.createTextNode(part)));
                });
                el.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                el.replaceChild(wrap(node.cloneNode(true)), node);
            }
        });
        el.classList.add('split');
    });

    document.querySelectorAll('[data-stagger]').forEach(group => {
        Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
    });

    function countUp(el) {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        if (reduceMotion || isNaN(target)) return;
        const duration = 1800;
        const start = performance.now();
        const step = now => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 4);
            el.textContent = Math.round(target * eased) + suffix;
            if (t < 1) requestAnimationFrame(step);
        };
        el.textContent = '0' + suffix;
        requestAnimationFrame(step);
    }

    const revealTargets = document.querySelectorAll('[data-reveal], [data-stagger], [data-split], [data-count]');

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                el.classList.add('is-visible');
                if (el.dataset.count) countUp(el);
                io.unobserve(el);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        revealTargets.forEach(el => io.observe(el));
    } else {
        revealTargets.forEach(el => el.classList.add('is-visible'));
    }

    document.querySelectorAll('[data-words]').forEach(el => {
        const words = el.dataset.words.split('|');
        if (reduceMotion) {
            el.textContent = words[0];
            return;
        }
        let w = 0;
        let c = 0;
        let deleting = false;
        const tick = () => {
            const word = words[w];
            c += deleting ? -1 : 1;
            el.textContent = word.slice(0, c);
            let delay = deleting ? 35 : 75;
            if (!deleting && c === word.length) {
                deleting = true;
                delay = 2000;
            } else if (deleting && c === 0) {
                deleting = false;
                w = (w + 1) % words.length;
                delay = 350;
            }
            setTimeout(tick, delay);
        };
        el.textContent = '';
        setTimeout(tick, 1200);
    });

    const form = document.getElementById('contactForm');
    if (form) {
        const params = new URLSearchParams(window.location.search);
        const status = document.getElementById('formStatus');
        const showStatus = (ok, message) => {
            status.className = 'form-status is-shown ' + (ok ? 'form-status--ok' : 'form-status--error');
            status.querySelector('span').textContent = message;
        };

        if (params.get('topic') === 'quote') form.elements._subject.value = 'Pricing quote request from rogueglobalsolutions.tech';
        if (params.get('sent')) showStatus(true, 'Thanks! Your message is on its way. We will reply by email.');

        form.addEventListener('submit', e => {
            if (!window.fetch) return;
            e.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(form)
            })
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(() => {
                    form.reset();
                    showStatus(true, 'Thanks! Your message is on its way. We will reply by email.');
                })
                .catch(() => {
                    showStatus(false, 'Something went wrong. Please email us directly at contact.rogueglobalsolutions@gmail.com.');
                })
                .finally(() => {
                    button.disabled = false;
                });
        });
    }

    if (!finePointer || reduceMotion) return;

    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('pointermove', e => {
            const r = btn.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) * 0.25;
            const y = (e.clientY - r.top - r.height / 2) * 0.35;
            btn.style.setProperty('--mag-x', x.toFixed(1) + 'px');
            btn.style.setProperty('--mag-y', y.toFixed(1) + 'px');
        });
        btn.addEventListener('pointerleave', () => {
            btn.style.setProperty('--mag-x', '0px');
            btn.style.setProperty('--mag-y', '0px');
        });
    });
})();
