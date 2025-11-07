(function () {
    const audio = document.getElementById("heroAudio");
    const toggle = document.querySelector(".audio-toggle");
    if (!audio || !toggle) {
        return;
    }

    const labels = {
        playing: "Pausar musica",
        paused: "Reproducir musica"
    };

    const setState = function (playing) {
        toggle.setAttribute("aria-pressed", playing ? "true" : "false");
        toggle.setAttribute("aria-label", playing ? labels.playing : labels.paused);
        toggle.classList.toggle("is-playing", playing);
    };

    const playAudio = function () {
        const attempt = audio.play();
        if (attempt && typeof attempt.then === "function") {
            return attempt.then(function () {
                setState(true);
                return true;
            }).catch(function (error) {
                setState(false);
                return Promise.reject(error);
            });
        }
        setState(true);
        return Promise.resolve(true);
    };

    const pauseAudio = function () {
        audio.pause();
        setState(false);
    };

    toggle.addEventListener("click", function () {
        if (!audio.src) {
            return;
        }

        if (audio.paused) {
            playAudio();
        } else {
            pauseAudio();
        }
    });

    audio.addEventListener("ended", function () {
        setState(false);
    });

    audio.addEventListener("pause", function () {
        setState(false);
    });

    audio.addEventListener("play", function () {
        setState(true);
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden && !audio.paused) {
            pauseAudio();
        }
    });

    setState(false);

    const registerUnlock = function () {
        const unlock = function () {
            playAudio().finally(function () {
                document.removeEventListener("pointerdown", unlock);
                document.removeEventListener("keydown", unlock);
            });
        };

        document.addEventListener("pointerdown", unlock, { once: true, passive: true });
        document.addEventListener("keydown", unlock, { once: true });
    };

    const attemptAutoplay = function () {
        if (!audio.src) {
            return;
        }

        // Avoid re-triggering if already playing
        if (!audio.paused) {
            setState(true);
            return;
        }

        playAudio().catch(registerUnlock);
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
        attemptAutoplay();
    } else {
        document.addEventListener("DOMContentLoaded", attemptAutoplay, { once: true });
    }
})();

(function () {
    const container = document.querySelector("[data-countdown]");
    if (!container) {
        return;
    }

    const host = container.closest("[data-countdown-date]");
    if (!host) {
        return;
    }

    const targetValue = host.getAttribute("data-countdown-date");
    if (!targetValue) {
        return;
    }

    const targetDate = new Date(targetValue);
    if (Number.isNaN(targetDate.getTime())) {
        console.warn("Countdown: fecha invalida", targetValue);
        return;
    }

    const fields = {
        days: container.querySelector('[data-countdown-value="days"]'),
        hours: container.querySelector('[data-countdown-value="hours"]'),
        minutes: container.querySelector('[data-countdown-value="minutes"]'),
        seconds: container.querySelector('[data-countdown-value="seconds"]')
    };

    if (!fields.days || !fields.hours || !fields.minutes || !fields.seconds) {
        return;
    }

    Object.values(fields).forEach(function (el) {
        el.addEventListener("animationend", function () {
            el.classList.remove("is-changing");
        });
    });

    const pad = function (value) {
        return String(value).padStart(2, "0");
    };

    const updateField = function (key, value) {
        const el = fields[key];
        if (!el) {
            return;
        }

        const formatted = pad(value);
        if (el.textContent === formatted) {
            return;
        }

        el.classList.remove("is-changing");
        el.textContent = formatted;
        void el.offsetWidth;
        el.classList.add("is-changing");
    };

    const render = function (diff) {
        const totalSeconds = Math.max(0, Math.floor(diff / 1000));
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        updateField("days", days);
        updateField("hours", hours);
        updateField("minutes", minutes);
        updateField("seconds", seconds);

        if (totalSeconds === 0) {
            host.classList.add("countdown--ended");
        }
    };

    const update = function () {
        const now = Date.now();
        const diff = targetDate.getTime() - now;
        if (diff <= 0) {
            render(0);
            window.clearInterval(timerId);
            return;
        }

        render(diff);
    };

    render(targetDate.getTime() - Date.now());
    const timerId = window.setInterval(update, 1000);
})();

