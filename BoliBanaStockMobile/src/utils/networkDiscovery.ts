/**
 * Utilitaire pour détecter automatiquement l'IP du serveur Django
 */

export interface NetworkEndpoint {
  ip: string;
  port: number;
  url: string;
  isReachable: boolean;
}

export class NetworkDiscovery {
  private static readonly COMMON_IPS = [
    '192.168.1.7',    // IP locale courante
    '192.168.1.100',  // IP alternative
    '10.0.2.2',       // Android Emulator localhost
    'localhost',       // Fallback local
  ];

  private static readonly PORTS = [8000, 3000];

  /**
   * Détecte automatiquement l'endpoint du serveur
   */
  static async discoverServer(): Promise<NetworkEndpoint | null> {
    console.log('🔍 Découverte automatique du serveur...');

    for (const ip of this.COMMON_IPS) {
      for (const port of this.PORTS) {
        const endpoint = `${ip}:${port}`;
        console.log(`  Test de ${endpoint}...`);

        try {
          const isReachable = await this.testEndpoint(ip, port);
          if (isReachable) {
            console.log(`✅ Serveur trouvé sur ${endpoint}`);
            return {
              ip,
              port,
              url: `http://${endpoint}/api/v1`,
              isReachable: true,
            };
          }
        } catch (error) {
          console.log(`❌ ${endpoint} non accessible`);
        }
      }
    }

    console.log('❌ Aucun serveur trouvé');
    return null;
  }

  /**
   * Teste si un endpoint est accessible
   */
  private static async testEndpoint(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);

      // Test simple avec fetch
      fetch(`http://${ip}:${port}/api/v1/`, {
        method: 'GET',
        timeout: 3000,
      })
        .then((response) => {
          clearTimeout(timeout);
          resolve(response.ok);
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
    });
  }

  /**
   * Obtient l'IP locale de l'appareil
   */
  static getLocalIP(): string {
    // Pour le développement, retourner l'IP la plus probable
    return '192.168.1.7';
  }

  /**
   * Construit l'URL de l'API avec l'IP détectée
   */
  static buildApiUrl(endpoint: string, baseUrl?: string): string {
    if (baseUrl) {
      return `${baseUrl}${endpoint}`;
    }

    // Fallback vers l'IP locale
    const localIP = this.getLocalIP();
    return `http://${localIP}:8000/api/v1${endpoint}`;
  }
}

/**
 * Configuration réseau par défaut
 */
export const DEFAULT_NETWORK_CONFIG = {
  API_BASE_URL: 'http://192.168.1.7:8000/api/v1',
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
};
