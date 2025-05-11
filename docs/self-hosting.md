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
- [ ] verify that sync to userscript works
- [ ] update login redirect url
- [ ] enable dashboard maintenance

## Post live
- [ ] image builds
- [ ] backups
- [ ] migrations
	- [reddit](https://www.reddit.com/r/sveltejs/comments/1cfupem/comment/l1s83z4/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)
- [ ] docker slow build
- [ ] nfca
- [ ] tailscale to nodes
- [ ] lockdown firewall
- [ ] cluster-wide pull secrets
- [ ] preview environment
