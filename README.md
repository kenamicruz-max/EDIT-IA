# EDIT-AI V5.1 MAX

Repositorio de EDIT-AI: reconstrucción automática de edición de video usando un MP4 de referencia (A) y un MP4 fuente (B).

## Contenido

El archivo `edit-ai-source.zip` contiene el código completo de la versión V5.1 MAX. El Dockerfile raíz está preparado para que RunPod pueda construir el worker desde la raíz del repositorio.

## Flujo

A + B → análisis multi-agente → source matching → edit spec → render GPU → quality check → autocorrect → MP4 final.

## Importante

El MP4 no contiene necesariamente el proyecto original de CapCut/After Effects. EDIT-AI reconstruye propiedades observables y no inventa datos ocultos.

Para producción distribuida, los MP4 deben viajar mediante object storage/URLs firmadas o directamente al worker; nunca se debe pasar una ruta de disco local de Vercel a RunPod.

## RunPod

Selecciona este repositorio en RunPod y usa el `Dockerfile` de la raíz. Guarda las claves como secrets. Ajusta la GPU al modelo/pipeline que se instale.
