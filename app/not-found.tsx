import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IepMark } from "@/components/brand/iep-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <IepMark className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have
          access to it.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild>
          <Link href="/home">
            <Compass className="h-4 w-4" />
            Go to my dashboard
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
