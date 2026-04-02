// чтобы запустить эту бурду, нужно в PowerShell вызвать

// cd C:\Users\Alex\WebstormProjects\idurar-erp-crm\backend
// k6 run src/tests/load-test.js

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  http.get('http://localhost:8888/public/settings');
  sleep(1);
}