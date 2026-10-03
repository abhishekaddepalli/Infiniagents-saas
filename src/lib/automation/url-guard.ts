import dns from 'dns/promises'
import net from 'net'

/**
 * SSRF protection for the HTTP Request node.
 *
 * Without this, a user could point a workflow at http://169.254.169.254 or at
 * an internal service and read data the server can reach but they cannot.
 * We allow only http/https on public IP addresses.
 */
function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // cloud metadata endpoints
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    return false
  }
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
  if (lower.startsWith('fe80')) return true // link local
  // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateAddress(mapped[1])
  return false
}

export async function isSafeOutboundUrl(raw: string): Promise<{ ok: boolean; reason: string }> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'the URL is not valid. Include the full address, e.g. https://api.example.com.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'only http:// and https:// URLs are allowed.' }
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { ok: false, reason: 'requests to internal hostnames are not allowed.' }
  }

  // Resolve the hostname and reject if any address is private.
  let addresses: string[]
  if (net.isIP(host)) {
    addresses = [host]
  } else {
    try {
      const records = await dns.lookup(host, { all: true })
      addresses = records.map((record) => record.address)
    } catch {
      return { ok: false, reason: 'the hostname could not be resolved.' }
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    return { ok: false, reason: 'requests to private or internal network addresses are not allowed.' }
  }

  return { ok: true, reason: '' }
}
