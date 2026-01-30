-- Migration: Create storage bucket for supplier documents (US-263)
-- Supplier Invoice & Receipt OCR Upload

-- Create storage bucket for supplier documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-documents',
  'supplier-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for supplier-documents bucket

-- Allow authenticated users to upload files to their organization's folder
CREATE POLICY "Users can upload supplier documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Allow users to read documents from their organizations
CREATE POLICY "Users can read their organization supplier documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Allow users to update documents in their organizations (e.g., rename)
CREATE POLICY "Users can update their organization supplier documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'supplier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Allow users to delete documents from their organizations
CREATE POLICY "Users can delete their organization supplier documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Add comments
COMMENT ON COLUMN storage.buckets.id IS 'Bucket for supplier invoice/receipt documents (US-263)';
