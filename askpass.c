/*
    ssh-add on Windows (probably part of the source at https://github.com/PowerShell/openssh-portable)
    does not/can not read the passphrase from stdin.
    
    However, when the DISPLAY env var is set and ssh-add is not run from a terminal (however it tests
    that), it will run the executable pointed to by SSH_ASKPASS in a subprocess and read the passphrase
    from that subprocess' stdout.
    
    This program can be used as the SSH_ASKPASS implementation. It will return the passphrase set
    in the SSH_PASS env variable.
    
    To cross-compile from Ubuntu, I installed the `mingw-w64` package and ran
    $ x86_64-w64-mingw32-gcc askpass.c -static -o askpass.exe
*/    

#include <stdio.h>
#include <stdlib.h>

int main(int argc, char** argv)
{
    printf("%s\n", getenv("SSH_PASS"));

    return 0;
}
