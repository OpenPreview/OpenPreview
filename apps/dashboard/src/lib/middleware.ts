import type { Database } from "@openpreview/supabase";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // if (process.env.NODE_ENV === "production" && user.email) {
    //   // Check if user's notification permissions exist in Supabase
    //   const { data: permissionData, error: permissionError } = await supabase
    //     .from("notification_permissions")
    //     .select("*")
    //     .eq("user_id", user.id)
    //     .single();

    //   if (permissionError && permissionError.code !== "PGRST116") {
    //     console.error(
    //       "Error fetching notification permissions from Supabase:",
    //       permissionError
    //     );
    //   } else if (!permissionData) {
    //     // User's notification permissions don't exist, create a contact in Resend
    //     const resend = new Resend(process.env.RESEND_API_KEY);
    //     try {
    //       const newContact = await resend.contacts.create({
    //         audienceId: process.env.RESEND_AUDIENCE_ID!,
    //         email: user.email,
    //         firstName: user.user_metadata?.first_name,
    //         lastName: user.user_metadata?.last_name,
    //       });

    //       if (newContact.data) {
    //         // Create a new record in notification_permissions
    //         const { error: insertError } = await supabase
    //           .from("notification_permissions")
    //           .insert({
    //             resend_id: newContact.data.id,
    //             user_id: user.id,
    //             email_notifications: false,
    //           });

    //         if (insertError) {
    //           console.error(
    //             "Error inserting notification permissions in Supabase:",
    //             insertError
    //           );
    //         }
    //       }
    //     } catch (error) {
    //       console.error("Error creating contact in Resend:", error);
    //     }
    //   }
    // }

  }

  // Add x-pathname to the response headers
  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);

  return supabaseResponse;
}
