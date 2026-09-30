#!/bin/bash
set -e

echo "[1/5] Preparing environment and directories..."
export USER=root
export HOME=/root
mkdir -p /root/.vnc

echo "[2/5] Creating xstartup script for XFCE..."
cat << 'EOF' > /root/.vnc/xstartup
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
export XKL_XMODMAP_DISABLE=1
export XDG_CURRENT_DESKTOP="XFCE"
export XDG_MENU_PREFIX="xfce-"
[ -x /etc/vnc/xstartup ] && exec /etc/vnc/xstartup
[ -r $HOME/.Xresources ] && xrdb $HOME/.Xresources
xsetroot -solid grey
vncconfig -iconic &
startxfce4 &
EOF
chmod +x /root/.vnc/xstartup

echo "[3/5] Cleaning up any stale locks or displays..."
vncserver -kill :1 || true
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1 || true

echo "[4/5] Starting TigerVNC server on :1 (port 5901)..."
vncserver :1 -geometry 1280x800 -depth 24 -SecurityTypes None --I-KNOW-THIS-IS-INSECURE -localhost yes

echo "[5/5] Ensuring noVNC default index redirects to vnc.html..."
if [ -d "/usr/share/novnc" ] && [ -f "/usr/share/novnc/vnc.html" ]; then
    ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html
fi

echo "VNC server initialized successfully."
