import { supabase } from '@/lib/supabase';
export async function seedDefaultCategoriesClientSide(workspaceId: string, userId: string) {
  console.log(`seedDefaultCategoriesClientSide: Verifying/seeding categories for workspace ${workspaceId}...`);
  
  // Double check client-side that categories don't already exist to prevent duplicate seed attempts
  const { data: existing, error: checkError } = await supabase
    .from('categories')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1);

  if (checkError) {
    console.error("seedDefaultCategoriesClientSide: Failed to check existing categories:");
    console.error("Code:", checkError.code);
    console.error("Message:", checkError.message);
    console.error("Details:", checkError.details);
    console.error("Hint:", checkError.hint);
    return;
  }

  if (existing && existing.length > 0) {
    console.log("seedDefaultCategoriesClientSide: Categories already seeded, skipping.");
    return;
  }

  const groups = [
    { name: 'Food & Dining', icon: 'Utensils', color: '#22C55E', items: ['Restaurants', 'Fast Food', 'Groceries', 'Coffee & Snacks'] },
    { name: 'Transportation', icon: 'Car', color: '#3B82F6', items: ['Fuel', 'Taxi & Ride Sharing', 'Public Transport', 'Vehicle Maintenance'] },
    { name: 'Housing', icon: 'Home', color: '#A855F7', items: ['Rent', 'Electricity', 'Water', 'Internet', 'Gas'] },
    { name: 'Healthcare', icon: 'Heart', color: '#EF4444', items: ['Doctor', 'Medicines', 'Insurance', 'Fitness'] },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', items: ['Clothing', 'Electronics', 'Home Items', 'Personal Care'] },
    { name: 'Entertainment', icon: 'Film', color: '#F97316', items: ['Movies', 'Games', 'Streaming Services', 'Events'] },
    { name: 'Education', icon: 'BookOpen', color: '#06B6D4', items: ['Books', 'Courses', 'Tuition', 'Certifications'] },
    { name: 'Family', icon: 'Users', color: '#EAB308', items: ['Kids', 'Household', 'Gifts', 'Family Activities'] },
    { name: 'Travel', icon: 'Plane', color: '#14B8A6', items: ['Flights', 'Hotels', 'Local Transport', 'Vacation'] },
    { name: 'Finance', icon: 'Wallet', color: '#10B981', items: ['Investments', 'Loan Payments', 'Savings', 'Taxes'] },
    { name: 'Miscellaneous', icon: 'Circle', color: '#6B7280', items: ['Donations', 'Pet Expenses', 'Other'] }
  ];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    try {
      // Insert Parent Category
      const { data: parent, error: pError } = await supabase
        .from('categories')
        .insert({
          workspace_id: workspaceId,
          created_by: userId,
          name: group.name,
          icon: group.icon,
          color: group.color,
          is_default: true,
          sort_order: i + 1
        })
        .select()
        .maybeSingle();

      if (pError) {
        console.error(`seedDefaultCategoriesClientSide: Error inserting parent category ${group.name}:`);
        console.error("Code:", pError.code);
        console.error("Message:", pError.message);
        console.error("Details:", pError.details);
        console.error("Hint:", pError.hint);
        continue;
      }

      if (parent) {
        const children = group.items.map((item, j) => ({
          workspace_id: workspaceId,
          created_by: userId,
          parent_id: parent.id,
          name: item,
          icon: group.icon,
          color: group.color,
          is_default: true,
          sort_order: j + 1
        }));

        const { error: cError } = await supabase
          .from('categories')
          .insert(children);

        if (cError) {
          console.error(`seedDefaultCategoriesClientSide: Error inserting children for category ${group.name}:`);
          console.error("Code:", cError.code);
          console.error("Message:", cError.message);
          console.error("Details:", cError.details);
          console.error("Hint:", cError.hint);
        }
      }
    } catch (err) {
      console.error(`seedDefaultCategoriesClientSide: Exception seeding category group ${group.name}:`, err);
    }
  }
    console.log("seedDefaultCategoriesClientSide: Default categories seeded successfully.");
}

export async function seedDefaultCategories(workspaceId: string) {
  let userId = '';
  try {
    const { useAuthStore } = await import('@/stores/authStore');
    userId = useAuthStore.getState().user?.id || '';
  } catch (err) {
    console.error("seedDefaultCategories: Could not import authStore or retrieve user:", err);
  }

  if (!userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || '';
    } catch (authErr) {
      console.error("seedDefaultCategories: Could not fetch user session:", authErr);
    }
  }

  console.log(`seedDefaultCategories: Seeding workspace: ${workspaceId} with user: ${userId}`);
  return seedDefaultCategoriesClientSide(workspaceId, userId);
}
