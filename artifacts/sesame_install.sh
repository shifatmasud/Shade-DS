#!/bin/sh
# Installs a released sesame-link build on macOS or Linux without a checkout. Resolves
# the requested release (the latest by default), downloads this machine's
# archive from the public Sesame Link release bucket, verifies its published
# checksum and strict archive shape, and installs the binary. On macOS it also
# requires the Developer ID signature of Sesame's Apple team from the first
# signed release onward; the Linux artifact is unsigned. Running the script
# again upgrades in place. See docs/client-release-runbook.md; the one-line invocation is:
#
#   curl -fsSL https://storage.googleapis.com/sesame-link/install.sh | sh
#
# SESAME_LINK_VERSION pins a release tag (for example v0.1.0) instead of the
# latest release. SESAME_LINK_BIN_DIR overrides the binary directory.
# SESAME_LINK_ENVIRONMENT=staging, which the staging web app's setup line
# sets, has the installed binary select staging for the default state directory
# with `sesame-link doctor --environment staging` and names staging's web app in
# the next steps. A machine already paired with production keeps it, and the
# installer then prints doctor's refusal and still completes the installation.
# SESAME_LINK_INSTALL_EVENTS=1 adds machine-readable progress lines, each
# beginning "sesame-link-install: ", to standard output for `sesame-link update`
# to render; they report what this script did and change none of it.

set -eu

RELEASE_BASE_URL="${SESAME_LINK_RELEASE_BASE_URL:-https://storage.googleapis.com/sesame-link}"
RELEASE_BASE_URL="${RELEASE_BASE_URL%/}"
# The latest pointer is one tag and a newline; a larger object is not it.
LATEST_POINTER_MAX_BYTES=128
BIN_DIR="${SESAME_LINK_BIN_DIR:-$HOME/.local/bin}"
ENVIRONMENT="${SESAME_LINK_ENVIRONMENT:-production}"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/sesame-link"
# macOS releases from this tag on are signed and notarized; earlier tags stay
# installable as the unsigned previews they were published as. The release
# workflow reads the team and requirement below to check its own signatures,
# so the two cannot drift apart.
FIRST_SIGNED_MACOS_RELEASE="v0.1.22"
DEVELOPER_ID_TEAM="C68THDW62S"
DEVELOPER_ID_REQUIREMENT="anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = \"${DEVELOPER_ID_TEAM}\""

step() {
    printf '==> %s\n' "$1"
}

event() {
    [ "${SESAME_LINK_INSTALL_EVENTS:-}" = "1" ] || return 0
    printf 'sesame-link-install: %s\n' "$*"
}

fail() {
    echo "install.sh: $1" >&2
    exit 1
}

platform="$(uname -s)"
architecture="$(uname -m)"
case "${platform}" in
    Darwin)
        case "${architecture}" in
            arm64) target="aarch64-apple-darwin"; platform_label="macOS (Apple Silicon)" ;;
            x86_64) target="x86_64-apple-darwin"; platform_label="macOS (Intel)" ;;
            *) fail "unsupported architecture ${architecture} on macOS; releases cover arm64 and x86_64" ;;
        esac
        ;;
    Linux)
        case "${architecture}" in
            x86_64) target="x86_64-unknown-linux-gnu"; platform_label="Linux (x86_64)" ;;
            *) fail "unsupported architecture ${architecture} on Linux; releases currently cover x86_64" ;;
        esac
        ;;
    *) fail "unsupported operating system ${platform}; releases cover macOS and Linux" ;;
esac

step "Installing Sesame Link"
step "Detected platform: ${platform_label}"
step "Checking prerequisites"

for command in curl install unzip; do
    command -v "${command}" >/dev/null 2>&1 \
        || fail "required install command is not available: ${command}"
done

if command -v sha256sum >/dev/null 2>&1; then
    checksum_program="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
    checksum_program="shasum"
else
    fail "a SHA-256 verifier is required (sha256sum or shasum)"
fi

