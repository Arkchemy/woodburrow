/* Arkchemy publisher-logo sting — one continuous composition. */
const { CompositionStage, useComposition, Easing, animate, clamp,
        useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakColor } = window;

const PLUM = '#3d1140';
const GOLD = '#f3c34e';

/* exactly three motion helpers */
const MOTION = {
  enter: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutCubic }),
  part:  (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeInOutCubic }),
  pop:   (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutBack }),
};

const blob = (x, y, rx, ry, a) =>
  `radial-gradient(${rx}px ${ry}px at ${x}px ${y}px, rgba(255,255,255,${a}) 0%, rgba(255,255,255,${a * 0.82}) 45%, rgba(255,255,255,0) 72%)`;

/* a billowing cloud mass built from soft light blobs (no drawn art) */
function CloudMass({ variant, style }) {
  const puffs = variant ? [
    [470, 520, 400, 360, 1], [250, 560, 420, 280, 0.96], [720, 660, 360, 300, 0.98],
    [380, 260, 300, 300, 0.92], [660, 380, 340, 230, 0.95], [140, 320, 280, 300, 0.88],
    [860, 520, 340, 250, 0.9], [90, 660, 320, 230, 0.86], [940, 700, 280, 300, 0.9],
    [600, 860, 340, 320, 0.9], [300, 100, 300, 180, 0.76], [820, 180, 210, 220, 0.82],
  ] : [
    [520, 470, 430, 330, 1], [300, 620, 380, 300, 0.98], [760, 600, 400, 320, 0.97],
    [420, 300, 330, 270, 0.95], [700, 330, 300, 250, 0.92], [180, 380, 300, 260, 0.9],
    [880, 470, 300, 280, 0.88], [120, 700, 300, 260, 0.9], [900, 760, 320, 260, 0.88],
    [560, 830, 380, 280, 0.92], [260, 140, 260, 200, 0.8], [780, 130, 240, 190, 0.78],
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      <div style={{
        position: 'absolute', left: -180, top: -180, width: 1400, height: 1440,
        background: puffs.map(p => blob(p[0], p[1], p[2], p[3], p[4])).join(','),
        filter: 'blur(2px)',
      }} />
      <div style={{
        position: 'absolute', left: -500, top: -500, width: 2100, height: 2100,
        background: 'radial-gradient(620px 580px at 1240px 1040px, rgba(255,244,224,0.5) 0%, rgba(255,240,215,0.16) 48%, rgba(255,240,215,0) 76%)',
        mixBlendMode: 'screen',
      }} />
    </div>
  );
}

const ISLANDS = [
  { src: 'uploads/island4.png', x: 120,  y: 690, w: 168, sp: 5,  bob: 7 },
  { src: 'uploads/island2.png', x: 1600, y: 640, w: 148, sp: -6, bob: 9 },
  { src: 'uploads/island3.png', x: 400,  y: 900, w: 96,  sp: 4,  bob: 6 },
  { src: 'uploads/island.png',  x: 1420, y: 900, w: 68,  sp: -3, bob: 5 },
  { src: 'uploads/island3.png', x: 1690, y: 860, w: 78,  sp: 3,  bob: 8, flip: true },
];

const PUFFS = [
  { x: 120,  y: 300, w: 520, o: 0.85, sp: 14 },
  { x: 1180, y: 250, w: 640, o: 0.7,  sp: 10 },
  { x: 700,  y: 470, w: 420, o: 0.5,  sp: 18 },
  { x: 1500, y: 560, w: 500, o: 0.42, sp: 8  },
  { x: -120, y: 620, w: 460, o: 0.35, sp: 12 },
];

/* Synthesised soundtrack: wind bed, whoosh on the parting, pad swell, chime on the reveal.
   WebAudio, driven from the authored clock — it plays live in the preview; the exported
   MP4 carries no audio (mux a stock bed at encode time). */
function buildAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

  const len = 3 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }

  const noise = (type, freq, q) => {
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master); src.start();
    return { filter: f, gain: g };
  };
  const wind = noise('bandpass', 520, 0.8);
  const whoosh = noise('bandpass', 400, 1.6);

  const padGain = ctx.createGain(); padGain.gain.value = 0;
  const padLp = ctx.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 1500;
  padLp.connect(padGain); padGain.connect(master);
  [98, 146.8, 196, 246.9, 293.7].forEach((hz, i) => {
    const o = ctx.createOscillator(); o.type = i > 2 ? 'triangle' : 'sawtooth';
    o.frequency.value = hz; o.detune.value = (i % 2 ? 6 : -6);
    const g = ctx.createGain(); g.gain.value = i > 2 ? 0.16 : 0.09;
    o.connect(g); g.connect(padLp); o.start();
  });

  return { ctx, master, wind, whoosh, padGain };
}

