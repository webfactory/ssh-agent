const os = require('os');

module.exports = (process.env['OS'] != 'Windows_NT') ? {

    // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
    // Action runs, where $HOME is different from the pwent
    homePath: os.userInfo().homedir,
    sshAgentPath: 'ssh-agent',
    sshAddPath: 'ssh-add',
    gitPath: 'git'

} : {

    homePath: os.homedir(),
    sshAgentPath: 'c://progra~1//git//usr//bin//ssh-agent.exe',
    sshAddPath: 'c://progra~1//git//usr//bin//ssh-add.exe',
    gitPath: 'c://progra~1//git//usr//bin//git.exe'
};

