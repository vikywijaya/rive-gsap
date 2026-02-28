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

// ── ViewModel property names — update these to match your Rive data bindings ──
// Check the browser console after loading to see what was found.
const PROP_HOVER  = 'Hover';     // Boolean property in "Animation A"
const PROP_SCROLL = 'Progress';  // Number  property in "Animation B" (range 0–100)
const PROP_CLICK  = 'Click';     // Trigger property in "Animation D"

// ── Diagnostic: log all artboard names from the file ─────────────────────────
async function logArtboardNames() {
  try {
    const runtime = await rive.RuntimeLoader.awaitInstance();
    const buf     = await fetch(RIV_SRC).then(r => r.arrayBuffer());
    const file    = runtime.load(new Uint8Array(buf));
    const names   = Array.from({ length: file.artboardCount() }, (_, i) => file.artboardByIndex(i).name);
    console.log('%c[Rive] Artboards in file:', 'color:#7c6dfa;font-weight:bold', names);
    const missing = Object.values(ARTBOARD_MAP).filter(n => !names.includes(n));
    if (missing.length) {
      console.warn('[Rive] ARTBOARD_MAP names not found in file:', missing);
    } else {
      console.log('%c[Rive] All artboard names match ✓', 'color:#4ade80');
    }
  } catch (e) {
    console.warn('[Rive] Could not inspect artboards:', e.message);
  }
}
logArtboardNames();

// ── Core loader ───────────────────────────────────────────────────────────────
// autoBind: true  → enables data binding, exposes r.viewModelInstance
// stateMachines   → still required to run the state machine
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
        console.log('✓ ViewModelInstance ready — expand to inspect:', vmi);
      } else {
        console.warn('✗ viewModelInstance is null — check that autoBind is supported and data binding is set up in this artboard');
      }
      console.groupEnd();
      onReady(r, vmi, canvas);
    },
  });
}

// Safe property accessors — return null instead of throwing if name is wrong
const getProp = {
  boolean: (vmi, name) => { try { return vmi?.boolean(name) ?? null; } catch { return null; } },
  number:  (vmi, name) => { try { return vmi?.number(name)  ?? null; } catch { return null; } },
  trigger: (vmi, name) => { try { return vmi?.trigger(name) ?? null; } catch { return null; } },
};

// ─────────────────────────────────────────────────────────────────────────────
// A — HOVER  (artboard: "Animation A")
// Writes true/false to the Boolean property on mouseenter/mouseleave.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-hover', (r, vmi) => {
  const hoverProp = getProp.boolean(vmi, PROP_HOVER);
  if (!hoverProp) console.warn(`[A] Boolean property "${PROP_HOVER}" not found — update PROP_HOVER in main.js`);

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
// GSAP ScrollTrigger drives the Number property from 0 → 100.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-scroll', (r, vmi) => {
  const scrollProp = getProp.number(vmi, PROP_SCROLL);
  if (!scrollProp) console.warn(`[B] Number property "${PROP_SCROLL}" not found — update PROP_SCROLL in main.js`);

  const statusEl = document.getElementById('status-scroll');

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
  // intentionally empty
});

// ─────────────────────────────────────────────────────────────────────────────
// D — BUTTON CLICK  (artboard: "Animation D")
// Fires the Trigger property. GSAP adds a spring bounce on the button.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-click', (r, vmi) => {
  const clickProp = getProp.trigger(vmi, PROP_CLICK);
  if (!clickProp) console.warn(`[D] Trigger property "${PROP_CLICK}" not found — update PROP_CLICK in main.js`);

  const btn      = document.getElementById('action-btn');
  const statusEl = document.getElementById('status-click');
  let tl         = null;

  btn.addEventListener('click', () => {
    if (clickProp) clickProp.fire();

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
