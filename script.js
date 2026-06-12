/**
 * HMT Design - Premium Single Page Landing Script
 * Features: Sticky Navigation, Mobile Menu, Audio Player with Dynamic Waveform,
 * Web Audio API Studio-Grade Sound Effects Synthesizer, and Scrolling Counter Stats.
 */

// Global State
let audioContext = null;
let activeSample = null; // Audio element
let isSamplePlaying = false;
let spectralInterval = null;

// Initialize on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  setupStickyHeader();
  setupMobileNav();
  setupCounters();
  setupCustomAudioPlayer();
  setupSynthBoard();
  populateWaveformIdle();
});

/* 1. Sticky Header */
function setupStickyHeader() {
  const header = document.querySelector("header");
  const checkScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };
  window.addEventListener("scroll", checkScroll);
  checkScroll(); // Check once on load
}

/* 2. Mobile Responsive Nav Menu Toggle */
function setupMobileNav() {
  const toggleBtn = document.querySelector(".mobile-nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const links = document.querySelectorAll(".nav-links a");

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navLinks.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", () => {
      navLinks.classList.remove("active");
    });

    // Close menu when clicking any nav item
    links.forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
      });
    });
  }
}

/* 3. Infinite Scrolling & Dynamic Animated Counter Panel */
function setupCounters() {
  const statsSection = document.querySelector(".stats-grid");
  const counterElements = document.querySelectorAll(".stat-number");

  if (!statsSection) return;

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute("data-target"), 10);
    const suffix = el.getAttribute("data-suffix") || "";
    let count = 0;
    const speed = Math.max(5, Math.ceil(target / 80)); // scale increment velocity

    const update = () => {
      count += speed;
      if (count >= target) {
        el.textContent = target + suffix;
      } else {
        el.textContent = count + suffix;
        requestAnimationFrame(update);
      }
    };
    update();
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        counterElements.forEach(animateCounter);
        observer.unobserve(entry.target); // Trigger only once
      }
    });
  }, { threshold: 0.15 });

  observer.observe(statsSection);
}

/* 4. Custom Waveform and HTML/JS Spectrogram */
function populateWaveformIdle() {
  const container = document.querySelector(".spectral-bars");
  if (!container) return;
  
  // Clear any existing bars
  container.innerHTML = "";
  
  // Create 64 waveform bar pillars
  const barCount = 48;
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "spectral-bar idle";
    
    // Create pre-set waveform arc styling
    const percentFromCenter = Math.abs((i - (barCount / 2)) / (barCount / 2));
    const idleHeight = Math.max(6, Math.round((1 - percentFromCenter * 0.7) * 45));
    bar.style.setProperty("--idle-height", `${idleHeight}px`);
    bar.style.height = `${idleHeight}px`;
    
    container.appendChild(bar);
  }
}

/* 5. Custom Audio Player Skin with Fallbacks */
function setupCustomAudioPlayer() {
  const playBtn = document.querySelector(".btn-play-action");
  const timelineProgress = document.querySelector(".wave-progress-overlay");
  const timeCurrent = document.querySelector(".time-current");
  const timeTotal = document.querySelector(".time-total");
  const volumeSlider = document.querySelector(".volume-slider");
  const audioLed = document.querySelector(".led-indicator");

  // Load the sample path
  activeSample = new Audio("assets/sample.mp3");
  activeSample.volume = 0.8;

  // Track status update
  activeSample.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(activeSample.duration);
  });

  activeSample.addEventListener("timeupdate", () => {
    const pct = (activeSample.currentTime / activeSample.duration) * 100;
    if (timelineProgress) timelineProgress.style.width = `${pct}%`;
    if (timeCurrent) timeCurrent.textContent = formatTime(activeSample.currentTime);
    
    // Generate active spectrum vibration during live playback
    vibrateWaveform();
  });

  activeSample.addEventListener("ended", () => {
    setPlaybackState(false);
  });

  activeSample.addEventListener("error", (e) => {
    console.warn("Audio file assets/sample.mp3 not found or failed to load. Synthesizer sound effects can still be used completely offline.", e);
    if (timeTotal) timeTotal.textContent = "0:15";
  });

  // Handle Play/Pause
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      // Create audio context on first user action if not already done
      initAudioContext();

      if (isSamplePlaying) {
        activeSample.pause();
        setPlaybackState(false);
      } else {
        // Try starting playback
        const playPromise = activeSample.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlaybackState(true);
            })
            .catch(error => {
              console.warn("Autoplay or file access failed. Falling back to dynamic synthesized drop!", error);
              // Fallback to synthesizing a cool sound segment sequence
              playSynthesizedDrop();
            });
        }
      }
    });
  }

  // Handle Volume Change
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value);
      activeSample.volume = vol;
    });
  }
}

