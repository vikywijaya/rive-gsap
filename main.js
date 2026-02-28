/**
 * Rive + GSAP integration demo
 *
 * Prerequisites — your Rive file needs one state machine called "Main"
 * with these inputs:
 *
 *   isHovered     Boolean   → Animation A (hover)
 *   scrollProgress Number   → Animation B (scroll, range 0–100)
 *   onClick       Trigger   → Animation D (button click)
 *
 * Animation C is a looping state inside the state machine; no input needed.
 *
 * Place your exported file as  animation.riv  next to index.html.
 */

gsap.registerPlugin(ScrollTrigger);

// ─── Shared config ────────────────────────────────────────
const RIV_SRC        = 'animation.riv';   // ← your file here
const STATE_MACHINE  = 'Main';            // ← your state machine name

// ─── Helper: build a Rive instance on a canvas ───────────
function makeRive(canvasId, onReady) {
  const canvas = document.getElementById(canvasId);
  const r = new rive.Rive({
    src: RIV_SRC,
    canvas,
    autoplay: true,
    stateMachines: STATE_MACHINE,
    onLoad() {
      r.resizeDrawingSurfaceToCanvas();
      const inputs = r.stateMachineInputs(STATE_MACHINE);
      onReady(r, inputs, canvas);
    },
  });
  return r;
}

// ─── Helper: find a state machine input by name ───────────
function findInput(inputs, name) {
  return inputs?.find(i => i.name === name) ?? null;
}

// ─────────────────────────────────────────────────────────
// A — HOVER
// Sets the Boolean input "isHovered" true/false on mouseenter/mouseleave.
// In the state machine: create a transition triggered by isHovered == true
// leading to Animation A's state.
// ─────────────────────────────────────────────────────────
makeRive('canvas-hover', (r, inputs, canvas) => {
  const isHovered = findInput(inputs, 'isHovered');
  const statusEl  = document.getElementById('status-hover');
  const zone      = document.getElementById('hover-zone');

  zone.addEventListener('mouseenter', () => {
    if (isHovered) isHovered.value = true;
    statusEl.textContent = 'hovered — animating A';
    statusEl.classList.add('active');
  });

  zone.addEventListener('mouseleave', () => {
    if (isHovered) isHovered.value = false;
    statusEl.textContent = 'idle';
    statusEl.classList.remove('active');
  });
});

// ─────────────────────────────────────────────────────────
// B — SCROLL
// GSAP ScrollTrigger maps scroll progress (0–1) to the Number input
// "scrollProgress" (0–100). In the state machine: create a blend state
// or a motion path driven by this number.
// ─────────────────────────────────────────────────────────
makeRive('canvas-scroll', (r, inputs) => {
  const scrollProgress = findInput(inputs, 'scrollProgress');
  const statusEl       = document.getElementById('status-scroll');

  ScrollTrigger.create({
    trigger: '#block-scroll',
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: true,                 // ties animation to scroll bar
    onUpdate(self) {
      const pct = Math.round(self.progress * 100);
      if (scrollProgress) scrollProgress.value = pct;
      statusEl.textContent = `${pct}%`;
      statusEl.classList.toggle('active', pct > 0 && pct < 100);
    },
  });
});

// ─────────────────────────────────────────────────────────
// C — LOOP
// No external trigger. The state machine contains a looping state for
// Animation C — it just plays automatically when the Rive instance loads.
// ─────────────────────────────────────────────────────────
makeRive('canvas-loop', (_r, _inputs) => {
  // nothing to wire up — the loop state handles itself
});

// ─────────────────────────────────────────────────────────
// D — BUTTON CLICK
// Fires the Trigger input "onClick". In the state machine: connect a
// transition from any state to Animation D using this trigger.
// A GSAP timeline adds a short UI flourish on the button as well.
// ─────────────────────────────────────────────────────────
makeRive('canvas-click', (r, inputs) => {
  const onClick  = findInput(inputs, 'onClick');
  const btn      = document.getElementById('action-btn');
  const statusEl = document.getElementById('status-click');
  let tl         = null;

  btn.addEventListener('click', () => {
    // Fire the Rive trigger
    if (onClick) onClick.fire();

    // GSAP button feedback
    if (tl) tl.kill();
    tl = gsap.timeline()
      .to(btn, { scale: 0.94, duration: 0.08, ease: 'power2.in' })
      .to(btn, { scale: 1,    duration: 0.4,  ease: 'elastic.out(1, 0.4)' });

    // Status label
    statusEl.textContent = 'fired! animating D…';
    statusEl.classList.add('active');
    gsap.delayedCall(2, () => {
      statusEl.textContent = 'waiting';
      statusEl.classList.remove('active');
    });
  });
});
