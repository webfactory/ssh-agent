const os = require('os');

module.exports = (linuxUseHomedir) => {
    (process.env['OS'] != 'Windows_NT') ? {

        // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
        // Action runs, where $HOME is different from the pwent
        // Adds ability to use use os.homedir() to try and counter https://github.com/nodejs/node/issues/25714
        home: linuxUseHomedir === "true" ? os.homedir() : os.userInfo().homedir,
        sshAgent: 'ssh-agent',
        sshAdd: 'ssh-add'

    } : {

        home: os.homedir(),
        sshAgent: 'c://progra~1//git//usr//bin//ssh-agent.exe',
        sshAdd: 'c://progra~1//git//usr//bin//ssh-add.exe'

    };
}