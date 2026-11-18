(() => {
  const slideWidth = 1600;
  const slideHeight = 900;
  const viewport = document.getElementById('viewport');
  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const previous = document.getElementById('prev');
  const next = document.getElementById('next');
  const fullscreenButton = document.getElementById('full');
  const counter = document.getElementById('counter');
  const progressTrack = document.getElementById('progress-track');
  const progress = document.getElementById('progress');
  const notes = document.getElementById('notes');
  const notesText = document.getElementById('notes-text');
  const notesButton = document.getElementById('notes-toggle');
  const announcement = document.getElementById('announcement');
  const overview = document.getElementById('overview');
  const overviewButton = document.getElementById('overview-toggle');
  const overviewClose = document.getElementById('overview-close');
  const overviewGrid = document.getElementById('overview-grid');

  let currentIndex = -1;
  let touchStart = null;

  const formatNumber = (number) => String(number).padStart(2, '0');

  function fitSlide() {
    const scale = Math.min(
      viewport.clientWidth / slideWidth,
      viewport.clientHeight / slideHeight,
    );
    deck.style.setProperty('--slide-scale', scale);
  }

  function goToSlide(index) {
    const targetIndex = Math.max(0, Math.min(slides.length - 1, index));
    if (targetIndex === currentIndex) return;

    const shouldAnnounce = currentIndex !== -1;
    currentIndex = targetIndex;
    const currentSlide = slides[currentIndex];
    const number = currentIndex + 1;
    const position = `Slide ${number} de ${slides.length}`;

    slides.forEach((slide, slideIndex) => {
      const isCurrent = slideIndex === currentIndex;
      slide.hidden = !isCurrent;
      slide.classList.toggle('active', isCurrent);
      if (isCurrent) {
        overviewItems[slideIndex].setAttribute('aria-current', 'true');
      } else {
        overviewItems[slideIndex].removeAttribute('aria-current');
      }
    });

    previous.setAttribute('aria-disabled', String(currentIndex === 0));
    next.setAttribute('aria-disabled', String(currentIndex === slides.length - 1));
    counter.textContent = `${formatNumber(number)} / ${formatNumber(slides.length)}`;
    progressTrack.setAttribute('aria-valuenow', String(number));
    progressTrack.setAttribute('aria-valuetext', position);
    progress.style.width = `${number / slides.length * 100}%`;
    notesText.textContent = currentSlide.dataset.notes;
    document.title = `${currentSlide.dataset.title} — Visão IA`;
    viewport.scrollTop = 0;

    if (shouldAnnounce) {
      announcement.textContent = `${position} – ${currentSlide.dataset.title}`;
    }
  }

  function setNotesVisible(visible) {
    notes.hidden = !visible;
    notesButton.setAttribute('aria-expanded', String(visible));
  }

  function openOverview() {
    overview.showModal();
    overviewItems[currentIndex].focus();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      } else {
        announcement.textContent = 'A tela cheia está indisponível neste navegador.';
      }
    } catch {
      announcement.textContent = 'Não foi possível alterar o modo de tela cheia.';
    }
  }

  function updateFullscreenButton() {
    const isFullscreen = Boolean(document.fullscreenElement);
    const label = isFullscreen ? 'Sair da tela cheia' : 'Tela cheia';
    fullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
    fullscreenButton.title = `${label} (F)`;
  }

  const overviewItems = slides.map((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'overview-item';

    const section = document.createElement('span');
    section.textContent = `${formatNumber(index + 1)} / ${slide.dataset.section}`;
    const title = document.createElement('strong');
    title.textContent = slide.dataset.title;

    button.append(section, title);
    button.addEventListener('click', () => {
      overview.close();
      goToSlide(index);
    });
    overviewGrid.append(button);
    return button;
  });

  previous.addEventListener('click', () => goToSlide(currentIndex - 1));
  next.addEventListener('click', () => goToSlide(currentIndex + 1));
  notesButton.addEventListener('click', () => setNotesVisible(notes.hidden));
  fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  overviewButton.addEventListener('click', openOverview);
  overviewClose.addEventListener('click', () => overview.close());
  overview.addEventListener('close', () => {
    if (!overview.open && document.activeElement === document.body) {
      overviewButton.focus();
    }
  });

  const navigationKeys = {
    ArrowRight: () => currentIndex + 1,
    ArrowDown: () => currentIndex + 1,
    PageDown: () => currentIndex + 1,
    ' ': () => currentIndex + 1,
    ArrowLeft: () => currentIndex - 1,
    ArrowUp: () => currentIndex - 1,
    PageUp: () => currentIndex - 1,
    Home: () => 0,
    End: () => slides.length - 1,
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.isContentEditable || event.target.closest?.('input, select, textarea')) return;

    const key = event.key.toLowerCase();
    if (overview.open) {
      if (key === 'o' && !event.repeat) {
        event.preventDefault();
        overview.close();
      }
      return;
    }

    if (event.key === ' ' && event.target.closest?.('button, a[href], summary, [role="button"]')) {
      return;
    }

    if (Object.hasOwn(navigationKeys, event.key)) {
      event.preventDefault();
      goToSlide(navigationKeys[event.key]());
      return;
    }

    if (event.repeat) return;
    switch (key) {
      case 'f':
        toggleFullscreen();
        break;
      case 'n':
        setNotesVisible(notes.hidden);
        break;
      case 'o':
        openOverview();
        break;
      case 'escape':
        setNotesVisible(false);
        break;
    }
  });

  viewport.addEventListener('touchstart', (event) => {
    touchStart = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });

  viewport.addEventListener('touchend', (event) => {
    const start = touchStart;
    touchStart = null;
    if (!start || overview.open) return;

    const finish = Array.from(event.changedTouches).find(
      (touch) => touch.identifier === start.identifier,
    );
    if (!finish) return;

    const deltaX = finish.clientX - start.clientX;
    const deltaY = finish.clientY - start.clientY;
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > 1.25 * Math.abs(deltaY)) {
      goToSlide(currentIndex + (deltaX < 0 ? 1 : -1));
    }
  }, { passive: true });

  viewport.addEventListener('touchcancel', () => {
    touchStart = null;
  }, { passive: true });

  new ResizeObserver(fitSlide).observe(viewport);
  fitSlide();
  updateFullscreenButton();
  goToSlide(0);
})();
