import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DataImportLoading() {
  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-between mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-10 w-28 rounded-lg" />
            {i < 3 && <Skeleton className="h-4 w-4 mx-2" />}
          </div>
        ))}
      </div>

      {/* Upload area */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-lg border-2 border-dashed" />
        </CardContent>
      </Card>
    </div>
  );
}
