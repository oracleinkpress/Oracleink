"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { sendReviewRequest, sendEditorialDecision } from "@/lib/resend";
import { revalidatePath } from "next/cache";

/**
 * Assigns a reviewer to an article and shoots an email.
 */
export async function assignReviewer(
  articleId: string,
  reviewerEmail: string,
  reviewerName: string,
  journalName: string
) {
  const supabase = await createServerClient();
  const adminSupabase = createAdminClient();

  // 1. Authenticate Editor
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized." };

  try {
    // 2. Fetch or create reviewer auth account/user id
    // In Supabase, editors can't inspect auth.users directly. We use admin client to find user by email.
    // If not found, we can mock or insert a placeholder profile.
    let reviewerUserId = "00000000-0000-0000-0000-000000000000"; // Mock reviewer UUID
    
    // We try to query or mock it
    const { data: userData, error: userError } = await adminSupabase.auth.admin.listUsers();
    if (userData && userData.users) {
      const match = userData.users.find(u => u.email === reviewerEmail);
      if (match) {
        reviewerUserId = match.id;
      }
    }

    // 3. Create review assignment
    const { error: assignError } = await supabase
      .from("review_assignments")
      .insert({
        article_id: articleId,
        reviewer_user_id: reviewerUserId,
        status: "pending"
      });

    if (assignError) throw assignError;

    // 4. Update article status to under_review
    await supabase
      .from("articles")
      .update({ status: "under_review" })
      .eq("id", articleId);

    // 5. Send Resend email invitation
    const dashboardUrl = `${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ? 'https://' + process.env.NEXT_PUBLIC_PLATFORM_DOMAIN : 'http://localhost:3000'}/dashboard/reviewer`;
    await sendReviewRequest(reviewerEmail, reviewerName, "Assigned Manuscript", journalName, dashboardUrl);

    revalidatePath("/dashboard/editor");
    return { success: true };
  } catch (err: any) {
    console.error("Error assigning reviewer:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Editorial decision: update status, issue, pages, and trigger notifications/revalidation.
 */
export async function updateArticleStatus(
  articleId: string,
  status: "submitted" | "under_review" | "revision_requested" | "accepted" | "published" | "rejected",
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  journalName: string,
  journalSlug: string,
  comments?: string,
  issueId?: string,
  firstPage?: number,
  lastPage?: number
) {
  const supabase = await createServerClient();

  // 1. Authenticate Editor
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized." };

  try {
    const updatePayload: any = { status };

    if (status === "published") {
      updatePayload.published_at = new Date().toISOString();
      if (issueId) updatePayload.issue_id = issueId;
      if (firstPage) updatePayload.first_page = firstPage;
      if (lastPage) updatePayload.last_page = lastPage;
      updatePayload.doi = `10.48309/${articleId.substring(0, 8)}`; // Auto-generate mock DOI prefix
    }

    // 2. Perform database update
    const { error: updateError } = await supabase
      .from("articles")
      .update(updatePayload)
      .eq("id", articleId);

    if (updateError) throw updateError;

    // 3. Send email decision notification via Resend
    if (status === "accepted" || status === "revision_requested" || status === "rejected") {
      await sendEditorialDecision(authorEmail, authorName, articleTitle, journalName, status, comments);
    }

    // 4. Trigger Next.js revalidation
    revalidatePath("/", "layout");
    revalidatePath(`/journal/${journalSlug}`, "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Error updating article status:", err);
    return { success: false, error: err.message || String(err) };
  }
}
