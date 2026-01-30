interface StructuredDataProps {
  data: Record<string, unknown>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ワークショップ用のEvent構造化データ
export function WorkshopEventSchema(workshop: {
  id: string;
  title: string;
  description: string;
  price: number;
  event_date?: string | null;
  event_time?: string | null;
  duration?: number;
  location?: string | null;
  image_url?: string | null;
  max_participants?: number;
}) {
  const startDate = workshop.event_date 
    ? `${workshop.event_date}${workshop.event_time ? `T${workshop.event_time}` : 'T10:00:00'}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": workshop.title,
    "description": workshop.description,
    "startDate": startDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": workshop.location || "3DLab",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "文京区",
        "addressRegion": "東京都",
        "postalCode": "113-0034",
        "addressCountry": "JP",
        "streetAddress": "湯島3-14-8 加田湯島ビル 5F"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "35.7051736",
        "longitude": "139.7697007"
      }
    },
    "image": workshop.image_url ? `https://3dlab.jp${workshop.image_url}` : "https://3dlab.jp/og-image.jpg",
    "offers": {
      "@type": "Offer",
      "url": `https://3dlab.jp/workshops/${workshop.id}`,
      "price": workshop.price,
      "priceCurrency": "JPY",
      "availability": "https://schema.org/InStock",
      "validFrom": new Date().toISOString()
    },
    "organizer": {
      "@type": "Organization",
      "name": "3DLab - 3Dプリンタ教室",
      "url": "https://3dlab.jp"
    },
    "maximumAttendeeCapacity": workshop.max_participants || 10
  };
}

// スクール用のCourse構造化データ
export function SchoolCourseSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "AI×3Dプリンタ教室",
    "description": "東京都文京区湯島のAI×3Dプリンタ教室。自由創作クラス・基本実践クラスの2つのコースをご用意。",
    "provider": {
      "@type": "Organization",
      "name": "3DLab - 3Dプリンタ教室",
      "url": "https://3dlab.jp",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "文京区",
        "addressRegion": "東京都",
        "postalCode": "113-0034",
        "addressCountry": "JP",
        "streetAddress": "湯島3-14-8 加田湯島ビル 5F"
      }
    },
    "courseCode": "3DLAB-SCHOOL",
    "educationalLevel": "Beginner",
    "teaches": [
      "3Dプリンタ",
      "3Dモデリング",
      "AI活用",
      "プログラミング"
    ],
    "coursePrerequisites": "特になし（初心者歓迎）",
    "offers": [
      {
        "@type": "Offer",
        "name": "自由創作クラス",
        "price": "17000",
        "priceCurrency": "JPY",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        "name": "基本実践クラス",
        "price": "30000",
        "priceCurrency": "JPY",
        "availability": "https://schema.org/InStock"
      }
    ]
  };
}

// HTMLコンテンツから見出し（h2, h3）を抽出してTOC構造を生成
function extractHeadings(html: string): Array<{ text: string; level: number }> {
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const headings: Array<{ text: string; level: number }> = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) {
      headings.push({ text, level: parseInt(match[1], 10) });
    }
  }
  return headings;
}

// ブログ記事用のArticle構造化データ
export function BlogArticleSchema(article: {
  title: string;
  slug?: string;
  description?: string;
  excerpt?: string;
  content?: string;
  published_at: string;
  updated_at?: string;
  author_name?: string;
  featured_image_url?: string;
  category?: string;
  tags?: string[];
}) {
  const description = article.excerpt || article.description || '';
  const articleUrl = article.slug
    ? `https://3dlab.jp/blog/${article.slug}`
    : 'https://3dlab.jp/blog';

  // HTMLタグを除去してプレーンテキストの文字数を算出
  const plainContent = article.content
    ? article.content.replace(/<[^>]*>/g, '')
    : '';
  const wordCount = plainContent.length;

  // 見出しからTOC（hasPart）を生成
  const headings = article.content ? extractHeadings(article.content) : [];
  const hasPart = headings.length > 0
    ? headings.map((h) => ({
        "@type": "WebPageElement",
        "name": h.text,
      }))
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "description": description,
    "image": article.featured_image_url || "https://3dlab.jp/og-image.jpg",
    "datePublished": article.published_at,
    "dateModified": article.updated_at || article.published_at,
    "author": {
      "@type": "Person",
      "name": article.author_name || "3DLab",
      "url": "https://3dlab.jp",
    },
    "publisher": {
      "@type": "Organization",
      "name": "3DLab - 3Dプリンタ教室",
      "url": "https://3dlab.jp",
      "logo": {
        "@type": "ImageObject",
        "url": "https://3dlab.jp/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "inLanguage": "ja",
    ...(wordCount > 0 && { "wordCount": wordCount }),
    ...(hasPart && { "hasPart": hasPart }),
    "articleSection": article.category,
    "keywords": article.tags?.join(", ") || ""
  };
}

// パンくずリスト用のBreadcrumbList構造化データ
export function BreadcrumbListSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

// FAQ用のFAQPage構造化データ
export function FAQPageSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

