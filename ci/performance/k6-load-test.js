/**
 * k6 Load Test Script — Exchange Backoffice
 *
 * Test scenarios: baseline, peak, stress, spike, soak
 *
 * Usage:
 *   k6 run ci/performance/k6-load-test.js
 *   k6 run ci/performance/k6-load-test.js --env SCENARIO=peak
 *   k6 run ci/performance/k6-load-test.js --out json=results.json
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const FRONTEND_URL = __ENV.FRONTEND_URL || "http://localhost:5173";
const SCENARIO = __ENV.SCENARIO || "baseline";

// Custom metrics
const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration", true);
const uploadDuration = new Trend("upload_duration", true);
const listDuration = new Trend("list_documents_duration", true);
const healthDuration = new Trend("health_check_duration", true);

// Test users
const TEST_USERS = [
  { email: "alice@exchange.dev", password: "password123", role: "SUBMITTER" },
  { email: "bob@exchange.dev", password: "password123", role: "VALIDATOR" },
  { email: "carol@exchange.dev", password: "password123", role: "SUPERVISOR" },
];

// ---------------------------------------------------------------------------
// Scenario configurations
// ---------------------------------------------------------------------------
const scenarios = {
  baseline: {
    executor: "constant-vus",
    vus: 10,
    duration: "10m",
    gracefulStop: "30s",
  },
  peak: {
    executor: "constant-vus",
    vus: 20,
    duration: "15m",
    gracefulStop: "30s",
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 10 },
      { duration: "5m", target: 25 },
      { duration: "5m", target: 50 },
      { duration: "3m", target: 0 },
    ],
    gracefulStop: "30s",
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 5,
    stages: [
      { duration: "10s", target: 100 },
      { duration: "60s", target: 100 },
      { duration: "10s", target: 5 },
      { duration: "2m", target: 5 },
    ],
    gracefulStop: "30s",
  },
  soak: {
    executor: "constant-vus",
    vus: 10,
    duration: "1h",
    gracefulStop: "1m",
  },
};

export const options = {
  scenarios: {
    default: scenarios[SCENARIO] || scenarios.baseline,
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    "http_req_duration{type:read}": ["p(95)<500"],
    "http_req_duration{type:write}": ["p(95)<2000"],
    "http_req_duration{type:upload}": ["p(95)<5000"],
    errors: ["rate<0.01"],
    health_check_duration: ["p(95)<100"],
    login_duration: ["p(95)<1000"],
    list_documents_duration: ["p(95)<500"],
  },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
function login(user) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { type: "write", name: "login" },
    }
  );

  loginDuration.add(res.timings.duration);

  const success = check(res, {
    "login status 200": (r) => r.status === 200,
    "login has token": (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  errorRate.add(0);
  return JSON.parse(res.body).token;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------
export default function () {
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // Health check
  group("Health Check", function () {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { type: "read", name: "health" },
    });
    healthDuration.add(res.timings.duration);
    const ok = check(res, {
      "health status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // Login
  let token;
  group("Authentication", function () {
    token = login(user);
  });

  if (!token) {
    sleep(2);
    return;
  }

  sleep(1);

  // List documents
  group("List Documents", function () {
    const res = http.get(`${BASE_URL}/api/documents`, {
      headers: authHeaders(token),
      tags: { type: "read", name: "list_documents" },
    });
    listDuration.add(res.timings.duration);
    const ok = check(res, {
      "list docs status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // Role-specific actions
  if (user.role === "SUBMITTER") {
    group("Document Upload", function () {
      // Create a small test file
      const fileData = "test,data,for,load,testing\n1,2,3,4,5\n";
      const boundary = "----k6boundary" + Date.now();

      const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="test-${Date.now()}.csv"\r\n` +
        `Content-Type: text/csv\r\n\r\n` +
        `${fileData}\r\n` +
        `--${boundary}--\r\n`;

      const res = http.post(`${BASE_URL}/api/documents/upload`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        tags: { type: "upload", name: "upload_document" },
      });

      uploadDuration.add(res.timings.duration);
      const ok = check(res, {
        "upload status 2xx": (r) => r.status >= 200 && r.status < 300,
      });
      errorRate.add(!ok);
    });
  }

  if (user.role === "VALIDATOR" || user.role === "SUPERVISOR") {
    group("Review Queue", function () {
      const res = http.get(`${BASE_URL}/api/documents?status=PENDING_REVIEW`, {
        headers: authHeaders(token),
        tags: { type: "read", name: "review_queue" },
      });
      const ok = check(res, {
        "review queue status 200": (r) => r.status === 200,
      });
      errorRate.add(!ok);
    });
  }

  // Think time (simulates real user behavior)
  sleep(Math.random() * 3 + 1);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------
export function setup() {
  // Verify the system is reachable
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(
      `System not reachable: ${BASE_URL}/health returned ${res.status}`
    );
  }
  console.log(`Load test starting — scenario: ${SCENARIO}, target: ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`Load test complete — started at ${data.startTime}`);
}
