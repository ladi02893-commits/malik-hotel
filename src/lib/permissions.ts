import { UserRole } from '@/types';

export const ADMIN_PERMISSIONS = [
  'pos.access',
  'order.create',
  'order.hold',
  'order.cancel',
  'order.void',
  'refund.create',
  'discount.apply',
  'discount.override',
  'receipt.print',
  'receipt.reprint',
  'product.create',
  'product.update',
  'category.manage',
  'register.open',
  'register.close',
  'cash.adjust',
  'reports.view',
  'settings.manage',
  'users.manage',
];

export const CASHIER_PERMISSIONS = [
  'pos.access',
  'order.create',
  'order.hold',
  'order.cancel',
  'refund.create',
  'discount.apply',
  'receipt.print',
  'receipt.reprint',
  'register.open',
  'register.close',
  'cash.adjust',
];

export function hasPermission(role: UserRole | undefined, permission: string): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  return CASHIER_PERMISSIONS.includes(permission);
}
