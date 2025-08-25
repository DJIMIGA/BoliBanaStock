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
    'web-production-e896b.up.railway.app',  // Railway - PRIORITÉ MAXIMALE
    '192.168.1.7',    // IP locale courante (fallback)
    '192.168.1.100',  // IP alternative (fallback)
    '10.0.2.2',       // Android Emulator localhost (fallback)
    'localhost',       // Fallback local
  ];

  private static readonly PORTS = [443, 80, 8000, 3000]; // 443 pour HTTPS Railway

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
              url: `https://${endpoint}/api/v1`, // Utilise HTTPS pour Railway
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
    const protocol = port === 443 ? 'https' : 'http';
    const url = `${protocol}://${ip}:${port}/api/v1/`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
      });
      return response.status === 200 || response.status === 401; // 401 = OK, auth requise
    } catch {
      return false;
    }
  }

  /**
   * Obtient l'IP locale (fallback)
   */
  static getLocalIP(): string {
    return 'web-production-e896b.up.railway.app'; // Utilise Railway par défaut
  }

  /**
   * Construit l'URL de l'API avec l'IP détectée
   */
  static buildApiUrl(endpoint: string, baseUrl?: string): string {
    if (baseUrl) {
      return `${baseUrl}${endpoint}`;
    }

    // Utilise Railway par défaut
    return `https://web-production-e896b.up.railway.app/api/v1${endpoint}`;
  }
}

/**
 * Configuration réseau par défaut
 */
export const DEFAULT_NETWORK_CONFIG = {
  API_BASE_URL: 'https://web-production-e896b.up.railway.app/api/v1', // Railway par défaut
  TIMEOUT: 15000,
};
