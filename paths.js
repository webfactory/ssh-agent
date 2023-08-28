const os = require('os');

module.exports = (process.env['OS'] != 'Windows_NT') ? {
    // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
    // Action runs, where $HOME is different from the pwent
    homePath: os.homedir(),
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
