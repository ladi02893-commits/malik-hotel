// Malik Tasty Nashta Point - Type Definitions

export type UserRole = 'admin' | 'cashier';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  display_name?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  pin_code?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  location: string;
  phone: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  is_setup_completed: boolean;
  updated_at: string;
}

export interface POSSettings {
  id: string;
  enable_discounts: boolean;
  max_cashier_discount_percent: number;
  require_pin_above_percent: number;
  allow_fixed_discount: boolean;
  allow_item_discount: boolean;
  enable_split_payment: boolean;
  enable_split_bill: boolean;
  enable_hold_orders: boolean;
  enable_item_notes: boolean;
  enable_addons: boolean;
  enable_tax: boolean;
  tax_rate_percent: number;
  enable_service_charge: boolean;
  service_charge_percent: number;
  enable_rounding: boolean;
  require_open_register: boolean;
  require_refund_approval: boolean;
  require_void_approval: boolean;
  require_refund_reason: boolean;
  admin_pin?: string;
  updated_at: string;
}

export interface ReceiptSettings {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  receipt_prefix: string;
  order_prefix: string;
  refund_prefix: string;
  header_message: string;
  footer_message: string;
  show_cashier: boolean;
  show_customer: boolean;
  show_payment_method: boolean;
  show_discount: boolean;
  auto_print: boolean;
  paper_width_mm: number;
  print_copies: number;
  updated_at: string;
}

export interface PaymentMethod {
  id: string; // 'cash' | 'jazzcash' | 'easypaisa' | 'card'
  name: string;
  type: 'cash' | 'digital' | 'card';
  is_active: boolean;
  sort_order: number;
  is_default: boolean;
  require_reference: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductAvailability = 'available' | 'sold_out' | 'hidden' | 'inactive';

export interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  short_name?: string;
  sku?: string;
  product_code?: string;
  description?: string;
  selling_price: number;
  cost_price?: number;
  availability: ProductAvailability;
  is_active: boolean;
  sort_order: number;
  image_url?: string;
  addon_groups?: AddonGroup[];
  created_at: string;
  updated_at: string;
}

export interface AddonGroup {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  addons?: Addon[];
}

export interface Addon {
  id: string;
  addon_group_id: string;
  name: string;
  price: number;
  sort_order: number;
  is_active: boolean;
}

export interface QuickNote {
  id: string;
  text: string;
  sort_order: number;
  is_active: boolean;
}

export interface SelectedAddon {
  addon_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string; // unique item line id in cart
  product_id: string;
  name: string;
  short_name?: string;
  unit_price: number;
  quantity: number;
  note?: string;
  addons: SelectedAddon[];
  item_discount: number;
  line_total: number;
  custom_unit_price?: number;
}

export interface CartTotals {
  subtotal: number;
  discount_amount: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  tax_amount: number;
  service_charge_amount: number;
  rounding_amount: number;
  grand_total: number;
}

export interface PaymentEntry {
  method_id: string;
  method_name: string;
  amount: number;
  reference_number?: string;
  amount_tendered?: number;
  change_returned?: number;
}

