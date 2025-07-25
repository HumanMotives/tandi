// supabase/functions/record-burial/index.js

// 1️⃣ Read your Dashboard‑configured secrets
const supabaseUrl      = Deno.env.get("SITEURL");
const serviceRoleKey   = Deno.env.get("SERVICE_ROLE_KEY");
const recaptchaSecret  = Deno.env.get("RECAPTCHA_SECRET_KEY");

// 2️⃣ Import Supabase & HTTP server helper
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 3️⃣ Initialize a service‐role Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey);

// 4️⃣ Start the Edge Function server
serve(async (req) => {
  // ─── CORS headers (very permissive for testing) ────────────────────────
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // ─── Handle preflight OPTIONS ─────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // ─── Handle the actual POST ──────────────────────────────────────────
  try {
    // Parse incoming JSON payload
    const { name, method, epitaph, country, token } = await req.json();

    // 1) Verify reCAPTCHA with Google
    const verifyRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: recaptchaSecret,
          response: token,
        }),
      }
    );
    const { success, score } = await verifyRes.json();
    if (!success || score < 0.5) {
      return new Response(
        JSON.stringify({ error: "Failed reCAPTCHA verification" }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // 2) Insert the burial record into Supabase
    const { data, error } = await supabase
      .from("burials")
      .insert([
        {
          name,
          method,
          epitaph,
          country,
          timestamp: new Date().toISOString(),
        },
      ]);

    if (error) throw error;

    // 3) Return success
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (err) {
    console.error("Error in record-burial function:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
