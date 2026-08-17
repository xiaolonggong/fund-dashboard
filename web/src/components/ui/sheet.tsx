import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {X} from 'lucide-react'
import {cn} from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'right' | 'left'
    width?: string
  }
>(({className, children, side = 'right', width = '520px', ...props}, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] sheet-overlay" />
    <DialogPrimitive.Content
      ref={ref}
      style={{width, maxWidth: 'calc(100vw - 0px)'}}
      className={cn(
        'fixed top-0 bottom-0 z-50 flex flex-col border-l border-line bg-panel shadow-2xl',
        side === 'right' ? 'right-0 sheet-slide-right' : 'left-0 sheet-slide-left',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-60 hover:opacity-100"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = 'SheetContent'

export function SheetHeader({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-line px-6 py-4', className)}
      {...props}
    />
  )
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('font-display text-xl font-semibold text-ink', className)}
      {...props}
    />
  )
}

export function SheetBody({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto px-6 py-4', className)}
      {...props}
    />
  )
}
