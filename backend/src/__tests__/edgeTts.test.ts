import { describe, expect, it } from 'vitest';
import { edgeServesLocale, edgeVoiceFor } from '../edgeTts.js';

/**
 * Edge TTS voice-map tests. The synthesis function itself drives a WebSocket
 * to Microsoft and belongs to live verification, not unit tests — but the
 * VOICE MAP is a routing table exactly like tts.ts's language sets, and a
 * wrong entry here means a failed request (or the wrong accent) on every
 * play for that language. Pinned from the live voice list of 2026-09-08.
 */

describe('edgeVoiceFor — the live voice list, pinned', () => {
  it('maps every cloud language to its Azure Neural voice', () => {
    expect(edgeVoiceFor('en-IN')).toBe('en-IN-PrabhatNeural');
    expect(edgeVoiceFor('hi-IN')).toBe('hi-IN-MadhurNeural');
    expect(edgeVoiceFor('bn-IN')).toBe('bn-IN-BashkarNeural');
    expect(edgeVoiceFor('ur-IN')).toBe('ur-IN-SalmanNeural');
  });

  it('has no Assamese voice — as-IN is the device tier, like everywhere else', () => {
    expect(edgeVoiceFor('as-IN')).toBeNull();
    expect(edgeServesLocale('as-IN')).toBe(false);
  });

  it('serves exactly en/hi/bn/ur', () => {
    for (const locale of ['en-IN', 'hi-IN', 'bn-IN', 'ur-IN']) {
      expect(edgeServesLocale(locale)).toBe(true);
    }
  });

  it('tolerates underscore and case variants of a locale tag', () => {
    expect(edgeVoiceFor('hi_in')).toBe('hi-IN-MadhurNeural');
    expect(edgeVoiceFor('UR-in')).toBe('ur-IN-SalmanNeural');
  });
});
