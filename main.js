gsap.registerPlugin(ScrollTrigger);

const RIV_SRC       = 'animation.riv';
const STATE_MACHINE = 'State Machine 1';

// ── Artboard names — must match exactly what is in the .riv file ──────────────
const ARTBOARD_MAP = {
  'canvas-hover':  'Animation A',
  'canvas-scroll': 'Animation B',
  'canvas-loop':   'Animation C',
  'canvas-click':  'Animation D',
};

// ── ViewModel property names — update to match your Rive data binding setup ───
// Data binding property types: boolean / number / string / color / image
// (there is no "trigger" type — use a boolean that the state machine resets)
const PROP_HOVER  = 'Hover';     // boolean  in "Animation A"
const PROP_SCROLL = 'Progress';  // number   in "Animation B"  (range 0 – 100)
const PROP_CLICK  = 'Click';     // boolean  in "Animation D"  (momentary pulse)

// ── Diagnostic: log real artboard names from the file ────────────────────────
async function logArtboardNames() {
  try {
    const runtime = await rive.RuntimeLoader.awaitInstance();
    const buf     = await fetch(RIV_SRC).then(r => r.arrayBuffer());
    const file    = runtime.load(new Uint8Array(buf));
    const names   = Array.from({ length: file.artboardCount() }, (_, i) => file.artboardByIndex(i).name);
    console.log('%c[Rive] Artboards in file:', 'color:#7c6dfa;font-weight:bold', names);
    const missing = Object.values(ARTBOARD_MAP).filter(n => !names.includes(n));
    if (missing.length) console.warn('[Rive] ARTBOARD_MAP names not found:', missing);
    else console.log('%c[Rive] All artboard names match ✓', 'color:#4ade80');
  } catch (e) {
    console.warn('[Rive] Could not inspect artboards:', e.message);
  }
}
logArtboardNames();

// ── Core loader ───────────────────────────────────────────────────────────────
// autoBind: true  activates data binding and exposes r.viewModelInstance
// stateMachines   still required so the state machine runs alongside bindings
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
      const vmi = r.viewModelInstance;

      console.group(`[Rive] "${artboard}"`);
      if (vmi) {
        console.log('✓ viewModelInstance found — expand to see all properties:', vmi);
      } else {
        console.warn('✗ viewModelInstance is null — make sure this artboard has a default ViewModel set up in Rive Studio');
      }
      console.groupEnd();

      onReady(r, vmi, canvas);
    },
  });
}

// Safe property getter — returns null and warns if the name is wrong
function prop(vmi, type, name) {
  try {
    const p = vmi?.[type]?.(name) ?? null;
    if (!p) console.warn(`[Rive] "${type}('${name}')" returned null — update the matching PROP_ constant in main.js`);
    return p;
  } catch (e) {
    console.warn(`[Rive] "${type}('${name}')" threw:`, e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A — HOVER  (artboard: "Animation A")
// Sets the boolean property to true on mouseenter, false on mouseleave.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-hover', (r, vmi) => {
  const hoverProp = prop(vmi, 'boolean', PROP_HOVER);

  const zone     = document.getElementById('hover-zone');
  const statusEl = document.getElementById('status-hover');

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

// ─────────────────────────────────────────────────────────────────────────────
// B — SCROLL  (artboard: "Animation B")
// GSAP ScrollTrigger drives the number property 0 → 100 as you scroll.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// C — LOOP  (artboard: "Animation C")
// Runs automatically — no property interaction needed.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-loop', () => {
  // intentionally empty — the loop state handles itself
});

// ─────────────────────────────────────────────────────────────────────────────
// D — BUTTON CLICK  (artboard: "Animation D")
// Data binding has no trigger type — use a momentary boolean pulse instead.
// Set it true, let the state machine transition, then reset to false.
// GSAP adds a spring bounce on the button itself.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-click', (r, vmi) => {
  const clickProp = prop(vmi, 'boolean', PROP_CLICK);

  const btn      = document.getElementById('action-btn');
  const statusEl = document.getElementById('status-click');
  let tl         = null;

  btn.addEventListener('click', () => {
    if (clickProp) {
      clickProp.value = true;
      // Reset after one frame so the state machine sees a rising edge
      requestAnimationFrame(() => { clickProp.value = false; });
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
