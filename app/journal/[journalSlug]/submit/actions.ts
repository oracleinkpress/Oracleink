"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getJournalBySlug } from "@/lib/tenant";
import { sendSubmissionConfirmation } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitManuscript(token: string | null, formData: FormData) {
  const supabase = await createServerClient(token);
  
  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);
  if (authError || !user) {
    return { success: false, error: "You must be logged in to submit a manuscript." };
  }

  // 2. Extract journal info
  const journalSlug = formData.get("journalSlug") as string;
  const journal = await getJournalBySlug(journalSlug);
  if (!journal) {
    return { success: false, error: "Journal not found." };
  }

  try {
    // 3. Handle PDF Upload
    const pdfFile = formData.get("pdf") as File;
    if (!pdfFile || pdfFile.size === 0) {
      return { success: false, error: "Please upload a valid PDF manuscript." };
    }

    if (pdfFile.size > 20 * 1024 * 1024) {
      return { success: false, error: "File size exceeds the 20MB limit." };
    }

    const fileBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const fileExt = pdfFile.name.split(".").pop();
    const fileName = `${journal.id}/${user.id}-${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("manuscripts")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("manuscripts")
      .getPublicUrl(fileName);

    // 4. Insert Article details
    const title = formData.get("title") as string;
    const abstract = formData.get("abstract") as string;
    const keywordsRaw = formData.get("keywords") as string;
    const keywords = keywordsRaw 
      ? keywordsRaw.split(",").map(k => k.trim()).filter(k => k.length > 0)
      : [];
    
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const { data: article, error: articleError } = await supabase
      .from("articles")
      .insert({
        journal_id: journal.id,
        title,
        abstract,
        keywords,
        slug,
        pdf_url: publicUrl,
        submitted_by: user.id,
        status: "submitted"
      })
      .select("id")
      .single();

    if (articleError) {
      throw new Error(`Article creation error: ${articleError.message}`);
    }

    // 5. Insert Authors & Link them
    const authorNames = formData.getAll("authorName[]") as string[];
    const authorEmails = formData.getAll("authorEmail[]") as string[];
    const authorAffiliations = formData.getAll("authorAffiliation[]") as string[];
    const authorOrcids = formData.getAll("authorOrcid[]") as string[];
    const correspondingIndex = parseInt(formData.get("correspondingAuthorIndex") as string || "0");

    for (let i = 0; i < authorNames.length; i++) {
      if (!authorNames[i]) continue;

      // Find or insert author
      let authorId = "";
      const { data: existingAuthor } = await supabase
        .from("authors")
        .select("id")
        .eq("email", authorEmails[i])
        .maybeSingle();

      if (existingAuthor) {
        authorId = existingAuthor.id;
      } else {
        const { data: newAuthor, error: newAuthorError } = await supabase
          .from("authors")
          .insert({
            full_name: authorNames[i],
            email: authorEmails[i],
            affiliation: authorAffiliations[i],
            orcid: authorOrcids[i]
          })
          .select("id")
          .single();

        if (newAuthorError) throw newAuthorError;
        authorId = newAuthor.id;
      }

      // Link article to author
      const { error: linkError } = await supabase
        .from("article_authors")
        .insert({
          article_id: article.id,
          author_id: authorId,
          author_order: i + 1,
          is_corresponding: i === correspondingIndex
        });

      if (linkError) throw linkError;
    }

    // 6. Trigger Email Confirmation
    await sendSubmissionConfirmation(
      user.email || authorEmails[0],
      authorNames[0] || user.email || "Author",
      title,
      journal.name
    );

    revalidatePath("/journal/[journalSlug]", "layout");
    
  } catch (err: any) {
    console.error("Submission action error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }

  // Redirect on success
  redirect("/dashboard/author");
}
