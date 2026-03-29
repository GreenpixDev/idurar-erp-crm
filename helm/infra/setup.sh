helm repo add metallb https://metallb.github.io/metallb
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add cert-manager https://charts.jetstack.io
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade \
  metallb metallb/metallb \
  --install \
  --version 0.15.3 \
  --namespace metallb-system \
  --create-namespace
helm upgrade \
  ingress-nginx ingress-nginx/ingress-nginx \
  --install \
  --version 4.15.1 \
  --namespace cert-manager \
  --create-namespace \
  --values values/ingress-nginx.yaml
helm upgrade \
  cert-manager cert-manager/cert-manager \
  --install \
  --version 1.20.1 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

helm upgrade \
  monitoring prometheus-community/kube-prometheus-stack \
  --install \
  --version 82.14.1 \
  --namespace monitoring \
  --create-namespace
helm upgrade \
  loki grafana/loki \
  --install \
  --version 6.55.0 \
  --namespace monitoring \
  --create-namespace
helm upgrade \
  k8s grafana/k8s-monitoring \
  --install \
  --version 3.8.5 \
  --namespace monitoring \
  --create-namespace
helm jaeger \
  k8s jaegertracing/jaeger \
  --install \
  --version 4.6.0 \
  --namespace monitoring \
  --create-namespace

helm upgrade \
  letsencrypt cert-issuer \
  --install \
  --namespace cert-manager \
  --create-namespace

helm upgrade \
  prometheus-hypervisor-exporter prometheus-hypervisor-exporter \
  --install \
  --namespace monitoring \
  --create-namespace