function setPlaybackState(playing) {
  const playBtn = document.querySelector(".btn-play-action");
  const audioLed = document.querySelector(".led-indicator");
  isSamplePlaying = playing;

  if (playing) {
    audioLed.classList.add("active");
    if (playBtn) {
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      `;
    }
    startSpectrumTimer();
  } else {
    audioLed.classList.remove("active");
    if (playBtn) {
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" style="transform: translateX(2px);">
          <polygon points="6 3 20 12 6 21 6 3"></polygon>
        </svg>
      `;
    }
    stopSpectrumTimer();
    populateWaveformIdle();
  }
}

function startSpectrumTimer() {
  if (spectralInterval) clearInterval(spectralInterval);
  spectralInterval = setInterval(vibrateWaveform, 65);
}

function stopSpectrumTimer() {
  if (spectralInterval) {
    clearInterval(spectralInterval);
    spectralInterval = null;
  }
}

function vibrateWaveform() {
  const bars = document.querySelectorAll(".spectral-bar");
  bars.forEach(bar => {
    // Generate organic, vibrant sound spectrum heights
    const modifier = Math.random() * 0.75 + 0.25;
    const computedHeight = Math.ceil(modifier * 105);
    bar.style.height = `${Math.max(6, computedHeight)}px`;
  });
}

function formatTime(secs) {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/* 6. Web Audio API Synthesizer Studio Deck for Live DJ Sound FX */
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

// Play a synthesized electronic DJ sweep when no mp3 exists as a fallback
function playSynthesizedDrop() {
  setPlaybackState(true);
  let duration = 4.0;
  let elapsed = 0;
  
  // Custom synth drop schedule
  synthesizeBassDrop(0);
  synthesizeLaserSweep(0.8);
  synthesizeFormantVocalization(1.8);
  
  const timer = setInterval(() => {
    elapsed += 0.1;
    const progress = (elapsed / duration) * 100;
    const timelineProgress = document.querySelector(".wave-progress-overlay");
    const timeCurrent = document.querySelector(".time-current");
    
    if (timelineProgress) timelineProgress.style.width = `${Math.min(100, progress)}%`;
    if (timeCurrent) timeCurrent.textContent = formatTime(elapsed);
    
    if (elapsed >= duration) {
      clearInterval(timer);
      setPlaybackState(false);
      if (timelineProgress) timelineProgress.style.width = "0%";
      if (timeCurrent) timeCurrent.textContent = "0:00";
    }
  }, 100);
}

function setupSynthBoard() {
  const btnBass = document.getElementById("synth-bass");
  const btnSweeper = document.getElementById("synth-sweeper");
  const btnTag = document.getElementById("synth-tag");

  if (btnBass) {
    btnBass.addEventListener("click", () => {
      initAudioContext();
      synthesizeBassDrop();
      flashWaveformAccent();
    });
  }
  
  if (btnSweeper) {
    btnSweeper.addEventListener("click", () => {
      initAudioContext();
      synthesizeLaserSweep();
      flashWaveformAccent();
    });
  }

  if (btnTag) {
    btnTag.addEventListener("click", () => {
      initAudioContext();
      synthesizeFormantVocalization();
      flashWaveformAccent();
    });
  }
}

// Flash UI on synth board action to coordinate action feedback
function flashWaveformAccent() {
  const container = document.querySelector(".custom-wave-container");
  if (container) {
    container.style.borderColor = "var(--neon-blue)";
    container.style.boxShadow = "var(--neon-blue-glow), inset 0 0 20px rgba(0, 229, 255, 0.2)";
    setTimeout(() => {
      container.style.borderColor = "rgba(0, 229, 255, 0.1)";
      container.style.boxShadow = "none";
    }, 400);
  }
  
  // Vibrate visual bars momentarily
  const bars = document.querySelectorAll(".spectral-bar");
  bars.forEach(bar => {
    const computedHeight = Math.ceil(Math.random() * 110);
    bar.style.height = `${Math.max(8, computedHeight)}px`;
  });
  
  // Transition back to idle smoothly after trigger
  setTimeout(populateWaveformIdle, 600);
}

/** 
 * SYNTH ENGINE 1: SUB BASS DROP
 * Rich sub-bass sliding from 150Hz to 32Hz with delay and saturation
 */
function synthesizeBassDrop(startTime = 0) {
  if (!audioContext) return;
  const time = audioContext.currentTime + startTime;
  
  // Oscillator
  const osc = audioContext.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, time);
  // Pitch slide down!
  osc.frequency.exponentialRampToValueAtTime(32, time + 1.2);
  
  // High-frequency overtone oscillator
  const subOsc = audioContext.createOscillator();
  subOsc.type = "triangle";
  subOsc.frequency.setValueAtTime(70, time);
  subOsc.frequency.exponentialRampToValueAtTime(16, time + 1.2);

  // Saturation / Wave Shaper for grit
  const shaper = audioContext.createWaveShaper();
  shaper.curve = makeDistortionCurve(15);
  
  // Low Pass Filter to keep it clean
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(350, time);
  filter.frequency.exponentialRampToValueAtTime(60, time + 1.2);
  filter.Q.setValueAtTime(5, time);

  // Gain envelope for transient hit
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.01, time);
  gainNode.gain.linearRampToValueAtTime(1.0, time + 0.05); // punch
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.5); // decay

  // Connections
  osc.connect(filter);
  subOsc.connect(shaper);
  shaper.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Start/Stop
  osc.start(time);
  subOsc.start(time);
  osc.stop(time + 1.6);
  subOsc.stop(time + 1.6);
}

