/**
 * Payment Audio and Voice Synthesis Utility
 * Plays an authentic digital payment chime (Web Audio API)
 * followed by a clear, natural Voice Announcement via SpeechSynthesis.
 * 
 * NOTE: Per user specifications, voice announcement is ONLY played for successful payments!
 */

// Synthesize a high-quality multi-frequency fintech success chime
export const playPaymentSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // 4 harmonic tones forming an uplifting, positive fintech success chord (C5, E5, G5, C6)
    const tones = [
      { freq: 523.25, time: 0.00, duration: 0.35, gain: 0.22 }, // C5
      { freq: 659.25, time: 0.07, duration: 0.35, gain: 0.24 }, // E5
      { freq: 783.99, time: 0.14, duration: 0.40, gain: 0.26 }, // G5
      { freq: 1046.50, time: 0.22, duration: 0.65, gain: 0.28 }, // C6
    ];

    tones.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + time);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration + 0.05);
    });
  } catch (err) {
    console.warn("Unable to play payment success chime:", err);
  }
};

// Natural Voice Announcement (like Paytm / PhonePe Soundbox)
export const playPaymentSuccessVoice = (amount, recipientName = '') => {
  try {
    if (!('speechSynthesis' in window)) return;

    // Cancel any previous speech synthesis
    window.speechSynthesis.cancel();

    const numericAmount = parseFloat(amount || 0);
    const formattedAmount = numericAmount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });

    let voiceText = `Payment of ${formattedAmount} rupees successful.`;
    if (recipientName && recipientName.trim()) {
      const cleanRecipient = recipientName.replace(/^@/, '').trim();
      voiceText = `Payment of ${formattedAmount} rupees to ${cleanRecipient} successful.`;
    }

    const utterance = new SpeechSynthesisUtterance(voiceText);
    utterance.rate = 0.95; // Natural spoken pace
    utterance.pitch = 1.05; // Friendly, clear tone
    utterance.volume = 1.0;

    // Pick best available English voice (Indian English or clear modern English)
    const findAndSetVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const preferredVoice =
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('India') ||
              v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Siri'))
        ) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    };

    findAndSetVoice();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findAndSetVoice;
    }

    // Play voice immediately after the chime concludes
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis speak error:", e);
      }
    }, 450);
  } catch (err) {
    console.warn("Voice announcement error:", err);
  }
};

/**
 * Main trigger for Payment Success
 * Plays chime AND clear soundbox voice announcement!
 */
export const playPaymentSuccessAudio = (amount, recipientName = '') => {
  playPaymentSuccessChime();
  playPaymentSuccessVoice(amount, recipientName);
};
