#!/usr/bin/env python3
"""
PTY Runner: Spawns commands inside an authentic Linux pseudo-terminal (pty).
Enables Bubbletea/ncurses/CLI TUIs (such as 'agy') to launch cleanly with full PTY and /dev/tty support.
"""
import os
import sys
import pty
import fcntl
import termios
import struct
import select
import signal
import subprocess
import argparse

def set_window_size(fd, rows=24, cols=80):
    try:
        winsize = struct.pack('HHHH', int(rows), int(cols), 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
    except Exception:
        pass

def main():
    parser = argparse.ArgumentParser(description='Run command in pseudo-terminal')
    parser.add_argument('--cwd', default='.', help='Working directory')
    parser.add_argument('--rows', type=int, default=24, help='Terminal rows')
    parser.add_argument('--cols', type=int, default=80, help='Terminal columns')
    parser.add_argument('command', nargs=argparse.REMAINDER, help='Command and arguments to execute')

    args = parser.parse_args()

    if not args.command:
        sys.stderr.write("No command specified\n")
        sys.exit(1)

    cmd = args.command
    if len(cmd) == 1 and (' ' in cmd[0] or ';' in cmd[0] or '|' in cmd[0] or '\n' in cmd[0]):
        cmd = ['/bin/bash', '-c', cmd[0]]

    master, slave = pty.openpty()
    set_window_size(slave, args.rows, args.cols)

    env = dict(os.environ)
    env['TERM'] = env.get('TERM', 'xterm-256color')
    env['COLORTERM'] = env.get('COLORTERM', 'truecolor')
    env['LINES'] = str(args.rows)
    env['COLUMNS'] = str(args.cols)
    env['PYTHONUNBUFFERED'] = '1'

    # Ensure ~/.local/bin and ./bin are prioritized in PATH
    path_entries = [
        '/app/applet/bin',
        os.path.join(os.getcwd(), 'bin'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bin'),
        '/root/.local/bin',
        os.path.expanduser('~/.local/bin'),
        '/usr/local/sbin',
        '/usr/local/bin',
        '/usr/sbin',
        '/usr/bin',
        '/sbin',
        '/bin'
    ]
    current_path = env.get('PATH', '')
    if current_path:
        path_entries.append(current_path)
    env['PATH'] = ':'.join(list(dict.fromkeys(path_entries)))

    proc = subprocess.Popen(
        cmd,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        cwd=args.cwd,
        env=env,
        preexec_fn=os.setsid,
        close_fds=True
    )
    os.close(slave)

    # Make master non-blocking
    flags = fcntl.fcntl(master, fcntl.F_GETFL)
    fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    # Make stdin non-blocking if possible
    stdin_fd = None
    try:
        stdin_fd = sys.stdin.fileno()
        flags_in = fcntl.fcntl(stdin_fd, fcntl.F_GETFL)
        fcntl.fcntl(stdin_fd, fcntl.F_SETFL, flags_in | os.O_NONBLOCK)
    except Exception:
        stdin_fd = None

    def forward_signal(signum, frame):
        try:
            os.killpg(os.getpgid(proc.pid), signum)
        except Exception:
            pass
        # If interrupted, ensure runner also cleans up promptly
        try:
            os.close(master)
        except Exception:
            pass
        sys.exit(130 if signum == signal.SIGINT else 143)

    signal.signal(signal.SIGINT, forward_signal)
    signal.signal(signal.SIGTERM, forward_signal)

    stdin_open = (stdin_fd is not None)
    return_code = 0

    try:
        while True:
            # Check if process exited
            if proc.poll() is not None:
                # Read all remaining output before terminating
                while True:
                    try:
                        data = os.read(master, 4096)
                        if data:
                            sys.stdout.buffer.write(data)
                            sys.stdout.buffer.flush()
                        else:
                            break
                    except (BlockingIOError, OSError):
                        break
                return_code = proc.returncode
                break

            r_inputs = [master]
            if stdin_open and stdin_fd is not None:
                r_inputs.append(stdin_fd)

            rlist, _, _ = select.select(r_inputs, [], [], 0.05)

            if master in rlist:
                try:
                    data = os.read(master, 4096)
                    if data:
                        sys.stdout.buffer.write(data)
                        sys.stdout.buffer.flush()
                    else:
                        break
                except (BlockingIOError, OSError):
                    pass

            if stdin_open and stdin_fd is not None and stdin_fd in rlist:
                try:
                    user_input = os.read(stdin_fd, 4096)
                    if user_input:
                        os.write(master, user_input)
                    else:
                        # EOF reached on stdin
                        stdin_open = False
                except (BlockingIOError, OSError):
                    pass
    except Exception:
        pass
    finally:
        try:
            os.close(master)
        except Exception:
            pass
        if proc.poll() is None:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                pass

    sys.exit(return_code)

if __name__ == '__main__':
    main()
