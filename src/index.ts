import { createServer } from "./api/server";

const port = Number(process.env.PORT ?? 3000);
const app = createServer();

app.listen(port, () => {
  console.log(`Pantry backend listening on ${port}`);
});