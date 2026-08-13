import {useEffect, useState} from 'react'
import {
  resolveFund,
  type AmountBasis,
  type FundQuoteRow,
  type HoldingInput,
  type Portfolio,
  type ResolveFundResult,
} from '@/lib/api'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {FundSearchInput} from '@/components/FundSearchInput'

export function FundFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  portfolios,
  defaultPortfolioId,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  initial: FundQuoteRow | null
  onSubmit: (payload: HoldingInput) => Promise<void>
  portfolios: Portfolio[]
  defaultPortfolioId: string
}) {
  const [code, setCode] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [amount, setAmount] = useState('')
  const [amountBasis, setAmountBasis] = useState<AmountBasis>('prev')
  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId)
  const [meta, setMeta] = useState<ResolveFundResult | null>(null)
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCode(initial?.code || '')
    setTotalCost(initial ? String(initial.totalCost) : '')
    setAmount(
      initial?.settledValue != null
        ? String(initial.settledValue)
        : initial?.currentValue != null
          ? String(initial.currentValue)
          : '',
    )
    setAmountBasis(initial?.percentSource === 'confirmed' ? 'today' : 'prev')
    setPortfolioId(initial?.portfolioId || defaultPortfolioId)
    setMeta(null)
    setError('')
    if (initial?.code) void identify(initial.code)
  }, [open, initial, defaultPortfolioId])

  async function identify(inputCode = code) {
    const normalized = inputCode.trim()
    if (!/^\d{6}$/.test(normalized)) {
      setError('请输入 6 位基金代码')
      return null
    }
    setResolving(true)
    setError('')
    try {
      const result = await resolveFund(normalized)
      setMeta(result)
      if (!result.confirmedSession && amountBasis === 'today') setAmountBasis('prev')
      return result
    } catch (err: unknown) {
      setMeta(null)
      setError(readError(err, '基金识别失败'))
      return null
    } finally {
      setResolving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑持仓' : '添加持仓'}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!meta) {
              setError('请先搜索并选择基金')
              return
            }
            setSaving(true)
            setError('')
            try {
              await onSubmit({
                code: meta.code,
                totalCost: Number(totalCost),
                amount: Number(amount),
                amountBasis,
                portfolioId,
              })
              onOpenChange(false)
            } catch (err: unknown) {
              setError(readError(err, '保存失败'))
            } finally {
              setSaving(false)
            }
          }}
        >
          <div className="space-y-1.5">
            <Label>{initial ? '基金代码' : '搜索基金'}</Label>
            {initial ? (
              <Input value={code} disabled />
            ) : (
              <FundSearchInput
                autoFocus
                disabled={resolving}
                onSelect={async (fund) => {
                  setCode(fund.code)
                  await identify(fund.code)
                }}
              />
            )}
            {resolving ? (
              <p className="text-xs text-muted">正在识别基金信息…</p>
            ) : null}
            {meta ? (
              <div className="rounded-md bg-paper-deep px-3 py-2 text-sm text-ink-soft">
                <div className="font-medium text-ink">{meta.name}</div>
                <div className="mt-1 text-xs text-muted">
                  最新净值 {formatNav(meta.netValue)} · {meta.netValueDate || '日期未知'}
                  {meta.sectors.length ? ` · ${meta.sectors.join(' / ')}` : ''}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portfolio-select">所属组合</Label>
            <select
              id="portfolio-select"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="total-cost">持仓成本</Label>
            <Input
              id="total-cost"
              type="number"
              step="0.01"
              min="0"
              value={totalCost}
              onChange={(event) => setTotalCost(event.target.value)}
              placeholder="当前剩余持仓的总成本"
              required
            />
            <p className="text-xs text-muted">增减仓后请按当前剩余持仓手动修正。</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="holding-amount">当前持仓金额</Label>
            <Input
              id="holding-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="用于按确认净值反推持有份额"
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">金额口径</legend>
            <div className="grid grid-cols-2 gap-2">
              <BasisOption
                checked={amountBasis === 'prev'}
                title="昨日结算"
                description="按上一确认净值计算份额"
                onChange={() => setAmountBasis('prev')}
              />
              <BasisOption
                checked={amountBasis === 'today'}
                disabled={!meta?.confirmedSession}
                title="今日结算"
                description={
                  meta?.confirmedSession ? '按今日确认净值计算份额' : '今日净值确认后可选'
                }
                onChange={() => setAmountBasis('today')}
              />
            </div>
          </fieldset>

          {error ? <p className="text-sm text-rise">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving || resolving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BasisOption({
  checked,
  disabled,
  title,
  description,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  title: string
  description: string
  onChange: () => void
}) {
  return (
    <label
      className={`rounded-md border px-3 py-2.5 ${
        checked ? 'border-accent bg-brand-soft' : 'border-line bg-paper'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <input
          type="radio"
          name="amount-basis"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
        />
        {title}
      </span>
      <span className="mt-1 block pl-5 text-xs text-muted">{description}</span>
    </label>
  )
}

function readError(error: unknown, fallback: string) {
  return (
    (error as {response?: {data?: {message?: string}}})?.response?.data?.message ||
    (error as Error)?.message ||
    fallback
  )
}

function formatNav(value?: number | null) {
  return value != null && Number.isFinite(value) ? value.toFixed(4) : '--'
}
