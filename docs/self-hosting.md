## Technologies
- Kubernetes (k8s)
  - 3 VM cluster on hetzner
    - 2vCPU 4GB RAM arm
    - I am guessing it should be enough as we don't have much load, but I am willing to upgrade VM specs if needed
- talos
- flux
  - read about gitops
- sops, age
- helm

## Done
- talos
- flux with sops

## ToDo #1
Setup k8s operators via flux into `kube-system` namespace
- [x] cilium ✅ 2025-04-27
- [ ] hetzner hcloud-cloud-controller-manager
- [ ] hetzner csi-driver
- [ ] zalando/postgres-operator
  - [ ] operator and ui

**Setup tailscale**
There is official operator for k8s that makes it easy to access services and we definitely need it, but there is also talos tailsclae plugin which I know nothing about. I assume it is to access the nodes themselves via VPN - if so it is also must have. Current talos config simply whitelists an IP: idk how it is for you, but I don't have a fixed IP from my internet provider.
