-- 実績紹介テーブル
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  image_urls TEXT[], -- 複数画像対応
  customer_name VARCHAR(255),
  created_date DATE,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ブログ投稿テーブル
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  category VARCHAR(100),
  tags TEXT[],
  author_name VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 商品テーブル
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'workshop', '3d_printing', 'product'
  base_price DECIMAL(10, 2) NOT NULL,
  image_urls TEXT[],
  specifications JSONB, -- 商品仕様
  is_active BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3Dプリント注文テーブル
CREATE TABLE IF NOT EXISTS printing_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending, processing, completed, cancelled
  stl_file_url TEXT NOT NULL,
  stl_file_name VARCHAR(255),
  file_size_mb DECIMAL(10, 2),
  volume_cm3 DECIMAL(10, 2),
  material_type VARCHAR(100) NOT NULL, -- PLA, ABS, PETG, Resin等
  material_color VARCHAR(50),
  layer_height DECIMAL(5, 3), -- 0.1mm, 0.2mm等
  infill_percentage INTEGER, -- 20%, 50%, 100%等
  estimated_print_time_hours DECIMAL(10, 2),
  base_cost DECIMAL(10, 2) DEFAULT 5000, -- 基本料金
  material_cost DECIMAL(10, 2), -- 材料費
  total_cost DECIMAL(10, 2), -- 合計金額
  notes TEXT,
  delivery_method VARCHAR(50), -- pickup, shipping
  delivery_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 印刷履歴テーブル（再注文用）
CREATE TABLE IF NOT EXISTS printing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_order_id UUID REFERENCES printing_orders(id),
  customer_id UUID REFERENCES customers(id),
  order_snapshot JSONB, -- 注文時の全情報を保存
  reorder_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instagram投稿連携テーブル
CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram_id VARCHAR(255) UNIQUE NOT NULL,
  media_type VARCHAR(50), -- IMAGE, VIDEO, CAROUSEL_ALBUM
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  caption TEXT,
  hashtags TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_portfolio_display_order ON portfolio_items(display_order, created_at DESC);
CREATE INDEX idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_products_category ON products(category, is_active);
CREATE INDEX idx_printing_orders_customer ON printing_orders(customer_id, created_at DESC);
CREATE INDEX idx_printing_orders_status ON printing_orders(status);
CREATE INDEX idx_instagram_posts_featured ON instagram_posts(is_featured, display_order);