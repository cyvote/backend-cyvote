import { isIP } from 'net';

export interface IpExtractionConfig {
  trustProxy: boolean;
  proxyHeaders: string[];
}

export class IpExtractorUtil {
  /**
   * Extract real IP address from request
   * Handles proxy headers and direct connections
   */
  static extractRealIp(request: any, config: IpExtractionConfig): string {
    // If not trusting proxy, return normalized direct connection IP
    if (!config.trustProxy) {
      const rawIp =
        request.ip ||
        request.connection?.remoteAddress ||
        request.socket?.remoteAddress ||
        '0.0.0.0';

      return this.normalizeIp(rawIp);
    }

    // Try to get IP from proxy headers
    for (const header of config.proxyHeaders) {
      const headerValue = request.headers[header.toLowerCase()];

      if (headerValue) {
        // Handle comma-separated list (e.g., X-Forwarded-For)
        const ips = headerValue.split(',').map((ip: string) => ip.trim());

        // Return first valid IP (normalized)
        for (const ip of ips) {
          const normalized = this.normalizeIp(ip);
          if (this.isValidIp(normalized)) {
            return normalized;
          }
        }
      }
    }

    // Fallback to normalized direct connection IP
    const rawIp =
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      '0.0.0.0';

    return this.normalizeIp(rawIp);
  }

  /**
   * Normalize IP address by stripping IPv4-mapped IPv6 prefix
   * Converts ::ffff:192.168.1.1 to 192.168.1.1 for consistent identification
   */
  static normalizeIp(ip: string): string {
    if (!ip) return '0.0.0.0';

    // Strip IPv4-mapped IPv6 prefix (::ffff:x.x.x.x)
    const ipv4MappedPrefix = '::ffff:';
    if (ip.toLowerCase().startsWith(ipv4MappedPrefix)) {
      return ip.substring(ipv4MappedPrefix.length);
    }

    return ip;
  }

  /**
   * Validate IP address format (IPv4 or IPv6)
   * Uses Node.js built-in net.isIP() for reliable validation
   * that handles all formats including compressed IPv6, loopback, etc.
   */
  private static isValidIp(ip: string): boolean {
    if (!ip) return false;

    // net.isIP returns 4 for IPv4, 6 for IPv6, 0 for invalid
    return isIP(ip) !== 0;
  }
}
