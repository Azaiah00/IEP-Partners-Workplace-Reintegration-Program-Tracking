import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getMasterOverview } from "@/lib/queries/iep";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Organizations · IEP Partners" };

export default async function OrganizationsPage() {
  await requireRole("super_admin");
  const overview = await getMasterOverview();

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="All client organizations under IEP Partners oversight."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overview.orgs.map((r) => (
          <Link key={r.org.id} href={`/iep/organizations/${r.org.id}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">{r.org.name}</CardTitle>
                <CardDescription>
                  {humanize(r.org.type)}
                  {r.org.city ? ` · ${r.org.city}, ${r.org.state ?? ""}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex gap-6 text-sm">
                  <span>
                    <span className="font-bold text-foreground">
                      {r.participants}
                    </span>{" "}
                    <span className="text-muted-foreground">participants</span>
                  </span>
                  <span>
                    <span className="font-bold text-foreground">
                      {r.staffCount}
                    </span>{" "}
                    <span className="text-muted-foreground">staff</span>
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
