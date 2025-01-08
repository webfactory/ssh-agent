const os = require('os');
const core = require('@actions/core');

const defaults = (process.env['OS'] != 'Windows_NT') ? {
    // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
    // Action runs, where $HOME is different from the pwent
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
