-- Add pin fields to workshops table
ALTER TABLE workshops
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN pin_order INTEGER DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX idx_workshops_pinned ON workshops(is_pinned DESC, pin_order ASC, created_at DESC);