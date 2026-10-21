export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded-full w-24"></div>
        <div className="h-4 bg-slate-200 rounded-full w-16"></div>
      </div>
      <div className="space-y-2">
        <div className="h-5 bg-slate-200 rounded-xl w-3/4"></div>
        <div className="h-3 bg-slate-100 rounded-xl w-full"></div>
      </div>
      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200"></div>
          <div className="h-3 bg-slate-200 rounded-full w-32"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded-xl w-20"></div>
      </div>
    </div>
  );
}