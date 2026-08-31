import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const TEMP_DIR = path.join(process.cwd(), 'temp', 'event-images')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function downloadImage(url: string): Promise<string> {
  ensureDir(TEMP_DIR)

  const ext = path.extname(new URL(url).pathname) || '.jpg'
  const filename = `img_${Date.now()}${ext}`
  const filepath = path.join(TEMP_DIR, filename)

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve).catch(reject)
          return
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode}`))
        return
      }

      const fileStream = fs.createWriteStream(filepath)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve(filepath)
      })
      fileStream.on('error', reject)
    }).on('error', reject)
  })
}

export function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true })
  }
}
