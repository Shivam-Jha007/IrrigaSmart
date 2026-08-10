import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types';
import { localeFor, type TranslateFn } from '../i18n';
import {
  askAssistant,
  MAX_QUESTION_CHARS,
  speechInputSupported,
  speechOutputSupported,
  speak,
  startListening,
  stopSpeaking,
  type AssistantContext,
  type AssistantSource,
  type AssistantTurn,
  type ListenSession,
} from '../services';

/**
 * FarmerAssistant — the ask-anything circle and chat panel (item 17).
 *
 * The floating circle sits in the corner of the dashboard, which is the
 * convention a farmer will already have met in every other chat app on their
 * phone. Tapping it opens a panel; tapping outside or the close button dismisses
 * it. Nothing else on the dashboard moves, so the assistant never costs the
 * decision card any space.
 *
 * WHAT THIS COMPONENT DOES AND DOES NOT DECIDE
 * It renders a conversation and forwards questions to `askAssistant`. It holds
 * no agronomy, no thresholds, and no irrigation arithmetic
 * (docs/09_AI_Implementation_Guide.md: UI components contain no business logic).
 * Which answer path served a question — the device's own rules or the model — is
 * decided in services/assistantService.ts, and shown here as a small badge so
 * the farmer can tell an instant offline answer from one that needed the
 * network.
 *
 * WHY THE SOURCE BADGE EXISTS
 * A farmer who cannot tell the two apart cannot tell why an answer stopped
 * arriving when their signal dropped. The badge makes the app's own state
 * legible instead of mysterious.
 */

interface Props {
  context: AssistantContext | undefined;
  language: Language;
  t: TranslateFn;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** Only on assistant messages, for the badge. */
  source?: AssistantSource;
}

/** Suggested openers, so the farmer never faces an empty box. */
const SUGGESTION_KEYS = [
  'assistant.suggest.amount',
  'assistant.suggest.timing',
  'assistant.suggest.why',
  'assistant.suggest.moisture',
] as const;

