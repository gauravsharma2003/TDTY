export function GET() {
  return new Response("google-site-verification: google640188ec36492a10.html", {
    headers: { "Content-Type": "text/html" },
  });
}
