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

export default function () {
  const loginRes = http.post('https://iec.kubeat.pro/api/login', JSON.stringify({
    email: 'admin@demo.com',
    password: 'admin123',
    remember: true
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login succeeded': (r) => r.status === 200 });

  const token = loginRes.json('result.token');

  // Шаг 2: используем токен в защищённых запросах
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const res = http.get('https://iec.kubeat.pro/api/client/summary', params);
  check(res, { 'status is 200': (r) => r.status === 200 });

  sleep(1);
}