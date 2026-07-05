import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed the `middleware` convention to `proxy`.
// See: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // /api/* routes do their own auth check (requireOwner/requireClinicRole) and
  // must return JSON on failure, not a redirect — this block only exists so
  // that calling auth.getUser() above refreshes the session and persists the
  // renewed cookies (via setAll) onto the response before the route handler
  // reads them. Without this, API routes never pass through proxy.ts (the
  // matcher used to exclude /api entirely) and could see a stale/expired
  // access token even though page navigations kept the session alive.
  if (path.startsWith("/api")) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role, clinic_id")
    .eq("auth_id", user.id)
    .single();

  // /admin/* requires role=owner
  if (path.startsWith("/admin") && platformUser?.role !== "owner") {
    return NextResponse.redirect(
      new URL(`/clinic/${platformUser?.clinic_id ?? ""}`, request.url)
    );
  }

  // /clinic/[id]/* requires matching clinic_id or owner
  if (path.startsWith("/clinic") && platformUser?.role !== "owner") {
    const clinicId = path.split("/")[2];
    if (clinicId !== platformUser?.clinic_id) {
      return NextResponse.redirect(
        new URL(`/clinic/${platformUser?.clinic_id ?? ""}`, request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/clinic/:path*", "/api/:path*"],
};