# How to install a new enough tmux here, as a sentence without its closing period, so a caller
# can end it or go on with what to do afterward.
tmux_install_suggestion() {
    case "${platform}" in
        Darwin)
            printf '%s' "Install it with 'brew install tmux' or 'sudo port install tmux'"
            ;;
        Linux)
            if command -v apt-get >/dev/null 2>&1; then
                printf '%s' "Install it with 'sudo apt-get install tmux', or from a newer package repository if that version is too old"
            elif command -v dnf >/dev/null 2>&1; then
                printf '%s' "Install it with 'sudo dnf install tmux'"
            elif command -v yum >/dev/null 2>&1; then
                printf '%s' "Install it with 'sudo yum install tmux'"
            elif command -v pacman >/dev/null 2>&1; then
                printf '%s' "Install it with 'sudo pacman -S tmux'"
            elif command -v zypper >/dev/null 2>&1; then
                printf '%s' "Install it with 'sudo zypper install tmux'"
            else
                printf '%s' "Install it with this system's package manager"
            fi
            ;;
    esac
}

tmux_suggestion="$(tmux_install_suggestion)"
claude_installed=0
codex_installed=0
command -v claude >/dev/null 2>&1 && claude_installed=1
command -v codex >/dev/null 2>&1 && codex_installed=1
[ "${claude_installed}" -eq 1 ] || [ "${codex_installed}" -eq 1 ] \
    || fail "Sesame Link needs Claude Code or Codex. Install Claude Code (claude) or Codex (codex), then run this installer again."

tmux_problem=""
if [ "${claude_installed}" -eq 1 ]; then
    if command -v tmux >/dev/null 2>&1; then
        tmux_version="$(tmux -V 2>/dev/null || true)"
        tmux_version_status="$(printf '%s\n' "${tmux_version}" | awk '
            $1 == "tmux" && $2 ~ /^[0-9]+\.[0-9]+/ {
                split($2, parts, ".")
                if (parts[1] + 0 > 3 || (parts[1] + 0 == 3 && parts[2] + 0 >= 4)) {
                    print "supported"
                } else {
                    print "old"
                }
                exit
            }
        ')"
        case "${tmux_version_status}" in
            supported) step "Verified ${tmux_version}" ;;
            old) tmux_problem="Claude Code sessions need tmux 3.4 or newer, and this computer has ${tmux_version}." ;;
            *) tmux_problem="Claude Code sessions need tmux 3.4 or newer, and the installer couldn't read this computer's tmux version ('${tmux_version}')." ;;
        esac
    else
        tmux_problem="Claude Code sessions need tmux 3.4 or newer, and tmux isn't installed."
    fi
    # Codex sessions need no tmux, so with Codex present a missing or old tmux is a note. Whether
    # Codex itself is ready is the binary's to check, so the note does not claim it.
    if [ -n "${tmux_problem}" ]; then
        if [ "${codex_installed}" -eq 1 ]; then
            echo "note: ${tmux_problem} ${tmux_suggestion}." >&2
            echo "note: Codex was found. After installing, run 'sesame-link status' to check that Codex sessions are ready." >&2
        else
            fail "${tmux_problem} ${tmux_suggestion}, then run this installer again."
        fi
    fi
fi

# A release tag is exactly what the release workflow publishes: `v` and the
# workspace's MAJOR.MINOR.PATCH, each component 0 or digits with no leading
# zero, within 64 bits. protocol/fixtures/release-tags.json lists what every
# reader of the channel accepts and refuses. The character list is spelled out
# rather than written as ranges, whose meaning depends on the locale; once it
# has passed, the text is one line of ASCII for awk to match.
valid_tag() {
    case "$1" in
        ""|*[!0123456789.v]*) return 1 ;;
    esac
    printf '%s\n' "$1" | awk -F. '
        $0 !~ /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/ { exit 1 }
        {
            sub(/^v/, "", $1)
            for (i = 1; i <= 3; i++) {
                # Equal-length digit strings compare as strings in numeric
                # order; awk numbers are doubles and cannot hold the bound.
                if (length($i) > 20 || (length($i) == 20 && $i "" > "18446744073709551615")) {
                    exit 1
                }
            }
        }
    '
}

# Whether release tag $1 is at least release tag $2. Both have passed
# valid_tag; components are compared as digit strings for the reason given
# there.
tag_at_least() {
    printf '%s %s\n' "$1" "$2" | awk '{
        split(substr($1, 2), a, ".")
        split(substr($2, 2), b, ".")
        for (i = 1; i <= 3; i++) {
            if (length(a[i]) != length(b[i])) { exit !(length(a[i]) > length(b[i])) }
            if (a[i] "" != b[i] "") { exit !(a[i] "" > b[i] "") }
        }
        exit 0
    }'
}

