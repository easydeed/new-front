'use client'

import { useEffect, useState } from 'react'

function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState('Copy')
  return (
    <button
      type="button"
      className="mkt-copy"
      onClick={() => {
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
        setLabel('Copied')
        window.setTimeout(() => setLabel('Copy'), 1400)
      }}
    >
      {label}
    </button>
  )
}

export function BaseBar({ url }: { url: string }) {
  return (
    <div className="mkt-base" data-code="1">
      <span className="mono" style={{ flex: 'none', fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', color: 'var(--violet)' }}>BASE</span>
      <pre>{url}</pre>
      <CopyButton text={url} />
    </div>
  )
}

export function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="mkt-panel" data-code="1">
      <div className="mkt-panel-bar">
        <span className="mono" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--on-dark-muted)' }}>{label}</span>
        <CopyButton text={code} />
      </div>
      <pre>{code}</pre>
    </div>
  )
}

export function CodeTabs({ samples }: { samples: Array<{ id: string; label: string; code: string }> }) {
  const [lang, setLang] = useState(samples[0]?.id ?? '')
  const active = samples.find((sample) => sample.id === lang) ?? samples[0]
  if (!active) return null
  return (
    <div className="mkt-panel" data-code="1">
      <div className="mkt-panel-bar" style={{ paddingLeft: 10 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={sample.id === active.id ? 'mkt-tab on' : 'mkt-tab'}
              onClick={() => setLang(sample.id)}
            >
              {sample.label}
            </button>
          ))}
        </div>
        <CopyButton key={active.id} text={active.code} />
      </div>
      <pre>{active.code}</pre>
    </div>
  )
}

/**
 * The active section is the last one whose top has reached the nav.
 * The sidebar scrolls itself; scrollIntoView would move the page.
 */
export function DocSidebar({ items }: { items: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState('')

  useEffect(() => {
    let raf = 0
    const onSpy = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const nav = document.querySelector('.mkt-nav')
        const navH = nav instanceof HTMLElement ? nav.offsetHeight : 120
        const els = document.querySelectorAll<HTMLElement>('[data-doc]')
        if (!els.length) return
        let cur = els[0].id
        els.forEach((el) => {
          if (el.getBoundingClientRect().top <= navH + 80) cur = el.id
        })
        setActive((prev) => (prev === cur ? prev : cur))
      })
    }
    onSpy()
    window.addEventListener('scroll', onSpy, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onSpy, { capture: true })
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const side = document.querySelector<HTMLElement>('[data-doc-side]')
    const link = side?.querySelector<HTMLElement>(`a[href="#${active}"]`)
    if (!side || !link) return
    const top = link.offsetTop
    const bot = top + link.offsetHeight
    if (top < side.scrollTop) side.scrollTop = Math.max(0, top - 40)
    else if (bot > side.scrollTop + side.clientHeight) side.scrollTop = bot - side.clientHeight + 12
  }, [active])

  return (
    <aside className="mkt-doc-side" data-doc-side="1">
      <div className="mono" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 12px 12px' }}>On this page</div>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={item.id === active ? 'on' : undefined}>{item.label}</a>
      ))}
    </aside>
  )
}
