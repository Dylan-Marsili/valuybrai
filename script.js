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
