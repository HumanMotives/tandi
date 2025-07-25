// supabase/functions/record-burial/index.js

// 1️⃣ Read your dashboard‐configured secrets
const supabaseUrl      = Deno.env.get("SITEURL");
const serviceRoleKey   = Deno.env.get("SERVICE_ROLE_KEY");
const recaptchaSecret  = Deno.env.get("RECAPTCHA_SECRET_KEY");

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 2️⃣ Initialize Supabase (service‑role version)
const supabase = createClient(supabaseUrl, serviceRoleKey);

// 3️⃣ Your function
serve(async (req) => {
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
        { status: 403 }
      );
    }

    // Insert into your table
    const { data, error } = await supabase
      .from("burials")
      .insert([{ name, method, epitaph, country, timestamp: new Date().toISOString() }]);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
