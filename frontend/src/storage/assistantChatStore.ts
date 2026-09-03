import { getDb, type AssistantChatMessage, type AssistantChatRecord } from './db';

/** Key of the single assistant conversation record. */
export const ASSISTANT_CHAT_KEY = 'default';

/**
 * Cap on the persisted transcript. The record is rewritten whole on every
 * message, and the model only ever receives the newest handful of turns as
 * history — anything past this is bytes IndexedDB rewrites for nothing.
 */
export const MAX_STORED_MESSAGES = 60;

/**
 * Assistant conversation persistence (V2.2).
 *
 * BEST-EFFORT BY DESIGN: neither function throws. A chat that cannot persist
 * (storage quota, private browsing) must still work for the session — losing
 * history on reopen is an inconvenience, an unhandled rejection inside a chat
 * send is a broken panel. Failures resolve to "nothing stored".
 */

export async function getAssistantChat(): Promise<AssistantChatMessage[]> {
  try {
    const db = await getDb();
    const record = await db.get('assistantChat', ASSISTANT_CHAT_KEY);
    return Array.isArray(record?.messages) ? record.messages : [];
  } catch {
    return [];
  }
}

export async function saveAssistantChat(
  messages: readonly AssistantChatMessage[],
): Promise<void> {
  try {
    const db = await getDb();
    const record: AssistantChatRecord = {
      id: ASSISTANT_CHAT_KEY,
      messages: messages.slice(-MAX_STORED_MESSAGES),
      updatedAt: new Date().toISOString(),
    };
    await db.put('assistantChat', record);
  } catch {
    // See the module note: persistence is best-effort.
  }
}