export function FarmerAssistant({ context, language, t }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const nextId = useRef(1);
  const listenRef = useRef<ListenSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const locale = localeFor(language);
  const canListen = speechInputSupported();
  const canSpeak = speechOutputSupported();

  // Keep the newest message in view. A farmer should not have to scroll to read
  // the answer they just asked for.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, busy]);

  // Any in-flight request and any speech belong to an open panel. Closing it
  // must not leave a fetch landing into a hidden component or a voice still
  // talking in the farmer's pocket.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    listenRef.current?.stop();
    listenRef.current = null;
    setListening(false);
    stopSpeaking();
  }, [open]);

  // Unmount cleanup: the same three resources, for the case where the whole
  // dashboard goes away rather than just the panel.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      listenRef.current?.stop();
      stopSpeaking();
    },
    [],
  );

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;

      setVoiceError(null);
      setInput('');
      const userMessage: Message = { id: nextId.current++, role: 'user', text };
      setMessages((prev) => [...prev, userMessage]);
      setBusy(true);

      // History is built from what is already on screen, so the model sees the
      // same conversation the farmer does.
      const history: AssistantTurn[] = messages.map((message) => ({
        role: message.role,
        content: message.text,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const answer = await askAssistant({
          question: text,
          context,
          history,
          t,
          signal: controller.signal,
        });
        setMessages((prev) => [
          ...prev,
          { id: nextId.current++, role: 'assistant', text: answer.text, source: answer.source },
        ]);
      } finally {
        // askAssistant never throws — it returns an 'unavailable' answer instead
        // — so this only has to clear the flags.
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, context, messages, t],
  );

  const toggleListening = useCallback(() => {
    if (listening) {
      listenRef.current?.stop();
      listenRef.current = null;
      setListening(false);
      return;
    }

    setVoiceError(null);
    const session = startListening(locale, {
      onPartial: (partial) => setInput(partial),
      onFinal: (final) => {
        setInput(final);
        setListening(false);
        listenRef.current = null;
        void send(final);
      },
      onError: (code) => {
        setListening(false);
        listenRef.current = null;
        setVoiceError(
          code === 'not-allowed' || code === 'service-not-allowed'
            ? t('assistant.voiceDenied')
            : code === 'no-speech'
              ? t('assistant.voiceNoSpeech')
              : t('assistant.voiceError'),
        );
      },
      onEnd: () => {
        setListening(false);
        listenRef.current = null;
      },
    });

    if (!session) {
      setVoiceError(t('assistant.voiceError'));
      return;
    }
    listenRef.current = session;
    setListening(true);
  }, [listening, locale, send, t]);

  if (!open) {
    return (
      <button
        type="button"
        className="assistant-fab"
        onClick={() => setOpen(true)}
        aria-label={t('assistant.open')}
        title={t('assistant.open')}
      >
        <span className="assistant-fab__icon" aria-hidden="true">
          💬
        </span>
        <span className="assistant-fab__label">{t('assistant.fabLabel')}</span>
      </button>
    );
  }

  return (
    <>
      {/* Scrim: tapping outside closes, which is what a farmer will try first. */}
      <div className="assistant-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <section className="assistant" role="dialog" aria-label={t('assistant.title')}>
        <header className="assistant__head">
          <h3 className="assistant__title">{t('assistant.title')}</h3>
          <button
            type="button"
            className="assistant__close"
            onClick={() => setOpen(false)}
            aria-label={t('assistant.close')}
          >
            ✕
          </button>
        </header>

        <div className="assistant__log" ref={logRef}>
          {messages.length === 0 && (
            <div className="assistant__intro">
              <p className="assistant__introText">{t('assistant.intro')}</p>
              <div className="assistant__suggestions">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="assistant__suggestion"
                    onClick={() => void send(t(key))}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`assistant__msg assistant__msg--${message.role}`}
            >
              <p className="assistant__msgText">{message.text}</p>
              {message.role === 'assistant' && (
                <div className="assistant__msgFoot">
                  {message.source && (
                    <span className={`assistant__source assistant__source--${message.source}`}>
                      {t(
                        message.source === 'rules'
                          ? 'assistant.sourceDevice'
                          : message.source === 'claude'
                            ? 'assistant.sourceOnline'
                            : 'assistant.sourceUnavailable',
                      )}
                    </span>
                  )}
                  {canSpeak && (
                    <button
                      type="button"
                      className="assistant__speak"
                      onClick={() => speak(message.text, locale)}
                      aria-label={t('assistant.readAloud')}
                      title={t('assistant.readAloud')}
                    >
                      🔊
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {busy && <p className="assistant__thinking">{t('assistant.thinking')}</p>}
        </div>

        {voiceError && <p className="assistant__voiceError">{voiceError}</p>}

        <form
          className="assistant__composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="assistant__input"
            value={input}
            maxLength={MAX_QUESTION_CHARS}
            placeholder={listening ? t('assistant.listening') : t('assistant.placeholder')}
            onChange={(event) => setInput(event.target.value)}
            aria-label={t('assistant.placeholder')}
          />
          {canListen && (
            <button
              type="button"
              className={`assistant__mic${listening ? ' assistant__mic--on' : ''}`}
              onClick={toggleListening}
              aria-label={listening ? t('assistant.stopListening') : t('assistant.speakNow')}
              title={listening ? t('assistant.stopListening') : t('assistant.speakNow')}
            >
              {listening ? '⏹' : '🎤'}
            </button>
          )}
          <button
            type="submit"
            className="assistant__send"
            disabled={busy || input.trim().length === 0}
            aria-label={t('assistant.send')}
          >
            ➤
          </button>
        </form>

        <p className="assistant__note">{t('assistant.note')}</p>
      </section>
    </>
  );
}
