gsap.registerPlugin(ScrollTrigger);

const RIV_SRC       = 'animation.riv';
const STATE_MACHINE = 'State Machine 1';

const ARTBOARD_MAP = {
  'canvas-hover':  'Animation A',
  'canvas-scroll': 'Animation B',
  'canvas-loop':   'Animation C',
  'canvas-click':  'Animation D',
};

const PROP_HOVER  = 'isHovered';      // boolean
const PROP_SCROLL = 'scrollProgress'; // number  (0 – 100)
const PROP_CLICK  = 'onClick';        // trigger

function makeRive(canvasId, onReady) {
  const canvas   = document.getElementById(canvasId);
  const artboard = ARTBOARD_MAP[canvasId];

  const r = new rive.Rive({
    src: RIV_SRC,
    canvas,
    artboard,
    stateMachines: STATE_MACHINE,
    autoBind: true,
    autoplay: true,
    onLoad() {
      r.resizeDrawingSurfaceToCanvas();
      onReady(r, r.viewModelInstance, canvas);
    },
  });
}

// Safe property getter — warns if the name is wrong
function prop(vmi, type, name) {
  try {
    const p = vmi?.[type]?.(name) ?? null;
    if (!p) console.warn(`[Rive] ${type}('${name}') returned null — check the PROP_ constant`);
    return p;
  } catch (e) {
    console.warn(`[Rive] ${type}('${name}') threw:`, e.message);
    return null;
  }
}

// ── A — HOVER ─────────────────────────────────────────────────────────────────
makeRive('canvas-hover', (r, vmi) => {
  const hoverProp = prop(vmi, 'boolean', PROP_HOVER);
  const zone      = document.getElementById('hover-zone');
  const statusEl  = document.getElementById('status-hover');

  zone.addEventListener('mouseenter', () => {
    if (hoverProp) hoverProp.value = true;
    statusEl.textContent = 'hovered — animating A';
    statusEl.classList.add('active');
  });

  zone.addEventListener('mouseleave', () => {
    if (hoverProp) hoverProp.value = false;
    statusEl.textContent = 'idle';
    statusEl.classList.remove('active');
  });
});

// ── B — SCROLL ────────────────────────────────────────────────────────────────
makeRive('canvas-scroll', (r, vmi) => {
  const scrollProp = prop(vmi, 'number', PROP_SCROLL);
  const statusEl   = document.getElementById('status-scroll');

  ScrollTrigger.create({
    trigger: '#block-scroll',
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: true,
    onUpdate(self) {
      const pct = Math.round(self.progress * 100);
      if (scrollProp) scrollProp.value = pct;
      statusEl.textContent = `${pct}%`;
      statusEl.classList.toggle('active', pct > 0 && pct < 100);
    },
  });
});

// ── C — LOOP ──────────────────────────────────────────────────────────────────
makeRive('canvas-loop', () => {});

// ── D — CLICK ─────────────────────────────────────────────────────────────────
makeRive('canvas-click', (r, vmi) => {
  const clickTrigger = vmi?.trigger?.(PROP_CLICK) ?? null;
  const btn          = document.getElementById('action-btn');
  const statusEl     = document.getElementById('status-click');
  let tl             = null;

  btn.addEventListener('click', () => {
    if (clickTrigger) {
      if      (typeof clickTrigger.fire     === 'function') clickTrigger.fire();
      else if (typeof clickTrigger.trigger  === 'function') clickTrigger.trigger();
      else if (typeof clickTrigger.activate === 'function') clickTrigger.activate();
    }

    if (tl) tl.kill();
    tl = gsap.timeline()
      .to(btn, { scale: 0.94, duration: 0.08, ease: 'power2.in' })
      .to(btn, { scale: 1,    duration: 0.4,  ease: 'elastic.out(1, 0.4)' });

    statusEl.textContent = 'fired! animating D…';
    statusEl.classList.add('active');
    gsap.delayedCall(2, () => {
      statusEl.textContent = 'waiting';
      statusEl.classList.remove('active');
    });
  });
});
