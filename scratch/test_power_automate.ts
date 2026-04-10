async function test() {
  const url = "https://defaultf3eedc7b7dd742b3a805865afbe2da.b7.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/051bab82e2a54ff19f3559914040a96f/triggers/manual/paths/invoke?api-version=1";
  try {
    console.log("Testing Power Automate URL...");
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response:", text.substring(0, 500));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
