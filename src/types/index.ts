export type MenuCategory = "Starters" | "Mains" | "Desserts" | "Drinks";

export type DietaryTag = "Popular" | "Chef Pick" | "Vegetarian" | "Spicy" | "Gluten-Free" | "New" | "Fresh" | "Signature" | "Sweet" | "Cold" | "Hot";

export type ModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  required?: boolean;
  options: ModifierOption[];
};

export type MenuItem = {
  id: number;
  category: MenuCategory;
  name: string;
  description: string;
  price: number;
  tag: DietaryTag | string;
  available: boolean;
  modifierGroups?: ModifierGroup[];
  prepTimeMinutes?: number;
};

export type OrderItem = {
  itemId: number;
  name: string;
  basePrice: number;
  selectedModifiers: { groupName: string; optionName: string; priceDelta: number }[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
};

export type OrderStatus = "New" | "Preparing" | "Ready" | "Served" | "Archived" | "Rejected";

export type OrderCard = {
  id: string;
  orderNumber: number;
  table: number;
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  createdAt: number; // Unix timestamp ms
  updatedAt: number;
  geoVerified?: boolean;
  distanceMeters?: number;
  tableWasVacant?: boolean;
  rejectedReason?: string;
};

export type ServiceType = 
  | "Water Refill" 
  | "Call Waiter" 
  | "Extra Napkins" 
  | "Sauces & Condiments" 
  | "Request Bill";

export type ServiceRequest = {
  id: string;
  table: number;
  type: ServiceType;
  status: "Pending" | "Resolved";
  createdAt: number;
  resolvedAt?: number;
};

export type UserRole = "guest" | "kitchen" | "owner";

// Table Floor Occupancy Lifecycle
export type TableOccupancyStatus = "VACANT" | "SEATED" | "ACTIVE_ORDER" | "SERVED" | "BILL_REQUESTED";

export type TableSession = {
  tableNumber: number;
  status: TableOccupancyStatus;
  seatedAt?: number;
  lastActivityAt?: number;
};

// GPS Geofence Anti-Tamper Configuration
export type GeoFenceConfig = {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 100
  restaurantName: string;
  strictMode: boolean; // if true, block order outside geofence; if false, warn
};

export type SyncEvent =
  | { type: "NEW_ORDER"; payload: OrderCard }
  | { type: "ORDER_STATUS_CHANGED"; payload: { orderId: string; status: OrderStatus; updatedAt: number } }
  | { type: "ORDER_TRANSFERRED"; payload: { orderId: string; fromTable: number; newTable: number } }
  | { type: "ORDER_REJECTED"; payload: { orderId: string; reason: string } }
  | { type: "NEW_SERVICE_REQUEST"; payload: ServiceRequest }
  | { type: "SERVICE_RESOLVED"; payload: { requestId: string; resolvedAt: number } }
  | { type: "MENU_UPDATED"; payload: MenuItem[] }
  | { type: "TABLE_STATUS_CHANGED"; payload: { tableNumber: number; status: TableOccupancyStatus; seatedAt?: number } }
  | { type: "TABLE_CLEARED"; payload: { tableNumber: number } }
  | { type: "GEO_CONFIG_UPDATED"; payload: GeoFenceConfig };
