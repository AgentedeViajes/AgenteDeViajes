(function () {
  'use strict';

  const hero = document.querySelector('.premium-hero');
  if (!hero) return;

  const slides = Array.from(hero.querySelectorAll('.hero-slide'));
  const dots = Array.from(hero.querySelectorAll('.hero-carousel-dot'));
  if (!slides.length || slides.length !== dots.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 7000;
  let current = 0;
  let timer = null;
  let paused = false;

  function loadSlide(index) {
    const slide = slides[index];
    if (!slide || slide.dataset.loaded === 'true') return Promise.resolve(true);
    if (slide._loadingPromise) return slide._loadingPromise;

    slide._loadingPromise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.onload = function () {
        slide.style.backgroundImage = `url("${slide.dataset.src}")`;
        slide.dataset.loaded = 'true';
        resolve(true);
      };
      image.onerror = function () { resolve(false); };
      image.src = slide.dataset.src;
    });
    return slide._loadingPromise;
  }

  function preloadNext(index) {
    const next = (index + 1) % slides.length;
    loadSlide(next);
  }

  function stopTimer() {
    window.clearTimeout(timer);
    timer = null;
  }

  function scheduleNext() {
    stopTimer();
    if (paused || reducedMotion.matches || document.hidden) return;
    timer = window.setTimeout(function () {
      showSlide((current + 1) % slides.length);
    }, interval);
  }

  async function showSlide(index) {
    const target = ((index % slides.length) + slides.length) % slides.length;
    const loaded = await loadSlide(target);
    if (!loaded) {
      const fallback = (target + 1) % slides.length;
      if (fallback !== current) showSlide(fallback);
      else scheduleNext();
      return;
    }

    slides[current].classList.remove('is-active');
    slides[current].setAttribute('aria-hidden', 'true');
    dots[current].classList.remove('is-active');
    dots[current].removeAttribute('aria-current');

    current = target;
    slides[current].classList.add('is-active');
    slides[current].setAttribute('aria-hidden', 'false');
    dots[current].classList.add('is-active');
    dots[current].setAttribute('aria-current', 'true');
    preloadNext(current);
    scheduleNext();
  }

  function pause() {
    paused = true;
    stopTimer();
  }

  function resume() {
    paused = false;
    scheduleNext();
  }

  dots.forEach(function (dot, index) {
    dot.addEventListener('click', function () { showSlide(index); });
  });

  hero.addEventListener('mouseenter', pause);
  hero.addEventListener('mouseleave', resume);
  hero.addEventListener('focusin', pause);
  hero.addEventListener('focusout', function (event) {
    if (!hero.contains(event.relatedTarget)) resume();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopTimer();
    else scheduleNext();
  });
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', scheduleNext);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(scheduleNext);
  }

  slides.forEach(function (slide, index) {
    slide.setAttribute('aria-hidden', index === current ? 'false' : 'true');
  });
  preloadNext(current);
  scheduleNext();
})();
