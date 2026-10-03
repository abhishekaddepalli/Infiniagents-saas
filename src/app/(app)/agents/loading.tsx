import { Skeleton } from '@/components/ui/skeleton'

export default function AgentsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-80" />
      <Skeleton className="mt-6 h-10 w-full" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
    </div>
  )
}
