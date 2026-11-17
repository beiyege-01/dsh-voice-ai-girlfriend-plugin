/**
 * BackendToggle: composer tool-row switch for WHO does speech recognition.
 *
 *  - ON  (backend = 'deepseek'): 官方云端 ASR — 不占显存、不用加载本机模型，
 *    但需要联网和 DeepSeek 平台 API Key（识别按音频时长计费）。
 *  - OFF (backend = 'funasr' / 'whisper'): 本机模型 — 免费、离线，但吃显存，
 *    首次说话要等模型加载。
 *
 * 状态来自语音桥 `/api/stt/backend`（不是 localStorage）：切换会写回桥的
 * bridge-config.json，所以刷新/换标签页/重开 DSH 都保持一致。
 */
import { memo, useCallback, useEffect, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-conversation's SlotMap merge for PropsRuntime resolution.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { VoiceInjected } from './contract.ts'
import { STT_BACKEND_EVENT, sttBackendGet, sttBackendSet } from './bridge.ts'
import { chipKey } from './chip.ts'
import chips from './chips.css'

const CLOUD_BACKEND = 'deepseek'
const LOCAL_BACKEND = 'funasr'

/** Full toggle props: framework runtime share + `voice` locale seat + injected face. */
export type BackendToggleProps = PropsRuntime<'conversation.input.left'> & PropsLocale<'voice'> & VoiceInjected

/** Cloud glyph for the official (cloud) backend. */
function CloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

/** Chip glyph for the local backend. */
function ChipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </svg>
  )
}

export const BackendToggle = memo(function BackendToggle({ t }: BackendToggleProps) {
  const [backend, setBackend] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    void sttBackendGet().then((info) => {
      if (info !== null) setBackend(info.backend)
    })
  }, [])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener(STT_BACKEND_EVENT, onChange)
    // 桥可能比页面晚起来：挂载后再补读一次
    const timer = window.setTimeout(refresh, 3000)
    return () => {
      window.removeEventListener(STT_BACKEND_EVENT, onChange)
      window.clearTimeout(timer)
    }
  }, [refresh])

  const toggle = useCallback(() => {
    if (busy) return
    const current = backend ?? LOCAL_BACKEND
    const next = current === CLOUD_BACKEND ? LOCAL_BACKEND : CLOUD_BACKEND
    setBusy(true)
    void sttBackendSet(next)
      .then((info) => {
        if (info !== null) setBackend(info.backend)
        else refresh()
      })
      .finally(() => setBusy(false))
  }, [backend, busy, refresh])

  // 桥没连上时不显示，避免误导成「已关闭」
  if (backend === null) return null

  const on = backend === CLOUD_BACKEND
  const hint = on ? t('stt.onHint') : t('stt.offHint')
  const prim = 'var(--dsw-alias-state-business-primary)'

  return (
    <span
      role="button"
      tabIndex={0}
      className={[chips.chip, on ? chips.on : ''].join(' ')}
      title={hint}
      aria-label={hint}
      aria-pressed={on}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 30,
        padding: '0 9px',
        borderRadius: 999,
        cursor: 'pointer',
        margin: '0 4px',
        flex: '0 0 auto',
        opacity: busy ? 0.5 : 1,
        background: on
          ? `color-mix(in srgb, ${prim} 22%, transparent)`
          : 'rgba(127,127,127,0.14)',
        color: on ? prim : 'var(--dsw-alias-label-dimmed)',
        boxShadow: on
          ? `inset 0 0 0 1px color-mix(in srgb, ${prim} 62%, transparent)`
          : 'inset 0 0 0 1px rgba(127,127,127,0.18)',
        transition: 'color .2s ease, background .2s ease, box-shadow .2s ease',
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
      onClick={toggle}
      onKeyDown={chipKey}
    >
      {on ? <CloudIcon /> : <ChipIcon />}
      <span>{on ? t('stt.cloudLabel') : t('stt.localLabel')}</span>
    </span>
  )
})
