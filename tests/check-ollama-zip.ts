async function checkURL() {
  const url = 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip'
  const res = await fetch(url, { method: 'HEAD' })
  console.log(`URL Status: ${res.status}`)
  console.log(`Location: ${res.headers.get('location') || url}`)
}
checkURL()
