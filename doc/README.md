## Additional doc for connector deployment

### Portal deployment

1. Create configmap:
   ```
   kubectl create configmap portal-config --from-file=pdc-portal.yml=$PWD/pdc-portal.yml -n ips 
   ```

2. Deploy service specified in portal-deployment.yaml:
   ```
   kubectl apply -f portal-deployment.yaml -n ips
   ```

> [!NOTE]
> If the app needs to be changed beyond the configuration, it is necessary to deploy a new image and update it in the `portal-deployment.yml file.
> Source code: https://github.com/i4Trust/pdc-portal/tree/main

