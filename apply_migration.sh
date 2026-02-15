#!/bin/bash
# Apply product_categories migration to remote database

echo "🔄 Applying migration to Supabase..."

# Read the .env file to get connection details
source .env

# Apply migration using Supabase CLI
supabase db push --linked 2>/dev/null || {
  echo "❌ Supabase CLI push failed. Please apply migration manually in dashboard."
  echo ""
  echo "📋 Copy this SQL and run it in Supabase Dashboard > SQL Editor:"
  echo ""
  cat supabase/migrations/20260215_230100_add_product_categories.sql
}
