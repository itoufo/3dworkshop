/**
 * ワークショップ予約時の参加同意書（既定の本文）
 *
 * ワークショップ側で consent_text が空のときはこれを表示し、同意チェックを必須にする。
 * 原本: 「AI×3Dプリンター オリジナルフィギュア参加同意書.docx」。紙の署名欄は
 * 予約フォームのチェックで代える文言に置き換えている。
 */
export const DEFAULT_CONSENT_TEXT = `AI×3Dプリンターでオリジナルフィギュアをつくろう 参加同意書
主催：3DLab(株式会社ウォーカー・株式会社sunU)
協力：武藤工業株式会社
本イベントへご参加いただくにあたり、以下の内容をご確認いただき、ご同意のうえお申し込みください。
1．イベントについて
本イベントでは、AIを活用してオリジナルキャラクターをデザインし、3Dプリンターでフィギュアを制作する体験を行います。
参加者および保護者の皆様には、安全で円滑なイベント運営のため、スタッフの指示に従っていただきますようお願いいたします。
2．データ作成について
AIは創作を支援するツールであり、生成される内容が必ずしも正確・適切であるとは限りません。また、AIの判断により、入力された内容であっても生成できない場合があります。 本イベントで制作したキャラクターデザインおよびフィギュアは、参加者個人でお楽しみいただくためのものです。

3．3Dプリンターについて
イベントでは実際に3Dプリンターが稼働します。
安全確保のため、以下の事項をお守りください。
・稼働中の3Dプリンターには触れないでください。
・スタッフの指示に従ってください。
・小学生以下のお子様は、必ず保護者の方と一緒にご参加ください。

4．3Dプリント製品について
・3Dプリント製品の特性上、積層痕（積み重ねた層の跡）や細かな凹凸、個体差、色味・質感に若干の違いが生じる場合がありますが、3Dプリント製法による仕様となりますので、ご了承ください。
・デザインや形状によっては、造形上の制約により細部の表現が変更・簡略化される場合があります。
・3Dプリント製品の特性上、細いパーツや細かな装飾、突起部分は造形後や使用中に外れたり、破損したりする場合があります。これは製法およびデザインの特性によるものであり、あらかじめご了承ください。
・制作物は観賞用です。小さな部品が含まれる場合がありますので、誤飲・窒息等の事故防止のため、小さなお子様の手の届かない場所で保管してください。
・制作物の仕上がりは、3Dプリントの特性上、完全にイメージどおりとなることや、同一品質での製作を保証するものではありません。

5．制作物について
・制作物は、破損防止のため緩衝材を使用し、十分注意のうえ発送いたします。 しかし、3Dプリント製品の特性上、細かな装飾や細いパーツは配送中の衝撃等により破損・脱落する可能性があります。あらかじめご了承ください。
・お申し込み時にご登録いただいた住所へ発送いたします。住所の誤記入、転居等により配達できなかった場合は、ご登録いただいたメールアドレス宛にご連絡いたします。
・当方からのメール送信日より2週間以内にご返信がない場合、制作物はお受け取りの意思がないものと判断し、やむを得ず処分させていただく場合があります。なお、処分後の再制作・再発送はいたしかねますので、あらかじめご了承ください
・制作物お渡し後の破損、紛失、変形等については、主催者は責任を負いかねます。

6．写真・動画の撮影および使用について
本イベントでは、イベントの記録および広報を目的として写真・動画の撮影を行います。 撮影した写真・動画は、以下の媒体で使用する場合があります。
・主催者(3DLab)および協力企業(武藤工業株式会社）のホームページ
・SNS（Instagram、Facebook、X、LINE、YouTube等）
・パンフレット、チラシ、ポスター等の広報物
・イベント報告書・実績資料
・その他、本イベントおよび関連事業の広報・PR活動
写真・動画への掲載を希望されない場合は、受付時またはイベント開始前までにスタッフへお申し出ください。可能な範囲で配慮いたしますが、会場全体を撮影した写真・動画等については、完全に写り込みを避けられない場合がありますので、あらかじめご了承ください。

7．個人情報の取扱いについて
ご提供いただいた個人情報は、本イベントの運営、参加者へのご連絡、お問い合わせへの対応を目的として利用し、法令に基づく場合を除き、ご本人の同意なく第三者へ提供することはありません。

8．免責事項
・イベント中は安全管理に十分配慮いたしますが、参加者ご自身または保護者の監督下における事故、けが、盗難、紛失等については、主催者に故意または重大な過失がある場合を除き、責任を負いかねます。
・天災、災害、交通機関の遅延、機材トラブル、講師の急病、その他やむを得ない事情により、イベント内容の変更または中止となる場合があります。
・イベント中に主催者の故意または重大な過失によらない損害が発生した場合、主催者はその責任を負いかねます。

同意について
予約フォームで「参加同意書の内容を確認し、同意します」にチェックしてお申し込みいただくことで、本同意書の内容に同意したものとします。グループでご参加の場合、予約者（代表者）の同意をもって参加者全員が内容を確認し、同意したものとします。`

