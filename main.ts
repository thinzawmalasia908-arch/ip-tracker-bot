// main.ts

// 👇 ဒီမှာ သင့် Telegram Link ကို ထည့်ပါ
const TELEGRAM_LINK = "https://t.me/ZhostTech"; 

// Deno KV ကို ဖွင့်မယ် (IP တွေကို သိမ်းထားဖို့)
const kv = await Deno.openKv();

Deno.serve(async (req: Request, info: Deno.ServeHandlerInfo) => {
  const url = new URL(req.url);

  // ၁။ ပင်မလမ်းကြောင်း (Link နှိပ်လိုက်ရင် ဒီကို ရောက်မယ်)
  if (url.pathname === "/" || url.pathname === "/go") {
    // IP ကို ရှာမယ်
    let clientIp = req.headers.get("cf-connecting-ip") || 
                   req.headers.get("x-forwarded-for") || 
                   info.remoteAddr.hostname;
    
    if (clientIp && clientIp.includes(",")) {
      clientIp = clientIp.split(",")[0].trim();
    }

    const timestamp = new Date().toISOString();
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // Deno KV ထဲမှာ မှတ်တမ်းတင်မယ်
    await kv.set(["ips", timestamp], { 
      ip: clientIp, 
      userAgent: userAgent,
      ref: req.headers.get("referer") || "Direct"
    });

    // Telegram ဆီ Redirect လုပ်မယ်
    return Response.redirect(TELEGRAM_LINK, 302);
  }

  // ၂။ ရလဒ်ကြည့်ဖို့ လျှို့ဝှက် Admin Page
  // 👇 "admin-secret-123" နေရာမှာ သင့်စိတ်ကြိုက် လျှို့ဝှက်နာမည် ပြောင်းပါ
  if (url.pathname === "/admin-secret-123") { 
    const entries = kv.list({ prefix: ["ips"] });
    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>IP Logs</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f4f4f9; }
          table { width: 100%; border-collapse: collapse; background: white; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #007bff; color: white; }
          tr:nth-child(even) { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>📋 ဝင်ရောက်ကြည့်ရှုသူများ၏ IP မှတ်တမ်း</h1>
        <table>
          <tr><th>အချိန်</th><th>IP Address</th><th>Browser/Device</th><th>လာသည့်လမ်း</th></tr>
    `;
    
    for await (const entry of entries) {
      html += `
        <tr>
          <td>${entry.key[1]}</td>
          <td><strong>${entry.value.ip}</strong></td>
          <td>${entry.value.userAgent}</td>
          <td>${entry.value.ref}</td>
        </tr>
      `;
    }
    
    html += `</table></body></html>`;
    
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response("Not Found", { status: 404 });
});