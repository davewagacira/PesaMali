import { motion } from 'framer-motion'
import { Skeleton, SkeletonText } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

function PanelSkeleton({
  titleWidth = 120,
  children,
  delay,
}: {
  titleWidth?: number
  children: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]"
      {...stagger(delay)}
    >
      <div className="mb-3.5 flex items-center gap-2">
        <Skeleton width={13} height={13} />
        <Skeleton width={titleWidth} height={11} />
      </div>
      {children}
    </motion.div>
  )
}

function ChatBubbleSkeleton({ align = 'left', lines = 2 }: { align?: 'left' | 'right'; lines?: number }) {
  const isRight = align === 'right'

  return (
    <div className={`flex max-w-[86%] gap-[11px] ${isRight ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <Skeleton width={32} height={32} />
      <div
        className={`rounded-2xl px-[17px] py-[13px] ${
          isRight
            ? 'rounded-tr-[5px] bg-[var(--card-2)]'
            : 'rounded-tl-[5px] border border-[var(--line)] bg-[var(--card-2)]'
        }`}
        style={{ width: isRight ? 220 : 310, maxWidth: '100%' }}
      >
        <SkeletonText lines={lines} />
      </div>
    </div>
  )
}

export function AISkeleton() {
  return (
    <div
      className="relative -m-2 overflow-hidden px-2 pb-10"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-28 -top-44 h-[520px] w-[520px] rounded-full bg-[var(--card-2)] opacity-30 blur-[90px]" />
        <div className="absolute -bottom-44 -right-24 h-[460px] w-[460px] rounded-full bg-[var(--card-2)] opacity-30 blur-[90px]" />
        <div className="absolute right-[18%] top-[30%] h-[380px] w-[380px] rounded-full bg-[var(--card-2)] opacity-20 blur-[90px]" />
      </div>

      <div className="mx-auto max-w-[1180px]">
        <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--primary-soft)] to-transparent p-6 mb-6">
          <Skeleton height={20} width={80} style={{ marginBottom: 12 }} />
          <Skeleton height={32} width={200} style={{ marginBottom: 8 }} />
          <Skeleton height={16} width={300} />
        </div>

        <motion.div
          className="mb-[26px] flex items-center gap-[26px] max-[1180px]:flex-col max-[1180px]:items-start max-[1180px]:gap-[18px]"
          {...stagger(0)}
        >
          <div className="relative h-[92px] w-[92px] shrink-0">
            <div className="absolute -inset-[9px] rounded-full border border-dashed border-[var(--line)]" />
            <div className="absolute inset-0 rounded-full bg-[var(--card-2)]">
              <div className="absolute inset-[5px] rounded-full bg-[var(--bg)]" />
            </div>
            <Skeleton width={56} height={56} circle className="absolute inset-[18px]" />
          </div>
          <div className="w-full max-w-xl">
            <Skeleton width={300} height={36} style={{ marginBottom: 10 }} />
            <SkeletonText lines={2} />
          </div>
        </motion.div>

        <div className="mb-6 grid grid-cols-4 gap-3.5 max-[1180px]:grid-cols-2 max-[560px]:grid-cols-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="flex items-center gap-[13px] rounded-2xl border border-[var(--line)] bg-[var(--card)] px-[18px] py-4 shadow-[var(--shadow)]"
              {...stagger(i + 1)}
            >
              <Skeleton width={40} height={40} />
              <div className="min-w-0 flex-1">
                <Skeleton width={120} height={10} style={{ marginBottom: 8 }} />
                <Skeleton width={90} height={16} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-[18px] max-[1180px]:grid-cols-1">
          <motion.section
            className="flex h-[min(720px,calc(100dvh-280px))] min-h-[520px] flex-col overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] max-[1180px]:h-[min(560px,calc(100dvh-220px))] max-[1180px]:min-h-[420px]"
            {...stagger(2)}
          >
            <div className="flex items-center gap-[11px] border-b border-[var(--line)] px-5 py-4">
              <Skeleton width={30} height={30} circle />
              <div>
                <Skeleton width={72} height={14} style={{ marginBottom: 7 }} />
                <Skeleton width={156} height={11} />
              </div>
              <Skeleton width={78} height={18} style={{ marginLeft: 'auto' }} />
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-hidden p-[22px]">
              <ChatBubbleSkeleton lines={3} />
              <ChatBubbleSkeleton align="right" lines={1} />
              <ChatBubbleSkeleton lines={2} />
              <div className="flex max-w-[86%] gap-[11px] self-start">
                <Skeleton width={32} height={32} />
                <div className="rounded-2xl rounded-tl-[5px] border border-[var(--line)] bg-[var(--card-2)] px-[17px] py-[13px]">
                  <div className="flex gap-1.5 py-1.5">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} width={7} height={7} circle />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto shrink-0 rounded-b-[20px] border-t border-[var(--line)] bg-[var(--card)] px-4 py-3.5">
              <div className="mb-[11px] flex gap-2 overflow-hidden">
                {[88, 140, 96, 122].map((w, i) => (
                  <Skeleton key={i} width={w} height={34} />
                ))}
              </div>
              <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--bg)] py-1.5 pl-4 pr-1.5">
                <Skeleton height={16} style={{ flex: 1 }} />
                <Skeleton width={42} height={42} />
              </div>
            </div>
          </motion.section>

          <aside className="flex flex-col gap-3.5">
            <PanelSkeleton titleWidth={92} delay={3}>
              <div className="flex flex-col gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-[var(--card-2)] px-3 py-2">
                    <Skeleton width={13} height={13} />
                    <Skeleton height={12} style={{ flex: 1 }} />
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((dot) => (
                        <Skeleton key={dot} width={4} height={4} circle />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PanelSkeleton>

            <PanelSkeleton titleWidth={90} delay={4}>
              <div className="mb-2.5 flex h-[74px] items-end gap-[7px]">
                {[42, 78, 35, 64, 54, 92, 48].map((h, i) => (
                  <Skeleton key={i} height={`${h}%`} style={{ flex: 1, minHeight: 4 }} />
                ))}
              </div>
              <div className="flex gap-[7px]">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} height={10} style={{ flex: 1 }} />
                ))}
              </div>
              <SkeletonText lines={2} style={{ marginTop: 12 }} />
            </PanelSkeleton>

            <PanelSkeleton titleWidth={102} delay={5}>
              <div className="flex flex-col">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-[11px] border-b border-[var(--line)] py-[11px] last:border-0 last:pb-0 first:pt-0">
                    <Skeleton width={30} height={30} />
                    <div className="flex-1">
                      <SkeletonText lines={2} />
                      <Skeleton width={84} height={12} style={{ marginTop: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            </PanelSkeleton>

            <PanelSkeleton titleWidth={90} delay={6}>
              <Skeleton width={142} height={28} style={{ marginBottom: 12 }} />
              <SkeletonText lines={4} />
            </PanelSkeleton>
          </aside>
        </div>
      </div>
    </div>
  )
}
