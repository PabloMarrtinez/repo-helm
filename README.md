## Crear un repo para helm

Creas un nuevo repositorio que debe contener los archivos:
1. Comprimidos `tgz` con la herramienta.
2. indice, generado con:

```bash
helm repo index .
```

3. Habilitamos `pages` en la rama del repositorio en la que tenemos los tgz y el index. `Settings > Pages > Source` seleccionamos la rama que queramos y la carpeta ("\").

## Repositorio con contenedores en dockerhub

Podemos usar dockerhub como repo de contenedores, cuando hacemos push le asignamos a cada imagen un **tag**, para despues referenciarlo en nuestros charts de la siguiente forma:

```yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wallet
  labels:
    app: wallet
spec:
  replicas: 1
  selector:
    matchLabels:
      app: wallet
  template:
    metadata:
      labels:
        app: wallet
    spec:
      containers:
      - name: ssi-core-dev-env
        image: pablomarrtinez/wallet:v2.1
        command: ["/bin/sh", "-c"]
        args: 
            /app/ssikit.sh fullApi
```

`image: <nombre_uusario>/<nombre_repo>:<tag>`


## Actualizar o crear un componente

### 1. Descomprimir el .tgz con la herramienta

```bash
tar -xzvf data-space-connector-6.0.0.tgz
```

Estructura:

```bash
.
├── charts
│   ├── <COMPONENTE 1>
│   |    ├── Chart.yaml
│   |    ├── templates
│   |    │   ├── ....
│   |    └── values.yaml
|   ├── <COMPONENTE 2>
|   ....
├── Chart.yaml
├── templates
│   ├── argo-application.yaml
│   └── _helpers.tpl
└── values.yaml
```

### 2. Añadir nuestro componente

1. Añadimos el chart dentro de `/charts`
2. Dentro del archivo global del `Chart.yaml` añadimos la infromación de nuestro componente referenciando a a la carpeta dentro de `/charts` que hemos creado:

```yml
...
- condition: wallet.deploymentEnabled
  name: wallet
  repository: file://./charts/wallet
  version: 0.1.0
...
```

En este fichero **también** podemos especificar la versión de la herramienta.

3. Añadir el contenido del `values.yaml` de nuestro componente dentro del `values.yml` **global**.

```yml
<COMPONENT>:
  deploymentEnabled: true
  <COMPONENT>:
    <CONTENIDO_VALUES>


Ejemplo:
wallet:
  deploymentEnabled: true
  wallet:
    ReplicaCount: 1
    FABRIC_ENDPOINT: "192.168.49.1"
    ISSUER_PORT: 32000
    VERIFIER_PORT: 32001
    WALLET_PORT: 32002
```


### 3. Comprimir de nuevo el .tgz.

```bash
tar -czvf file.tgz data-space-connector
```

Una vez tenemos el .tgz debemos subirlo a nuestro repositorio y actualizar el fichero `index.yaml` con:

```bash
helm repo index . --url <REPO_URL>

Ejemplo:
helm repo index . --url https://pablomarrtinez.github.io/repo-helm/
```

Finalmente, actualizamos el repositorio. Una vez este hecho podemos cargar la herramienta con:

```bash
helm dependency update
helm search repo <name>
helm install -n ips -f ./values-tango.yaml ips-dsc dsc/data-space-connector --version <version>
```
En el caso de que no tengamos el repositorio importado a helm:

```bash
helm repo add <nombre-del-repositorio> <url-del-repositorio>
```


