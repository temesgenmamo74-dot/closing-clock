import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { runCollector } from "@/lib/collector.server";

export const Route = createFileRoute("/api/public/jobs/collect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const result = await runCollector(20);
        return Response.json({ success: true, ...result });
      },
    },
  },
});
