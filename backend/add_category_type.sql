-- Add type column to categories table
ALTER TABLE categories ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT '지출';

-- Update existing categories to set appropriate types
-- You can manually update specific categories to '수입' if needed
-- For example:
-- UPDATE categories SET type = '수입' WHERE name IN ('급여', '용돈', '그 외');

-- Create index on type for better query performance
CREATE INDEX idx_categories_type ON categories(type);
