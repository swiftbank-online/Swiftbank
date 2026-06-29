// @ts-ignore
import serverApp from "../dist/server.cjs";

const app = (serverApp && (serverApp as any).default) || serverApp;

export default app;
