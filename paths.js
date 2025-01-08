const os = require('os');
const core = require('@actions/core');

const defaults = (process.env['OS'] != 'Windows_NT') ? {
    // We use os.userInfo() rather than os.homedir(), since it uses the getpwuid() system call to get the user's home directory (see https://nodejs.org/api/os.html#osuserinfooptions).
    // This mimics the way openssh derives the home directory for locating config files (see https://github.com/openssh/openssh-portable/blob/826483d51a9fee60703298bbf839d9ce37943474/ssh.c#L710);
    // Makes a difference in Docker-based Action runs, when $HOME is different from what getpwuid() returns (which is based on the entry in /etc/passwd)
    homePath: os.userInfo().homedir,
    sshAgentCmdDefault: 'ssh-agent',
    sshAddCmdDefault: 'ssh-add',
    gitCmdDefault: 'git'
} : {
    // Assuming GitHub hosted `windows-*` runners for now
    homePath: os.homedir(),
    sshAgentCmdDefault: 'c://progra~1//git//usr//bin//ssh-agent.exe',
    sshAddCmdDefault: 'c://progra~1//git//usr//bin//ssh-add.exe',
    gitCmdDefault: 'c://progra~1//git//bin//git.exe'
};

const sshAgentCmdInput = core.getInput('ssh-agent-cmd');
const sshAddCmdInput = core.getInput('ssh-add-cmd');
const gitCmdInput = core.getInput('git-cmd');

module.exports = {
    homePath: defaults.homePath,
    sshAgentCmd: sshAgentCmdInput !== '' ? sshAgentCmdInput : defaults.sshAgentCmdDefault,
    sshAddCmd: sshAddCmdInput !== '' ? sshAddCmdInput : defaults.sshAddCmdDefault,
    gitCmd: gitCmdInput !== '' ? gitCmdInput : defaults.gitCmdDefault,
};
