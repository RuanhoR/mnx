import { createServer } from 'http'
import ResponseFrame from './framework'
import { RegisterRoutes } from './routes'

const PORT = parseInt(process.env.PORT || '3000', 10)

async function handleRequest(req: import('http').IncomingMessage, res: import('http').ServerResponse) {
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString()
    const urlStr = req.url || '/'
    const host = req.headers.host || 'localhost'
    const url = new URL(urlStr, `http://${host}`)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
    }
    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') ? body : undefined
    })
    const frame = new ResponseFrame(request)
    RegisterRoutes(frame)
    const response = await frame.handlerRequest()
    const respHeaders: Record<string, string | string[]> = {}
    response.headers.forEach((v, k) => { respHeaders[k] = v })
    res.writeHead(response.status, respHeaders)
    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  })
}

const server = createServer(handleRequest)
server.listen(PORT, () => {
  console.log(`PMNX Server running on http://localhost:${PORT}`)
})
