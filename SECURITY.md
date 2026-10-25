# Seguridad

## Reportar una vulnerabilidad

No abras un issue público. Escribe al responsable del proyecto (ver `CODEOWNERS`) con los pasos para reproducirla. Se responde en un máximo de 5 días hábiles.

## Prácticas del proyecto

- Secretos solo en variables de entorno; nunca en el repositorio. `.env` está en `.gitignore`.
- Toda entrada HTTP se valida con Zod; los errores no exponen el stack.
- Cabeceras de seguridad con `@fastify/helmet` y límite de peticiones con `@fastify/rate-limit`.
- El identificador del dispositivo se guarda como hash SHA-256; las coordenadas exactas no salen por la API pública.
- Dependencias actualizadas por Renovate; revisar avisos de `pnpm audit` en cada release.
