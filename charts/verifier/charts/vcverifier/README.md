# vcverifier

![Version: 1.0.22](https://img.shields.io/badge/Version-1.0.22-informational?style=flat-square) ![AppVersion: 2.0.1](https://img.shields.io/badge/AppVersion-2.0.1-informational?style=flat-square)

A Helm chart for running the i4Trust DSBA VCVerifier.

**Homepage:** <https://github.com/fiware/vcverifier>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| wistefan | <stefan.wiedemann@fiware.org> |  |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| deployment.additionalAnnotations | object | `{}` | additional annotations for the deployment, if required |
| deployment.additionalLabels | object | `{}` | additional labels for the deployment, if required |
| deployment.affinity | object | `{}` | affinity template ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity |
| deployment.configRepo | object | `{"configEndpoint":"http://credentials-config:8080/"}` | config repo configuration |
| deployment.image.pullPolicy | string | `"IfNotPresent"` | specification of the image pull policy |
| deployment.image.repository | string | `"quay.io/fiware/vcverifier"` | image name |
| deployment.image.tag | string | `"2.0.1"` | tag of the image to be used |
| deployment.livenessProbe.initialDelaySeconds | int | `3` |  |
| deployment.livenessProbe.periodSeconds | int | `10` |  |
| deployment.livenessProbe.successThreshold | int | `1` |  |
| deployment.livenessProbe.timeoutSeconds | int | `30` |  |
| deployment.logging | object | `{"jsonLogging":true,"level":"WARN","logRequests":true,"pathsToSkip":["/metrics","/health"]}` | logging configuration |
| deployment.logging.jsonLogging | bool | `true` | should the log be in structured json |
| deployment.logging.level | string | `"WARN"` | the log level, can be DEBUG, INFO, WARN, ERROR |
| deployment.logging.logRequests | bool | `true` | should requests be logged |
| deployment.logging.pathsToSkip | list | `["/metrics","/health"]` | list of paths to be excluded from the request logging |
| deployment.m2m | object | `{"authEnabled":false,"clientId":"tir-res","credentialPath":"/opt/credential/credential.json","keyPath":"/opt/did/secret/tls.key","verificationMethod":"did:example:key#1"}` | m2m related config |
| deployment.nodeSelector | object | `{}` | selector template ref: https://kubernetes.io/docs/user-guide/node-selection/ |
| deployment.port | int | `3000` | port to run the container at |
| deployment.readinessProbe.initialDelaySeconds | int | `4` |  |
| deployment.readinessProbe.periodSeconds | int | `10` |  |
| deployment.readinessProbe.successThreshold | int | `1` |  |
| deployment.readinessProbe.timeoutSeconds | int | `30` |  |
| deployment.replicaCount | int | `1` | initial number of target replications, can be different if autoscaling is enabled |
| deployment.revisionHistoryLimit | int | `3` | number of old replicas to be retained |
| deployment.server | object | `{"host":"my-verifier.org","staticDir":"views/static","templateDir":"views/"}` | configuration for server |
| deployment.server.host | string | `"my-verifier.org"` | host of the verifier |
| deployment.server.staticDir | string | `"views/static"` | directory to be used for static content, f.e. images referenced from the templates |
| deployment.server.templateDir | string | `"views/"` | directory to be used for retrieving the templates. |
| deployment.ssikit | object | `{"auditorUrl":"https://auditor.walt"}` | ssikit related configuration |
| deployment.ssikit.auditorUrl | string | `"https://auditor.walt"` | address of the auditor url |
| deployment.tolerations | list | `[]` | tolerations template ref: ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/ |
| deployment.updateStrategy.rollingUpdate | object | `{"maxSurge":1,"maxUnavailable":0}` | new pods will be added gradually |
| deployment.updateStrategy.rollingUpdate.maxSurge | int | `1` | number of pods that can be created above the desired amount while updating |
| deployment.updateStrategy.rollingUpdate.maxUnavailable | int | `0` | number of pods that can be unavailable while updating |
| deployment.updateStrategy.type | string | `"RollingUpdate"` | type of the update |
| deployment.verifier | object | `{"did":"did:key:myverifier","sessionExpiry":30,"tirAddress":"http://my-tir.org"}` | configuration required for the verifier functionality |
| deployment.verifier.did | string | `"did:key:myverifier"` | did to be used for the verifier |
| deployment.verifier.sessionExpiry | int | `30` | expiry of a login-session in seconds |
| deployment.verifier.tirAddress | string | `"http://my-tir.org"` | address of the trusted issuers registry to be used for verification |
| fullnameOverride | string | `""` |  |
| ingress.annotations | object | `{}` | annotations to be added to the ingress |
| ingress.enabled | bool | `false` | should there be an ingress to connect the verifier with the public internet |
| ingress.hosts | list | `[]` | all hosts to be provided |
| ingress.tls | list | `[]` | configure the ingress' tls |
| nameOverride | string | `""` |  |
| route.annotations | object | `{}` | annotations to be added to the route |
| route.certificate | object | `{}` | see: https://github.com/FIWARE-Ops/fiware-gitops/blob/master/doc/ROUTES.md |
| route.enabled | bool | `false` |  |
| route.tls | object | `{"termination":"edge"}` | tls configuration for the route |
| service.annotations | object | `{}` | additional annotations, if required |
| service.port | int | `3000` | port to be set for the internal service |
| service.type | string | `"ClusterIP"` | service type |
| serviceAccount | object | `{"create":false}` | if a specific service account should be used, it can be configured here ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/ |
| serviceAccount.create | bool | `false` | specifies if the account should be created |
| static.enabled | bool | `false` |  |
| templates | string | `nil` | if the style of the login-page should be altered, templates can be provided here. |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.3](https://github.com/norwoodj/helm-docs/releases/v1.11.3)
