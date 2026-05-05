import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/csm-queue-stats
 * Returns queue statistics for all CSMs with caching (30s)
 *
 * Response format:
 * {
 *   csm_id: uuid,
 *   csm_name: string,
 *   csm_email: string,
 *   max_capacity: number,
 *   assigned_count: number,
 *   available_slots: number,
 *   load_percentage: number (0-100),
 *   status: 'active' | 'inactive'
 * }[]
 */
export async function GET(request: NextRequest) {
  try {
    // Add cache headers (30 seconds)
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30, s-maxage=30",
    };

    const { data, error } = await supabase
      .from("csm_queue_stats")
      .select(
        "csm_id, csm_name, csm_email, max_capacity, assigned_count, available_slots, load_percentage, status"
      )
      .order("csm_name", { ascending: true });

    if (error) {
      console.error("[CSM Queue Stats] Error fetching data:", error);
      return NextResponse.json(
        { error: "Failed to fetch CSM queue stats" },
        { status: 500, headers }
      );
    }

    // Transform data to ensure numeric types
    const stats = (data || []).map((row: any) => ({
      csm_id: row.csm_id,
      csm_name: row.csm_name,
      csm_email: row.csm_email,
      max_capacity: parseInt(row.max_capacity) || 20,
      assigned_count: parseInt(row.assigned_count) || 0,
      available_slots: parseInt(row.available_slots) || 20,
      load_percentage: parseFloat(row.load_percentage) || 0,
      status: row.status,
    }));

    return NextResponse.json(stats, { headers });
  } catch (error) {
    console.error("[CSM Queue Stats] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
