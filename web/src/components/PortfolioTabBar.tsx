import {Settings2} from 'lucide-react'
import type {Portfolio} from '@/lib/api'

export function PortfolioTabBar({
  portfolios,
  activeId,
  onSelect,
  onManage,
}: {
  portfolios: Portfolio[]
  activeId: string | null
  onSelect: (id: string | null) => void
  onManage: () => void
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          activeId === null
            ? 'bg-brand-soft text-accent'
            : 'text-ink-soft hover:bg-paper-deep'
        }`}
      >
        全部
      </button>
      {portfolios.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeId === p.id
              ? 'bg-brand-soft text-accent'
              : 'text-ink-soft hover:bg-paper-deep'
          }`}
        >
          {p.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onManage}
        className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-paper-deep hover:text-ink"
        title="管理组合"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  )
}
