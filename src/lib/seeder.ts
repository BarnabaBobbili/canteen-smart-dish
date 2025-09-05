import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const seedInitialData = async (user: User) => {
  try {
    // 1. Create a Canteen for the new owner
    const { data: canteen, error: canteenError } = await supabase
      .from('canteens')
      .insert({
        name: `${user.user_metadata.full_name}'s Canteen`,
        owner_id: user.id,
        description: 'A fresh canteen ready for business!',
      })
      .select()
      .single();

    if (canteenError) throw canteenError;
    if (!canteen) throw new Error('Canteen creation failed.');

    const canteenId = canteen.id;

    // 2. Update the owner's profile with the new canteen_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ canteen_id: canteenId })
      .eq('user_id', user.id);

    if (profileError) throw profileError;

    // 3. Create sample categories
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .insert([
        { canteen_id: canteenId, name: 'Main Course', description: 'Hearty and delicious main courses.' },
        { canteen_id: canteenId, name: 'Snacks', description: 'Quick and tasty snacks.' },
        { canteen_id: canteenId, name: 'Beverages', description: 'Cool and refreshing drinks.' },
      ])
      .select();

    if (categoryError) throw categoryError;
    if (!categories) throw new Error('Category creation failed.');

    const mainCourseCat = categories.find(c => c.name === 'Main Course')?.id;
    const snacksCat = categories.find(c => c.name === 'Snacks')?.id;
    const beveragesCat = categories.find(c => c.name === 'Beverages')?.id;

    // 4. Create sample menu items
    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .insert([
        { canteen_id: canteenId, category_id: mainCourseCat, name: 'Chicken Biryani', price: 150, preparation_time: 25 },
        { canteen_id: canteenId, category_id: mainCourseCat, name: 'Paneer Butter Masala', price: 120, preparation_time: 20 },
        { canteen_id: canteenId, category_id: snacksCat, name: 'Samosa', price: 15, preparation_time: 10 },
        { canteen_id: canteenId, category_id: snacksCat, name: 'Veg Sandwich', price: 40, preparation_time: 5 },
        { canteen_id: canteenId, category_id: beveragesCat, name: 'Masala Chai', price: 10, preparation_time: 5 },
        { canteen_id: canteenId, category_id: beveragesCat, name: 'Fresh Lime Soda', price: 25, preparation_time: 3 },
      ])
      .select();

    if (menuItemsError) throw menuItemsError;
    if (!menuItems) throw new Error('Menu item creation failed.');

    // 5. Create a sample staff member (cashier) to associate with orders
    // In a real scenario, you'd invite them. Here we create a placeholder profile.
    const { data: cashierProfile, error: cashierError } = await supabase
      .from('profiles')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000004', // Placeholder UUID
        email: 'cashier@example.com',
        full_name: 'Sample Cashier',
        role: 'cashier',
        canteen_id: canteenId,
      })
      .select()
      .single();

    if (cashierError && cashierError.code !== '23505') { // Ignore if profile already exists
      throw cashierError;
    }
    const cashierId = cashierProfile?.user_id || '00000000-0000-0000-0000-000000000004';

    // 6. Create sample orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .insert([
        { canteen_id: canteenId, customer_name: 'Ankit', total_amount: 165.00, status: 'completed', payment_method: 'upi', served_by: cashierId, created_at: new Date(Date.now() - 86400000).toISOString() },
        { canteen_id: canteenId, customer_name: 'Bhavna', total_amount: 130.00, status: 'preparing', payment_method: 'cash', served_by: cashierId, created_at: new Date(Date.now() - 600000).toISOString() },
        { canteen_id: canteenId, customer_name: 'Chirag', total_amount: 50.00, status: 'pending', payment_method: 'card', served_by: cashierId, created_at: new Date(Date.now() - 120000).toISOString() },
      ])
      .select();

    if (ordersError) throw ordersError;
    if (!orders) throw new Error('Order creation failed.');

    // 7. Create sample order items
    const orderItemsToInsert = [
      // Order 1
      { order_id: orders[0].id, menu_item_id: menuItems.find(m => m.name === 'Chicken Biryani')?.id, quantity: 1, unit_price: 150, total_price: 150 },
      { order_id: orders[0].id, menu_item_id: menuItems.find(m => m.name === 'Samosa')?.id, quantity: 1, unit_price: 15, total_price: 15 },
      // Order 2
      { order_id: orders[1].id, menu_item_id: menuItems.find(m => m.name === 'Paneer Butter Masala')?.id, quantity: 1, unit_price: 120, total_price: 120 },
      { order_id: orders[1].id, menu_item_id: menuItems.find(m => m.name === 'Masala Chai')?.id, quantity: 1, unit_price: 10, total_price: 10 },
      // Order 3
      { order_id: orders[2].id, menu_item_id: menuItems.find(m => m.name === 'Masala Chai')?.id, quantity: 5, unit_price: 10, total_price: 50 },
    ].filter(oi => oi.menu_item_id); // Filter out any items that might not have been found

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (orderItemsError) throw orderItemsError;

    return { success: true };

  } catch (error) {
    console.error("Error seeding data:", error);
    return { success: false, error };
  }
};
