---
name: git-commit
description: >-
  Commits every change on the single main branch and pushes it to the Job
  Matching Assistant GitHub repository. Use when the user asks to commit,
  make a git commit, push, upload the project, or subir cambios a GitHub.
---

# Git commit

Solo se maneja una rama: `main`. No crear otras ramas. No cambiar `git config`. No usar `--force`, `--no-verify`, ni `--amend`.

Si el directorio no es un repositorio git, ejecutar `git init` antes de los pasos siguientes.

Antes de agregar archivos, revisar si hay secretos (`.env`, credenciales, llaves, tokens). Si aparecen, avisar y dejarlos fuera del commit.

## Regla

Siempre:

```
git add .
git commit -m ""
```

El mensaje del commit debe describir que se esta subiendo y siempre precedido por el prefijo: feat, fix, enhance, etc. Ejemplo: "feat: implementing new models for support..."

Prefijos:

- `feat`: funcionalidad nueva
- `fix`: correccion
- `enhance`: mejora de algo que ya existe
- `docs`: solo documentacion
- `refactor`: cambio interno sin comportamiento nuevo
- `chore`: mantenimiento
- `test`: pruebas

Formato: `prefijo: descripcion en una linea`

## Subir

Se subira a este repo:

```
git remote add origin https://github.com/jucarata/Job-Matching-Assistant.git
git branch -M main
git push -u origin main
```

Si `origin` ya existe, no volver a ejecutar `git remote add`. Seguir con `git branch -M main` y `git push -u origin main`.

Despues del push, ejecutar `git status` para confirmar que la rama `main` quedo publicada.
