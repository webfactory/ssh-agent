# `ssh-agent` GitHub Action

This action 
* starts the `ssh-agent`, 
* exports the `SSH_AUTH_SOCK` environment variable, 
* loads one or several private SSH key into the agent and
* configures `known_hosts` for GitHub.com.

It should work in all GitHub Actions virtual environments, including container-based workflows. 

Windows and Docker support is, however, somewhat new. Since we have little feedback from the field, things might not run so smooth for you as we'd hope. If Windows and/or Docker-based workflows work well for you, leave a :+1: at https://github.com/webfactory/ssh-agent/pull/17.

Also, using multiple GitHub deployment keys is supported; keys are mapped to repositories by using SSH key comments (see below).

## Why?

When running a GitHub Action workflow to stage your project, run tests or build images, you might need to fetch additional libraries or _vendors_ from private repositories.

GitHub Actions only have access to the repository they run for. So, in order to access additional private repositories, create an SSH key with sufficient access privileges. Then, use this action to make the key available with `ssh-agent` on the Action worker node. Once this has been set up, `git clone` commands using `ssh` URLs will _just work_. Also, running `ssh` commands to connect to other servers will be able to use the key.

## Usage

1. Generate a new SSH key with sufficient access privileges. For security reasons, don't use your personal SSH key but set up a dedicated one for use in GitHub Actions. See below for a few hints if you are unsure about this step.
2. Make sure you don't have a passphrase set on the private key.
3. Add the public SSH key to the private repository you are pulling from during the Github Action as a 'Deploy Key'.
4. Add the private SSH key to the repository triggering the Github Action: 
    * In your repository, go to the *Settings > Secrets* menu and create a new secret. In this example, we'll call it `SSH_PRIVATE_KEY`. 
    * Put the contents of the *private* SSH key file into the contents field. <br>
    * This key should start with `-----BEGIN ... PRIVATE KEY-----`, consist of many lines and ends with `-----END ... PRIVATE KEY-----`. 
5. In your workflow definition file, add the following step. Preferably this would be rather on top, near the `actions/checkout@v2` line.

```yaml
# .github/workflows/my-workflow.yml
jobs:
    my_job:
        ...
        steps:
            - actions/checkout@v2
            # Make sure the @v0.6.0 matches the current version of the
            # action 
            - uses: webfactory/ssh-agent@v0.6.0
              with:
                  ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
            - ... other steps
```
5. If, for some reason, you need to change the location of the SSH agent socket, you can use the `ssh-auth-sock` input to provide a path.

### Using Multiple Keys

There are cases where you might need to use multiple keys. For example, "[deploy keys](https://docs.github.com/en/developers/overview/managing-deploy-keys#deploy-keys)" might be limited to a single repository, so you'll need several of them.

You can set up different keys as different secrets and pass them all to the action like so:

```yaml
# ... contens as before
            - uses: webfactory/ssh-agent@v0.6.0
              with:
                  ssh-private-key: |
                        ${{ secrets.FIRST_KEY }}
                        ${{ secrets.NEXT_KEY }}
                        ${{ secrets.ANOTHER_KEY }}
```

The `ssh-agent` will load all of the keys and try each one in order when establishing SSH connections.

There's one **caveat**, though: SSH servers may abort the connection attempt after a number of mismatching keys have been presented. So if, for example, you have six different keys loaded into the `ssh-agent`, but the server aborts after five unknown keys, the last key (which might be the right one) will never even be tried. But when you're using GitHub Deploy Keys, read on!

### Support for GitHub Deploy Keys

When using **Github deploy keys**, GitHub servers will accept the _first_ known key. But since deploy keys are scoped to a single repository, this might not be the key needed to access a particular repository. Thus, you will get the error message `fatal: Could not read from remote repository. Please make sure you have the correct access rights and the repository exists.` if the wrong key/repository combination is tried.

To support picking the right key in this use case, this action scans _key comments_ and will set up extra Git and SSH configuration to make things work.

1. When creating the deploy key for a repository like `git@github.com:owner/repo.git` or `https://github.com/owner/repo`, put that URL into the key comment. (Hint: Try `ssh-keygen ... -C "git@github.com:owner/repo.git"`.)
2. After keys have been added to the agent, this action will scan the key comments. 
3. For key comments containing such URLs, a Git config setting is written that uses [`url.<base>.insteadof`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-urlltbasegtinsteadOf). It will redirect `git` requests to URLs starting with either `https://github.com/owner/repo` or `git@github.com:owner/repo` to a fake hostname/URL like `git@...some.hash...:owner/repo`.
4. An SSH configuration section is generated that applies to the fake hostname. It will map the SSH connection back to `github.com`, while at the same time pointing SSH to a file containing the appropriate key's public part. That will make SSH use the right key when connecting to GitHub.com.

