"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitReviewRecommendation(
  assignmentId: string,
  recommendation: "accept" | "minor_revision" | "major_revision" | "reject",
  comments: string
) {
  const supabase = createServerClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized." };

  try {
    // 2. Update review assignment
    const { error: updateError } = await supabase
      .from("review_assignments")
      .update({
        status: "submitted",
        recommendation,
        comments,
        submitted_at: new Date().toISOString()
      })
      .eq("id", assignmentId)
      .eq("reviewer_user_id", user.id); // Ensure user owns assignment

    if (updateError) throw updateError;

    revalidatePath("/dashboard/reviewer");
    return { success: true };
  } catch (err: any) {
    console.error("Error submitting review recommendation:", err);
    return { success: false, error: err.message || String(err) };
  }
}
