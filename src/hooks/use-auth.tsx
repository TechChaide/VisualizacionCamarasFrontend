'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Con httpOnly cookies, no tenemos token en localStorage
        // Solo verificamos que existan user y appsByProfile
        const userData = localStorage.getItem('user');
        const appsByProfile = localStorage.getItem('appsByProfile');

        if (!userData || !appsByProfile) {
          setIsAuthenticated(false);
          setUser(null);
          toast({
            title: "Sesión requerida",
            description: "Debes iniciar sesión para acceder a esta página",
            variant: "destructive",
          });
          router.push('/');
          return;
        }

        try {
          const parsedUser = JSON.parse(userData);
          const parsedAppsByProfile = JSON.parse(appsByProfile);
          
          // Verificar que tenga al menos una aplicación
          if (!Object.keys(parsedAppsByProfile || {}).length) {
            setIsAuthenticated(false);
            setUser(null);
            toast({
              title: "Sin permisos",
              description: "No tienes acceso a ninguna aplicación configurada",
              variant: "destructive",
            });
            router.push('/');
            return;
          }

          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (parseError) {
          setIsAuthenticated(false);
          setUser(null);
          toast({
            title: "Error de sesión",
            description: "Datos de sesión inválidos. Por favor inicia sesión nuevamente",
            variant: "destructive",
          });
          router.push('/');
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        toast({
          title: "Error de autenticación",
          description: "Error al verificar la sesión",
          variant: "destructive",
        });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, toast]);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
}