gsap.registerPlugin(ScrollTrigger);

const RIV_SRC      = 'animation.riv';
const STATE_MACHINE = 'State Machine 1';  // same name in every artboard

// ── Update these to match your exact artboard names (check console on load) ──
const ARTBOARD_MAP = {
  'canvas-hover':  'Animation A',
  'canvas-scroll': 'Animation B',
  'canvas-loop':   'Animation C',
  'canvas-click':  'Animation D',
};

// ── Reads the .riv file and logs every artboard name it contains ──────────────
// Open the browser console (F12) to see the real names, then update ARTBOARD_MAP
async function logArtboardNames() {
  try {
    const runtime = await rive.RuntimeLoader.awaitInstance();
    const buf     = await fetch(RIV_SRC).then(r => r.arrayBuffer());
    const file    = runtime.load(new Uint8Array(buf));
    const names   = Array.from({ length: file.artboardCount() }, (_, i) => file.artboardByIndex(i).name);
    console.log('%c[Rive] Artboards in file:', 'color:#7c6dfa;font-weight:bold', names);
    const mapped  = Object.values(ARTBOARD_MAP);
    const missing = mapped.filter(n => !names.includes(n));
    if (missing.length) {
      console.warn('[Rive] These names in ARTBOARD_MAP were NOT found in the file:', missing);
      console.warn('[Rive] → Open main.js and update ARTBOARD_MAP to use the names listed above');
    } else {
      console.log('%c[Rive] All artboard names match ✓', 'color:#4ade80');
    }
  } catch (e) {
    console.warn('[Rive] Could not inspect artboards:', e.message);
  }
}
logArtboardNames();

// ─── Core loader ──────────────────────────────────────────
function makeRive(canvasId, onReady) {
  const canvas   = document.getElementById(canvasId);
  const artboard = ARTBOARD_MAP[canvasId];

  const r = new rive.Rive({
    src: RIV_SRC,
    canvas,
    artboard,
    stateMachines: STATE_MACHINE,   // must be in constructor for inputs to work
    autoplay: true,
    onLoad() {
      r.resizeDrawingSurfaceToCanvas();
      const inputs = r.stateMachineInputs(STATE_MACHINE) ?? [];
      console.group(`[Rive] "${artboard}"`);
      console.log('Inputs:', inputs.map(i => {
        if (typeof i.fire === 'function') return `${i.name} [Trigger]`;
        if (typeof i.value === 'boolean') return `${i.name} [Boolean]`;
        return `${i.name} [Number]`;
      }));
      console.groupEnd();
      onReady(r, inputs, canvas);
    },
  });
}

// Duck-type helpers — work regardless of what the inputs are named
const boolInput    = (inputs) => inputs.find(i => typeof i.fire !== 'function' && typeof i.value === 'boolean') ?? null;
const numInput     = (inputs) => inputs.find(i => typeof i.fire !== 'function' && typeof i.value === 'number')  ?? null;
const triggerInput = (inputs) => inputs.find(i => typeof i.fire === 'function') ?? null;

// ─────────────────────────────────────────────────────────
// A — HOVER  (artboard: "Animation A")
// Flips the first Boolean input true on mouseenter, false on mouseleave.
// ─────────────────────────────────────────────────────────
makeRive('canvas-hover', (r, inputs, canvas) => {
  const hoverBool = boolInput(inputs);
  const statusEl  = document.getElementById('status-hover');
  const zone      = document.getElementById('hover-zone');

  zone.addEventListener('mouseenter', () => {
    if (hoverBool) hoverBool.value = true;
    statusEl.textContent = 'hovered — animating A';
    statusEl.classList.add('active');
  });

  zone.addEventListener('mouseleave', () => {
    if (hoverBool) hoverBool.value = false;
    statusEl.textContent = 'idle';
    statusEl.classList.remove('active');
  });
});

// ─────────────────────────────────────────────────────────
// B — SCROLL  (artboard: "Animation B")
// GSAP ScrollTrigger drives the first Number input from 0 → 100
// as the section scrolls through the viewport.
// ─────────────────────────────────────────────────────────
makeRive('canvas-scroll', (r, inputs) => {
  const scrollNum = numInput(inputs);
  const statusEl  = document.getElementById('status-scroll');

  ScrollTrigger.create({
    trigger: '#block-scroll',
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: true,
    onUpdate(self) {
      const pct = Math.round(self.progress * 100);
      if (scrollNum) scrollNum.value = pct;
      statusEl.textContent = `${pct}%`;
      statusEl.classList.toggle('active', pct > 0 && pct < 100);
    },
  });
});

// ─────────────────────────────────────────────────────────
// C — LOOP  (artboard: "Animation C")
// Nothing to wire — the looping state in the state machine
// runs automatically once the artboard is loaded and played.
// ─────────────────────────────────────────────────────────
makeRive('canvas-loop', () => {
  // intentionally empty
});

// ─────────────────────────────────────────────────────────
// D — BUTTON CLICK  (artboard: "Animation D")
// Fires the first Trigger input on button click.
// GSAP adds a spring-bounce feedback on the button itself.
// ─────────────────────────────────────────────────────────
makeRive('canvas-click', (r, inputs) => {
  const clickTrigger = triggerInput(inputs);
  const btn          = document.getElementById('action-btn');
  const statusEl     = document.getElementById('status-click');
  let tl             = null;

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