export interface RegisterSession {
  id: string;
  user_id?: string;
  user_name_snapshot: string;
  opened_at: string;
  opening_amount: number;
  closed_at?: string;
  expected_amount?: number;
  actual_amount?: number;
  difference?: number;
  closing_note?: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export type RegisterTxType = 'OPENING' | 'SALE' | 'REFUND' | 'CASH_IN' | 'CASH_OUT' | 'ADJUSTMENT';

export interface RegisterTransaction {
  id: string;
  register_session_id: string;
  type: RegisterTxType;
  amount: number;
  order_id?: string;
  refund_id?: string;
  reason?: string;
  note?: string;
  created_by?: string;
  user_name_snapshot?: string;
  created_at: string;
}

export type OrderStatus = 'completed' | 'held' | 'refunded' | 'partially_refunded' | 'voided';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name_snapshot: string;
  unit_price: number;
  quantity: number;
  item_subtotal: number;
  addons_total: number;
  item_discount: number;
  line_total: number;
  note?: string;
  refunded_quantity: number;
  addons?: Array<{
    id: string;
    addon_id?: string;
    addon_name_snapshot: string;
    price_snapshot: number;
    quantity: number;
    line_total: number;
  }>;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  payment_method_id: string;
  amount: number;
  reference_number?: string;
  amount_tendered?: number;
  change_returned?: number;
  status: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  receipt_number: string;
  register_session_id?: string;
  customer_id?: string;
  customer_name_snapshot?: string;
  customer_phone_snapshot?: string;
  status: OrderStatus;
  subtotal: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount: number;
  tax_rate_percent: number;
  tax_amount: number;
  service_charge_percent: number;
  service_charge_amount: number;
  rounding_amount: number;
  grand_total: number;
  total_paid: number;
  change_returned: number;
  notes?: string;
  void_reason?: string;
  voided_at?: string;
  voided_by?: string;
  reprint_count: number;
  idempotency_key?: string;
  created_by?: string;
  cashier_name_snapshot: string;
  created_at: string;
  completed_at: string;
  items?: OrderItem[];
  payments?: PaymentRecord[];
  refunds?: any[];
}

export interface HeldOrder {
  id: string;
  hold_number: string;
  customer_name?: string;
  note?: string;
  items_count?: number;
  cart_payload: {
    items: CartItem[];
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    discount_amount: number;
    notes?: string;
  };
  subtotal: number;
  discount_amount: number;
  grand_total: number;
  created_by?: string;
  cashier_name_snapshot: string;
  status: 'held' | 'resumed' | 'cancelled';
  created_at: string;
  resumed_at?: string;
}

export interface RefundItem {
  id: string;
  refund_id: string;
  order_item_id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
}

export interface Refund {
  id: string;
  refund_number: string;
  order_id: string;
  register_session_id?: string;
  refund_type: 'full' | 'partial';
  total_refund_amount: number;
  refund_method: string;
  reason: string;
  notes?: string;
  approved_by?: string;
  created_by?: string;
  user_name_snapshot: string;
  created_at: string;
  items?: RefundItem[];
  order?: Order;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

// -------------------------------------------------------------
// VENDORS, RAW MATERIALS & PURCHASES (MAAL ENTRY)
// -------------------------------------------------------------
export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  category: string;
  address?: string;
  opening_balance: number;
  current_balance: number; // positive = payable to vendor (udhaar)
  is_active: boolean;
  total_purchases_amount?: number;
  total_payments_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  default_price: number;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  invoice_id: string;
  raw_material_id?: string;
  item_name_snapshot: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  vendor_id?: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_method: string;
  payment_status: 'paid' | 'partial' | 'credit';
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: PurchaseItem[];
  vendor?: Vendor;
}

export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  vendor_name_snapshot?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  vendor?: Vendor;
}

export interface DailySummaryData {
  date: string;
  sales: {
    total_orders: number;
    gross_sales: number;
    discounts: number;
    net_sales: number;
    cash_sales: number;
    digital_sales: number;
  };
  purchases: {
    total_invoices: number;
    total_purchases: number;
    paid_cash: number;
    unpaid_credit: number;
    top_items: { name: string; quantity: number; unit: string; total: number }[];
  };
  cash_drawer: {
    is_open: boolean;
    opening_float: number;
    cash_sales: number;
    cash_in: number;
    cash_out: number;
    cash_refunds: number;
    expected_cash: number;
    actual_cash?: number;
    difference?: number;
  };
  vendors: {
    total_outstanding_payable: number;
    payments_made_today: number;
  };
  margin: {
    day_gross_margin: number; // net_sales - total_purchases
    net_cash_flow: number;    // cash_sales + cash_in - (purchases_cash_paid + cash_out + refunds)
  };
}
