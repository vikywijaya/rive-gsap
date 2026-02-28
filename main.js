gsap.registerPlugin(ScrollTrigger);

const RIV_SRC = 'animation.riv';

// Each canvas loads its own artboard from the .riv file
const ARTBOARD_MAP = {
  'canvas-hover':  'Animation A',
  'canvas-scroll': 'Animation B',
  'canvas-loop':   'Animation C',
  'canvas-click':  'Animation D',
};

// ─── Core loader ──────────────────────────────────────────
// Auto-detects the state machine inside each artboard so we
// don't need to hard-code names. Opens a console group so
// you can see exactly what was found in each artboard.
function makeRive(canvasId, onReady) {
  const canvas  = document.getElementById(canvasId);
  const artboard = ARTBOARD_MAP[canvasId];

  const r = new rive.Rive({
    src: RIV_SRC,
    canvas,
    artboard,
    autoplay: true,
    onLoad() {
      r.resizeDrawingSurfaceToCanvas();

      const smNames = r.stateMachineNames ?? [];
      console.group(`[Rive] "${artboard}"`);
      console.log('State machines:', smNames.length ? smNames : '(none)');

      let inputs = [];

      if (smNames.length > 0) {
        const smName = smNames[0];
        r.play(smName);                               // start the state machine
        inputs = r.stateMachineInputs(smName) ?? [];
        console.log(
          'Inputs:',
          inputs.map(i => {
            if (typeof i.fire === 'function') return `${i.name} [Trigger]`;
            if (typeof i.value === 'boolean') return `${i.name} [Boolean]`;
            return `${i.name} [Number]`;
          })
        );
      }

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
