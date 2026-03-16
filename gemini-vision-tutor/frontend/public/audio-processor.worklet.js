/**
 * audio-processor.worklet.js
 * Place at: frontend/public/audio-processor.worklet.js
 *
 * Lightweight audio processor:
 *  - DC offset removal (removes low-frequency hum)
 *  - Converts float32 to int16
 *  - No noise gate — Gemini's VAD handles speech detection
 *
 * The noise gate was causing "no response after first turn" because
 * it would close between turns and then be too slow to reopen when
 * the user spoke again, so Gemini never received clean speech audio.
 */

class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._dcOffset = 0;
    this._dcAlpha  = 0.995;

    // Handle reset messages (kept for compatibility)
    this.port.onmessage = (e) => {
      if (e.data?.type === "reset") {
        this._dcOffset = 0;
      }
    };
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      // DC offset removal
      this._dcOffset = this._dcAlpha * this._dcOffset + (1 - this._dcAlpha) * input[i];
      const sample   = input[i] - this._dcOffset;

      // Convert to int16
      const clamped = Math.max(-1, Math.min(1, sample));
      int16[i]      = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }

    this.port.postMessage(int16, [int16.buffer]);
    return true;
  }
}

registerProcessor("mic-processor", MicProcessor);