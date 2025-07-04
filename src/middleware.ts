/*
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting en memoria (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Configuración de rate limiting por ruta
const RATE_LIMITS = {
  '/api/messages': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 mensajes por minuto
  '/api/sessions': { maxRequests: 10, windowMs: 60 * 1000 },  // 10 sesiones por minuto
  '/api/notes': { maxRequests: 50, windowMs: 60 * 1000 },     // 50 notas por minuto
  '/api/profile': { maxRequests: 30, windowMs: 60 * 1000 },   // 30 requests por minuto
  '/api/admin': { maxRequests: 50, windowMs: 60 * 1000 },     // 50 requests admin por minuto
  '/api/templates': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 templates por minuto
};

function isRateLimited(identifier: string, path: string): boolean {
  const now = Date.now();
  const routeConfig = RATE_LIMITS[path as keyof typeof RATE_LIMITS];
  
  if (!routeConfig) {
    return false; // No rate limiting para rutas no configuradas
  }
  
  const key = `${identifier}:${path}`;
  const userLimit = rateLimitMap.get(key);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + routeConfig.windowMs
    });
    return false;
  }
  
  if (userLimit.count >= routeConfig.maxRequests) {
    return true;
  }
  
  userLimit.count++;
  return false;
}

// Limpiar entradas vencidas periódicamente
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // Limpiar cada minuto

export async function middleware(request: NextRequest) {
  // Solo aplicar rate limiting a rutas de API
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Rutas que no requieren rate limiting
  const publicRoutes = ['/api/health'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    // Usar IP como identificador para rate limiting
    const identifier = request.ip || 
                      request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      'anonymous';

    // Verificar rate limiting
    const path = request.nextUrl.pathname;
    const baseRoute = Object.keys(RATE_LIMITS).find(route => 
      path.startsWith(route)
    );

    if (baseRoute && isRateLimited(identifier, baseRoute)) {
      const routeConfig = RATE_LIMITS[baseRoute as keyof typeof RATE_LIMITS];
      
      return NextResponse.json(
        { 
          error: 'Rate limit excedido',
          message: `Máximo ${routeConfig.maxRequests} requests por ${routeConfig.windowMs / 1000} segundos`,
          retryAfter: Math.ceil(routeConfig.windowMs / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(routeConfig.windowMs / 1000)),
            'X-RateLimit-Limit': String(routeConfig.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + routeConfig.windowMs)
          }
        }
      );
    }

    // Agregar headers informativos de rate limit
    if (baseRoute) {
      const key = `${identifier}:${baseRoute}`;
      const userLimit = rateLimitMap.get(key);
      const routeConfig = RATE_LIMITS[baseRoute as keyof typeof RATE_LIMITS];
      
      if (userLimit) {
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', String(routeConfig.maxRequests));
        response.headers.set('X-RateLimit-Remaining', String(Math.max(0, routeConfig.maxRequests - userLimit.count)));
        response.headers.set('X-RateLimit-Reset', String(userLimit.resetTime));
        return response;
      }
    }

    return NextResponse.next();

  } catch (error) {
    console.error('Error en middleware:', error);
    return NextResponse.next(); // Continuar en caso de error
  }
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas de API excepto las estáticas
    '/api/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 
*/

// Middleware desactivado para static export
// Las rutas de API no funcionan con static export
export function middleware() {
  // No hacer nada en static export
}

export const config = {
  matcher: [],
}; 