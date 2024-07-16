
# Paso 1: Creación de tu propia rama

Imita la rama de **pablo** para crear tu propia rama con el código del connector.

Para generar el archivo `.tgz` ejecutamos:

```bash
helm dependecy update
helm package .
```

# Paso 2: Movemos el archivo comprimo a la rama gh-pages

Esta rama es la ahora tiene la configuración para actuar como repositorio de helm.

Actualizamos el index:

```bash
helm repo index .
```

Actualizamos el repositorio:

```bash
git add .
git commit -m "msj"
git push origin gh-pages
```

# Paso 2: Comunicación a través de la cli

```bash
helm repo add connector https://PabloMarrtinez.github.io/repo-helm/
helm repo update
helm search repo connector
```