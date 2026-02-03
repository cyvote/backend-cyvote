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
    // If not trusting proxy, return direct connection IP
    if (!config.trustProxy) {
      return (
        request.ip ||
        request.connection?.remoteAddress ||
        request.socket?.remoteAddress ||
        '0.0.0.0'
      );
    }

    // Try to get IP from proxy headers
    for (const header of config.proxyHeaders) {
      const headerValue = request.headers[header.toLowerCase()];

      if (headerValue) {
        // Handle comma-separated list (e.g., X-Forwarded-For)
        const ips = headerValue.split(',').map((ip: string) => ip.trim());

        // Return first valid IP
        for (const ip of ips) {
          if (this.isValidIp(ip)) {
            return ip;
          }
        }
      }
    }

    // Fallback to direct connection IP
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      '0.0.0.0'
    );
  }

  /**
   * Validate IP address format (IPv4 or IPv6)
   */
  private static isValidIp(ip: string): boolean {
    if (!ip) return false;

    // IPv4 regex
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}