# A third argument saves the response headers there, so a caller watching the
# download can read its size.
download() {
    source_url="$1"
    destination="$2"
    if [ -n "${3:-}" ]; then
        set -- --dump-header "$3"
    else
        set --
    fi
    curl --fail --silent --show-error --location \
        --proto '=https' --proto-redir '=https' \
        --connect-timeout 15 --max-time 300 --retry 3 \
        "$@" --output "${destination}" "${source_url}" \
        || fail "could not download ${source_url}"
}

workdir="$(mktemp -d)"
binary_temporary=""
launcher_temporary=""
cleanup() {
    rm -rf "${workdir}"
    [ -z "${binary_temporary}" ] || rm -f "${binary_temporary}"
    [ -z "${launcher_temporary}" ] || rm -f "${launcher_temporary}"
}
trap cleanup EXIT

# The web apps follow ManagementEnvironment::web_origin in src/management.rs.
case "${ENVIRONMENT}" in
    production) web_app="https://link.sesame.com" ;;
    staging) web_app="https://link-dev.sesameai.app" ;;
    *) fail "SESAME_LINK_ENVIRONMENT must be staging or production, got: ${ENVIRONMENT}" ;;
esac

tag="${SESAME_LINK_VERSION:-}"
if [ -z "${tag}" ]; then
    step "Resolving latest release"
    download "${RELEASE_BASE_URL}/latest" "${workdir}/latest"
    latest_bytes="$(wc -c < "${workdir}/latest" | tr -d ' ')"
    [ "${latest_bytes}" -le "${LATEST_POINTER_MAX_BYTES}" ] \
        || fail "the public latest pointer is unexpectedly large"
    tag="$(cat "${workdir}/latest")"
fi
valid_tag "${tag}" \
    || fail "SESAME_LINK_VERSION must be a release tag like v0.1.0, got: ${tag}"
archive="sesame-link-${tag}-${target}.zip"
release_url="${RELEASE_BASE_URL}/releases/${tag}"

step "Resolved version: ${tag}"
require_signature=0
if [ "${platform}" = "Darwin" ]; then
    if tag_at_least "${tag}" "${FIRST_SIGNED_MACOS_RELEASE}"; then
        require_signature=1
        command -v codesign >/dev/null 2>&1 \
            || fail "codesign is required to verify the release signature"
    elif [ -n "${SESAME_LINK_VERSION:-}" ]; then
        echo "warning: Sesame Link ${tag} is an unsigned preview and has not been notarized by Apple" >&2
    else
        # Only a version the owner named can be an unsigned preview: a latest
        # pointer moved back to an unused pre-signing tag would otherwise
        # install an unsigned binary without anyone asking for one.
        fail "the latest pointer names ${tag}, a release from before macOS signing; set SESAME_LINK_VERSION=${tag} to install that unsigned preview deliberately"
    fi
else
    echo "warning: this Sesame Link preview is unsigned" >&2
fi
step "Downloading Sesame Link"
if [ "${SESAME_LINK_INSTALL_EVENTS:-}" = "1" ]; then
    archive_headers="${workdir}/archive.headers"
    event "download-headers ${archive_headers}"
    event "download-file ${workdir}/${archive}"
else
    archive_headers=""
fi
download "${release_url}/${archive}" "${workdir}/${archive}" "${archive_headers}"
download "${release_url}/checksums.txt" "${workdir}/checksums.txt"
event "downloaded"

# The digest comes from the same release the archive does, so this catches a
# corrupted or mixed-up download, not a hostile release.
step "Verifying checksum and release archive"
line="$(awk -v file="${archive}" '$2 == file { print; found = 1 } END { exit !found }' \
    "${workdir}/checksums.txt")" \
    || fail "checksums.txt on release ${tag} has no entry for ${archive}"
case "${checksum_program}" in
    sha256sum)
        (cd "${workdir}" && printf '%s\n' "${line}" | sha256sum -c - >/dev/null) \
            || fail "checksum mismatch for ${archive}; refusing to install"
        ;;
    shasum)
        (cd "${workdir}" && printf '%s\n' "${line}" | shasum -a 256 -c - >/dev/null) \
            || fail "checksum mismatch for ${archive}; refusing to install"
        ;;
esac

payload="sesame-link-${tag}-${target}"
# BusyBox unzip has no ZipInfo (-Z) mode. Both implementations list members
# between dashed rules with -l. Remove only the metadata prefix, preserving
# whitespace in names so an unexpected path cannot become an allowed one.
LC_ALL=C unzip -l "${workdir}/${archive}" > "${workdir}/listing" \
    || fail "could not inspect ${archive}"
