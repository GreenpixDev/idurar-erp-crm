// чтобы запустить эту бурду, нужно в PowerShell вызвать

// cd C:\Users\Alex\WebstormProjects\idurar-erp-crm\backend
// k6 run src/tests/load-test.js

import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

const BASE = 'https://iec.kubeat.pro/api';

function rand(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}

function randomClient() {
  const countries = ['BY', 'US', 'DE', 'FR', 'PL', 'UA', 'RU'];
  const id = rand(6);
  return {
    name: `User_${id}`,
    country: countries[Math.floor(Math.random() * countries.length)],
    address: `Street ${rand(4)} ${Math.floor(Math.random() * 999)}`,
    email: `user_${id}@test-${rand(4)}.com`,
  };
}

function randomInvoice(clientId) {
  const now = new Date();
  const expired = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const qty = Math.floor(Math.random() * 10) + 1;
  const price = Math.floor(Math.random() * 500) + 10;
  return {
    client: clientId,
    number: Math.floor(Math.random() * 100000),
    year: now.getFullYear(),
    status: 'draft',
    date: now.toISOString(),
    expiredDate: expired.toISOString(),
    notes: `Note ${rand(5)}`,
    items: [
      {
        itemName: `Item_${rand(4)}`,
        description: `desc ${rand(6)}`,
        price: price,
        quantity: qty,
        total: price * qty,
      },
    ],
    taxRate: 0,
  };
}

export default function () {
  // 1. Login
  const loginRes = http.post(
      `${BASE}/login`,
      JSON.stringify({ email: 'admin@demo.com', password: 'admin123', remember: true }),
      { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, { 'login succeeded': (r) => r.status === 200 });

  const token = loginRes.json('result.token');
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // 2. Summary
  const summaryRes = http.get(`${BASE}/client/summary`, params);
  check(summaryRes, { 'summary 200': (r) => r.status === 200 });

  // 3. Settings list
  const settingsRes = http.get(`${BASE}/setting/listAll`, params);
  check(settingsRes, { 'settings 200': (r) => r.status === 200 });

  // 4. Create client with generated data
  const clientPayload = randomClient();
  const createClientRes = http.post(
      `${BASE}/client/create`,
      JSON.stringify(clientPayload),
      params
  );
  check(createClientRes, { 'client created': (r) => r.status === 200 });

  const clientId = createClientRes.json('result._id');

  // 5. Search clients
  const searchRes = http.get(`${BASE}/client/search?q=&fields=name`, params);
  check(searchRes, { 'search 200': (r) => r.status === 200 });

  // 6. Create invoice with generated data
  if (clientId) {
    const invoicePayload = randomInvoice(clientId);
    const createInvoiceRes = http.post(
        `${BASE}/invoice/create`,
        JSON.stringify(invoicePayload),
        params
    );
    check(createInvoiceRes, { 'invoice created': (r) => r.status === 200 });

    const invoiceId = createInvoiceRes.json('result._id');

    // 7. Read invoice
    if (invoiceId) {
      const readRes = http.get(`${BASE}/invoice/read/${invoiceId}`, params);
      check(readRes, { 'invoice read 200': (r) => r.status === 200 });
    }
  }

  sleep(1);
}