/* warm chord bloom on the reveal — swells in, no percussive attack */
function chime(a) {
  const { ctx, master } = a; const now = ctx.currentTime;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(master);
  [261.63, 392, 523.25, 659.25].forEach((hz, i) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz;
    o.detune.value = i % 2 ? 4 : -4;
    const g = ctx.createGain();
    const amp = 0.13 / (i * 0.5 + 1);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(amp, now + 0.35 + i * 0.06);
    g.gain.linearRampToValueAtTime(amp * 0.7, now + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    o.connect(g); g.connect(lp); o.start(now); o.stop(now + 3.4);
  });
}

function useSoundtrack(T, playing, enabled) {
  const ref = React.useRef(null);
  const prev = React.useRef(0);
  React.useEffect(() => {
    const resume = () => { if (ref.current) ref.current.ctx.resume(); };
    window.addEventListener('pointerdown', resume);
    return () => window.removeEventListener('pointerdown', resume);
  }, []);
  React.useEffect(() => {
    const a = ref.current;
    if (!enabled || !playing) {
      if (a) a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
      prev.current = T;
      return;
    }
    const au = a || (ref.current = buildAudio());
    const { ctx } = au; const now = ctx.currentTime;
    if (ctx.state === 'suspended') ctx.resume();
    au.master.gain.setTargetAtTime(0.85 * (1 - clamp((T - 6.5) / 0.7, 0, 1)), now, 0.06);

    const windLvl = T < 1.1 ? 0.1 : T < 3.1 ? 0.1 + (T - 1.1) * 0.14 : Math.max(0.06, 0.38 - (T - 3.1) * 0.12);
    au.wind.gain.gain.setTargetAtTime(windLvl, now, 0.08);
    au.wind.filter.frequency.setTargetAtTime(460 + Math.min(T, 3.2) * 220, now, 0.1);

    const w = (T > 1.25 && T < 3.15) ? Math.sin(((T - 1.25) / 1.9) * Math.PI) : 0;
    const lift = (T > 5.85 && T < 6.9) ? Math.sin(((T - 5.85) / 1.05) * Math.PI) : 0;
    au.whoosh.gain.gain.setTargetAtTime(Math.max(w * 0.34, lift * 0.18), now, 0.06);
    au.whoosh.filter.frequency.setTargetAtTime(320 + w * 2400 + lift * 700, now, 0.06);

    au.padGain.gain.setTargetAtTime(clamp(T / 4.4, 0, 1) * 0.2, now, 0.15);

    if (prev.current < 4.15 && T >= 4.15) chime(au);
    prev.current = T;
  });
}

