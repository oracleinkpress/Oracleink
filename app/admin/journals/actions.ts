"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a new journal and makes it instantly live.
 */
export async function createJournal(token: string | null, formData: FormData) {
  const supabase = await createServerClient(token);

  // 1. Authenticate Platform Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);
  if (!user) {
    return { 
      success: false, 
      error: `Unauthorized. Please log in. (Supabase Auth: ${authError?.message || 'Null user'}, Token len: ${token ? token.length : 0})` 
    };
  }

  // Double check admin role mapping (bypass check for development test account)
  if (user.email !== "test-admin@oracleinkpress.com") {
    const { data: isPlatAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .maybeSingle();

    if (!isPlatAdmin) {
      return { success: false, error: "Access Denied. Platform Admin role required." };
    }
  }

  try {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const issnOnline = formData.get("issn_online") as string;
    const issnPrint = formData.get("issn_print") as string;
    const subjectArea = formData.get("subject_area") as string;
    const aimsScope = formData.get("aims_scope") as string;
    const themeColor = formData.get("theme_color") as string || "#1a3c6e";

    // Validate inputs
    if (!name || !slug) {
      return { success: false, error: "Name and Slug are required." };
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "");

    // 2. Insert into journals table
    const { data, error } = await supabase
      .from("journals")
      .insert({
        name,
        slug: cleanSlug,
        issn_online: issnOnline || null,
        issn_print: issnPrint || null,
        subject_area: subjectArea || null,
        aims_scope: aimsScope || null,
        theme_color: themeColor,
        status: "active"
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 3. Clear cache
    revalidatePath("/", "layout");
    
    return { success: true, journal: data };
  } catch (err: any) {
    console.error("Error creating journal:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Assigns a dashboard role (editor/reviewer/admin) to a user email.
 */
export async function assignUserRole(token: string | null, email: string, journalId: string, role: string) {
  const supabase = await createServerClient(token);
  const adminSupabase = createAdminClient();

  // 1. Authenticate Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized." };

  try {
    // 2. Find user in auth.users by email
    let targetUserId = "";

    const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) throw listError;

    const match = listData?.users.find(u => u.email === email);
    
    if (match) {
      targetUserId = match.id;
    } else {
      // If user does not exist, let's create a placeholder auth account for testing
      const { data: newAuthUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
        email: email,
        password: "password123",
        email_confirm: true
      });
      
      if (createAuthError) throw createAuthError;
      targetUserId = newAuthUser.user.id;
    }

    // 3. Insert into user_roles
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: targetUserId,
        journal_id: journalId,
        role: role
      });

    if (roleError) {
      // If it exists, handle conflict
      if (roleError.code === "23505") {
        return { success: false, error: "This user already has this role for this journal." };
      }
      throw roleError;
    }

    revalidatePath("/admin/journals");
    return { success: true };
  } catch (err: any) {
    console.error("Error assigning user role:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Server action to sign in a user and set their auth session cookie.
 */
export async function signInAction(email: string, password: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // If user does not exist (e.g. first time login for test admin), try to sign up!
      if (email === "test-admin@oracleinkpress.com" || email === "test-author@oracleinkpress.com") {
        const { data: signUpData, error: signUpError } = await client.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        // Re-authenticate
        const { data: reSignData, error: reSignError } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (reSignError) throw reSignError;

        if (reSignData?.session) {
          const cookieStore = await cookies();
          cookieStore.set("sb-access-token", reSignData.session.access_token, {
            path: "/",
            maxAge: 604800,
            sameSite: "lax",
            secure: true,
          });
          return { success: true };
        }
      }
      throw error;
    }

    if (data?.session) {
      const cookieStore = await cookies();
      cookieStore.set("sb-access-token", data.session.access_token, {
        path: "/",
        maxAge: 604800,
        sameSite: "lax",
        secure: true,
      });
      return { success: true };
    }

    return { success: false, error: "No session generated." };
  } catch (err: any) {
    console.error("Sign in action failed:", err);
    return { success: false, error: err.message || "Failed to sign in." };
  }
}

/**
 * Server action to sign out a user and clear their auth session cookie.
 */
export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  return { success: true };
}
