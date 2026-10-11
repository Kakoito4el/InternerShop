export type UserRole = "USER" | "ADMIN";

export interface User {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  balance: number;
  avatar_url?: string;
}

export interface Category {
  id: number;
  app_id: string;
  name: string;
  slug: string;
  parent_id?: number | null;
  image_url?: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  app_id: string;
  category_id?: number;
  title: string;
  description?: string;
  price: number;
  unit?: string;
  stock: number;
  attributes?: Record<string, any>;
  options?: Record<string, string[]>;
  main_image_url?: string;
  is_available: boolean;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  selected_options?: Record<string, any>;
  product?: Product;
}

export interface OrderItem {
  id: number;
  product_id?: number;
  title_snapshot: string;
  price_snapshot: number;
  quantity: number;
  selected_options?: Record<string, any>;
}

export type OrderStatus =
  | "NEW"
  | "PAID"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

export interface Order {
  id: number;
  app_id: string;
  user_id: number;
  total_amount: number;
  status: OrderStatus;
  customer_name?: string;
  phone?: string;
  delivery_address?: string;
  comment?: string;
  created_at: string;
  items: OrderItem[];
}

export interface AppSettings {
  store_name: string;
  currency: string;
  delivery_fee: number;
  min_order_amount: number;
  extra_config?: Record<string, any>;
}
