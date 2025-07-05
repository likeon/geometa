import { prod } from "@api/lib/utils/env";
import bearer from "@elysiajs/bearer";
import { Elysia } from "elysia";

const frontendToken = process.env.FRONTEND_API_TOKEN;

export function auth(jwt?: boolean) {
  return new Elysia({ name: "geometa-auth" })
    .use(bearer())
    .onBeforeHandle(({ bearer, status }) => {
      if (prod) {
        if (!bearer) {
          return status(401);
        }

        if (bearer !== frontendToken) {
          return status(403);
        }
      }
    })
    .macro({
      userId: {
        async resolve({ status, request: { headers } }) {
          const userId = headers.get("x-api-user-id");
          if (!userId) {
            return status(401);
          }

          return { userId };
        },
      },
    })
    .as("global");
}
