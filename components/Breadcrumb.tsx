import Link from 'next/link';
import { StructuredData, BreadcrumbListSchema } from './StructuredData';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const breadcrumbItems = [
    { name: 'ホーム', url: 'https://3dlab.jp' },
    ...items.map(item => ({
      name: item.name,
      url: `https://3dlab.jp${item.href}`
    }))
  ];

  return (
    <>
      <StructuredData data={BreadcrumbListSchema(breadcrumbItems)} />
      <nav aria-label="パンくずリスト" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <li>
            <Link 
              href="/" 
              className="hover:text-purple-600 transition-colors flex items-center"
              aria-label="ホーム"
            >
              <Home className="w-4 h-4" />
            </Link>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {index === items.length - 1 ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link 
                  href={item.href} 
                  className="hover:text-purple-600 transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

