(function (global) {
  'use strict';

  const VERSION = 6;
  const BPM = 108;
  const BAR_SECONDS = 60 / BPM * 4;
  const CROSSFADE_SECONDS = .38;
  const MODULE_URL = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';

  function selectTrack(situation) {
    return 'base';
  }

  function create(options) {
    const settings = options || {};
    const isMuted = settings.isMuted || (() => false);
    const baseUrl = MODULE_URL || (global.location && global.location.href) || 'http://localhost/';
    function supportedAudioType() {
      if (typeof document === 'undefined') return 'mp3';
      const probe = document.createElement('audio');
      if (probe.canPlayType('audio/ogg; codecs="vorbis"')) return 'ogg';
      if (probe.canPlayType('audio/mpeg')) return 'mp3';
      return 'wav';
    }
    const format = settings.format || supportedAudioType();
    const urls = Object.assign({
      base: new URL('assets/puyo-garden-108-loop-v1.mp3?v=2', baseUrl).href,
      pressure: new URL('assets/puyo-theme-pressure.' + format + '?v=1', baseUrl).href,
    }, settings.urls || {});
    let context = null;
    let master = null;
    const buffers = {};
    const loads = {};
    let active = null;
    let wanted = false;
    let requestToken = 0;
    let switchToken = 0;
    let intensity = 0;
    let desiredTrack = 'base';

    function ensure() {
      if (context) return context;
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 2.5;
      master.gain.value = .17;
      master.connect(compressor).connect(context.destination);
      return context;
    }

    function load(track) {
      if (buffers[track]) return Promise.resolve(buffers[track]);
      if (loads[track]) return loads[track];
      loads[track] = fetch(urls[track])
        .then((response) => {
          if (!response.ok) throw new Error('Music request failed: ' + response.status);
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .then((decoded) => { buffers[track] = decoded; return decoded; })
        .catch((error) => { delete loads[track]; throw error; });
      return loads[track];
    }

    function makeSource(track, buffer, when, offset, gainValue) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      gain.gain.setValueAtTime(gainValue, when);
      source.connect(gain).connect(master);
      source.start(when, offset);
      return { source, gain, track, startedAt: when, offset };
    }

    function stopVoice(voice, when) {
      if (!voice) return;
      try { voice.source.stop(when); } catch (error) {}
      if (when <= context.currentTime) {
        try { voice.source.disconnect(); } catch (error) {}
        try { voice.gain.disconnect(); } catch (error) {}
      }
    }

    function currentOffset(voice, when) {
      if (!voice || !voice.source.buffer) return 0;
      const elapsed = Math.max(0, when - voice.startedAt);
      return (voice.offset + elapsed) % voice.source.buffer.duration;
    }

    async function switchTo(track) {
      desiredTrack = track;
      if (!wanted || isMuted() || !ensure() || (active && active.track === track)) return;
      const token = ++switchToken;
      try {
        const decoded = await load(track);
        if (!wanted || isMuted() || token !== switchToken || desiredTrack !== track) return;
        if (!active) {
          active = makeSource(track, decoded, context.currentTime + .04, 0, 1);
          return;
        }
        const now = context.currentTime;
        const position = currentOffset(active, now);
        const intoBar = position % BAR_SECONDS;
        const wait = intoBar < .025 ? .04 : BAR_SECONDS - intoBar;
        const when = now + wait;
        const offset = currentOffset(active, when);
        const previous = active;
        const next = makeSource(track, decoded, when, offset, .0001);
        previous.gain.gain.setValueAtTime(previous.gain.gain.value, when);
        previous.gain.gain.linearRampToValueAtTime(.0001, when + CROSSFADE_SECONDS);
        next.gain.gain.linearRampToValueAtTime(1, when + CROSSFADE_SECONDS);
        stopVoice(previous, when + CROSSFADE_SECONDS + .05);
        active = next;
      } catch (error) {
        console.warn('Puyo music could not switch tracks.', error);
      }
    }

    async function start(situation) {
      const state = situation || {};
      wanted = true;
      desiredTrack = selectTrack(state);
      const token = ++requestToken;
      switchToken++;
      if (isMuted() || !ensure()) return;
      if (context.state === 'suspended') await context.resume();
      try {
        const decoded = await load(desiredTrack);
        if (!wanted || isMuted() || token !== requestToken) return;
        if (active && active.track === desiredTrack) return;
        if (active) stopVoice(active, context.currentTime);
        active = makeSource(desiredTrack, decoded, context.currentTime + .04, 0, 1);
      } catch (error) {
        console.warn('Puyo music could not start.', error);
      }
    }

    function setSituation(situation) {
      const track = selectTrack(situation);
      desiredTrack = track;
      if (wanted && active && active.track !== track) return switchTo(track);
      return Promise.resolve();
    }

    function pause() {
      if (context && context.state === 'running') context.suspend();
    }

    function resume() {
      wanted = true;
      if (isMuted()) return;
      if (active && context && context.state === 'suspended') context.resume();
      else if (!active) start({ mode: desiredTrack === 'pressure' ? 'challenge' : 'classic', stage: desiredTrack === 'pressure' ? 4 : 1 });
    }

    function stop() {
      wanted = false;
      requestToken++;
      switchToken++;
      if (active && context) stopVoice(active, context.currentTime);
      active = null;
    }

    function setMuted(muted) {
      if (muted) pause();
      else if (wanted) resume();
    }

    function volumeForIntensity() {
      return .17 + intensity * .018;
    }

    function holdVolume(now) {
      if (!master) return;
      if (typeof master.gain.cancelAndHoldAtTime === 'function') master.gain.cancelAndHoldAtTime(now);
      else {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
      }
    }

    function setIntensity(level) {
      intensity = Math.max(0, Math.min(2, Number(level) || 0));
      if (master && context) master.gain.setTargetAtTime(volumeForIntensity(), context.currentTime, .08);
    }

    function onChain(chain) {
      intensity = chain >= 3 ? 2 : chain > 1 ? 1 : 0;
      if (!master || !context) return;
      const now = context.currentTime;
      const target = volumeForIntensity();
      holdVolume(now);
      master.gain.linearRampToValueAtTime(target * .58, now + .045);
      if (chain >= 4) {
        master.gain.linearRampToValueAtTime(target * 1.08, now + .3);
        master.gain.linearRampToValueAtTime(target, now + .72);
      } else {
        master.gain.linearRampToValueAtTime(target, now + .32);
      }
    }

    function onChainEnd(summary) {
      intensity = 0;
      if (!master || !context) return;
      const chain = typeof summary === 'number' ? summary : Number(summary && summary.chain) || 0;
      const now = context.currentTime;
      const target = volumeForIntensity();
      holdVolume(now);
      master.gain.linearRampToValueAtTime(target * (chain >= 4 ? .5 : .68), now + .04);
      master.gain.linearRampToValueAtTime(target, now + (chain >= 4 ? .62 : .38));
    }

    function onAllClear() {
      intensity = 0;
      if (!master || !context) return;
      const now = context.currentTime;
      const target = volumeForIntensity();
      holdVolume(now);
      master.gain.linearRampToValueAtTime(target * .42, now + .055);
      master.gain.linearRampToValueAtTime(target * 1.1, now + .48);
      master.gain.linearRampToValueAtTime(target, now + 1.18);
    }

    return Object.freeze({ start, setSituation, pause, resume, stop, setMuted, setIntensity, onChain, onChainEnd, onAllClear, isPlaying: () => wanted, currentTrack: () => active ? active.track : desiredTrack });
  }

  global.PuyoMusic = Object.freeze({ VERSION, BAR_SECONDS, selectTrack, create });
})(typeof window !== 'undefined' ? window : globalThis);
