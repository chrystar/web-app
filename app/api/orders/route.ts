import { createClient } from '@supabase/supabase-js';
import { loyaltyService } from '@/lib/loyalty-service';
import { requireAdmin } from '@/lib/admin-guard';

// Create a singleton Supabase client for the API routes
const getSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

const supabase = getSupabaseClient();

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CreateOrderRequest {
  guestUserId?: string; // Optional: guest user ID from authenticated user
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
  };
  selectedLGA: string;
  paymentMethod: string;
  paymentReference: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export async function POST(request: Request) {
  try {
    const body: CreateOrderRequest = await request.json();

    // Verify payment with Paystack (with better error handling)
    let paymentVerified = false;
    
    try {
      const verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(body.paymentReference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const verifyData = await verifyResponse.json();

      if (verifyData.status && verifyData.data && verifyData.data.status === 'success') {
        paymentVerified = true;
      } else {
        console.error('Payment verification failed:', verifyData);
      }
    } catch (verifyError) {
      console.error('Payment verification error:', verifyError);
    }

    if (!paymentVerified) {
      return Response.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        guest_user_id: body.guestUserId || null,
        customer_name: `${body.customerInfo.firstName} ${body.customerInfo.lastName}`,
        customer_email: body.customerInfo.email,
        customer_phone: body.customerInfo.phone,
        delivery_address: body.customerInfo.address,
        delivery_lga: body.selectedLGA,
        payment_method: body.paymentMethod,
        payment_reference: body.paymentReference,
        subtotal: body.subtotal,
        delivery_fee: body.deliveryFee,
        total: body.total,
        status: 'confirmed',
        order_status: 'confirmed',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error details:', {
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
      });
      return Response.json(
        { error: `Failed to create order: ${orderError.message}` },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      product_price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error details:', {
        message: itemsError.message,
        code: itemsError.code,
        details: itemsError.details,
      });
      return Response.json(
        { error: `Failed to create order items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    try {
      await loyaltyService.awardForSuccessfulOrder({
        guestUserId: body.guestUserId || null,
        orderId: Number(order.id),
        orderTotal: Number(body.total || 0),
      });
    } catch (loyaltyError) {
      console.error('Loyalty processing failed (order still created):', loyaltyError);
    }

    return Response.json({
      id: order.id,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const paymentReference = searchParams.get('reference');
    const orderId = searchParams.get('id');

    const query = supabase.from('orders').select(`
      id,
      guest_user_id,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      delivery_lga,
      payment_method,
      payment_reference,
      subtotal,
      delivery_fee,
      total,
      status,
      order_status,
      created_at,
      notes,
      order_items (
        id,
        product_id,
        product_name,
        product_price,
        quantity,
        subtotal
      )
    `);

    // Filter by order ID
    if (orderId) {
      const { data, error } = await query.eq('id', orderId).single();
      if (error) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }
      return Response.json(data);
    }

    // Filter by email (for guest order lookup)
    if (email) {
      const { data, error } = await query.eq('customer_email', email);
      if (error) {
        return Response.json({ error: 'Failed to fetch orders' }, { status: 500 });
      }
      return Response.json(data || []);
    }

    // Filter by payment reference (for payment confirmation)
    if (paymentReference) {
      const { data, error } = await query.eq('payment_reference', paymentReference).single();
      if (error) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }
      return Response.json(data);
    }

    // If no filters, return all orders (for admin dashboard)
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Fetch all orders error:', error);
      return Response.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
    return Response.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await request.json();
    const { id, order_status, notes } = body;

    if (!id) {
      return Response.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | null> = {};

    if (order_status) {
      updateData.order_status = order_status;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return Response.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
