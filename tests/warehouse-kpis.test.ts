import assert from "node:assert/strict";
import test from "node:test";
import { summarizeWarehouseStock, type ProductWithWarehouseStocks } from "../lib/warehouses";

const warehouses = [{ id: "a", key: "A", name: "A", order: 1, createdAt: new Date(), updatedAt: new Date() }, { id: "b", key: "B", name: "B", order: 2, createdAt: new Date(), updatedAt: new Date() }];
const products: ProductWithWarehouseStocks[] = [{ id: "p", name: "Producto", sku: null, image: "", minimumStock: 5, stock: 20, stocksByWarehouseId: { a: 0, b: 20 } }];

test("stock suficiente global no oculta el faltante local", () => {
  assert.deepEqual(summarizeWarehouseStock(warehouses, products).map((item) => item.lowStock), [1, 0]);
});

test("las unidades se suman por ubicación", () => {
  assert.deepEqual(summarizeWarehouseStock(warehouses, products).map((item) => item.units), [0, 20]);
});
