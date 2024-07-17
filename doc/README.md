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
