import pino from "pino";
import { env } from "../config/env.js";

export const loggerConfig = {
  level: env.LOG_LEVEL,
};

export const logger = pino(loggerConfig);
