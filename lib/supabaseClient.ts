import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqlqhfgpisicerylhidl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHFoZmdwaXNpY2VyeWxoaWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzI5MDIsImV4cCI6MjEwNjkwODkwMn0.gtTasmx448mdQMRkBXJD5fLCFKFpAvQKyM-spPg1gOY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);