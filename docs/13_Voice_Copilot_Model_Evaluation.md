# 13_Voice_Copilot_Model_Evaluation.md

# IrrigaSmart

## Voice Copilot — Live Audio Model Evaluation

Version: 1.0

Status: **Decision recorded. Not approved for implementation.**

Nothing in this document has been built. It records a decision so that the choice
is made once, on evidence, rather than under time pressure later. The seam it
names — `frontend/src/services/voiceProvider.ts` — exists and deliberately has no
working implementation behind it.

Sources are Google's own developer documentation (`ai.google.dev`), read on
**16 August 2026**. Every figure below is quoted from there or marked as our own
estimate. Where the documentation is silent, this document says so instead of
filling the gap.

---

# 1. The question

Voice already works in IrrigaSmart. `frontend/src/services/speech.ts` uses the
browser's own `SpeechRecognition` and `speechSynthesis`, so a farmer can speak a
question and hear the answer read back in any of the five languages. That path is
shipped, costs nothing, needs no key, and its output goes through the same
deterministic rule engine and the same `sanitizeReply` safety net as typed text.

The question is whether to replace it with a **live audio model** — a bidirectional
stream where the model hears the farmer directly and speaks back, with no text
transcript in between. Two candidates were named:

- `gemini-3.1-flash-live-preview`
- `gemini-2.5-flash-native-audio-preview-12-2025`

---

# 2. What the two models actually are

Both are Live API models. Both are **preview**. Both are available on the Gemini
API free tier, and both are priced identically for audio when billed:

| | `gemini-3.1-flash-live-preview` | `gemini-2.5-flash-native-audio-preview-12-2025` |
|---|---|---|
| Status | Preview | Preview |
| Audio in / out price | $3.00 / $12.00 per 1M tokens | $3.00 / $12.00 per 1M tokens |
| Text in / out price | $0.75 / $4.50 per 1M tokens | $0.50 / $2.00 per 1M tokens |
| Context window | Not published per-model | 128k tokens |
| Function calling | **Sequential only** | `NON_BLOCKING` async tools, with `INTERRUPT` / `WHEN_IDLE` / `SILENT` scheduling |
| Thinking | Defaults to `thinkingLevel: minimal` | Not applicable in the same form |
| Affective dialog | No | Yes |
| Proactive audio | No | Yes |
| Code-switching | Not documented as a feature | Documented: switches languages naturally mid-utterance |
| Session cap (audio only) | 15 minutes | 15 minutes |
| Audio format | 16 kHz PCM in, 24 kHz out | 16 kHz PCM in, 24 kHz out |
| Our five languages | All supported | All supported |

Cost of a conversation, our own arithmetic from Google's per-token prices: audio
in is roughly **$0.005 per minute** and audio out roughly **$0.018 per minute**.
A three-minute exchange in which the farmer speaks for one minute and the model
speaks for one is on the order of **$0.023**. That is small per conversation and
is not small multiplied by a district.

---

# 3. What the documentation no longer tells us

Google has **removed the per-model rate-limit tables** for these models and
states that preview limits "are not guaranteed".

This matters more than any feature in the table above. PRD §13 says not to
architect around "Gemini is unlimited for free", and this is the evidence for
that instruction rather than a restatement of it: the free allowance we would be
depending on is now undocumented and explicitly not promised. A build that
assumes it will find, at some later date, that the assumption was never made in
writing.

---

# 4. Security: ephemeral tokens are not optional

A browser cannot hold `GEMINI_API_KEY`. Anything shipped to the client is
readable by anyone who opens the network tab, and a leaked key is billable to us.

Google's answer is **ephemeral tokens**, and the constraints are specific:

- They are **Live API only** — the text assistant route cannot use them.
- They are **`v1beta` only**.
- They must be **minted on the server**. That means a new backend endpoint whose
  sole job is to exchange our secret key for a short-lived client token.
- A session must **reconnect roughly every 10 minutes** using
  `sessionResumption`, because of the 15-minute audio session cap.

So the smallest honest version of this feature is not "add a voice button". It is:
a new backend endpoint holding the secret, a token lifecycle, a WebSocket client,
a reconnect-and-resume loop, and an audio pipeline at 16 kHz in / 24 kHz out.

---

# 5. Why this is not a drop-in replacement for what we have

The architecture in PRD §9 is:

```
raw data → rule engine → structured assessment → LLM → natural-language explanation
```

Not `data → LLM → decision`. The rule engine decides; the model only puts the
decision into words. Two consequences for live audio:

