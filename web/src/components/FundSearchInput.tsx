import {useEffect, useId, useRef, useState} from 'react'
import {Search, Loader2} from 'lucide-react'
import {searchFunds, type FundSearchResult} from '@/lib/api'
import {cn} from '@/lib/utils'

export function FundSearchInput({
  autoFocus,
  disabled,
  placeholder = '输入基金代码或名称搜索',
  onSelect,
}: {
  autoFocus?: boolean
  disabled?: boolean
  placeholder?: string
  onSelect: (fund: FundSearchResult) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FundSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const reqIdRef = useRef(0)
  const listboxId = useId()

  // 防抖搜索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setOpen(false)
      return
    }
    const reqId = ++reqIdRef.current
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchFunds(trimmed)
        if (reqId !== reqIdRef.current) return
        setResults(data)
        setOpen(true)
        setHighlight(data.length ? 0 : -1)
      } catch {
        if (reqId !== reqIdRef.current) return
        setResults([])
        setOpen(false)
      } finally {
        if (reqId === reqIdRef.current) setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(fund: FundSearchResult) {
    onSelect(fund)
    setQuery('')
    setResults([])
    setOpen(false)
    setHighlight(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) {
      if (e.key === 'ArrowDown' && results.length) {
        setOpen(true)
        setHighlight(0)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && highlight < results.length) pick(results[highlight])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          className={cn(
            'flex h-10 w-full rounded-xl border border-line bg-panel pl-9 pr-3 py-1 text-sm shadow-sm transition-colors',
            'placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-muted',
          )}
          value={query}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-panel shadow-lg"
        >
          {results.map((fund, i) => (
            <li
              key={fund.code}
              role="option"
              aria-selected={i === highlight}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                i === highlight ? 'bg-brand-soft' : 'hover:bg-paper-deep',
              )}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(fund)}
            >
              <span className="font-mono text-xs text-muted">{fund.code}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{fund.name}</span>
              {fund.fundType ? (
                <span className="shrink-0 text-xs text-muted">{fund.fundType}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {open && !loading && results.length === 0 && query.trim() ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 text-center text-sm text-muted shadow-lg">
          未找到匹配的基金
        </div>
      ) : null}
    </div>
  )
}
