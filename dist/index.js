"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./api/server");
const port = Number(process.env.PORT ?? 3000);
const app = (0, server_1.createServer)();
app.listen(port, () => {
    console.log(`Pantry backend listening on ${port}`);
});
//# sourceMappingURL=index.js.map