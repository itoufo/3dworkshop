import type { Metadata } from "next";
import { createClient } from '@supabase/supabase-js';
import { BlogArticleSchema } from '@/components/StructuredData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getBlogPost(slug: string) {
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  try {
    const { slug } = await params
    const blogPost = await getBlogPost(slug);

    if (!blogPost) {
      return {
        title: "ブログ記事 | 3DLab",
        description: "3Dプリンタ教室3DLabのブログ",
      };
    }

    const title = `${blogPost.title} | 3Dプリンタブログ | 3DLab`;
    const description = blogPost.excerpt || `${blogPost.title}の記事。3Dプリンタ教室3DLabのブログ。`;
    const imageUrl = blogPost.featured_image_url || '/og-image.jpg';

    return {
      title,
      description,
      keywords: `3Dプリンタ,${blogPost.category || ''},${blogPost.tags?.join(',') || ''},ブログ,情報`,
      alternates: {
        canonical: `/blog/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `https://3dlab.jp/blog/${slug}`,
        siteName: "3DLab - 3Dプリンタ教室",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: blogPost.title,
          },
        ],
        locale: "ja_JP",
        type: 'article',
        publishedTime: blogPost.published_at,
        modifiedTime: blogPost.updated_at || blogPost.created_at,
        authors: [blogPost.author_name || '3DLab'],
        tags: blogPost.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: "ブログ記事 | 3DLab",
      description: "3Dプリンタ教室3DLabのブログ",
    };
  }
}

export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blogPost = await getBlogPost(slug);

  const structuredData = blogPost ? BlogArticleSchema(blogPost) : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      {children}
    </>
  );
}

