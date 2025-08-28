'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>
            
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <p className="text-gray-600 mb-4">
                  この利用規約（以下、「本規約」といいます。）は、株式会社sunU（以下、「当社」といいます。）が運営する3Dプリンタ教室「3DLab」（以下、「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下、「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  制定日：2024年1月1日<br />
                  最終改定日：2024年3月28日
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第1条（適用）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。</li>
                  <li>当社は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下、「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。</li>
                  <li>本規約の規定が前条の個別規定の規定と矛盾する場合には、個別規定において特段の定めなき限り、個別規定の規定が優先されるものとします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第2条（利用登録）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。</li>
                  <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
                    <ul className="list-disc list-inside ml-4 mt-2">
                      <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                      <li>本規約に違反したことがある者からの申請である場合</li>
                      <li>その他、当社が利用登録を相当でないと判断した場合</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第3条（サービス内容）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>本サービスは、3Dプリンティング技術の教育、ワークショップの開催、および関連する教材・サービスの提供を行います。</li>
                  <li>本サービスの具体的な内容は、当社ウェブサイト上に掲載するものとします。</li>
                  <li>当社は、ユーザーに事前通知することなく、本サービスの内容を変更することができるものとします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第4条（料金および支払方法）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>ユーザーは、本サービスの利用にあたり、当社が別途定め、ウェブサイトに表示する利用料金を支払うものとします。</li>
                  <li>ユーザーが利用料金の支払を遅滞した場合には、ユーザーは年14.6％の割合による遅延損害金を支払うものとします。</li>
                  <li>スクール会員の月謝は、自動引き落としによるものとし、毎月所定の日に翌月分の月謝が引き落とされるものとします。</li>
                  <li>一度お支払いいただいた料金は、当社の責めに帰すべき事由がある場合を除き、返金いたしません。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第5条（キャンセルポリシー）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>ワークショップのキャンセルは、開催日の3日前までに連絡いただいた場合、全額返金いたします。</li>
                  <li>開催日の2日前から前日のキャンセルは、料金の50％を返金いたします。</li>
                  <li>開催日当日のキャンセル、または無断欠席の場合、返金はいたしません。</li>
                  <li>スクール会員の退会は、退会希望月の前月15日までにお申し出ください。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第6条（禁止事項）</h2>
                <p className="text-gray-700 mb-2">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>当社、本サービスの他のユーザー、または第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                  <li>当社のサービスの運営を妨害するおそれのある行為</li>
                  <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                  <li>不正アクセスをし、またはこれを試みる行為</li>
                  <li>他のユーザーに成りすます行為</li>
                  <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                  <li>当社、本サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
                  <li>その他、当社が不適切と判断する行為</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第7条（本サービスの提供の停止等）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                    <ul className="list-disc list-inside ml-4 mt-2">
                      <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                      <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                      <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                      <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                    </ul>
                  </li>
                  <li>当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第8条（著作権）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報に関してのみ、本サービスを利用し、投稿ないしアップロードすることができるものとします。</li>
                  <li>ユーザーが本サービスを利用して投稿ないしアップロードした文章、画像、映像等の著作権については、当該ユーザーその他既存の権利者に留保されるものとします。</li>
                  <li>当社が提供する教材、カリキュラム、その他のコンテンツの著作権は当社に帰属し、ユーザーは個人的な学習目的以外での使用、複製、配布を行ってはなりません。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第9条（免責事項）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを保証するものではありません。</li>
                  <li>当社は、本サービスによってユーザーに生じたあらゆる損害について、当社の故意又は重過失による場合を除き、一切の責任を負いません。</li>
                  <li>前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます。）による不法行為によりユーザーに生じた損害のうち特別な事情から生じた損害（当社またはユーザーが損害発生につき予見し、または予見し得た場合を含みます。）について一切の責任を負いません。</li>
                  <li>当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第10条（サービス内容の変更等）</h2>
                <p className="text-gray-700">
                  当社は、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することができるものとし、ユーザーはこれを承諾するものとします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第11条（利用規約の変更）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>当社は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
                    <ul className="list-disc list-inside ml-4 mt-2">
                      <li>本規約の変更がユーザーの一般の利益に適合するとき</li>
                      <li>本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき</li>
                    </ul>
                  </li>
                  <li>当社はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を通知します。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第12条（個人情報の取扱い）</h2>
                <p className="text-gray-700">
                  当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第13条（通知または連絡）</h2>
                <p className="text-gray-700">
                  ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第14条（準拠法・裁判管轄）</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                  <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">第15条（事業者情報）</h2>
                <div className="bg-gray-50 rounded-lg p-6 text-gray-700">
                  <p className="font-semibold mb-2">運営会社</p>
                  <p>株式会社sunU</p>
                  <p className="mt-3 font-semibold mb-2">代表取締役</p>
                  <p>伊東優</p>
                  <p className="mt-3 font-semibold mb-2">お問い合わせ</p>
                  <p>メール：y-sato@sunu25.com</p>
                  <p>電話：080-9453-0911</p>
                </div>
              </section>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-center text-gray-600">
                  <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                    プライバシーポリシーはこちら
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}