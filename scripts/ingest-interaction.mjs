const interactionId = '9df1352e-61a6-4396-9678-fe59d9f8c3af'
const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjM1OTc2ZDQ4LWYwMDUtNDI4ZC1hYjZhLTZlZTUzNjk4YzMxZCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL21na3dhZWp4YXp3d2V2YmxxeWNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjMWNmYmYxOS04ZmJmLTQzNDQtODA5My0zZTAzMTM1ZjIzNWYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc0OTc3MzIxLCJpYXQiOjE3NzQ5NzM3MjEsImVtYWlsIjoidGVzdEBwbGFubmVyYS5jb20uYnIiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3NDk3MzcyMX1dLCJzZXNzaW9uX2lkIjoiOTBmNTQyMDctYjBkMS00OTU4LWI1NDktYmJiOTk4NTAyN2Q3IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.8XNmLWzRlaJdaKl4YeMG8pzn9XUIlCEy9pNyx6Hqocidi6QqCZnh9j2eAVrcP-duzq-PZUSnU5fUEUezRtYoLA'

async function ingest() {
  console.log(`Ingerindo interação ${interactionId}...`)
  const response = await fetch(`http://localhost:3000/api/interactions/${interactionId}/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const data = await response.json()
  console.log(JSON.stringify(data, null, 2))
}

ingest()