awk '
    /^ *-+ +[- ]+$/ { rules++; next }
    rules == 1 {
        if (!sub(/^ *[0-9]+  [0-9-]+ [0-9:]+   /, "")) { exit 1 }
        print
    }
    END { if (rules != 2) exit 1 }
' "${workdir}/listing" > "${workdir}/members" \
    || fail "could not parse the archive listing for ${archive}"
unexpected="$(awk -v payload="${payload}" \
    '$0 != payload "/" && $0 != payload "/sesame-link" { print }' \
    "${workdir}/members")"
[ -z "${unexpected}" ] \
    || fail "${archive} contains an unexpected path; refusing to extract"
[ "$(grep -Fxc "${payload}/sesame-link" "${workdir}/members")" -eq 1 ] \
    || fail "${archive} does not contain exactly one sesame-link binary"

unzip -q "${workdir}/${archive}" -d "${workdir}"
extracted="${workdir}/${payload}"
[ -f "${extracted}/sesame-link" ] && [ ! -L "${extracted}/sesame-link" ] \
    || fail "release ${tag} has no sesame-link binary"
event "verified-checksum"

# Notarization cannot be checked offline for a bare executable; the release
# workflow refuses to publish one Apple did not accept.
if [ "${require_signature}" -eq 1 ]; then
    codesign --verify --strict -R="${DEVELOPER_ID_REQUIREMENT}" "${extracted}/sesame-link" \
        2> "${workdir}/codesign-error" \
        || {
            cat "${workdir}/codesign-error" >&2
            fail "the sesame-link binary in ${archive} is not signed by Sesame's Developer ID (team ${DEVELOPER_ID_TEAM}); refusing to install"
        }
    step "Verified the Developer ID signature of team ${DEVELOPER_ID_TEAM}"
    event "verified-signature ${DEVELOPER_ID_TEAM}"
fi

mkdir -p "${BIN_DIR}"
previous_version="absent"
previous_sha256="absent"
binary_digest() {
    digest_output="$(
        if [ "${checksum_program}" = "sha256sum" ]; then
            sha256sum < "$1"
        else
            shasum -a 256 < "$1"
        fi
    )" || { printf '%s\n' "unknown"; return; }
    printf '%s\n' "${digest_output}" | awk '{print $1}'
}
# Receipt fields are single lines even if an old executable prints unusual output.
binary_version() {
    if version_output="$("$1" --version 2> "${workdir}/version-error")"; then
        printf '%s' "${version_output}" | tr '\r\n\t' '   ' | cut -c 1-512 | sed 's/ *$//'
    else
        echo "warning: could not run $2 with --version; its recorded version is unknown" >&2
        cat "${workdir}/version-error" >&2
        printf '%s' "unknown"
    fi
}
if [ -e "${BIN_DIR}/sesame-link" ]; then
    previous_version="$(binary_version "${BIN_DIR}/sesame-link" "the previous binary")"
    previous_sha256="$(binary_digest "${BIN_DIR}/sesame-link")"
fi
if [ "${previous_version}" = "absent" ]; then
    step "Installing binary to ${BIN_DIR}/sesame-link"
else
    step "Replacing binary at ${BIN_DIR}/sesame-link with ${tag}"
fi
binary_temporary="${BIN_DIR}/.sesame-link-install-$$"
install -m 0755 "${extracted}/sesame-link" "${binary_temporary}"
installed_version="$(binary_version "${binary_temporary}" "the new binary")"
installed_sha256="$(binary_digest "${binary_temporary}")"
mv -f "${binary_temporary}" "${BIN_DIR}/sesame-link"
binary_temporary=""
# Earlier releases installed a Terminal launcher beside the data directory;
# the daemon no longer runs one, so an upgrade removes that regular file.
stale_launcher="${DATA_DIR}/terminal-launcher-macos"
if [ -f "${stale_launcher}" ] && [ ! -L "${stale_launcher}" ]; then
    rm -f "${stale_launcher}" \
        && step "Removed the Terminal launcher an earlier release installed at ${stale_launcher}"
fi
step "Installed binary version: ${installed_version}"
event "installed ${installed_version}"

