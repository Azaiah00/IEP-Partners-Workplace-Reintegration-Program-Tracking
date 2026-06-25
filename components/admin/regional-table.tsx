import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export function RegionalTable({
  regions,
}: {
  regions: { region: string; total: number; active: number; completion: number }[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Region</TableHead>
          <TableHead className="text-right">Participants</TableHead>
          <TableHead className="text-right">Active</TableHead>
          <TableHead className="w-[34%]">Avg. Completion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {regions.map((r) => (
          <TableRow key={r.region}>
            <TableCell className="font-medium text-foreground">
              {r.region}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {r.total}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {r.active}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Progress value={r.completion} className="h-2 flex-1" />
                <span className="w-9 text-right text-xs font-medium text-foreground">
                  {r.completion}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
