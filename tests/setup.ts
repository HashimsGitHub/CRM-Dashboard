import { config } from "dotenv";
config({ path: ".env.local" });
config();

// Tests truncate tables, so they must never run against DATABASE_URL.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set TEST_DATABASE_URL to a disposable Postgres database to run tests (see README).");
if (testUrl === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
process.env.DATABASE_URL = testUrl;
process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234567890";
