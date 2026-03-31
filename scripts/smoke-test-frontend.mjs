const routes = [
  '/',
  '/login',
  '/dashboard',
  '/accounts/9c7f35b2-5e36-4524-8deb-d22d939b04c2',
  '/accounts/new',
  '/suporte',
  '/perguntar',
  '/esforco'
]

async function smokeTest() {
  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3000${route}`, {
        headers: {
          // Simulation of a session cookie might be needed if pages are protected
          // but I can at least see if they redirect or return 200/302
        },
        redirect: 'manual'
      })
      console.log(`Route: ${route} | Status: ${res.status} | Location: ${res.headers.get('location') || 'N/A'}`)
    } catch (e) {
      console.error(`Route: ${route} | Error: ${e.message}`)
    }
  }
}

smokeTest()
