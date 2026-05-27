type OdooConfig = {
  url: string;
  database: string;
  username: string;
  apiKey: string;
};

type OdooJsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: {
      name?: string;
      message?: string;
      debug?: string;
    };
  };
};

export type OdooProduct = {
  id: number;
  name: string;
  default_code?: string | false;
  list_price?: number;
  qty_available?: number;
  virtual_available?: number;
  barcode?: string | false;
  categ_id?: [number, string] | false;
  image_url: string;
};

type OdooMenuRecord = {
  id: number;
  name: string;
  action?: string | false;
  web_icon_data?: string | false;
  sequence?: number;
};

export type OdooApp = {
  id: number;
  name: string;
  originalName: string;
  action?: string;
  icon?: string;
  url: string;
};

type OdooSaleOrder = {
  id: number;
  name: string;
  partner_id?: [number, string] | false;
  amount_total?: number;
  state?: string;
  date_order?: string | false;
  user_id?: [number, string] | false;
  invoice_status?: string | false;
};

type OdooSaleOrderLine = {
  id: number;
  product_id?: [number, string] | false;
  product_uom_qty?: number;
  price_total?: number;
};

type OdooLead = {
  id: number;
  name: string;
  stage_id?: [number, string] | false;
  expected_revenue?: number;
  probability?: number;
  partner_id?: [number, string] | false;
  user_id?: [number, string] | false;
};

type OdooCountGroup = {
  __count?: number;
};

type OdooAmountGroup = OdooCountGroup & {
  amount_total?: number;
};

type OdooPartnerGroup = OdooCountGroup & {
  partner_id?: [number, string] | false;
};

type OdooProductSalesGroup = OdooCountGroup & {
  product_id?: [number, string] | false;
  product_uom_qty?: number;
  price_total?: number;
};

export type OdooReportPeriod = "today" | "week" | "month";

export type OdooSalesReport = {
  period: OdooReportPeriod;
  label: string;
  startDate: string;
  endDate: string;
  orders: OdooSaleOrder[];
  topProducts: Array<{
    id: number;
    name: string;
    quantity: number;
    amount: number;
  }>;
  lowStockProducts: OdooProduct[];
  opportunities: OdooLead[];
  metrics: {
    confirmedSales: number;
    confirmedOrders: number;
    quotations: number;
    averageTicket: number;
    uniqueCustomers: number;
    toInvoice: number;
    lowStock: number;
    opportunities: number;
    expectedRevenue: number;
  };
};

let cachedUid: number | null = null;
let cachedUidPromise: Promise<number> | null = null;
let nextOdooCallAt = 0;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOdooSlot() {
  const waitMs = Math.max(nextOdooCallAt - Date.now(), 0);

  if (waitMs > 0) {
    await delay(waitMs);
  }

  nextOdooCallAt = Date.now() + 275;
}

function getOdooConfig(): OdooConfig {
  const url = process.env.ODOO_URL?.replace(/\/+$/, "");
  const database = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const apiKey = process.env.ODOO_API_KEY;

  if (!url || !database || !username || !apiKey) {
    throw new Error("ODOO_NOT_CONFIGURED");
  }

  return { url, database, username, apiKey };
}

