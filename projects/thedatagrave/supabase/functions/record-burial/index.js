import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// read your secrets as before
const supabaseUrl      = Deno.env.get("SITEURL");
const serviceRoleKey   = Deno.env.get("SERVICE_ROLE_KEY");
const recaptchaSecret  = Deno.env.get("RECAPTCHA_SECRET_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  // 1️⃣ Build CORS headers based on incoming Origin (or use '*' if you prefer)
  const origin = req.headers.get('Origin') || '*';
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 2️⃣ Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 3️⃣ Your normal logic
  try {
    const { name, method, epitaph, country, token } = await req.json();

    // Verify reCAPTCHA
    const verify = await fetch(
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
    const { success, score } = await verify.json();
    if (!success || score < 0.5) {
      return new Response(
        JSON.stringify({ error: "Failed reCAPTCHA" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Insert into burials
    const { data, error } = await supabase
      .from("burials")
      .insert([{ name, method, epitaph, country, timestamp: new Date().toISOString() }]);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
