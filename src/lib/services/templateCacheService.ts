// Servicio de cache local para plantillas con estrategias inteligentes
import { UserTemplate } from '@/lib/services/databaseService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  version: number;
}

interface CacheConfig {
  maxSize: number;
  maxAge: number; // en milisegundos
  storageKey: string;
  version: number;
}

interface TemplateUsageStats {
  templateId: string;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
}

class TemplateCacheService {
  private config: CacheConfig = {
    maxSize: 50, // máximo 50 plantillas en cache
    maxAge: 30 * 60 * 1000, // 30 minutos
    storageKey: 'notasai_template_cache',
    version: 2 // ← Incrementar versión para resetear caches existentes
  };

  private usageStatsKey = 'notasai_template_usage';
  private userKey = '';

  constructor() {
    // Solo hacer cleanup si estamos en el cliente
    if (this.isClient()) {
      this.cleanup();
    }
  }

  // Verificar si estamos en el cliente (browser)
  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Configurar cache para usuario específico
  setUser(userId: string): void {
    this.userKey = userId;
    this.config.storageKey = `notasai_template_cache_${userId}`;
    this.usageStatsKey = `notasai_template_usage_${userId}`;
  }

  // Obtener plantillas del cache (SIN incrementar contadores automáticamente)
  getTemplates(): UserTemplate[] | null {
    if (!this.isClient()) return null;
    
    try {
      const cached = localStorage.getItem(this.config.storageKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Verificar versión del cache
      if (cacheData.version !== this.config.version) {
        this.clear();
        return null;
      }

      const now = Date.now();
      const validEntries: UserTemplate[] = [];

      // Filtrar entradas válidas SIN incrementar contadores
      for (const [templateId, entry] of Object.entries(cacheData.data || {})) {
        const cacheEntry = entry as CacheEntry<UserTemplate>;
        
        // Verificar si no ha expirado
        if (now - cacheEntry.timestamp < this.config.maxAge) {
          validEntries.push(cacheEntry.data);
        }
      }

      if (validEntries.length === 0) {
        this.clear();
        return null;
      }

      console.log(`📦 Cache hit: ${validEntries.length} plantillas recuperadas del cache local`);
      return validEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
    } catch (error) {
      console.error('Error al leer cache de plantillas:', error);
      this.clear();
      return null;
    }
  }

  // Método específico para registrar el acceso a una plantilla individual
  recordTemplateAccess(templateId: string): void {
    if (!this.isClient()) return;
    
    try {
      const existing = this.getCacheData();
      const entry = existing[templateId];
      
      if (entry) {
        entry.lastAccessed = Date.now();
        entry.accessCount += 1;
        this.saveCache(existing);
        
        console.log(`📊 Acceso registrado para plantilla: ${entry.data.name} (${entry.accessCount} accesos)`);
      }
    } catch (error) {
      console.error('Error al registrar acceso a plantilla:', error);
    }
  }

  // Guardar plantillas en cache
  setTemplates(templates: UserTemplate[]): void {
    if (!this.isClient()) return;
    
    try {
      const now = Date.now();
      const cacheData: Record<string, CacheEntry<UserTemplate>> = {};
      
      // Leer cache existente para preservar estadísticas
      const existing = this.getCacheData();
      
      templates.forEach(template => {
        const existingEntry = existing[template.id];
        cacheData[template.id] = {
          data: template,
          timestamp: now,
          accessCount: existingEntry?.accessCount || 0, // Empezar en 0, no en 1
          lastAccessed: existingEntry?.lastAccessed || now,
          version: this.config.version
        };
      });

      // Aplicar límite de tamaño usando LRU
      const limitedCache = this.applyLRULimit(cacheData);
      this.saveCache(limitedCache);
      
      console.log(`💾 Cache actualizado: ${Object.keys(limitedCache).length} plantillas guardadas`);
      
    } catch (error) {
      console.error('Error al guardar cache de plantillas:', error);
    }
  }

  // Añadir una plantilla individual al cache
  addTemplate(template: UserTemplate): void {
    if (!this.isClient()) return;
    
    try {
      const existing = this.getCacheData();
      const now = Date.now();
      
      existing[template.id] = {
        data: template,
        timestamp: now,
        accessCount: 0, // Empezar en 0, no en 1
        lastAccessed: now,
        version: this.config.version
      };

      const limitedCache = this.applyLRULimit(existing);
      this.saveCache(limitedCache);
      
      console.log(`➕ Plantilla añadida al cache: ${template.name}`);
      
    } catch (error) {
      console.error('Error al añadir plantilla al cache:', error);
    }
  }

  // Actualizar una plantilla en el cache (SIN incrementar contador automáticamente)
  updateTemplate(template: UserTemplate): void {
    if (!this.isClient()) return;
    
    try {
      const existing = this.getCacheData();
      
      if (existing[template.id]) {
        const entry = existing[template.id];
        if (entry) {
          entry.data = template;
          entry.timestamp = Date.now();
          // NO incrementar accessCount automáticamente aquí
          
          this.saveCache(existing);
          console.log(`🔄 Plantilla actualizada en cache: ${template.name}`);
        }
      } else {
        this.addTemplate(template);
      }
      
    } catch (error) {
      console.error('Error al actualizar plantilla en cache:', error);
    }
  }

  // Eliminar una plantilla del cache
  removeTemplate(templateId: string): void {
    if (!this.isClient()) return;
    
    try {
      const existing = this.getCacheData();
      
      if (existing[templateId]) {
        delete existing[templateId];
        this.saveCache(existing);
        console.log(`🗑️ Plantilla eliminada del cache: ${templateId}`);
      }
      
    } catch (error) {
      console.error('Error al eliminar plantilla del cache:', error);
    }
  }

  // Verificar si el cache es válido y reciente
  isCacheValid(): boolean {
    if (!this.isClient()) return false;
    
    try {
      const cached = localStorage.getItem(this.config.storageKey);
      if (!cached) return false;

      const cacheData = JSON.parse(cached);
      return cacheData.version === this.config.version && 
             Object.keys(cacheData.data || {}).length > 0;
             
    } catch {
      return false;
    }
  }

  // Obtener plantillas más utilizadas
  getMostUsedTemplates(limit: number = 5): UserTemplate[] {
    const cached = this.getTemplates();
    if (!cached) return [];

    const existing = this.getCacheData();
    
    // Filtrar y mapear con la información de uso
    const templatesWithUsage = cached
      .map(template => {
        const entry = existing[template.id];
        if (!entry) return null;
        return {
          template,
          accessCount: entry.accessCount
        };
      })
      .filter((item): item is { template: UserTemplate; accessCount: number } => item !== null);
    
    // Solo retornar plantillas que tienen al menos 1 acceso
    return templatesWithUsage
      .filter(item => item.accessCount > 0)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(item => item.template);
  }

  // Obtener estadísticas del cache
  getCacheStats(): {
    totalTemplates: number;
    cacheSize: string;
    oldestEntry: string;
    newestEntry: string;
    mostUsed: string;
    hitRate?: number;
  } {
    if (!this.isClient()) {
      return {
        totalTemplates: 0,
        cacheSize: '0 KB',
        oldestEntry: 'N/A',
        newestEntry: 'N/A',
        mostUsed: 'N/A'
      };
    }
    
    try {
      const existing = this.getCacheData();
      const templates = Object.values(existing);
      
      if (templates.length === 0) {
        return {
          totalTemplates: 0,
          cacheSize: '0 KB',
          oldestEntry: 'N/A',
          newestEntry: 'N/A',
          mostUsed: 'N/A'
        };
      }

      const oldest = templates.reduce((prev, curr) => 
        prev.timestamp < curr.timestamp ? prev : curr
      );
      
      const newest = templates.reduce((prev, curr) => 
        prev.timestamp > curr.timestamp ? prev : curr
      );
      
      const mostUsed = templates.reduce((prev, curr) => 
        prev.accessCount > curr.accessCount ? prev : curr
      );

      const cacheData = localStorage.getItem(this.config.storageKey);
      const sizeInKB = cacheData ? Math.round(new Blob([cacheData]).size / 1024) : 0;

      return {
        totalTemplates: templates.length,
        cacheSize: `${sizeInKB} KB`,
        oldestEntry: oldest.data.name,
        newestEntry: newest.data.name,
        mostUsed: mostUsed.accessCount > 0 
          ? `${mostUsed.data.name} (${mostUsed.accessCount} accesos)`
          : 'Ninguna usada aún'
      };

    } catch (error) {
      console.error('Error al obtener estadísticas del cache:', error);
      return {
        totalTemplates: 0,
        cacheSize: '0 KB',
        oldestEntry: 'Error',
        newestEntry: 'Error',
        mostUsed: 'Error'
      };
    }
  }

  // Resetear contadores de acceso (útil para debugging)
  resetAccessCounters(): void {
    if (!this.isClient()) return;
    
    try {
      const existing = this.getCacheData();
      
      Object.keys(existing).forEach(templateId => {
        const entry = existing[templateId];
        if (entry) {
          entry.accessCount = 0;
          entry.lastAccessed = Date.now();
        }
      });
      
      this.saveCache(existing);
      console.log('🔄 Contadores de acceso reseteados');
    } catch (error) {
      console.error('Error al resetear contadores:', error);
    }
  }

  // Invalidar cache (forzar recarga desde servidor)
  invalidate(): void {
    this.clear();
    console.log('🔄 Cache de plantillas invalidado');
  }

  // Limpiar cache completamente
  clear(): void {
    if (!this.isClient()) return;
    
    try {
      localStorage.removeItem(this.config.storageKey);
      localStorage.removeItem(this.usageStatsKey);
      console.log('🧹 Cache de plantillas limpiado');
    } catch (error) {
      console.error('Error al limpiar cache:', error);
    }
  }

  // --- Métodos privados ---

  private getCacheData(): Record<string, CacheEntry<UserTemplate>> {
    if (!this.isClient()) return {};
    
    try {
      const cached = localStorage.getItem(this.config.storageKey);
      if (!cached) return {};

      const cacheData = JSON.parse(cached);
      return cacheData.data || {};
    } catch {
      return {};
    }
  }

  private saveCache(data: Record<string, CacheEntry<UserTemplate>>): void {
    if (!this.isClient()) return;
    
    const cacheData = {
      version: this.config.version,
      data,
      lastUpdated: Date.now()
    };

    localStorage.setItem(this.config.storageKey, JSON.stringify(cacheData));
  }

  private applyLRULimit(data: Record<string, CacheEntry<UserTemplate>>): Record<string, CacheEntry<UserTemplate>> {
    const entries = Object.entries(data);
    
    if (entries.length <= this.config.maxSize) {
      return data;
    }

    // Ordenar por última vez accedido (LRU)
    entries.sort(([, a], [, b]) => b.lastAccessed - a.lastAccessed);
    
    // Mantener solo los más recientes
    const limitedEntries = entries.slice(0, this.config.maxSize);
    
    console.log(`🔄 Cache LRU: manteniendo ${this.config.maxSize} de ${entries.length} plantillas`);
    
    return Object.fromEntries(limitedEntries);
  }

  private updateUsageStats(templates: UserTemplate[]): void {
    if (!this.isClient()) return;
    
    try {
      const stats: TemplateUsageStats[] = templates.map(template => ({
        templateId: template.id,
        accessCount: 0, // Empezar en 0
        lastAccessed: Date.now(),
        createdAt: new Date(template.created_at).getTime()
      }));

      localStorage.setItem(this.usageStatsKey, JSON.stringify(stats));
    } catch (error) {
      console.error('Error al actualizar estadísticas de uso:', error);
    }
  }

  private cleanup(): void {
    // Limpiar caches antiguos o corruptos al inicializar
    if (!this.isClient()) return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('notasai_template_cache_') || key.startsWith('notasai_template_usage_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              // Si no tiene versión o es una versión antigua, eliminar
              if (!parsed.version || parsed.version < this.config.version) {
                localStorage.removeItem(key);
                console.log(`🧹 Cache antiguo eliminado: ${key}`);
              }
            }
          } catch {
            localStorage.removeItem(key);
            console.log(`🧹 Cache corrupto eliminado: ${key}`);
          }
        }
      });
    } catch (error) {
      console.error('Error durante cleanup del cache:', error);
    }
  }
}

// Instancia singleton del servicio de cache
export const templateCacheService = new TemplateCacheService();

// Hook para estadísticas del cache
export const useTemplateCacheStats = () => {
  const getStats = () => templateCacheService.getCacheStats();
  const getMostUsed = (limit?: number) => templateCacheService.getMostUsedTemplates(limit);
  const invalidate = () => templateCacheService.invalidate();
  const clear = () => templateCacheService.clear();
  const resetCounters = () => templateCacheService.resetAccessCounters();
  const recordAccess = (templateId: string) => templateCacheService.recordTemplateAccess(templateId);

  return {
    getStats,
    getMostUsed,
    invalidate,
    clear,
    resetCounters,
    recordAccess
  };
}; 