import pino from "pino";
import { webEnv } from "./env";

export const logger = pino({ level: webEnv.LOG_LEVEL });