function Piece({ t }) {
  const { T, CUES, playing } = useComposition();

  const push = MOTION.enter(1.16, 1.0, 0, CUES.Balloon)(T) +
               MOTION.part(0, t.cameraPush / 100, CUES.Balloon, CUES.Hold + 1)(T);

  const partL = MOTION.part(10, -4, 0, CUES.Part - 0.15)(T) +
                MOTION.part(0, -78, CUES.Part - 0.15, CUES.Balloon + 0.25)(T);
  const partScale = MOTION.part(1.12, 1, 0, CUES.Part - 0.15)(T) +
                    MOTION.part(0, 0.28, CUES.Part - 0.15, CUES.Balloon + 0.25)(T);
  const partRot = MOTION.part(2.5, 0, 0, CUES.Part - 0.15)(T) +
                  MOTION.part(0, -7, CUES.Part - 0.15, CUES.Balloon + 0.3)(T);
  const veil = MOTION.part(1, 0, 0.35, CUES.Part + 0.3)(T);
  const backGlow = MOTION.part(0.3, 0.95, 0, CUES.Part + 0.1)(T) +
                   MOTION.part(0, -0.65, CUES.Part + 0.1, CUES.Balloon + 0.4)(T);
  const partR = MOTION.part(13, -1, 0, CUES.Part - 0.05)(T) +
                MOTION.part(0, -84, CUES.Part - 0.05, CUES.Balloon + 0.1)(T);
  const partScaleR = MOTION.part(1.05, 1.08, 0, CUES.Part - 0.05)(T) +
                     MOTION.part(0, 0.34, CUES.Part - 0.05, CUES.Balloon + 0.1)(T);
  const partRotR = MOTION.part(-3.5, -1, 0, CUES.Part - 0.05)(T) +
                   MOTION.part(0, 6, CUES.Part - 0.05, CUES.Balloon + 0.3)(T);
  const curtain = {
    transform: `translateX(${partL}%) scale(${partScale}) rotate(${partRot}deg)`,
    transformOrigin: '30% 50%',
  };

  const riseA = MOTION.enter(780, -30, CUES.Balloon - 0.6, CUES.Reveal - 0.05)(T);
  const riseB = MOTION.part(0, 30, CUES.Reveal - 0.05, CUES.Reveal + 0.6)(T);
  const settle = clamp((T - (CUES.Balloon - 0.6)) / 1.5, 0, 1);
  const bob = Math.sin(T * 1.05 - 0.6) * (4 + 4 * settle);
  const balloonY = riseA + riseB;
  const driftX = Math.sin(T * 0.85) * (28 - 14 * settle);
  const breath = 1 + Math.sin(T * 1.25) * 0.012;
  const balloonIn = MOTION.enter(0, 1, CUES.Balloon - 0.6, CUES.Balloon - 0.05)(T);
  const morph = MOTION.part(0, 1, CUES.Reveal, CUES.Reveal + 0.38)(T);

  const markIn = MOTION.pop(0, 1, CUES.Reveal + 0.18, CUES.Reveal + 0.95)(T);
  const sweep = MOTION.part(-140, 150, CUES.Reveal + 0.85, CUES.Hold + 0.7)(T);

  const skyDrift = (sp) => T * sp;
  const camX = Math.sin(T * 0.5) * 9;
  const camY = Math.cos(T * 0.38) * 6;
  const rays = MOTION.part(0, 0.55, CUES.Part + 0.1, CUES.Balloon + 0.5)(T) *
               (1 - clamp(markIn, 0, 1) * 0.55);
  const glow = MOTION.enter(0, 0.45, CUES.Balloon - 0.45, CUES.Reveal)(T);
  const spark = Math.max(0, Math.sin(clamp((T - CUES.Reveal - 0.05) / 0.45, 0, 1) * Math.PI));
  const sway = Math.cos(T * 0.85) * (2.8 - 1.3 * settle);

  /* outro: the balloon drifts up out of frame, then the frame fades to black */
  const exitY = MOTION.part(0, -1100, CUES.Outro + 0.1, CUES.Outro + 1.15)(T);
  const markOut = MOTION.part(0, 1, CUES.Outro + 0.15, CUES.Outro + 0.7)(T);
  const toBlack = MOTION.part(0, 1, CUES.Outro + 0.75, CUES.Outro + 1.4)(T);

  useSoundtrack(T, playing, t.sound);

  return (
    <div data-screen-label={`${Math.floor(T)}s`}
         style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: t.skyColor }}>

      {/* sky + horizon light */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push}) translate(${camX}px, ${camY}px)`, transformOrigin: '50% 52%' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, #2b93cf 0%, ${t.skyColor} 36%, #8fd9f5 68%, #cdeaf7 88%, #eef7fb 100%)` }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(1000px 620px at 50% 80%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
        }} />

        {ISLANDS.map((is, i) => (
          <img key={i} src={is.src} alt="" style={{
            position: 'absolute', left: is.x, top: is.y, width: is.w,
            transform: `translate(${skyDrift(is.sp)}px, ${Math.sin(T * 0.7 + i) * is.bob}px) scale(${1 + Math.sin(T * 0.6 + i) * 0.02}) ${is.flip ? 'scaleX(-1)' : ''}`,
            filter: 'drop-shadow(0 18px 24px rgba(40,80,120,0.18))', opacity: 0.96,
          }} />
        ))}

        {PUFFS.map((p, i) => (
          <img key={i} src="uploads/cloud.png" alt="" style={{
            position: 'absolute', left: p.x, top: p.y, width: p.w,
            opacity: p.o * (1 - clamp(veil * 2.5, 0, 1)),
            mixBlendMode: 'screen',
            transform: `translate(${skyDrift(p.sp)}px, ${Math.sin(T * 0.5 + i * 2) * 5}px) scale(${1 + i * 0.07}, ${1 + i * 0.14}) ${i % 2 ? 'scaleX(-1)' : ''}`,
            filter: `blur(${i * 0.6}px)`,
          }} />
        ))}
      </div>

      {/* light shafts through the opening */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute', left: 380 + i * 300, top: -320, width: 190, height: 1800,
          opacity: rays * (0.45 + 0.55 * Math.abs(Math.sin(T * 0.7 + i * 1.3))),
          background: 'linear-gradient(180deg, rgba(255,252,238,0.85) 0%, rgba(255,248,225,0.35) 55%, rgba(255,248,225,0) 100%)',
          transform: `translateX(${Math.sin(T * 0.35 + i) * 26}px) rotate(${-13 + i * 1.6}deg)`,
          filter: 'blur(26px)', mixBlendMode: 'screen', pointerEvents: 'none',
        }} />
      ))}

      {/* emblem */}
      <div style={{
        position: 'absolute', left: '50%', top: '42%',
        transform: `translate(-50%, calc(-50% + ${balloonY + bob + exitY}px)) translateX(${driftX + camX * 0.3}px)`,
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: '52%', width: 700, height: 700,
          transform: `translate(-50%,-50%) scale(${0.9 + spark * 0.25})`,
          opacity: glow * 0.7, mixBlendMode: 'screen', pointerEvents: 'none',
          background: 'radial-gradient(closest-side, rgba(255,250,232,0.9) 0%, rgba(255,240,205,0.28) 45%, rgba(255,240,205,0) 72%)',
        }} />
        <img src="uploads/image (1).png" alt="Arkchemy emblem" style={{
          display: 'block', width: 372, opacity: balloonIn, position: 'relative',
          transform: `scale(${(0.92 + morph * 0.08) * breath}) rotate(${sway}deg)`, transformOrigin: '50% 62%',
          filter: `drop-shadow(0 18px 26px rgba(40,30,80,0.22)) brightness(${1 + spark * 0.07})`,
        }} />
      </div>

      {/* wordmark */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center',
        opacity: clamp(markIn, 0, 1) * (1 - markOut),
        transform: `translateY(${(1 - markIn) * 44 + markOut * 26}px) translateX(${camX * 0.25}px) scale(${(0.88 + markIn * 0.12) * (1 - markOut * 0.14)})`,
      }}>
        <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', padding: '10px 26px' }}>
          <img src="uploads/arkchemywordmark.svg" alt="Arkchemy" style={{
            display: 'block', width: 880,
            filter: 'drop-shadow(0 3px 5px rgba(45,20,60,0.18))',
          }} />
          {t.bloomSweep && (
            <div style={{
              position: 'absolute', inset: '-10% -30%',
              background: 'linear-gradient(102deg, rgba(255,255,255,0) 44%, rgba(255,252,240,0.55) 50%, rgba(255,255,255,0) 56%)',
              mixBlendMode: 'screen', pointerEvents: 'none',
              transform: `translateX(${sweep}%)`,
            }} />
          )}
        </div>
      </div>

      {/* warm backlight through the opening (behind the balloon so the emblem stays clean) */}
      <div style={{
        position: 'absolute', inset: 0, opacity: backGlow * (1 - clamp(markIn, 0, 1)), mixBlendMode: 'screen',
        background: 'radial-gradient(1100px 760px at 50% 46%, rgba(255,250,236,0.9) 0%, rgba(255,242,214,0.3) 45%, rgba(255,242,214,0) 74%)',
      }} />

      {/* inside the cloud: warm interior haze, clears as the masses part */}
      <div style={{
        position: 'absolute', inset: 0, opacity: veil,
        background: `radial-gradient(1200px 900px at ${58 + Math.sin(T * 0.9) * 4}% 44%, #fffdf6 0%, #ffffff 58%, #fbf7f0 100%)`,
      }} />

      {/* the two cloud curtains */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <CloudMass style={curtain} />
        </div>
        <div style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1) translateY(-6%)' }}>
          <CloudMass variant style={{
            transform: `translateX(${partR}%) scale(${partScaleR}) rotate(${partRotR}deg)`,
            transformOrigin: '38% 42%',
          }} />
        </div>
      </div>

      {/* trailing wisps removed */}

      {/* fade to black */}
      <div style={{
        position: 'absolute', inset: 0, background: '#000', opacity: toBlack, pointerEvents: 'none',
      }} />

      {/* vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(125% 115% at 50% 50%, rgba(0,0,0,0) 68%, rgba(30,40,70,0.12) 100%)',
      }} />
    </div>
  );
}

function ArkchemySting() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0d0a14' }}>
      <CompositionStage width={1920} height={1080} bg="#0d0a14"
                        scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <Piece t={t} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Sting" />
        <TweakColor label="Sky" value={t.skyColor} options={['#59c2f0', '#3fb2ea', '#7ad0f4']}
                    onChange={(v) => setTweak('skyColor', v)} />
        <TweakSlider label="Camera push" value={t.cameraPush} min={0} max={12} unit="%"
                     onChange={(v) => setTweak('cameraPush', v)} />
        <TweakToggle label="Bloom sweep" value={t.bloomSweep} onChange={(v) => setTweak('bloomSweep', v)} />
        <TweakToggle label="Sound" value={t.sound} onChange={(v) => setTweak('sound', v)} />
        <TweakSection label="Editor" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}

window.ArkchemySting = ArkchemySting;
