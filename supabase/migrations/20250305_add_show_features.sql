-- Add show_features column to workshops table
-- Controls visibility of the "このワークショップの特徴" section on workshop detail pages
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS show_features BOOLEAN DEFAULT true;