(function () {
    const carousels = document.querySelectorAll("[data-carousel]");
    if (!carousels.length) {
        return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    carousels.forEach(function (carousel) {
        const track = carousel.querySelector("[data-carousel-track]");
        const slides = track ? Array.from(track.children) : [];
        if (!track || !slides.length) {
            return;
        }

        const prevButton = carousel.querySelector("[data-carousel-prev]");
        const nextButton = carousel.querySelector("[data-carousel-next]");
        const progressBar = carousel.querySelector("[data-carousel-progress]");

        let index = 0;
        let autoplayId = null;
        let slidesPerView = 1;
        let pageCount = Math.max(1, slides.length);

        const getSlidesPerView = function () {
            const value = parseFloat(window.getComputedStyle(track).getPropertyValue("--slides-per-view")) || 1;
            if (Number.isNaN(value) || value <= 0) {
                return 1;
            }
            return Math.min(slides.length, Math.max(1, Math.round(value)));
        };

        const recalcMetrics = function () {
            slidesPerView = getSlidesPerView();
            pageCount = Math.max(1, Math.ceil(slides.length / slidesPerView));
            if (index >= pageCount) {
                index = pageCount - 1;
            }
        };

        const update = function () {
            track.style.setProperty("--carousel-index", index);
            if (progressBar) {
                const ratio = (index + 1) / pageCount;
                progressBar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
            }
        };

        const move = function (step) {
            index = (index + step + pageCount) % pageCount;
            update();
        };

        const goTo = function (nextIndex) {
            index = (nextIndex + pageCount) % pageCount;
            update();
        };

        const stopAutoplay = function () {
            if (autoplayId) {
                window.clearInterval(autoplayId);
                autoplayId = null;
            }
        };

        const startAutoplay = function () {
            if (prefersReducedMotion || pageCount < 2) {
                return;
            }
            stopAutoplay();
            autoplayId = window.setInterval(function () {
                move(1);
            }, 6000);
        };

        if (prevButton) {
            prevButton.addEventListener("click", function () {
                move(-1);
            });
        }

        if (nextButton) {
            nextButton.addEventListener("click", function () {
                move(1);
            });
        }

        carousel.addEventListener("keydown", function (event) {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                move(1);
            }
        });

        carousel.addEventListener("pointerenter", stopAutoplay);
        carousel.addEventListener("pointerleave", startAutoplay);
        carousel.addEventListener("focusin", stopAutoplay);
        carousel.addEventListener("focusout", startAutoplay);

        const handleResize = function () {
            recalcMetrics();
            update();
        };

        window.addEventListener("resize", handleResize);
        recalcMetrics();
        update();
        startAutoplay();
    });
})();

(function () {
    const modal = document.querySelector("[data-bank-modal]");
    const triggers = document.querySelectorAll("[data-bank-modal-open]");
    if (!modal || !triggers.length) {
        return;
    }

    const dialog = modal.querySelector(".bank-modal__dialog");
    const closeElements = modal.querySelectorAll("[data-bank-modal-close]");
    const body = document.body;
    const transitionDuration = 260;
    let lastFocusedElement = null;
    let closeTimeout = null;

    const handleKeydown = function (event) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeModal();
        }
    };

    const openModal = function () {
        if (!modal.hidden) {
            return;
        }

        lastFocusedElement = document.activeElement;
        modal.hidden = false;
        window.requestAnimationFrame(function () {
            modal.classList.add("is-visible");
        });
        body.classList.add("has-bank-modal");
        document.addEventListener("keydown", handleKeydown);
        if (dialog) {
            dialog.focus();
        }
    };

    const closeModal = function () {
        if (modal.hidden) {
            return;
        }
        modal.classList.remove("is-visible");
        body.classList.remove("has-bank-modal");
        document.removeEventListener("keydown", handleKeydown);
        if (closeTimeout) {
            window.clearTimeout(closeTimeout);
        }
        closeTimeout = window.setTimeout(function () {
            modal.hidden = true;
            closeTimeout = null;
            if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
                lastFocusedElement.focus();
            }
        }, transitionDuration);
    };

    triggers.forEach(function (trigger) {
        trigger.addEventListener("click", openModal);
    });

    closeElements.forEach(function (element) {
        element.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
})();

