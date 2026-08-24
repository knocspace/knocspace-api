// Prisma CLI 설정. 앱이 아니라 prisma 명령이 읽습니다.
import { defineConfig } from "prisma/config";
import { loadEnvFile } from "./src/env-file.js";

loadEnvFile();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
