import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://huuytzuocdtgedlmmccx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dXl0enVvY2R0Z2VkbG1tY2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU0NzIzMiwiZXhwIjoyMDg0MTIzMjMyfQ.RmMEkOh5E-V501SiFKWPsSF4qQn1Ir_TNIl5i44JkDg'
);

async function fixSuppliers() {
  // Find Jonssons Livs organization
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', '%Jonsson%');
  
  if (orgError) {
    console.error('Error finding org:', orgError);
    return;
  }
  
  console.log('Found organizations:', orgs);
  
  if (orgs.length === 0) {
    console.log('No organization found matching Jonsson');
    return;
  }
  
  const orgId = orgs[0].id;
  console.log('Using org ID:', orgId);
  
  // Update all suppliers to this organization
  const { data, error } = await supabase
    .from('suppliers')
    .update({ organization_id: orgId })
    .neq('organization_id', orgId)
    .select();
  
  if (error) {
    console.error('Error updating suppliers:', error);
  } else {
    console.log('Updated suppliers:', data?.length || 0);
    console.log(data);
  }
}

fixSuppliers();
