import { ExternalLink, LifeBuoy, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JobResourcesView } from "@/lib/queries/jobs";

type SectorMeta = { outlook?: string; typical_wage?: string };

export function ResourcesSidebar({ data }: { data: JobResourcesView }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <LifeBuoy className="h-4 w-4 text-primary" /> Virginia workforce resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.resources.map((r) => (
            <a
              key={r.id}
              href={r.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-raised/50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-foreground group-hover:text-primary">
                  {r.name}
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
              {r.category && (
                <Badge variant="secondary" className="mt-1.5">
                  {r.category}
                </Badge>
              )}
            </a>
          ))}
          {data.resources.length === 0 && (
            <p className="text-sm text-muted-foreground">No resources listed.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" /> In-demand sectors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.sectors.map((s) => {
            const meta = (s.meta ?? {}) as SectorMeta;
            return (
              <div key={s.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                {meta.typical_wage && (
                  <p className="mt-0.5 text-xs font-medium text-primary">
                    {meta.typical_wage}
                  </p>
                )}
                {meta.outlook && (
                  <p className="mt-1 text-xs text-muted-foreground">{meta.outlook}</p>
                )}
              </div>
            );
          })}
          {data.sectors.length === 0 && (
            <p className="text-sm text-muted-foreground">No sectors listed.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