/** 
 * SYNTH ENGINE 2: RESONANT LASER SWEEPER
 * White noise and saw oscillator modulated by sliding resonance filter
 */
function synthesizeLaserSweep(startTime = 0) {
  if (!audioContext) return;
  const time = audioContext.currentTime + startTime;

  // Noise Buffer Generator
  const bufferSize = audioContext.sampleRate * 1.5;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = buffer;

  // Saw wave oscillator for frequency grit
  const saw = audioContext.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.setValueAtTime(45, time);
  saw.frequency.exponentialRampToValueAtTime(1200, time + 1.0);

  // High Resonance Bandpass Filter
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(15, time);
  filter.frequency.setValueAtTime(300, time);
  filter.frequency.exponentialRampToValueAtTime(6500, time + 0.8);
  filter.frequency.exponentialRampToValueAtTime(400, time + 1.4);

  // Delay node for stereo spacious echo
  const delay = audioContext.createDelay();
  delay.delayTime.value = 0.15;
  const delayGain = audioContext.createGain();
  delayGain.gain.value = 0.4;

  const mainGain = audioContext.createGain();
  mainGain.gain.setValueAtTime(0.01, time);
  mainGain.gain.linearRampToValueAtTime(0.8, time + 0.1);
  mainGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

  // Route connections
  noiseSource.connect(filter);
  saw.connect(filter);
  filter.connect(mainGain);
  
  // Feedback Echo path
  mainGain.connect(audioContext.destination);
  mainGain.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(audioContext.destination);
  delayGain.connect(delay); // feedback loop

  // Play
  noiseSource.start(time);
  saw.start(time);
  noiseSource.stop(time + 1.5);
  saw.stop(time + 1.5);
}

/** 
 * SYNTH ENGINE 3: ROBOTIC VOCAL SPECTRUM FORMANT
 * Double bandpass combs combined with stereo delay and sweep
 * Simulates a custom metallic dry/wet "HMT Design" voice tag readout!
 */
function synthesizeFormantVocalization(startTime = 0) {
  if (!audioContext) return;
  const time = audioContext.currentTime + startTime;

  // Pulse Oscillator (low frequency harmonic base)
  const pulse = audioContext.createOscillator();
  pulse.type = "sawtooth";
  pulse.frequency.setValueAtTime(95, time);
  pulse.frequency.linearRampToValueAtTime(115, time + 0.4);
  pulse.frequency.linearRampToValueAtTime(80, time + 1.0);

  // Formant Filter 1 (creates vocal vowel resonators e.g. "Ah" / "Oh")
  const f1 = audioContext.createBiquadFilter();
  f1.type = "bandpass";
  f1.Q.setValueAtTime(12, time);
  f1.frequency.setValueAtTime(600, time); // "Ah"
  f1.frequency.exponentialRampToValueAtTime(450, time + 0.5); // "Oo"
  f1.frequency.exponentialRampToValueAtTime(800, time + 1.0); // "Ee"

  // Formant Filter 2 (creates secondary mouth cavity resonance)
  const f2 = audioContext.createBiquadFilter();
  f2.type = "bandpass";
  f2.Q.setValueAtTime(10, time);
  f2.frequency.setValueAtTime(1800, time);
  f2.frequency.exponentialRampToValueAtTime(1100, time + 0.5);
  f2.frequency.exponentialRampToValueAtTime(2400, time + 1.0);

  // Stereo Ping-Pong delay
  const delay = audioContext.createDelay();
  delay.delayTime.value = 0.28;
  const delayFdbk = audioContext.createGain();
  delayFdbk.gain.value = 0.45;

  const voiceGain = audioContext.createGain();
  voiceGain.gain.setValueAtTime(0.01, time);
  voiceGain.gain.linearRampToValueAtTime(0.9, time + 0.08);
  voiceGain.gain.exponentialRampToValueAtTime(0.001, time + 1.3);

  // Connections
  pulse.connect(f1);
  pulse.connect(f2);
  f1.connect(voiceGain);
  f2.connect(voiceGain);
  
  voiceGain.connect(audioContext.destination);
  voiceGain.connect(delay);
  delay.connect(delayFdbk);
  delayFdbk.connect(audioContext.destination);
  delayFdbk.connect(delay);

  pulse.start(time);
  pulse.stop(time + 1.4);
}

// Distortion Curve builder (WaveShaper helper)
function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
