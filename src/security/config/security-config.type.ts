export type SecurityConfig = {
  rateLimit: {
    global: {
      ttl: number; // Time window in seconds (60)
      limit: number; // Max requests per window (100)
    };
    login: {
      ttl: number; // Time window in seconds (600)
      limit: number; // Max attempts per window (5)
    };
    tokenVerify: {
      ttl: number; // Time window in seconds (300)
      limit: number; // Max attempts per window (3)
    };
    storage: {
      cleanupInterval: number; // Cleanup interval in ms (60000)
    };
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean | object;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean | object;
    hidePoweredBy: boolean;
    hsts: boolean | object;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean | object;
    xssFilter: boolean;
  };
  csrf: {
    enabled: boolean;
    cookieName: string;
    headerName: string;
    secret: string;
    ttl: number; // Token TTL in seconds
  };
  ipExtraction: {
    trustProxy: boolean;
    proxyHeaders: string[]; // ['x-forwarded-for', 'x-real-ip']
  };
};
