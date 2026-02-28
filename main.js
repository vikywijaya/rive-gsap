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
// Data binding property types: boolean / number / string / color / trigger / image
const PROP_HOVER  = 'isHovered';      // boolean  in "Animation A"
const PROP_SCROLL = 'scrollProgress'; // number   in "Animation B"  (range 0 – 100)
const PROP_CLICK  = 'onClick';        // trigger  in "Animation D"

// ── Diagnostic: log artboard names + ViewModel properties from the file ──────
async function logFileInfo() {
  try {
    const runtime = await rive.RuntimeLoader.awaitInstance();
    const buf     = await fetch(RIV_SRC).then(r => r.arrayBuffer());
    const file    = runtime.load(new Uint8Array(buf));

    // Artboard names
    const artboardNames = Array.from(
      { length: file.artboardCount() },
      (_, i) => file.artboardByIndex(i).name
    );
    console.log('%c[Rive] Artboards:', 'color:#7c6dfa;font-weight:bold', artboardNames);
    const missing = Object.values(ARTBOARD_MAP).filter(n => !artboardNames.includes(n));
    if (missing.length) console.warn('[Rive] ARTBOARD_MAP names not found in file:', missing);

    // ViewModel properties — enumerate every artboard's default ViewModel
    for (const abName of Object.values(ARTBOARD_MAP)) {
      try {
        const ab = file.artboardByName(abName);
        const vm = ab?.defaultViewModel?.() ?? ab?.viewModel?.();
        if (!vm) { console.warn(`[Rive] "${abName}" — no default ViewModel found`); continue; }

        const count = typeof vm.propertyCount === 'function'
          ? vm.propertyCount()
          : vm.propertyCount ?? 0;

        const props = [];
        for (let i = 0; i < count; i++) {
          const name = vm.propertyName(i);
          const type = vm.propertyType?.(i);
          props.push(type != null ? `${name} (type:${type})` : name);
        }
        console.log(`%c[Rive] "${abName}" ViewModel properties:`, 'color:#4ade80', props);
      } catch (e) {
        console.warn(`[Rive] "${abName}" — could not enumerate ViewModel properties:`, e.message);
      }
    }
  } catch (e) {
    console.warn('[Rive] Diagnostic failed:', e.message);
  }
}
logFileInfo();

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
        console.log('✓ viewModelInstance:', vmi);
        // Attempt to list all properties by trying names from the raw ViewModel
        try {
          const vm   = vmi.viewModel ?? vmi._viewModel ?? vmi.model;
          const cnt  = typeof vm?.propertyCount === 'function' ? vm.propertyCount() : vm?.propertyCount;
          if (cnt != null) {
            const list = Array.from({ length: cnt }, (_, i) => vm.propertyName(i));
            console.log('  property names:', list);
          }
        } catch (_) { /* silent — logFileInfo handles this more thoroughly */ }
      } else {
        console.warn('✗ viewModelInstance is null');
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
// onClick is a trigger — retrieve it via stateMachineInputs() and call .fire().
// The VMI trigger property has no .fire() in the JS runtime; the state machine
// input API is the correct way to fire triggers from JS.
// GSAP adds a spring bounce on the button itself.
// ─────────────────────────────────────────────────────────────────────────────
makeRive('canvas-click', (r, vmi) => {
  const inputs       = r.stateMachineInputs(STATE_MACHINE);
  const clickTrigger = inputs?.find(
    i => i.type === rive.StateMachineInputType.Trigger && i.name === PROP_CLICK
  ) ?? null;
  if (!clickTrigger) console.warn(`[Rive D] trigger input "${PROP_CLICK}" not found in state machine inputs`);

  const btn      = document.getElementById('action-btn');
  const statusEl = document.getElementById('status-click');
  let tl         = null;

  btn.addEventListener('click', () => {
    if (clickTrigger) clickTrigger.fire();

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
