import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qdacztgcgyamjebuxggx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWN6dGdjZ3lhbWplYnV4Z2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODY2NDEsImV4cCI6MjA2MDM2MjY0MX0.CqiZexqn7SpwlO2H9wjDg3596pTC2lNDWsvxN21nJNk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY); 