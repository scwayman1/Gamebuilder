import { BriefForm } from "@/components/brief-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewModulePage() {
  return (
    <div className="space-y-6 pt-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Back
      </Link>
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Module brief</h1>
        <p className="max-w-2xl pt-1 text-muted-foreground text-sm">
          Capture the lesson target. The planner will turn this into a scoped
          blueprint you can edit before any code is generated.
        </p>
      </div>
      <BriefForm />
    </div>
  );
}
