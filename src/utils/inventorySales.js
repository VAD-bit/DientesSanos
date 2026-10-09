export const INVENTORY_SALES_GROUPS = {
  all: 'Todos',
  retail: 'Productos para venta',
  cafe: 'Café de cortesía'
};

export const getInventorySalesGroup = (item) =>
  String(item?.inventory_type || '').toLowerCase() === 'cafe' ? 'cafe' : 'retail';

export const getInventorySalesLabel = (item) =>
  INVENTORY_SALES_GROUPS[getInventorySalesGroup(item)];

export const filterSellableInventory = (items = []) =>
  items.filter((item) => item?.is_for_sale !== false);

export const matchesInventorySalesGroup = (item, group) =>
  group === 'all' || getInventorySalesGroup(item) === group;
