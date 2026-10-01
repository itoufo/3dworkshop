/**
 * 英語ページのアクセス案内（湯島の教室）。
 * 住所・駅からの徒歩分数は日本語ページ（components/WorkshopDetailView.tsx のアクセス欄）と同じ内容。
 * 地図の埋め込みも同じものを使う。
 */
export const EN_ADDRESS_LINES = ['5F, Kada Yushima Building', '3-14-8 Yushima, Bunkyo-ku', 'Tokyo 113-0034, Japan']

export const EN_STATIONS: { icon: string; text: string }[] = [
  { icon: '🚇', text: 'Yushima Station (Tokyo Metro Chiyoda Line), Exit 3 — 1 min walk' },
  { icon: '🚃', text: 'JR Okachimachi Station, South Exit — 8 min walk' },
  { icon: '🚇', text: 'JR Akihabara Station, Electric Town Exit — 10 min walk' },
  { icon: '🚉', text: 'Ochanomizu Station (Marunouchi Line), Hijiribashi Exit — 12 min walk' },
]

export default function EnglishAccess({ headingLevel = 'h2' }: { headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <Heading className={headingLevel === 'h2' ? 'text-3xl md:text-4xl font-bold text-gray-900 mb-6' : 'text-xl font-bold text-gray-900 mb-6'}>
        Access
      </Heading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl overflow-hidden shadow-md h-64 lg:h-full lg:min-h-[18rem]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.0302599999997!2d139.7671258!3d35.7051736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188ea6490c7a0b%3A0xf7e6918f7f01c837!2z5qCq5byP5Lya56S-44Km44Kp44O844Kr44O8!5e0!3m2!1sen!2sjp!4v1736922000000!5m2!1sen!2sjp"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Map of 3DLab"
          />
        </div>
        <div>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="font-bold text-gray-900 mb-2">📍 3DLab</p>
            <address className="not-italic text-base text-gray-700">
              {EN_ADDRESS_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </address>
            <p className="mt-3 text-base text-gray-600">
              For maps and taxis: <span lang="ja">〒113-0034 東京都文京区湯島3-14-8 加田湯島ビル 5F</span>
            </p>
          </div>
          <ul className="space-y-2">
            {EN_STATIONS.map((s) => (
              <li key={s.text} className="flex items-start gap-2 text-base text-gray-700">
                <span aria-hidden>{s.icon}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
