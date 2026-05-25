param(
  [string] $Target = "eve"
)

$ErrorActionPreference = "Stop"

$remoteScript = "echo '== identity =='; " +
  "uname -a; " +
  "sysctl -n hw.machine kern.osversion 2>/dev/null || true; " +
  "echo '== command availability =='; " +
  "for c in make clang ldid git uicache dpkg apt; do " +
  "if command -v `$c >/dev/null 2>&1; then printf '%-8s %s\n' `$c `$(command -v `$c); else printf '%-8s missing\n' `$c; fi; " +
  "done; " +
  "echo '== theos =='; " +
  "printf 'THEOS=%s\n' `"`${THEOS:-}`"; " +
  "for d in /var/theos /opt/theos `"`$HOME/theos`"; do test -d `"`$d`" && find `"`$d`" -maxdepth 2 -type d | head -20; done"

ssh $Target $remoteScript
