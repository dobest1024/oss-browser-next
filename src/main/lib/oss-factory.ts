import OSS from 'ali-oss'
import http from 'http'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { Account } from './accounts'

const clients = new Map<string, OSS>()

function makeAgent(proxyUrl: string, secure: boolean) {
  const url = new URL(proxyUrl)
  if (url.protocol.startsWith('socks')) {
    return new SocksProxyAgent(proxyUrl)
  }
  const AgentClass = secure ? https.Agent : http.Agent
  return new AgentClass({ host: url.hostname, port: Number(url.port) })
}

export function getClient(account: Account): OSS {
  const cached = clients.get(account.id)
  if (cached) return cached

  const opts: OSS.Options = {
    accessKeyId: account.accessKeyId,
    accessKeySecret: account.accessKeySecret,
    region: account.region,
    endpoint: account.cname || account.endpoint || undefined,
    cname: !!account.cname,
    timeout: 60000
  }

  if (account.proxy) {
    opts.agent = makeAgent(account.proxy, false) as unknown as http.Agent
  }

  const client = new OSS(opts)
  clients.set(account.id, client)
  return client
}

export function invalidateClient(accountId: string): void {
  clients.delete(accountId)
}