// RSVP modal + form logic
(function () {
    const modal = document.querySelector('[data-rsvp-modal]');
    if (!modal) { return; }

    const dialog = modal.querySelector('.bank-modal__dialog');
    const body = document.body;
    const closeEls = modal.querySelectorAll('[data-rsvp-modal-close]');
    const transitionDuration = 260;
    let lastFocused = null;
    let closeTimeout = null;

    // Attach triggers: explicit data attr and "Confirmar" link
    const triggers = new Set();
    document.querySelectorAll('[data-rsvp-modal-open]').forEach(el => triggers.add(el));
    Array.from(document.querySelectorAll('a.event-info__button')).forEach(a => {
        if (/confirmar/i.test(a.textContent || '')) { triggers.add(a); }
    });

    const onKeydown = (ev) => {
        if (ev.key === 'Escape') { ev.preventDefault(); closeModal(); }
    };

    const openModal = () => {
        if (!modal.hidden) { return; }
        lastFocused = document.activeElement;
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('is-visible'));
        body.classList.add('has-bank-modal');
        document.addEventListener('keydown', onKeydown);
        if (dialog) { dialog.focus(); }
        ensureAtLeastOneGuest();
    };

    const closeModal = () => {
        if (modal.hidden) { return; }
        modal.classList.remove('is-visible');
        body.classList.remove('has-bank-modal');
        document.removeEventListener('keydown', onKeydown);
        if (closeTimeout) { clearTimeout(closeTimeout); }
        closeTimeout = setTimeout(() => {
            modal.hidden = true;
            closeTimeout = null;
            if (lastFocused && typeof lastFocused.focus === 'function') { lastFocused.focus(); }
        }, transitionDuration);
    };

    triggers.forEach(el => {
        el.addEventListener('click', (ev) => {
            // If it is an anchor, avoid navigation
            if (el.tagName === 'A') { ev.preventDefault(); }
            openModal();
        });
    });

    closeEls.forEach(el => el.addEventListener('click', closeModal));
    modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });

    // RSVP form behavior
    const guestContainer = modal.querySelector('#rsvpGuests');
    const template = modal.querySelector('#guestTemplate');
    const addGuestBtn = modal.querySelector('#addGuestBtn');
    const form = modal.querySelector('#rsvpForm');
    const errorEl = modal.querySelector('#rsvpError');
    const successEl = modal.querySelector('#rsvpSuccess');

    let guestList = null; // array of {Nombre, Apellido}
    let guestIndex = 0;

    // API URL (usa el servidor local si estamos en entorno de desarrollo)
    const API_URL = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'https://valuybrai-backend.vercel.app/api/rsvp'
        : '/api/rsvp';

    const fixMojibake = (str) => {
        // Corrige caracteres mal codificados comunes en fuentes CP1252/UTF-8 mal interpretadas
        return str
            .replace(/Ã±/g, 'n')
            .replace(/a�/g, 'n')
            .replace(/Ã¡/g, 'a')
            .replace(/Ã©/g, 'e')
            .replace(/Ã­/g, 'i')
            .replace(/Ã³/g, 'o')
            .replace(/Ãº/g, 'u')
            .replace(/Â/g, '');
    };

    const normalize = (s) => {
        if (!s) return '';
        let out = String(s).toLowerCase();
        out = fixMojibake(out);
        return out
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const loadGuestList = () => {
        if (guestList) return Promise.resolve(guestList);
        const url = encodeURI('Lista.json');
        return fetch(url).then(r => {
            if (!r.ok) throw new Error('No se pudo cargar la lista');
            return r.json();
        }).then(json => {
            guestList = Array.isArray(json) ? json : [];
            return guestList;
        }).catch(err => {
            console.warn('Error cargando lista de invitados:', err);
            guestList = [];
            return guestList;
        });
    };

    const guestSet = () => {
        const set = new Set();
        (guestList || []).forEach(item => {
            const key = normalize(item.Nombre) + '|' + normalize(item.Apellido);
            if (key.trim() !== '|') set.add(key);
        });
        return set;
    };

    const newGuestEl = () => {
        const node = template.content.cloneNode(true);
        const fieldset = node.querySelector('[data-guest]');
        const legendIndex = node.querySelector('[data-guest-index]');
        const radios = node.querySelectorAll('input[type="radio"]');
        guestIndex += 1;
        if (legendIndex) legendIndex.textContent = String(guestIndex);
        radios.forEach(r => {
            r.name = r.name.replace('__IDX__', String(guestIndex));
        });
        return node;
    };

    const updateGuestControls = () => {
        const blocks = Array.from(guestContainer.querySelectorAll('[data-guest]'));
        blocks.forEach((block, i) => {
            const label = block.querySelector('[data-guest-index]');
            if (label) label.textContent = String(i + 1);
            const removeBtn = block.querySelector('[data-guest-remove]');
            if (removeBtn) removeBtn.disabled = blocks.length <= 1;
        });
    };

    const ensureAtLeastOneGuest = () => {
        if (!guestContainer.querySelector('[data-guest]')) {
            guestContainer.appendChild(newGuestEl());
        }
        updateGuestControls();
    };

    addGuestBtn && addGuestBtn.addEventListener('click', () => {
        guestContainer.appendChild(newGuestEl());
        updateGuestControls();
    });

    const resetGuestBlock = (block) => {
        block.querySelectorAll('input[type="text"]').forEach(i => { i.value = ''; });
        block.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; });
        block.querySelectorAll('select').forEach(s => { s.selectedIndex = 0; });
        const err = block.querySelector('[data-guest-error]');
        if (err) { err.hidden = true; err.textContent = ''; }
    };

    guestContainer.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-guest-remove]');
        if (!btn) return;
        ev.preventDefault();
        const block = btn.closest('[data-guest]');
        if (!block) return;
        const blocks = guestContainer.querySelectorAll('[data-guest]');
        if (blocks.length > 1) {
            block.remove();
        } else {
            resetGuestBlock(block);
        }
        updateGuestControls();
    });

    const clearMessages = () => {
        errorEl && (errorEl.hidden = true, errorEl.textContent = '');
        successEl && (successEl.hidden = true);
        guestContainer.querySelectorAll('[data-guest-error]').forEach(el => { el.hidden = true; el.textContent = ''; });
    };

    const collectGuests = () => {
        const guests = [];
        const blocks = Array.from(guestContainer.querySelectorAll('[data-guest]'));
        blocks.forEach((block, i) => {
            const nombre = block.querySelector('input[name="nombre"]').value || '';
            const apellido = block.querySelector('input[name="apellido"]').value || '';
            const radioName = Array.from(block.querySelectorAll('input[type="radio"][name^="asiste-"]')).map(r => r.name)[0] || '';
            const asisteEl = radioName ? block.querySelector('input[type="radio"][name="' + radioName + '"]:checked') : null;
            const alimentacion = (block.querySelector('select[name="alimentacion"]').value || 'Ninguno').trim();
            const cancion = block.querySelector('input[name="cancion"]').value || '';
            guests.push({ nombre, apellido, asiste: !!(asisteEl && asisteEl.value === 'si'), alimentacion, cancion, _block: block });
        });
        return guests;
    };

    const validateAgainstList = (guests) => {
        const set = guestSet();
        let ok = true;
        guests.forEach(g => {
            const key = normalize(g.nombre) + '|' + normalize(g.apellido);
            const blockError = g._block.querySelector('[data-guest-error]');
            if (!g.nombre.trim() || !g.apellido.trim()) {
                ok = false;
                if (blockError) { blockError.hidden = false; blockError.textContent = 'Nombre y apellido son obligatorios.'; }
            } else if (!set.has(key)) {
                ok = false;
                if (blockError) { blockError.hidden = false; blockError.textContent = 'No encontramos este invitado en la lista.'; }
            }
        });
        return ok;
    };

    // ya no se descarga JSON en el cliente

    form && form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        clearMessages();
        loadGuestList().then(() => {
            const guests = collectGuests();
            // basic radio validation
            let radiosOk = true;
            guests.forEach(g => {
                const blockError = g._block.querySelector('[data-guest-error]');
                const hasChoice = g._block.querySelector('input[type="radio"][name^="asiste-"]:checked');
                if (!hasChoice) { radiosOk = false; blockError.hidden = false; blockError.textContent = 'Elegí una opción de asistencia.'; }
            });

            const listOk = validateAgainstList(guests);
            if (!radiosOk || !listOk) {
                if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'Revisá los datos marcados en rojo.'; }
                return;
            }

            const payload = {
                fecha: new Date().toISOString(),
                invitados: guests.map(({ _block, ...rest }) => rest)
            };
            // Enviar al servidor para guardar en archivo
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async (r) => {
                const ct = r.headers.get('content-type') || '';
                if (!ct.includes('application/json')) {
                    const txt = await r.text().catch(() => '');
                    throw new Error('Respuesta no JSON (' + r.status + '): ' + txt.slice(0, 120));
                }
                const resp = await r.json();
                if (!r.ok || !resp || resp.ok !== true) throw new Error('Respuesta inválida del servidor');
                if (successEl) { successEl.hidden = false; }
                updateGuestControls();
            }).catch(err => {
                if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'No se pudo guardar. Probá de nuevo.'; }
                console.warn('Error enviando RSVP:', err);
            });
        });
    });
})();
