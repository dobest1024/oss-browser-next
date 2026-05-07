import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY = crypto.scryptSync('oss-browser-next-key', 'salt', 32)
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
