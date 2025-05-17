## Technologies
- Kubernetes (k8s)
  - 3 VM cluster on hetzner
    - 4vCPU 8GB RAM arm
- talos
- flux
- sops, age
- helm

## Done
- talos
- flux with sops

## ToDo #1
Setup k8s operators via flux into `kube-system` namespace
- [x] cilium ✅ 2025-04-27
- [x] hetzner hcloud-cloud-controller-manager ✅ 2025-04-29
- [x] hetzner csi-driver ✅ 2025-04-30
- [x] zalando/postgres-operator ✅ 2025-04-30
  - [manifest reference](https://github.com/zalando/postgres-operator/blob/master/docs/reference/cluster_manifest.md) 
  - [chart values](https://github.com/zalando/postgres-operator/blob/master/charts/postgres-operator/values.yaml)
- [x] tailscale ✅ 2025-05-07

## ToDo #2
- [x] cloudflare ✅ 2025-05-08
- [x] postgres config ✅ 2025-05-10
- [x] maps page caching ✅ 2025-05-11
- [x] health checks ✅ 2025-05-08
- [x] cronjobs ✅ 2025-05-11
- [x] metrics ✅ 2025-05-08
	- [x] hubble? ✅ 2025-05-08
- [x] sentry ✅ 2025-05-11

## Going live
- [x] verify that sync to userscript works ✅ 2025-05-11
- [x] update login redirect url ✅ 2025-05-11
- [x] enable dashboard maintenance ✅ 2025-05-11
- [x] init db connection in hooks ✅ 2025-05-11

## Post live
- [x] image builds ✅ 2025-05-16
- [x] backups ✅ 2025-05-13
- [ ] migrations
- [ ] docker slow build
- [ ] nfca
- [ ] tailscale to nodes
- [ ] lockdown firewall
- [ ] cluster-wide pull secrets
- [ ] preview environment
- [ ] sentry disable telemetry
- [ ] locations upload: show form error when file over BODY_SIZE_LIMIT
