import {useState} from 'react'
import {Pencil, Plus, Trash2, X, Check} from 'lucide-react'
import {
  createPortfolio,
  deletePortfolio,
  renamePortfolio,
  listPortfolios,
  MAX_PORTFOLIOS,
} from '@/lib/portfolioStore'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function PortfolioManagerDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onChanged: () => void
}) {
  const [portfolios, setPortfolios] = useState(listPortfolios())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  function refresh() {
    setPortfolios(listPortfolios())
  }

  function handleCreate() {
    const name = newName.trim()
    if (!name) {
      setError('请输入组合名称')
      return
    }
    try {
      createPortfolio(name)
      setNewName('')
      setError('')
      refresh()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function handleStartEdit(id: string, name: string) {
    setEditingId(id)
    setEditName(name)
  }

  function handleConfirmRename(id: string) {
    const name = editName.trim()
    if (!name) {
      setError('组合名称不能为空')
      return
    }
    try {
      renamePortfolio(id, name)
      setEditingId(null)
      setError('')
      refresh()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`确认删除组合「${name}」？组合内的所有持仓将被一并删除，此操作不可撤销。`)) return
    try {
      deletePortfolio(id)
      setError('')
      refresh()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const canCreate = portfolios.length < MAX_PORTFOLIOS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>管理投资组合</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {portfolios.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2"
            >
              {editingId === p.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename(p.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleConfirmRename(p.id)}
                    className="rounded p-1 text-fall hover:bg-paper-deep"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded p-1 text-muted hover:bg-paper-deep"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-ink">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(p.id, p.name)}
                    className="rounded p-1 text-muted hover:bg-paper-deep hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="rounded p-1 text-muted hover:bg-paper-deep hover:text-rise"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {canCreate ? (
          <div className="mt-4 flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              placeholder="输入新组合名称"
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              创建
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">已达上限 {MAX_PORTFOLIOS} 个组合</p>
        )}

        <p className="text-xs text-muted">
          已创建 {portfolios.length} / {MAX_PORTFOLIOS} 个组合。删除组合会连带删除其中所有持仓。
        </p>

        {error ? <p className="text-sm text-rise">{error}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
