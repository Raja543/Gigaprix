import Link from "next/link";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Flag className="h-7 w-7 text-primary" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-sm text-text-muted">
        That competition, profile, or page doesn&apos;t exist.
      </p>
      <div className="flex gap-2">
        <Link href="/">
          <Button>Go home</Button>
        </Link>
        <Link href="/tournaments">
          <Button variant="outline">Browse competitions</Button>
        </Link>
      </div>
    </div>
  );
}
