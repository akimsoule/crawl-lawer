import type { Config } from "@netlify/functions";

async function handler(req: Request) {
  const { next_run } = await req.json();

  console.log("Received event! Next invocation at:", next_run);
}

export default handler;
export const config: Config = {
  schedule: "@hourly",
};
