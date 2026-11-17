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
/** 上次确认过的后端，缓存下来保证按钮**首帧就渲染**（不会因为桥暂时没起来而消失）。 */
const CACHE_KEY = 's2s.voice.sttBackend'

function readCached(): string {
  try {
    const v = localStorage.getItem(CACHE_KEY)
    return v === LOCAL_BACKEND || v === CLOUD_BACKEND ? v : CLOUD_BACKEND
  } catch {
    return CLOUD_BACKEND
  }
}

function writeCached(v: string): void {
  try {
    localStorage.setItem(CACHE_KEY, v)
  } catch {
    // 持久化不可用——本次会话内仍然正确
  }
}

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
  // 初值来自缓存，**永远不是 null**：切换开关必须常驻，不能因为桥暂时不可达而消失。
  const [backend, setBackend] = useState<string>(readCached)
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)

  const refresh = useCallback(() => {
    void sttBackendGet().then((info) => {
      if (info !== null) {
        setBackend(info.backend)
        writeCached(info.backend)
        setOffline(false)
      } else {
        setOffline(true)
      }
    })
  }, [])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener(STT_BACKEND_EVENT, onChange)
    // 桥可能比页面晚起来 / 中途重启：定时补读 + 切回页面时补读
    const timer = window.setInterval(refresh, 10000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(STT_BACKEND_EVENT, onChange)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const toggle = useCallback(() => {
    if (busy) return
    const next = backend === CLOUD_BACKEND ? LOCAL_BACKEND : CLOUD_BACKEND
    setBusy(true)
    void sttBackendSet(next)
      .then((info) => {
        if (info !== null) {
          setBackend(info.backend)
          writeCached(info.backend)
          setOffline(false)
        } else {
          setOffline(true)
          refresh()
        }
      })
      .finally(() => setBusy(false))
  }, [backend, busy, refresh])

  const on = backend === CLOUD_BACKEND
  const hint = on ? t('stt.onHint') : t('stt.offHint')
  const prim = 'var(--dsw-alias-state-business-primary)'

  return (
    <span
      role="button"
      tabIndex={0}
      className={[chips.chip, on ? chips.on : ''].join(' ')}
      title={offline ? `${hint}（语音桥未连接，显示的是上次状态）` : hint}
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
        opacity: busy || offline ? 0.55 : 1,
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
