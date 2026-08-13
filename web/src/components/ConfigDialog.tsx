import {useRef, useState} from 'react'
import {Download, Upload} from 'lucide-react'
import {exportConfig, importConfig} from '@/lib/api'
import {validateImportConfig} from '@/lib/portfolioStore'
import {Button} from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PendingImport = {
  payload: unknown
  fileName: string
  count: number
  watchCount: number
  portfolioCount: number
  exportedAt: string
  schemaVersion: number
}

export function ConfigDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onImported: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleExport() {
    setError('')
    const config = exportConfig()
    const blob = new Blob([JSON.stringify(config, null, 2)], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `fund-dashboard-backup-${fileStamp(new Date())}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setMessage('备份文件已导出')
  }

  async function handleFile(file: File) {
    setError('')
    setMessage('')
    setPending(null)
    try {
      if (!file.name.toLowerCase().endsWith('.json')) throw new Error('请选择 JSON 文件')
      const payload = JSON.parse(await file.text()) as unknown
      const summary = validateImportConfig(payload)
      setPending({payload, fileName: file.name, ...summary})
    } catch (err: unknown) {
      setError(err instanceof SyntaxError ? '文件不是有效 JSON' : (err as Error).message)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function confirmImport() {
    if (!pending) return
    try {
      importConfig(pending.payload)
      setPending(null)
      setMessage('数据已导入，行情正在刷新')
      onImported()
    } catch (err: unknown) {
      setError((err as Error).message || '导入失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>本地数据备份</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-muted">
          持仓和自选保存在当前浏览器。建议定期导出备份；导入会覆盖当前全部数据。
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            导出数据
          </Button>
          <Button type="button" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            选择备份
          </Button>
        </div>

        {pending ? (
          <div className="mt-4 rounded-lg border border-line bg-paper p-4">
            <div className="text-sm font-medium text-ink">确认覆盖当前数据？</div>
            <dl className="mt-2 grid grid-cols-[88px_1fr] gap-y-1 text-xs text-muted">
              <dt>文件</dt>
              <dd className="truncate text-ink-soft">{pending.fileName}</dd>
              <dt>持仓数量</dt>
              <dd className="text-ink-soft">{pending.count} 只</dd>
              <dt>组合数量</dt>
              <dd className="text-ink-soft">{pending.portfolioCount} 个</dd>
              <dt>自选数量</dt>
              <dd className="text-ink-soft">{pending.watchCount} 只</dd>
              <dt>备份时间</dt>
              <dd className="text-ink-soft">{formatDateTime(pending.exportedAt)}</dd>
              <dt>结构版本</dt>
              <dd className="text-ink-soft">v{pending.schemaVersion}</dd>
            </dl>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
                取消
              </Button>
              <Button type="button" size="sm" variant="danger" onClick={confirmImport}>
                覆盖并导入
              </Button>
            </div>
          </div>
        ) : null}

        {message ? <p className="mt-3 text-sm text-fall">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rise">{error}</p> : null}
      </DialogContent>
    </Dialog>
  )
}

function fileStamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function formatDateTime(value: string) {
  if (!value) return '未记录'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '未记录' : date.toLocaleString('zh-CN', {hour12: false})
}
