/**
 * QQBridge: hidden component (renders null) that bridges the conversation to
 * QQ via the bridge's /api/qq/ws WebSocket + NapCat:
 *
 *  - inbound: a QQ private message arrives -> bridge pushes
 *    { type: 'qq_message', text } -> we inject it via sendText (same
 *    steer/queue delivery as voice input).
 *  - outbound: when a new assistant reply settles, we push its text back to
 *    the bridge ({ type: 'reply' }), which synthesizes TTS voice and sends
 *    it to the configured QQ.
 *
 * Enabled only when the bridge config has `qq.enabled`; the WS simply fails
 * to connect otherwise (silent, no UI).
 */
import { memo, useEffect, useRef } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-conversation's SlotMap merge for PropsRuntime resolution.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantChatData } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { bridgeBase } from '../bridge.ts'
import type { VoiceInjected } from '../contract.ts'
import { readQqPush } from '../QqPushToggle.tsx'
import { cleanReplyText } from './clean.ts'

/** Full props: framework runtime share + `voice` locale seat + injected face. */
export type QQBridgeProps = PropsRuntime<'conversation.input.left'> & PropsLocale<'voice'> & VoiceInjected

function qqWsUrl(): string {
  const base = bridgeBase()
  const proto = base.startsWith('https:') ? 'wss:' : 'ws:'
  return `${proto}//${base.replace(/^https?:\/\//, '')}/api/qq/ws`
}

function assistantData(node: { kind: string; data: unknown }): AssistantChatData | undefined {
  if (node.kind !== 'assistant-step') return undefined
  return node.data as AssistantChatData
}

function nodeText(data: AssistantChatData): string {
  return data.blocks
    .filter(block => block.kind === 'text')
    .map(block => block.text)
    .join('\n')
}

/**
 * Whether an assistant node belongs to a plain chat TURN: a turn runs from
 * one USER node to the next; if ANY tool-call falls inside that interval the
 * whole turn is agent work (pre-tool preamble, post-tool summary) and never
 * gets voiced to QQ. A turn with no tool-call is a plain chat reply.
 */
function isPlainChatTurn(
  snapshot: { chat: { nodes: { values(): readonly { kind: string; anchorSeq: number }[] } } },
  anchor: number,
): boolean {
  let prevUser = -1
  let nextUser = Infinity
  for (const node of snapshot.chat.nodes.values()) {
    if (node.kind !== 'user') continue
    if (node.anchorSeq < anchor) {
      if (node.anchorSeq > prevUser) prevUser = node.anchorSeq
    } else if (node.anchorSeq > anchor) {
      if (node.anchorSeq < nextUser) nextUser = node.anchorSeq
    }
  }
  for (const node of snapshot.chat.nodes.values()) {
    if (node.kind !== 'tool-call') continue
    if (node.anchorSeq > prevUser && node.anchorSeq < nextUser) return false // agent working turn
  }
  return true
}

/**
 * @param props - framework runtime + locale + injected sendText.
 */
export const QQBridge = memo(function QQBridge({ useSession, sendText }: QQBridgeProps) {
  const wsRef = useRef<WebSocket | null>(null)
  const lastReplyAnchorRef = useRef(0)
  const snapshot = useSession(s => s)

  // WS connect with auto-reconnect (3s). Only one tab should run this (the
  // bridge itself replaces stale connections).
  useEffect(() => {
    let closed = false
    let ws: WebSocket | null = null
    const connect = () => {
      if (closed) return
      ws = new WebSocket(qqWsUrl())
      ws.onopen = () => { wsRef.current = ws }
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as { type?: string; text?: string }
          if (msg.type === 'qq_message' && typeof msg.text === 'string' && msg.text.trim() !== '') {
            void sendText(msg.text.trim()).catch((err) => {
              console.error('[ui-voice] qq inject failed:', err)
            })
          }
        } catch {
          // malformed frame — ignore
        }
      }
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (!closed) setTimeout(connect, 3000)
      }
    }
    connect()
    return () => {
      closed = true
      if (ws !== null) { try { ws.close() } catch { /* already closed */ } }
    }
  }, [sendText])

  // New settled assistant reply -> push text to the bridge (it voices it to QQ).
  // Skips entirely when the QQ push toggle is off. Only plain chat replies
  // (nearest preceding non-assistant node is a USER node) reach QQ — agent
  // working output (after tool-calls) is never voiced.
  useEffect(() => {
    if (!readQqPush()) return
    let maxAnchor = 0
    let newest: { anchor: number; text: string } | null = null
    for (const node of snapshot.chat.nodes.values()) {
      if (node.kind !== 'assistant-step') continue
      const data = assistantData(node)
      if (data === undefined || data.status !== 'settled') continue
      if (node.anchorSeq > maxAnchor) {
        maxAnchor = node.anchorSeq
        newest = { anchor: node.anchorSeq, text: cleanReplyText(nodeText(data), 100000) }
      }
    }
    if (newest === null) return
    if (!isPlainChatTurn(snapshot, newest.anchor)) return // agent working turn — no QQ voice
    if (newest.anchor > lastReplyAnchorRef.current) {
      lastReplyAnchorRef.current = newest.anchor
      const text = newest.text.trim()
      if (text !== '') {
        const ws = wsRef.current
        if (ws !== null && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'reply', text }))
        }
      }
    }
  }, [snapshot])

  return null
})
