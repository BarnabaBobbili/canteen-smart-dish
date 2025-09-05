CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_canteen_id UUID)
RETURNS TABLE (
  total_revenue_month NUMERIC,
  total_orders_month BIGINT,
  pending_orders_total BIGINT,
  menu_items_total BIGINT,
  revenue_growth_percentage NUMERIC,
  orders_growth_percentage NUMERIC,
  avg_order_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Current Period
  current_revenue NUMERIC;
  current_orders BIGINT;
  -- Previous Period
  previous_revenue NUMERIC;
  previous_orders BIGINT;
BEGIN
  -- Calculate stats for the current month (from start of this month to now)
  SELECT
    COALESCE(SUM(total_amount), 0),
    COALESCE(COUNT(id), 0)
  INTO
    current_revenue,
    current_orders
  FROM public.orders
  WHERE
    canteen_id = p_canteen_id
    AND status = 'completed'
    AND created_at >= date_trunc('month', now());

  -- Calculate stats for the previous month (from start of last month to end of last month)
  SELECT
    COALESCE(SUM(total_amount), 0),
    COALESCE(COUNT(id), 0)
  INTO
    previous_revenue,
    previous_orders
  FROM public.orders
  WHERE
    canteen_id = p_canteen_id
    AND status = 'completed'
    AND created_at >= date_trunc('month', now() - interval '1 month')
    AND created_at < date_trunc('month', now());

  -- Calculate total pending orders
  SELECT COALESCE(COUNT(id), 0)
  INTO pending_orders_total
  FROM public.orders
  WHERE canteen_id = p_canteen_id AND status IN ('pending', 'preparing');

  -- Calculate total active menu items
  SELECT COALESCE(COUNT(id), 0)
  INTO menu_items_total
  FROM public.menu_items
  WHERE canteen_id = p_canteen_id AND is_active = true;

  -- Calculate growth percentages
  revenue_growth_percentage :=
    CASE
      WHEN previous_revenue > 0 THEN ((current_revenue - previous_revenue) / previous_revenue) * 100
      ELSE 0
    END;

  orders_growth_percentage :=
    CASE
      WHEN previous_orders > 0 THEN ((current_orders::NUMERIC - previous_orders::NUMERIC) / previous_orders::NUMERIC) * 100
      ELSE 0
    END;

  -- Calculate average order value for the current month
  avg_order_value :=
    CASE
      WHEN current_orders > 0 THEN current_revenue / current_orders
      ELSE 0
    END;

  -- Assign values to the output table
  total_revenue_month := current_revenue;
  total_orders_month := current_orders;

  RETURN QUERY SELECT
    total_revenue_month,
    total_orders_month,
    pending_orders_total,
    menu_items_total,
    revenue_growth_percentage,
    orders_growth_percentage,
    avg_order_value;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_popular_items(p_canteen_id UUID, p_limit INT)
RETURNS TABLE (
  name TEXT,
  order_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.name,
    SUM(oi.quantity) as total_quantity
  FROM public.order_items oi
  JOIN public.menu_items mi ON oi.menu_item_id = mi.id
  JOIN public.orders o ON oi.order_id = o.id
  WHERE o.canteen_id = p_canteen_id
    AND o.created_at >= date_trunc('month', now()) -- Only consider this month's orders
  GROUP BY mi.name
  ORDER BY total_quantity DESC
  LIMIT p_limit;
END;
$$;
