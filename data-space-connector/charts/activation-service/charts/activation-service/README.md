# activation-service

![Version: 2.3.1](https://img.shields.io/badge/Version-2.3.1-informational?style=flat-square) ![AppVersion: 2.2.0](https://img.shields.io/badge/AppVersion-2.2.0-informational?style=flat-square)

A Helm chart for running the i4Trust activation service for creating policies at an iSHARE authorisation registry or to create entries at a trusted issuers list

**Homepage:** <https://github.com/i4trust/activation-service>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| dwendland | <dennis.wendland@fiware.org> |  |

## Source Code

* <https://github.com/i4trust/activation-service>

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| activationService.logLevel | string | `"info"` | Log Level |
| activationService.maxHeaderSize | int | `32768` | Maximum header size in bytes |
| activationService.port | int | `8080` | Listen port |
| activationService.workers | int | `1` | Number of (gunicorn) workers that should be created |
| autoscaling.enabled | bool | `false` |  |
| autoscaling.maxReplicas | int | `10` | maximum number of running pods |
| autoscaling.metrics | list | `[]` | metrics to react on |
| autoscaling.minReplicas | int | `1` | minimum number of running pods |
| ccs.defaultOidcScope | string | `"defaultScope"` | Default scope to be used from scopes below, if none is provided |
| ccs.id | string | `"pdc-activation-service"` | Id of the service |
| ccs.oidcScopes | object | `{"asWrite":[{"trustedIssuersLists":["https://til.fiware.dev"],"trustedParticipantsLists":["https://tir.fiware.dev"],"type":"VerifiableCredential"}],"defaultScope":[{"trustedIssuersLists":["https://til.fiware.dev"],"trustedParticipantsLists":["https://tir.fiware.dev"],"type":"VerifiableDefaultCredential"}]}` | Credential configurations for particular scopes |
| config.apikeys.ishare.apiKey | string | `""` | API key for iSHARE flow (auto-generated if left empty) |
| config.apikeys.ishare.enabledCreatePolicy | bool | `false` | Enable API-Key requirement for iSHARE flow /createpolicy endpoint (API key will be required) |
| config.apikeys.ishare.enabledToken | bool | `true` | Enable API-Key requirement for iSHARE flow /token endpoint (API key will be required) |
| config.apikeys.ishare.headerName | string | `"AS-API-KEY"` | API-Key Header name for iSHARE flow |
| config.apikeys.issuer.apiKey | string | `""` | API key for Trusted-Issuers-List flow (auto-generated if left empty) |
| config.apikeys.issuer.enabledIssuer | bool | `true` | Enable API-Key requirement for Trusted-Issuers-List flow /issuer endpoint (API key will be required) |
| config.apikeys.issuer.headerName | string | `"AS-API-KEY"` | API-Key Header name for Trusted-Issuers-List flow |
| config.ar.delegation | string | `"https://ar.packetdelivery.net/delegation"` | Endpoint for delegation requests |
| config.ar.id | string | `"EU.EORI.NLPACKETDEL"` | EORI of AR |
| config.ar.policy | string | `"https://ar.packetdelivery.net/policy"` | Endpoint for create policy requests |
| config.ar.token | string | `"https://ar.packetdelivery.net/connect/token"` | Endpoint for token request |
| config.client.crt | string | `"<pdc-certs>"` | Client certificate (PEM certificate chain) |
| config.client.id | string | `"EU.EORI.NLPACKETDEL"` | Client ID |
| config.client.key | string | `"<pdc-private-key>"` | Client key (PEM private key) |
| config.db.echo | bool | `true` | Enable SQL logging to stderr |
| config.db.modTracking | bool | `false` | Enable tracking of modifications |
| config.db.useMemory | bool | `true` | Use sqlite in-memory database |
| config.issuer.algorithms | list | `["ES256"]` | Allowed algorithms for JWT signatures |
| config.issuer.clientId | string | `"pdc-activation-service"` | clientId parameter |
| config.issuer.jwksPath | string | `"/.well-known/jwks"` | JWKS path at verifier |
| config.issuer.providerId | string | `"did:key:some-key"` | Provider DID |
| config.issuer.roles.createRole | string | `"CREATE_ISSUER"` | Role for creating trusted issuer |
| config.issuer.roles.deleteRole | string | `"DELETE_ISSUER"` | Role for deleting trusted issuer |
| config.issuer.roles.updateRole | string | `"UPDATE_ISSUER"` | Role for updating trusted issuer |
| config.issuer.samedevicePath | string | `"/api/v1/samedevice"` | samedevice flow path at verifier |
| config.issuer.tilUri | string | `"http://til.internal"` | URI of Trusted Issuers List service |
| config.issuer.verifierUri | string | `"https://verifier.packetdelivery.net"` | URI of verifier |
| deployment.additionalAnnotations | object | `{}` | additional annotations for the deployment, if required |
| deployment.additionalLabels | object | `{}` | additional labels for the deployment, if required |
| deployment.affinity | object | `{}` | affinity template ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity |
| deployment.image.pullPolicy | string | `"IfNotPresent"` | specification of the image pull policy |
| deployment.image.repository | string | `"i4trust/activation-service"` | image name ref: https://hub.docker.com/r/i4trust/activation-service |
| deployment.image.tag | string | `"2.2.0"` | tag of the image to be used |
| deployment.livenessProbe.initialDelaySeconds | int | `20` |  |
| deployment.livenessProbe.periodSeconds | int | `10` |  |
| deployment.livenessProbe.successThreshold | int | `1` |  |
| deployment.livenessProbe.timeoutSeconds | int | `30` |  |
| deployment.nodeSelector | object | `{}` | selector template ref: https://kubernetes.io/docs/user-guide/node-selection/ |
| deployment.readinessProbe.initialDelaySeconds | int | `21` |  |
| deployment.readinessProbe.periodSeconds | int | `10` |  |
| deployment.readinessProbe.successThreshold | int | `1` |  |
| deployment.readinessProbe.timeoutSeconds | int | `30` |  |
| deployment.replicaCount | int | `1` | initial number of target replications, can be different if autoscaling is enabled |
| deployment.revisionHistoryLimit | int | `3` | number of old replicas to be retained |
| deployment.tolerations | list | `[]` | tolerations template ref: ref: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/ |
| deployment.updateStrategy.rollingUpdate | object | `{"maxSurge":1,"maxUnavailable":0}` | new pods will be added gradually |
| deployment.updateStrategy.rollingUpdate.maxSurge | int | `1` | number of pods that can be created above the desired amount while updating |
| deployment.updateStrategy.rollingUpdate.maxUnavailable | int | `0` | number of pods that can be unavailable while updating |
| deployment.updateStrategy.type | string | `"RollingUpdate"` | type of the update |
| fullnameOverride | string | `""` |  |
| ingress.annotations | object | `{}` | annotations to be added to the ingress |
| ingress.enabled | bool | `false` | should there be an ingress to connect the activation service with the public internet |
| ingress.hosts | list | `[]` | all hosts to be provided |
| ingress.tls | list | `[]` | configure the ingress' tls |
| nameOverride | string | `""` |  |
| route.annotations | object | `{}` | annotations to be added to the route |
| route.certificate | object | `{}` | see: https://github.com/FIWARE-Ops/fiware-gitops/blob/master/doc/ROUTES.md |
| route.enabled | bool | `false` |  |
| route.tls | object | `{}` | tls configuration for the route |
| service.annotations | object | `{}` | addtional annotations, if required |
| service.port | int | `8080` | port to be used by the service |
| service.type | string | `"ClusterIP"` | service type |
| serviceAccount | object | `{"create":false}` | if a specific service account should be used, it can be configured here ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/ |
| serviceAccount.create | bool | `false` | specifies if the account should be created |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.12.0](https://github.com/norwoodj/helm-docs/releases/v1.12.0)