**The safety net is text-shaped.** `sanitizeReply` and `FORBIDDEN_TERMS` in
`backend/src/assistant.ts` inspect the model's *words*. A native-audio model that
speaks directly to the farmer produces audio; if the spoken audio is the product,
there is nothing for the current guardrail to read. The permanent product
boundary — no product name, no dose, no spray schedule, no claim that a disease is
present — is enforced today by reading the reply before the farmer sees it. Live
audio would require that enforcement to be rebuilt against a transcript, and a
transcript that arrives *alongside* speech the farmer has already heard is not a
gate. It is a log.

**Offline is the normal case, not the exception.** The recommendation engine runs
on-device precisely because a field has no signal. A live audio session is a
continuously open socket: it is the least offline-tolerant component we could add.
`speech.ts` degrades gracefully — synthesis is usually on-device and keeps working
with no connection. A Live API session simply does not exist without one.

---

# 6. Which of the two, if we build it

**`gemini-3.1-flash-live-preview`**, as the default.

The reasoning, in order of weight:

1. **Sequential-only function calling costs us nothing.** The limitation matters
   when tools are slow or remote. Ours are neither: every tool a voice Copilot
   would call — the decision engine, the water balance, the improvement plan — is
   local, synchronous and returns in microseconds. `NON_BLOCKING` tools solve a
   problem we do not have.
2. **`thinkingLevel: minimal` by default is the right default here.** A farmer
   standing in a field asking whether to irrigate today wants the answer while
   they are still standing there. Latency is a feature of this product; depth of
   reasoning is supplied by the rule engine, not by the model.
3. **It is the newer line**, so it is the one likelier to leave preview and gain
   documented limits.

**`gemini-2.5-flash-native-audio-preview-12-2025`** is the A/B candidate, for one
specific reason that cannot be settled from documentation: **code-switching**.
Real farmer speech in West Bengal and across the Hindi belt is Hinglish and
Banglish — an English crop name and an English number inside a Bengali sentence.
Google documents natural code-switching for this model and does not for the other.
Whether that difference is audible in our five languages is an empirical question,
and answering it needs recordings of real speech, not a spec sheet. Affective
dialog and proactive audio are pleasant and are not reasons to choose it.

---

# 7. Recommendation

**Do not build live audio now.** Keep `speech.ts`.

What we have already delivers the farmer-facing benefit — ask by voice, hear the
answer — at zero cost, with no key in the browser, with the text safety net fully
in force, and with graceful offline behaviour. What live audio adds is
conversational fluency. What it costs is a new secret-holding endpoint, a token
lifecycle, a reconnect loop, an audio pipeline, a per-minute bill, a dependency on
an undocumented free allowance, and a guardrail that has to be rebuilt from
scratch against a medium it was not designed for.

That trade is not currently worth making. It may become worth making when the
models leave preview and their limits are documented again.

**What is built instead:** `frontend/src/services/voiceProvider.ts` — the
interface, and nothing else. It names the seam so that this decision, when
revisited, is a matter of writing one implementation rather than reworking the
assistant. See PRD §13: the abstraction is the deliverable.

---

# 8. If it is built later, these are the conditions

Not a wish list — these are the things whose absence would make the feature
dishonest or unaffordable.

1. **The token endpoint holds the secret.** `GEMINI_API_KEY` never reaches the
   client. The browser receives only a short-lived token.
2. **The rule engine still decides.** The model is given the structured
   assessment and asked to speak it. It is not given raw data and asked what to
   do. PRD §9 is not relaxed for audio.
3. **The boundary is enforced on the transcript, and the transcript gates the
   audio.** If enforcement cannot happen before the farmer hears the words, the
   spoken channel must not carry disease or fertilizer content at all.
4. **No autonomous action.** PRD §28 Guardrail 3: the Copilot does not start a
   pump. A voice interface makes "just say the word" tempting and the answer is
   still no.
5. **Provenance survives the medium.** "The soil map estimates" and "your soil is"
   are different sentences. A spoken answer that drops the qualifier breaks
   Guardrail 1 exactly as a written one would, and speech has no room for a
   provenance chip — the qualifier has to be in the words.
6. **A hard session and spend ceiling**, because the free allowance is
   undocumented and a stuck-open socket is a bill.
7. **`speech.ts` stays.** Live audio is an enhancement for farmers with signal,
   never the only way to ask a question.

---

# 9. Decision log

| Date | Decision |
|---|---|
| 2026-08-16 | Both candidates evaluated from `ai.google.dev`. Live audio **not** built. `VoiceProvider` interface added as the seam. If built: `gemini-3.1-flash-live-preview` default, `gemini-2.5-flash-native-audio-preview-12-2025` as the A/B candidate for Hinglish and Banglish code-switching. |
