"""Linux-only launcher. Fail closed if filesystem/network isolation is unavailable."""
import ctypes
import errno
import os
from pathlib import Path
import resource
import sys


def isolate(workdir):
    if os.geteuid() == 0:
        os.setgroups([])
        os.setgid(65534)
        os.setuid(65534)
    libc = ctypes.CDLL(None, use_errno=True)
    # Landlock syscalls have the same numbers on the supported amd64/arm64 workers.
    abi = libc.syscall(444, 0, 0, 1)
    if abi < 1:
        raise RuntimeError('Office conversion requires Linux Landlock support.')
    handled = (1 << 13) - 1
    if abi >= 2: handled |= 1 << 13  # cross-directory rename/link
    if abi >= 3: handled |= 1 << 14  # truncate
    class Ruleset(ctypes.Structure):
        _fields_ = [('handled_access_fs', ctypes.c_uint64)]
    class PathRule(ctypes.Structure):
        _pack_ = 1
        _fields_ = [('allowed_access', ctypes.c_uint64), ('parent_fd', ctypes.c_int32)]
    attr = Ruleset(handled)
    ruleset = libc.syscall(444, ctypes.byref(attr), ctypes.sizeof(attr), 0)
    if ruleset < 0: raise OSError(ctypes.get_errno(), 'landlock_create_ruleset')
    try:
        read = 1 | 4 | 8
        paths = {p: read for p in ['/usr', '/lib', '/lib64', '/bin', '/sbin', '/etc', '/var/spool/libreoffice', '/var/cache/fontconfig'] if Path(p).exists()}
        paths[str(Path(workdir).resolve())] = handled
        paths["/tmp"] = (1 << 9) | (1 << 5)  # LibreOffice IPC socket creation/removal only; no file reads/writes.
        # Null/random devices are required by LibreOffice; originals, artifacts,
        # other jobs and /proc (including worker credentials) remain inaccessible.
        for p in ['/dev/null', '/dev/urandom', '/dev/random']:
            paths[p] = 2 | 4
        for path, access in paths.items():
            fd = os.open(path, os.O_PATH | os.O_CLOEXEC)
            try:
                rule = PathRule(access, fd)
                if libc.syscall(445, ruleset, 1, ctypes.byref(rule), 0):
                    raise OSError(ctypes.get_errno(), 'landlock_add_rule')
            finally: os.close(fd)
        if libc.prctl(38, 1, 0, 0, 0) or libc.syscall(446, ruleset, 0):
            raise OSError(ctypes.get_errno(), 'landlock_restrict_self')
    finally: os.close(ruleset)
    # Permit local IPC but deny Internet/raw socket creation in the entire child tree.
    seccomp = ctypes.CDLL('libseccomp.so.2', use_errno=True)
    seccomp.seccomp_init.argtypes = [ctypes.c_uint32]
    seccomp.seccomp_init.restype = ctypes.c_void_p
    seccomp.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    class Arg(ctypes.Structure):
        _fields_ = [('arg', ctypes.c_uint), ('op', ctypes.c_uint), ('a', ctypes.c_uint64), ('b', ctypes.c_uint64)]
    seccomp.seccomp_rule_add_array.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint, ctypes.POINTER(Arg)]
    seccomp.seccomp_load.argtypes = [ctypes.c_void_p]
    seccomp.seccomp_release.argtypes = [ctypes.c_void_p]
    context = seccomp.seccomp_init(0x7fff0000)
    if not context: raise RuntimeError('seccomp_init failed')
    try:
        rule = Arg(0, 1, 1, 0)  # SCMP_CMP_NE: socket family != AF_UNIX
        if seccomp.seccomp_rule_add_array(context, 0x50000 | errno.EPERM, seccomp.seccomp_syscall_resolve_name(b'socket'), 1, ctypes.byref(rule)) < 0:
            raise RuntimeError('seccomp socket rule failed')
        if seccomp.seccomp_load(context) < 0: raise RuntimeError('seccomp_load failed')
    finally: seccomp.seccomp_release(context)
    resource.setrlimit(resource.RLIMIT_CPU, (90, 90))
    resource.setrlimit(resource.RLIMIT_FSIZE, (256*1024*1024, 256*1024*1024))
    resource.setrlimit(resource.RLIMIT_AS, (2*1024**3, 2*1024**3))


if __name__ == '__main__':
    isolate(sys.argv[1])
    os.execv(sys.argv[2], sys.argv[2:])
