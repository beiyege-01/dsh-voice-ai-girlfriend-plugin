/**
 * chipStyle: a small, host-proof "state chip" for the voice toolbar controls.
 *
 * We deliberately render these as `<span role="button">` with INLINE styles
 * instead of `<button>`: dsh 0.1.3 forces composer-area buttons to a neutral
 * gray + white, which the plugin's stylesheet cannot override. Inline styles on
 * a span are immune to that, so the design (centered, pill, clear ON/OFF) is
 * fully under our control.
 */
import type { CSSProperties } from 'react'

const prim = 'var(--dsw-alias-state-business-primary)'
const dim = 'var(--dsw-alias-label-dimmed)'

export function chipStyle(on: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    padding: 0,
    border: 'none',
    borderRadius: 9,
    cursor: 'pointer',
    flex: '0 0 auto',
    margin: '0 4px',
    background: on
      ? `color-mix(in srgb, ${prim} 22%, transparent)`
      : 'rgba(127,127,127,0.14)',
    color: on ? prim : dim,
    boxShadow: on
      ? `inset 0 0 0 1px color-mix(in srgb, ${prim} 62%, transparent)`
      : 'inset 0 0 0 1px rgba(127,127,127,0.18)',
    transition: 'color .2s ease, background .2s ease, box-shadow .2s ease',
    // 芯片是开关、不是输入框：禁掉文本插入符与选区高亮。浏览器在 tabIndex
    // 元素上（尤其旁边有输入框时）可能画出闪烁的竖线，看起来像多了个光标。
    caretColor: 'transparent',
    userSelect: 'none',
  }
}

/** Convenience keyboard activation for a span-as-button (Enter/Space). */
export function chipKey(e: React.KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).click()
  }
}