# Installation is machine-wide for this user, independent of any one daemon's
# state directory. Each completed replacement gets its own private receipt;
# failure to save diagnostics must not misreport the already-completed install.
record_installation() (
    umask 077
    history_directory="${DATA_DIR}/install-history"
    [ ! -L "${history_directory}" ] || return 1
    mkdir -p "${history_directory}" || return 1
    chmod 700 "${history_directory}" || return 1
    receipt_time="$(date -u '+%Y-%m-%dT%H:%M:%SZ')" || return 1
    receipt_binary_path="$(printf '%s' "${BIN_DIR}/sesame-link" | tr '\r\n\t' '   ')"
    receipt="$(mktemp "${history_directory}/.pending.XXXXXXXX")" || return 1
    if ! printf 'event=installation_completed\ninstalled_at=%s\nrelease=%s\ntarget=%s\nbinary_path=%s\nprevious_version=%s\nprevious_sha256=%s\ninstalled_version=%s\ninstalled_sha256=%s\ndaemon_restarted=false\n' \
        "${receipt_time}" "${tag}" "${target}" "${receipt_binary_path}" \
        "${previous_version}" "${previous_sha256}" "${installed_version}" "${installed_sha256}" \
        > "${receipt}"; then
        rm -f "${receipt}"
        return 1
    fi
    published_receipt="${history_directory}/install.${receipt##*.}"
    mv "${receipt}" "${published_receipt}" || return 1
    step "Installation receipt: ${published_receipt}"
)
if ! record_installation; then
    echo "warning: installation completed, but its receipt could not be saved under ${DATA_DIR}/install-history" >&2
fi
case ":${PATH}:" in
    *":${BIN_DIR}:"*) step "${BIN_DIR} is already on PATH" ;;
    *)
        step "${BIN_DIR} isn't on your PATH. Add it in your shell profile:"
        echo "  export PATH=\"${BIN_DIR}:\$PATH\""
        ;;
esac

# Without Claude Code only Codex sessions are possible. Without Codex, Claude Code passed the
# checks above, and nothing is missing that needs saying.
[ "${claude_installed}" -eq 1 ] \
    || echo "note: Claude Code (claude) wasn't found, so only Codex sessions are possible. Run 'sesame-link status' to check that Codex sessions are ready."

# The binary resolves each state directory's Management environment, and only it does: an
# existing directory may already be enrolled with an environment other than production. A default
# state directory that does not exist yet resolves to production, the default for a new
# installation, so a production install names its web app only then, and a staging install only
# once the binary has confirmed staging below. The path follows default_state_directory in
# src/cli/state_directory.rs; change both together.
case "${XDG_STATE_HOME:-}" in
    /*) state_directory="${XDG_STATE_HOME}/sesame-link" ;;
    *) state_directory="${HOME}/.local/state/sesame-link" ;;
esac
name_web_app=1
if [ -e "${state_directory}" ] || [ -L "${state_directory}" ]; then
    name_web_app=0
fi

# Selecting an environment is the binary's decision: it refuses to move a paired machine, and
# that refusal leaves the installation complete with the selection as a step to run by hand.
staging_selected=0
if [ "${ENVIRONMENT}" = "staging" ]; then
    if "${BIN_DIR}/sesame-link" doctor --environment staging > "${workdir}/doctor-output" 2>&1; then
        staging_selected=1
        name_web_app=1
        step "Selected the staging environment"
    else
        # A failed doctor may have created the state directory, and this machine may still
        # resolve to production, so the binary names its own web app.
        name_web_app=0
        echo "warning: Sesame Link couldn't switch this computer to staging:" >&2
        cat "${workdir}/doctor-output" >&2
    fi
fi

printf '\nSesame Link %s installed successfully.\n' "${tag}"
printf '\n'
echo "Next steps:"
if [ "${ENVIRONMENT}" = "staging" ] && [ "${staging_selected}" -eq 0 ]; then
    printf '%s\n' \
        "  Switch this computer to staging. If it's signed in to production, run 'sesame-link unpair' first:" \
        "    sesame-link doctor --environment staging"
fi
printf '%s\n' \
    "  Sign in and add this computer to your account:" \
    "    sesame-link auth login" \
    "  Then open the web app on any device to reach your sessions:"
if [ "${name_web_app}" -eq 1 ]; then
    echo "    ${web_app}"
else
    echo "    Run 'sesame-link' to see the web app this computer uses."
fi
# A Sesame Link already running keeps running the build it started from.
if [ "${previous_version}" != "absent" ]; then
    printf '\n%s\n' "If Sesame Link was already running, run 'sesame-link restart' to use the new version."
fi