## Action Inputs

The following inputs can be used to control the action's behavior:

* `ssh-private-key`: Required. Use this to provide the key(s) to load as GitHub Actions secrets.
* `ssh-auth-sock`: Can be used to control where the SSH agent socket will be placed. Ultimately affects the `$SSH_AUTH_SOCK` environment variable.
* `log-public-key`: Set this to `false` if you want to suppress logging of _public_ key information. To simplify debugging and since it contains public key information only, this is turned on by default.

## Exported variables

The action exports the `SSH_AUTH_SOCK` and `SSH_AGENT_PID` environment variables through the Github Actions core module.
The `$SSH_AUTH_SOCK` is used by several applications like git or rsync to connect to the SSH authentication agent.
The `$SSH_AGENT_PID` contains the process id of the agent. This is used to kill the agent in post job action.

## Known Issues and Limitations

### Works for the Current Job Only

Since each job [runs in a fresh instance](https://help.github.com/en/articles/about-github-actions#job) of the virtual environment, the SSH key will only be available in the job where this action has been referenced. You can, of course, add the action in multiple jobs or even workflows. All instances can use the same `SSH_PRIVATE_KEY` secret.

### SSH Private Key Format

If the private key is not in the `PEM` format, you will see an `Error loading key "(stdin)": invalid format` message.

Use `ssh-keygen -p -f path/to/your/key -m pem` to convert your key file to `PEM`, but be sure to make a backup of the file first 😉.

## Additional Information for Particular Tools or Platforms

If you know that your favorite tool or platform of choice requires extra tweaks or has some caveats when running with SSH, feel free to open a PR to amend this section here.

### Container-based Workflows

If you are using this action on container-based workflows, make sure the container has the necessary SSH binaries or package(s) installed.

### Using the `docker/build-push-action` Action

If you are using the `docker/build-push-action`, and would like to pass the SSH key, you can do so by adding the following config to pass the socket file through:

```yml
      - name: Build and push
        id: docker_build
        uses: docker/build-push-action@v2
        with:
          ssh: |
            default=${{ env.SSH_AUTH_SOCK }}
```

### Using the `docker/build-push-action` Action together with multiple Deploy Keys

If you use the `docker/build-push-action` and want to use multiple GitHub deploy keys, you need to copy the git and ssh configuration to the container during the build. Otherwise, the Docker build process would still not know how to handle multiple deploy keys. Even if the ssh agent was set up correctly on the runner.

This requires an additional step in the actions workflow and two additional lines in the Dockerfile.

Workflow:
```yml
      - name: Prepare git and ssh config for build context
        run: |
          mkdir root-config
          cp -r ~/.gitconfig  ~/.ssh root-config/
  
      - name: Build and push
        id: docker_build
        uses: docker/build-push-action@v2
        with:
          ssh: |
            default=${{ env.SSH_AUTH_SOCK }}
```

Dockerfile:
```Dockerfile
COPY root-config /root/
RUN sed 's|/home/runner|/root|g' -i.bak /root/.ssh/config
```

Have in mind that the Dockerfile now contains customized git and ssh configurations. If you don't want that in your final image, use multi-stage builds.


### Cargo's (Rust) Private Dependencies on Windows

If you are using private repositories in your dependencies like this:

```
stuff = { git = "ssh://git@github.com/myorg/stuff.git", branch = "main" }
```

... you will need to change a configuration in the workflow for Windows machines in order to make cargo able to clone private repositories.

There are 2 ways you can achieve this:

1. Add this step once in your job **before** any cargo command:

```
      - name: Update cargo config to use Git CLI
        run: Set-Content -Path $env:USERPROFILE\.cargo\config.toml "[net]`ngit-fetch-with-cli = true"
```

This will configure Cargo to use the Git CLI as explained in the [Cargo's documentation](https://doc.rust-lang.org/cargo/reference/config.html#netgit-fetch-with-cli).

2. Alternatively you can set it to the environment variables for the entire workflow:

```
env:
  CARGO_NET_GIT_FETCH_WITH_CLI: true
```

### Using Deploy Keys with Swift Package Manager

`xcodebuild` by default uses Xcode's built-in Git tooling. If you want to use GitHub Deploy Keys as supported by this action, however, that version of Git will lack the necessary URL remapping. In this case, pass `-scmProvider system` to the `xcodebuild` command, as mentioned in [Apple's documentation](https://developer.apple.com/documentation/swift_packages/building_swift_packages_or_apps_that_use_them_in_continuous_integration_workflows#3680255).

## What this Action *cannot* do for you

The following items are not issues, but beyond what this Action is supposed to do.

### Work on Remote Machines

When using `ssh` to connect from the GitHub Action worker node to another machine, you *can* forward the SSH Agent socket and use your private key on the other (remote) machine. However, this Action will not configure `known_hosts` or other SSH settings on the remote machine for you.

### Provide the SSH Key as a File

This Action is designed to pass the SSH key directly into `ssh-agent`; that is, the key is available in memory on the GitHub Action worker node, but never written to disk. As a consequence, you _cannot_ pass the key as a build argument or a mounted file into Docker containers that you build or run on the worker node. You _can_, however, mount the `ssh-agent` Unix socket into a Docker container that you _run_, set up the `SSH_AUTH_SOCK` env var and then use SSH from within the container (see https://github.com/webfactory/ssh-agent/issues/11).

### Run `ssh-keyscan` to Add Host Keys for Additional Hosts

If you want to use `ssh-keyscan` to add additional hosts (that you own/know) to the `known_hosts` file, you can do so with a single shell line in your Action definition. You don't really need this Action to do this for you.

As a side note, using `ssh-keyscan` without proper key verification is susceptible to man-in-the-middle attacks. You might prefer putting your _known_ SSH host key in your own Action files to add it to the `known_hosts` file. The SSH host key is not secret and can safely be committed into the repo. 

## Creating SSH Keys

In order to create a new SSH key, run `ssh-keygen -t ed25519 -a 100 -f path/to/keyfile`, as suggested in [this blog post](https://stribika.github.io/2015/01/04/secure-secure-shell.html). 
If you need to work with some older server software and need RSA keys, try `ssh-keygen -t rsa -b 4096 -o -f path/to/keyfile` instead.

Both commands will prompt you for a key passphrase and save the key in `path/to/keyfile`.
In general, having a passphrase is a good thing, since it will keep the key encrypted on your disk. When using the key with this action, however, you need to make sure you don't 
specify a passphrase: The key must be usable without reading the passphrase from input. Since the key itself is stored using GitHub's "Secret" feature, it should be fairly safe anyway.

## Authorizing a Key

To actually grant the SSH key access, you can – on GitHub – use at least two ways:

* [Deploy keys](https://developer.github.com/v3/guides/managing-deploy-keys/#deploy-keys) can be added to individual GitHub repositories. They can give read and/or write access to the particular repository. When pulling a lot of dependencies, however, you'll end up adding the key in many places. Rotating the key probably becomes difficult. The deploy key needs to be added to the private repository that is being fetched as a private dependency.

* A [machine user](https://developer.github.com/v3/guides/managing-deploy-keys/#machine-users) can be used for more fine-grained permissions management and have access to multiple repositories with just one instance of the key being registered. It will, however, count against your number of users on paid GitHub plans.

## Hacking

As a note to my future self, in order to work on this repo:

* Clone it
* Run `yarn install` to fetch dependencies
* _hack hack hack_
* `node index.js`. Inputs are passed through `INPUT_` env vars with their names uppercased.

  On *nix use:
  ```bash
  env "INPUT_SSH-PRIVATE-KEY=\`cat file\`" node index.js
  ```

  On Windows (cmd):
  ```cmd
  set /P INPUT_SSH-PRIVATE-KEY=< file
  node index.js
  ```

  On Windows (PowerShell):
  ```ps
  ${env:INPUT_SSH-PRIVATE-KEY} = (Get-Content .\test-keys -Raw); node index.js
  node index.js
  ```
* Run `npm run build` to update `dist/*`, which holds the files actually run
* Read https://help.github.com/en/articles/creating-a-javascript-action if unsure.
* Maybe update the README example when publishing a new version.

## Credits, Copyright and License

This action was written by webfactory GmbH, Bonn, Germany. We're a software development
agency with a focus on PHP (mostly [Symfony](http://github.com/symfony/symfony)). If you're a 
developer looking for new challenges, we'd like to hear from you! 

- <https://www.webfactory.de>
- <https://twitter.com/webfactory>

Copyright 2019 – 2022 webfactory GmbH, Bonn. Code released under [the MIT license](LICENSE).
