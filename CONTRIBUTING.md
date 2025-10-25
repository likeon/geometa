# Contributing to Learnable Meta

Thank you for your interest in contributing! We welcome contributions from the community to make this project better.

## Contribution Guidelines
- If you plan to introduce breaking or intrusive changes, we recommend bringing them up in [Discord] or opening a [GitHub Discussion][gh-discussion] first.
- Follow git Conventional Commits guidelines for consistent commit messages

## Development setup

Installation is tested to work on Linux and Windows WSL. Mac OS should work too, but exact installations steps could differ.

#### System dependencies
1. Install [mise CLI][mise] and [activate][mise-activate] it in your shell
2. Install [docker] or [podman] container engines
  - Exact installation steps depend on your operating system
3. Install postgres client `psql`

#### Project setup

Run the following installation commands in order.

1. `mise install` - bun and nodejs runtimes + utilities (full list in [mise.toml](./mise.toml))
2. `just install` - npm dependencies
3. `just run` - starts a [kind] Kubernetes cluster using [Tilt]
  - Open [http://localhost:10350/](http://localhost:10350/) and wait for applications to start
    - You can find logs for `postgres`, `frontend` and `api` there
  - Since this command occupies a session, you'll need to open a new terminal window or move it to background
4. `just api::db-init` - applies initial db data
5. To avoid the hassle of setting up Discord auth which is enabled in production you can login under a development user account
  - Create `.env.local` file in `./apps/frontend/` folder with the following content:
    ```
    ALLOW_LOGIN_BYPASS=true
    ```
  - Login by opening this url [http://localhost:5173/login/bypass?uid=1001][login-bypass-url]

## Pull Request Process

- Clearly describe the problem or feature in your pull request
- Provide steps to reproduce and test your changes if applicable
- Ensure that your branch is up-to-date with the latest changes from the main branch
- All checks (formatting, linting, etc.) must pass before your pull request can be merged

## Getting Help

If you need assistance, have questions, or want to discuss ideas, you can join our [Discord] server and chat with the community.

[mise]: https://mise.jdx.dev/getting-started.html
[mise-activate]: https://mise.jdx.dev/getting-started.html#activate-mise
[docker]: https://docs.docker.com/get-docker/
[podman]: https://podman.io/docs/installation
[kind]: https://kind.sigs.k8s.io/docs/user/quick-start/
[Tilt]: https://docs.tilt.dev/
[gh-discussion]: https://github.com/likeon/geometa/discussions
[Discord]: https://discord.gg/AcXEWznYZe
[login-bypass-url]: http://localhost:5173/login/bypass?uid=1001]
