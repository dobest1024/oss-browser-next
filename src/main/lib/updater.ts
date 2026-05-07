import { net } from 'electron'
import { app } from 'electron'
import pkg from '../../../package.json'

// Update this to your GitHub repo (owner/repo)
const REPO = pkg.repository?.replace(/^https:\/\/github\.com\//, '') ?? ''

export interface ReleaseInfo {
  version: string
  url: string
  publishedAt: string
  body: string
}

export async function checkForUpdate(): Promise<ReleaseInfo | null> {
  if (!REPO) return null
  const current = app.getVersion()
  return new Promise((resolve) => {
    const request = net.request({
      url: `https://api.github.com/repos/${REPO}/releases/latest`,
      method: 'GET'
    })
    request.setHeader('User-Agent', `oss-browser-next/${current}`)
    request.setHeader('Accept', 'application/vnd.github.v3+json')

    let body = ''
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString() })
      response.on('end', () => {
        try {
          const release = JSON.parse(body)
          const latest = (release.tag_name as string).replace(/^v/, '')
          if (isNewerVersion(latest, current)) {
            resolve({
              version: latest,
              url: release.html_url,
              publishedAt: release.published_at,
              body: release.body || ''
            })
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      })
    })
    request.on('error', () => resolve(null))
    request.end()
  })
}

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [la, lb, lc] = parse(latest)
  const [ca, cb, cc] = parse(current)
  if (la !== ca) return la > ca
  if (lb !== cb) return lb > cb
  return lc > cc
}
