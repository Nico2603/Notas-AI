'use client';

import { useAuth } from '@/contexts/AuthContext';
import AuthenticatedApp from '@/components/AuthenticatedApp';
import { Button } from '@/components/ui/button';
import { FaGoogle } from 'react-icons/fa';

export default function HomePage() {
  const { user, isLoading, signIn } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-soft border">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bienvenido a <span className="gradient-text">Notas-AI</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Tu asistente de IA para notas clínicas
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => signIn()}
              className="w-full btn-primary flex items-center justify-center gap-2"
              size="lg"
            >
              <FaGoogle className="h-5 w-5" />
              Iniciar sesión con Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthenticatedApp />;
} 