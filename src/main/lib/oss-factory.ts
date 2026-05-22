import OSS from 'ali-oss'
import http from 'http'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { Account } from './accounts'

const clients = new Map<string, OSS>()

interface ProxyAgents {
  agent: http.Agent
  httpsAgent: https.Agent
}

// HttpsProxyAgent / SocksProxyAgent only use constructor options for the
// connection to the proxy itself. The TLS handshake to the *target* uses
// the request opts that node-core passes into `connect()`. To skip target
// cert verification we must inject rejectUnauthorized:false there.
class InsecureHttpsProxyAgent extends HttpsProxyAgent<string> {
  async connect(req: any, opts: any) {
    return super.connect(req, { ...opts, rejectUnauthorized: false })
  }
}
class InsecureSocksProxyAgent extends SocksProxyAgent {
  async connect(req: any, opts: any) {
    return super.connect(req, { ...opts, rejectUnauthorized: false })
  }
}

function makeAgents(proxyUrl: string, insecureTLS: boolean): ProxyAgents {
  const url = new URL(proxyUrl)
  if (url.protocol.startsWith('socks')) {
    const socks = insecureTLS ? new InsecureSocksProxyAgent(proxyUrl) : new SocksProxyAgent(proxyUrl)
    return { agent: socks as unknown as http.Agent, httpsAgent: socks as unknown as https.Agent }
  }
  return {
    agent: new HttpProxyAgent(proxyUrl) as unknown as http.Agent,
    httpsAgent: (insecureTLS
      ? new InsecureHttpsProxyAgent(proxyUrl)
      : new HttpsProxyAgent(proxyUrl)) as unknown as https.Agent
  }
}

export function getClient(account: Account): OSS {
  const cached = clients.get(account.id)
  if (cached) return cached

  const opts: OSS.Options & { httpsAgent?: https.Agent; secure?: boolean } = {
    accessKeyId: account.accessKeyId,
    accessKeySecret: account.accessKeySecret,
    region: account.region,
    endpoint: account.cname || account.endpoint || undefined,
    cname: !!account.cname,
    secure: true,
    timeout: 60000
  }

  const insecureTLS = !!account.insecureTLS
  if (account.proxy) {
    const { agent, httpsAgent } = makeAgents(account.proxy, insecureTLS)
    opts.agent = agent
    opts.httpsAgent = httpsAgent
  } else if (insecureTLS) {
    opts.httpsAgent = new https.Agent({ rejectUnauthorized: false })
  }

  const client = new OSS(opts)
  clients.set(account.id, client)
  return client
}

export function invalidateClient(accountId: string): void {
  clients.delete(accountId)
}