/** そのワークショップで表示・記録する同意書の本文 */
export function getConsentText(workshop: { consent_text?: string | null }): string {
  const custom = workshop.consent_text?.trim()
  return custom ? custom : DEFAULT_CONSENT_TEXT
}

/**
 * 上の既定本文の英訳。英語ページ（/en）でワークショップに consent_text_en がないときに使う。
 * ⚠ 英語は consent_text（日本語ページと共用）に入れない。入れると日本語ページの同意書まで英語になる
 * ⚠ 日本語の本文を直したら、こちらも直すこと
 */
export const DEFAULT_CONSENT_TEXT_EN = `Create Your Own 3D Figure with AI × 3D Printer — Participation Agreement
Organizer: 3DLab (Walker Inc. / sunU Inc.)
In cooperation with: MUTOH INDUSTRIES LTD.
Before taking part in this event, please read the following and book only if you agree.

1. About the event
In this event, you design an original character with the help of AI and make it into a figure with a 3D printer.
For a safe and smooth event, we ask all participants and parents or guardians to follow the staff's instructions.

2. About creating the data
AI is a tool that supports creative work, and what it generates is not always accurate or appropriate. The AI may also be unable to generate certain content, even if you enter it. The character designs and figures made at this event are for the participants' personal enjoyment.

3. About the 3D printers
3D printers will be running during the event.
For safety, please observe the following:
・Do not touch a 3D printer while it is running.
・Follow the staff's instructions.
・Children of elementary school age or younger must take part together with a parent or guardian.

4. About 3D-printed items
・Because of how 3D printing works, items may show layer lines (marks from the stacked layers), small bumps, individual differences, and slight variations in color and texture. These are characteristics of the 3D printing process; thank you for your understanding.
・Depending on the design and shape, fine details may be changed or simplified because of printing limitations.
・Because of how 3D printing works, thin parts, fine decorations, and protruding parts may come off or break after printing or during use. This is due to the printing process and the design; thank you for your understanding.
・The items are for display. They may contain small parts, so keep them out of the reach of small children to prevent accidents such as swallowing or choking.
・Because of how 3D printing works, we cannot guarantee that the finished item will look exactly as imagined, or that items will be made to identical quality.

5. About your finished item
・We pack finished items with cushioning to prevent damage and ship them with care. However, because of how 3D printing works, fine decorations and thin parts may break or come off from impacts during shipping. Thank you for your understanding.
・We ship to the address you registered when booking. If an item cannot be delivered because of an incorrect address, a move, or similar reasons, we will contact you at the email address you registered.
・If we do not receive a reply within two weeks of the date we send that email, we will assume you do not wish to receive the item and may have to dispose of it. Please note that we cannot remake or reship an item after it has been disposed of.
・The organizer is not responsible for damage, loss, deformation, or similar issues after the item has been handed over.

6. Photos and videos
We take photos and videos during the event to record it and for publicity. These photos and videos may be used in the following:
・The websites of the organizer (3DLab) and the cooperating company (MUTOH INDUSTRIES LTD.)
・Social media (Instagram, Facebook, X, LINE, YouTube, etc.)
・Promotional materials such as brochures, flyers, and posters
・Event reports and records of past activities
・Other publicity and PR for this event and related activities
If you do not want to appear in photos or videos, please tell the staff at reception or before the event starts. We will accommodate your request as far as possible, but in photos or videos of the whole venue it may not be possible to keep you out of the frame entirely. Thank you for your understanding.

7. Personal information
We use the personal information you provide to run this event, to contact participants, and to respond to inquiries. Except where required by law, we will not provide it to third parties without your consent.

8. Disclaimer
・We take great care with safety during the event. However, except in cases of intent or gross negligence on the part of the organizer, the organizer is not responsible for accidents, injuries, theft, loss, or similar incidents involving participants or occurring under a parent's or guardian's supervision.
・The event may be changed or canceled because of natural disasters, emergencies, transport delays, equipment problems, sudden illness of the instructor, or other unavoidable circumstances.
・The organizer is not responsible for damage that occurs during the event and is not caused by the organizer's intent or gross negligence.

About your agreement
By checking "I have read and agree to the participation agreement" on the booking form and completing your booking, you agree to the contents of this agreement. For group bookings, the agreement of the person making the booking (the representative) means that all participants have read and agreed to its contents.`


/** 英語ページ（/en）で表示・記録する同意書の本文 */
export function getEnglishConsentText(workshop: { consent_text_en?: string | null }): string {
  const custom = workshop.consent_text_en?.trim()
  return custom ? custom : DEFAULT_CONSENT_TEXT_EN
}

/**
 * 表示した言語の同意書。予約フォームの表示とサーバーの記録（consent_text_snapshot）の両方でこれを使い、
 * 見せた本文と記録が必ず一致するようにする
 */
export function getConsentTextFor(
  workshop: { consent_text?: string | null; consent_text_en?: string | null },
  locale: 'ja' | 'en',
): string {
  return locale === 'en' ? getEnglishConsentText(workshop) : getConsentText(workshop)
}
