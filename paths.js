const os = require('os');

module.exports = (process.env['OS'] != 'Windows_NT') ? {
    // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
    // Action runs, where $HOME is different from the pwent
    homePath: os.userInfo().homedir,
    sshAgentCmd: 'ssh-agent',
    sshAddCmd: 'ssh-add',
    gitCmd: 'git'
} : {
    // Assuming GitHub hosted `windows-*` runners for now
    homePath: os.homedir(),
    sshAgentCmd: 'c://progra~1//git//usr//bin//ssh-agent.exe',
    sshAddCmd: 'c://progra~1//git//usr//bin//ssh-add.exe',
    gitCmd: 'c://progra~1//git//bin//git.exe'
};