async function callOdooJsonRpc<T>(
  config: OdooConfig,
  params: {
    service: "common" | "object";
    method: string;
    args: unknown[];
  },
): Promise<T> {
  await waitForOdooSlot();

  const response = await fetch(`${config.url}/jsonrpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params,
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      await delay(1600);
      await waitForOdooSlot();

      const retryResponse = await fetch(`${config.url}/jsonrpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params,
          id: Date.now(),
        }),
      });

      if (retryResponse.ok) {
        const retryPayload = (await retryResponse.json()) as OdooJsonRpcResponse<T>;

        if (retryPayload.error) {
          throw new Error(
            retryPayload.error.data?.message ||
              retryPayload.error.message ||
              "ODOO_RPC_ERROR",
          );
        }

        return retryPayload.result as T;
      }
    }

    throw new Error(`ODOO_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as OdooJsonRpcResponse<T>;

  if (payload.error) {
    throw new Error(
      payload.error.data?.message || payload.error.message || "ODOO_RPC_ERROR",
    );
  }

  return payload.result as T;
}

export async function authenticateOdoo() {
  if (cachedUid) return cachedUid;
  if (cachedUidPromise) return cachedUidPromise;

  const config = getOdooConfig();
  cachedUidPromise = callOdooJsonRpc<number | false>(config, {
    service: "common",
    method: "authenticate",
    args: [config.database, config.username, config.apiKey, {}],
  }).then((uid) => {
    if (!uid) {
      throw new Error("ODOO_AUTH_FAILED");
    }

    cachedUid = uid;
    return uid;
  });

  try {
    return await cachedUidPromise;
  } finally {
    cachedUidPromise = null;
  }
}

export async function executeOdooKw<T>(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
) {
  const config = getOdooConfig();
  const uid = await authenticateOdoo();

  return callOdooJsonRpc<T>(config, {
    service: "object",
    method: "execute_kw",
    args: [
      config.database,
      uid,
      config.apiKey,
      model,
      method,
      args,
      kwargs,
    ],
  });
}

export async function getOdooCount(model: string, domain: unknown[] = []) {
  return executeOdooKw<number>(model, "search_count", [domain]);
}

export type OdooCustomerSummary = {
  id: number;
  name: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string | null;
  averageTicket: number;
};

type OdooPartnerRecord = {
  id: number;
  name: string;
};

type OdooOrderForCustomer = {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  amount_total: number;
  date_order: string | false;
  state: string;
};

export async function getCustomersByDateRange(
  startDate: string,
  endDate: string,
  limit = 20,
): Promise<OdooCustomerSummary[]> {
  const domain = [
    ["date_order", ">=", startDate],
    ["date_order", "<=", endDate],
    ["state", "in", ["sale", "done"]],
  ];

  type GroupResult = { partner_id?: [number, string] | false; amount_total?: number; __count?: number };
  const groups = await executeOdooKw<GroupResult[]>(
    "sale.order",
    "read_group",
    [domain, ["partner_id", "amount_total:sum"], ["partner_id"]],
    { limit, orderby: "amount_total desc", lazy: false },
  );

  return groups
    .filter((g) => Array.isArray(g.partner_id))
    .map((g) => {
      const [id, name] = g.partner_id as [number, string];
      const total = g.amount_total ?? 0;
      const count = g.__count ?? 1;
      return { id, name, totalSpent: total, orderCount: count, lastOrderDate: null, averageTicket: count > 0 ? total / count : 0 };
    });
}

export async function getChurnedCustomers(
  monthsWithoutPurchase: number,
  limit = 20,
): Promise<OdooCustomerSummary[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsWithoutPurchase);
  const cutoffStr = cutoff.toISOString().slice(0, 19).replace("T", " ");

  const activePartnerIds = await executeOdooKw<{ partner_id?: [number, string] | false }[]>(
    "sale.order",
    "read_group",
    [
      [["date_order", ">=", cutoffStr], ["state", "in", ["sale", "done"]]],
      ["partner_id"],
      ["partner_id"],
    ],
    { lazy: false },
  ).then((groups) =>
    groups
      .filter((g) => Array.isArray(g.partner_id))
      .map((g) => (g.partner_id as [number, string])[0]),
  );

  type AllGroupResult = { partner_id?: [number, string] | false; amount_total?: number; __count?: number; date_order?: string | false };
  const allGroups = await executeOdooKw<AllGroupResult[]>(
    "sale.order",
    "read_group",
    [
      [["state", "in", ["sale", "done"]]],
      ["partner_id", "amount_total:sum", "date_order:max"],
      ["partner_id"],
    ],
    { lazy: false },
  );

  const churned = allGroups
    .filter((g) => {
      if (!Array.isArray(g.partner_id)) return false;
      const pid = (g.partner_id as [number, string])[0];
      return !activePartnerIds.includes(pid);
    })
    .slice(0, limit)
    .map((g) => {
      const [id, name] = g.partner_id as [number, string];
      const total = g.amount_total ?? 0;
      const count = g.__count ?? 1;
      return {
        id,
        name,
        totalSpent: total,
        orderCount: count,
        lastOrderDate: typeof g.date_order === "string" ? g.date_order : null,
        averageTicket: count > 0 ? total / count : 0,
      };
    });

  return churned;
}

export async function getTopCustomers(
  startDate: string,
  endDate: string,
  limit = 10,
): Promise<OdooCustomerSummary[]> {
  return getCustomersByDateRange(startDate, endDate, limit);
}

export async function getCustomerPurchaseHistory(
  partnerName: string,
  limit = 10,
) {
  const partners = await executeOdooKw<OdooPartnerRecord[]>(
    "res.partner",
    "search_read",
    [[["name", "ilike", partnerName]]],
    { fields: ["id", "name"], limit: 5 },
  );

  if (partners.length === 0) return null;

  const partner = partners[0];
  const orders = await executeOdooKw<OdooOrderForCustomer[]>(
    "sale.order",
    "search_read",
    [[["partner_id", "=", partner.id], ["state", "in", ["sale", "done"]]]],
    {
      fields: ["id", "name", "partner_id", "amount_total", "date_order", "state"],
      limit,
      order: "date_order desc",
    },
  );

  const totalSpent = orders.reduce((sum, o) => sum + (o.amount_total ?? 0), 0);
  return { partner, orders, totalSpent };
}

export async function getSalesSummary(startDate: string, endDate: string) {
  const domain = [
    ["date_order", ">=", startDate],
    ["date_order", "<=", endDate],
    ["state", "in", ["sale", "done"]],
  ];

  type SumGroup = { amount_total?: number; __count?: number };
  const [salesGroups, quotations, toInvoice] = await Promise.all([
    executeOdooKw<SumGroup[]>("sale.order", "read_group", [domain, ["amount_total:sum"], []]),
    getOdooCount("sale.order", [
      ["date_order", ">=", startDate],
      ["date_order", "<=", endDate],
      ["state", "in", ["draft", "sent"]],
    ]),
    getOdooCount("sale.order", [
      ...domain,
      ["invoice_status", "in", ["to invoice", "no"]],
    ]),
  ]);

  const total = salesGroups[0]?.amount_total ?? 0;
  const confirmedOrders = salesGroups[0]?.__count ?? 0;

  return {
    total,
    confirmedOrders,
    quotations,
    toInvoice,
    averageTicket: confirmedOrders > 0 ? total / confirmedOrders : 0,
  };
}

export async function getTopProducts(startDate: string, endDate: string, limit = 8) {
  type ProductGroup = { product_id?: [number, string] | false; product_uom_qty?: number; price_total?: number };
  const groups = await executeOdooKw<ProductGroup[]>(
    "sale.order.line",
    "read_group",
    [
      [
        ["order_id.date_order", ">=", startDate],
        ["order_id.date_order", "<=", endDate],
        ["order_id.state", "in", ["sale", "done"]],
      ],
      ["product_id", "product_uom_qty:sum", "price_total:sum"],
      ["product_id"],
    ],
    { limit, orderby: "price_total desc", lazy: false },
  );

  return groups
    .filter((g) => Array.isArray(g.product_id))
    .map((g) => {
      const [id, name] = g.product_id as [number, string];
      return { id, name, quantity: g.product_uom_qty ?? 0, amount: g.price_total ?? 0 };
    });
}

export async function getOdooConnectionStatus() {
  const uid = await authenticateOdoo();
  return {
    connected: true,
    database: getOdooConfig().database,
    uid,
  };
}

export async function getOdooProducts(limit = 20) {
  const config = getOdooConfig();
  const products = await executeOdooKw<Array<Omit<OdooProduct, "image_url">>>(
    "product.product",
    "search_read",
    [[["sale_ok", "=", true], ["active", "=", true]]],
    {
      fields: [
        "id",
        "name",
        "default_code",
        "list_price",
        "qty_available",
        "virtual_available",
        "barcode",
        "categ_id",
      ],
      limit,
      order: "write_date desc",
    },
  );

  return products.map((product) => ({
    ...product,
    image_url: `${config.url}/web/image/product.product/${product.id}/image_512`,
  }));
}

function translateOdooAppName(name: string) {
  const labels: Record<string, string> = {
    Accounting: "Contabilidad",
    Apps: "Aplicaciones",
    Barcode: "Código de barras",
    Calendar: "Calendario",
    Contacts: "Contactos",
    CRM: "CRM",
    Dashboards: "Tableros",
    Discuss: "Conversaciones",
    Employees: "Empleados",
    Inventory: "Inventario",
    Invoicing: "Facturación",
    Manufacturing: "Fabricación",
    Purchase: "Compra",
    Quality: "Calidad",
    Sales: "Ventas",
    Settings: "Ajustes",
    "Shop Floor": "Planta de producción",
    "Point of Sale": "Punto de venta",
    "Link Tracker": "Rastreador de enlaces",
    WhatsApp: "WhatsApp",
  };

  return labels[name] || name;
}

export async function getOdooApps() {
  const config = getOdooConfig();
  const menus = await executeOdooKw<OdooMenuRecord[]>(
    "ir.ui.menu",
    "search_read",
    [[["parent_id", "=", false]]],
    {
      fields: ["id", "name", "action", "web_icon_data", "sequence"],
      order: "sequence asc, name asc",
    },
  );

  return menus.map((menu) => ({
    id: menu.id,
    name: translateOdooAppName(menu.name),
    originalName: menu.name,
    action: menu.action || undefined,
    icon: menu.web_icon_data
      ? `data:image/png;base64,${menu.web_icon_data}`
      : undefined,
    url: `${config.url}/odoo?menu_id=${menu.id}`,
  }));
}

function formatOdooDate(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function getReportRange(period: OdooReportPeriod) {
  const now = new Date();
  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    start,
    end: now,
  };
}

function normalizeReportPeriod(period?: string | null): OdooReportPeriod {
  if (period === "today" || period === "week" || period === "month") {
    return period;
  }

  return "month";
}

function reportPeriodLabel(period: OdooReportPeriod) {
  const labels: Record<OdooReportPeriod, string> = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
  };

  return labels[period];
}

export async function getOdooSalesReport(periodInput?: string | null) {
  const period = normalizeReportPeriod(periodInput);
  const { start, end } = getReportRange(period);
  const domain = [["date_order", ">=", formatOdooDate(start)]];
  const confirmedDomain = [
    ...domain,
    ["state", "in", ["sale", "done"]],
  ];

  await authenticateOdoo();

  const orders = await executeOdooKw<OdooSaleOrder[]>(
    "sale.order",
    "search_read",
    [domain],
    {
      fields: [
        "id",
        "name",
        "partner_id",
        "amount_total",
        "state",
        "date_order",
        "user_id",
        "invoice_status",
      ],
      limit: 80,
      order: "date_order desc",
    },
  );

  const salesGroups = await executeOdooKw<OdooAmountGroup[]>(
    "sale.order",
    "read_group",
    [confirmedDomain, ["amount_total:sum"], []],
  );

  const confirmedSales = salesGroups[0]?.amount_total ?? 0;
  const confirmedOrders = salesGroups[0]?.__count ?? 0;
  const quotations = await getOdooCount("sale.order", [
    ...domain,
    ["state", "in", ["draft", "sent"]],
  ]);
  const toInvoice = await getOdooCount("sale.order", [
    ...confirmedDomain,
    ["invoice_status", "in", ["to invoice", "no"]],
  ]);
  const customerGroups = await executeOdooKw<OdooPartnerGroup[]>(
    "sale.order",
    "read_group",
    [confirmedDomain, ["partner_id"], ["partner_id"]],
    { lazy: false },
  );
  const topProductGroups = await executeOdooKw<OdooProductSalesGroup[]>(
    "sale.order.line",
    "read_group",
    [
      [
        ["order_id.date_order", ">=", formatOdooDate(start)],
        ["order_id.state", "in", ["sale", "done"]],
      ],
      ["product_id", "product_uom_qty:sum", "price_total:sum"],
      ["product_id"],
    ],
    { limit: 8, orderby: "price_total desc", lazy: false },
  );
  const stockProducts = await getOdooProducts(120);
  const opportunities = await executeOdooKw<OdooLead[]>(
    "crm.lead",
    "search_read",
    [[["create_date", ">=", formatOdooDate(start)], ["active", "=", true]]],
    {
      fields: [
        "id",
        "name",
        "stage_id",
        "expected_revenue",
        "probability",
        "partner_id",
        "user_id",
      ],
      limit: 8,
      order: "write_date desc",
    },
  ).catch(() => []);
  const expectedRevenue = opportunities.reduce(
    (sum, lead) => sum + (lead.expected_revenue ?? 0),
    0,
  );

  const topProducts = topProductGroups
    .filter((group) => Array.isArray(group.product_id))
    .map((group) => {
      const [id, name] = group.product_id as [number, string];
      return {
      id,
      name,
        quantity: group.product_uom_qty ?? 0,
        amount: group.price_total ?? 0,
      };
    });
  const lowStock = stockProducts
    .filter((product) => (product.qty_available ?? 0) <= 10)
    .sort((a, b) => (a.qty_available ?? 0) - (b.qty_available ?? 0))
    .slice(0, 8);

  return {
    period,
    label: reportPeriodLabel(period),
    startDate: formatOdooDate(start),
    endDate: formatOdooDate(end),
    orders,
    topProducts,
    lowStockProducts: lowStock,
    opportunities,
    metrics: {
      confirmedSales,
      confirmedOrders,
      quotations,
      averageTicket:
        confirmedOrders > 0 ? confirmedSales / confirmedOrders : 0,
      uniqueCustomers: customerGroups.filter((group) => group.partner_id).length,
      toInvoice,
      lowStock: lowStock.length,
      opportunities: opportunities.length,
      expectedRevenue,
    },
  } satisfies OdooSalesReport;
}
