import { Skeleton, SkeletonCards } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96" />
      <div className="mt-6">
        <SkeletonCards />
      </div>
      <div className="mt-4">
        <SkeletonCards count={3} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
