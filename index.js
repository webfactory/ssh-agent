const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

try {
    const privateKey = core.getInput('ssh-private-key');

    if (!privateKey) {
        core.setFailed("The ssh-private-key argument is empty. Maybe the secret has not been configured, or you are using a wrong secret name in your workflow file.");

        return;
    }

    var home;

    if (process.env['OS'] == 'Windows_NT') {
        console.log('Preparing ssh-agent service on Windows');
        child_process.execSync('sc config ssh-agent start=demand', { stdio: 'inherit' });

        home = os.homedir();
    } else {
        // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
        // Action runs, where $HOME is different from the pwent
        var { homedir: home } = os.userInfo();
    }

    const homeSsh = home + '/.ssh';

    console.log(`Adding GitHub.com keys to ${homeSsh}/known_hosts`);
    fs.mkdirSync(homeSsh, { recursive: true });
    fs.appendFileSync(`${homeSsh}/known_hosts`, '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
    fs.appendFileSync(`${homeSsh}/known_hosts`, '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');

    console.log("Starting ssh-agent");
    const authSock = core.getInput('ssh-auth-sock');
    let sshAgentOutput = ''
    if (authSock && authSock.length > 0) {
        sshAgentOutput = child_process.execFileSync('ssh-agent', ['-a', authSock]);
    } else {
        sshAgentOutput = child_process.execFileSync('ssh-agent')
    }

    // Extract auth socket path and agent pid and set them as job variables
    const lines = sshAgentOutput.toString().split("\n")
    for (const lineNumber in lines) {
        const matches = /^(SSH_AUTH_SOCK|SSH_AGENT_PID)=(.*); export \1/.exec(lines[lineNumber])
        if (matches && matches.length > 0) {
            core.exportVariable(matches[1], matches[2])
        }
    }

    console.log("Adding private key to agent");
    privateKey.split(/(?=-----BEGIN)/).forEach(function(key) {
        child_process.execSync('ssh-add -', { input: key.trim() + "\n" });
    });

    console.log("Keys added:");
    child_process.execSync('ssh-add -l', { stdio: 'inherit' });

    child_process.execFileSync('ssh-add', ['-L']).toString().split(/\r?\n/).forEach(function(key) {
        let parts = key.match(/\bgithub.com[:/](.*)(?:\.git)?\b/);

        if (parts == null) {
            return;
        }

        let ownerAndRepo = parts[1];
        let sha256 = crypto.createHash('sha256').update(key).digest('hex');

        fs.writeFileSync(`${homeSsh}/${sha256}`, key + "\n", { mode: '600' });

        child_process.execSync(`git config --global --replace-all url."git@${sha256}:${ownerAndRepo}".insteadOf "https://github.com/${ownerAndRepo}"`);
        child_process.execSync(`git config --global --add url."git@${sha256}:${ownerAndRepo}".insteadOf "git@github.com:${ownerAndRepo}"`);

        let sshConfig = `\nHost ${sha256}\n`
                              + `    HostName github.com\n`
                              + `    User git\n`
                              + `    IdentityFile ${homeSsh}/${sha256}\n`
                              + `    IdentitiesOnly yes\n`;

        fs.appendFileSync(`${homeSsh}/config`, sshConfig);

        console.log(`Added deploy-key mapping: Use key ${sha256} for GitHub repository ${ownerAndRepo}`);
    });

} catch (error) {
    core.setFailed(error.message);
}
