/**
 * VoicePicker: 音色选择胶囊 + 弹出面板。
 *
 * 取代原来的「点击轮转」：音色一多，轮转要点十几次才能选到想要的。
 * 现在点一下弹出可滚动列表，当前项高亮，点选即切换。
 *
 * 交互细节：
 *  - 点胶囊开/关；点面板外关闭；Esc 关闭
 *  - 面板向上弹出（工具栏在输入框上方，向下会被输入框挡住）
 *  - 切换成功后自动收起
 *  - 尊重 prefers-reduced-motion
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import styles from './VoicePicker.module.css'
import chips from './chips.css'

export interface VoiceOption {
  name: string
  label: string
}

export interface VoicePickerProps {
  /** 当前音色名（用于高亮）。 */
  current: string
  /** 当前音色显示名（胶囊上的文字）。 */
  currentLabel: string
  /** 可选音色。 */
  options: VoiceOption[]
  /** 选择回调（点选后由父组件负责切桥）。 */
  onSelect: (name: string) => void
  /** 胶囊的 tooltip。 */
  hint: string
  /** 面板标题。 */
  title: string
  /** 麦克风图标。 */
  icon: () => JSX.Element
}

export const VoicePicker = memo(function VoicePicker({
  current,
  currentLabel,
  options,
  onSelect,
  hint,
  title,
  icon: Icon,
}: VoicePickerProps) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  /** 带退场动画的关闭。 */
  const close = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 100)
  }, [])

  const toggle = useCallback(() => {
    if (open) close()
    else setOpen(true)
  }, [open, close])

  // 点面板外 / Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const node = wrapRef.current
      if (node !== null && !node.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // 打开后把当前项滚到可见区域
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (panel === null) return
    const active = panel.querySelector<HTMLElement>('[data-current="1"]')
    if (active !== null) active.scrollIntoView({ block: 'nearest' })
  }, [open])

  const pick = useCallback((name: string) => {
    onSelect(name)
    close()
  }, [onSelect, close])

  const prim = 'var(--dsw-alias-state-business-primary)'

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <span
        role="button"
        tabIndex={0}
        className={chips.chip}
        title={hint}
        aria-label={`${hint}：${currentLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px',
          borderRadius: 999,
          cursor: 'pointer',
          background: `color-mix(in srgb, ${prim} 18%, transparent)`,
          color: prim,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${prim} 55%, transparent)`,
          transition: 'color .2s ease, background .2s ease, box-shadow .2s ease',
          fontSize: 12,
          lineHeight: 1,
        }}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <Icon />
        <span>{currentLabel}</span>
      </span>

      {open && (
        <div
          ref={panelRef}
          className={[styles.panel, closing ? styles.panelClosing : ''].join(' ')}
          role="listbox"
          aria-label={title}
        >
          <div className={styles.header}>{title}</div>
          {options.map((opt) => {
            const isCurrent = opt.name === current
            return (
              <button
                key={opt.name}
                type="button"
                role="option"
                aria-selected={isCurrent}
                data-current={isCurrent ? '1' : '0'}
                className={[styles.item, isCurrent ? styles.current : ''].join(' ')}
                onClick={() => pick(opt.name)}
              >
                <span>{opt.label}</span>
                {isCurrent && (
                  <svg className={styles.check} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </span>
  )
})
