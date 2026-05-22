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

function makeAgents(proxyUrl: string): ProxyAgents {
  const url = new URL(proxyUrl)
  if (url.protocol.startsWith('socks')) {
    const socks = new SocksProxyAgent(proxyUrl)
    return { agent: socks as unknown as http.Agent, httpsAgent: socks as unknown as https.Agent }
  }
  return {
    agent: new HttpProxyAgent(proxyUrl) as unknown as http.Agent,
    httpsAgent: new HttpsProxyAgent(proxyUrl) as unknown as https.Agent
  }
}

export function getClient(account: Account): OSS {
  const cached = clients.get(account.id)
  if (cached) return cached

  const opts: OSS.Options & { httpsAgent?: https.Agent } = {
    accessKeyId: account.accessKeyId,
    accessKeySecret: account.accessKeySecret,
    region: account.region,
    endpoint: account.cname || account.endpoint || undefined,
    cname: !!account.cname,
    timeout: 60000
  }

  if (account.proxy) {
    const { agent, httpsAgent } = makeAgents(account.proxy)
    opts.agent = agent
    opts.httpsAgent = httpsAgent
  }

  const client = new OSS(opts)
  clients.set(account.id, client)
  return client
}

export function invalidateClient(accountId: string): void {
  clients.delete(accountId)
}
