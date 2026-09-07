#!/usr/bin/env bash
set -Eeuo pipefail

pack_url="https://u210.github.io/reimagined-pack/pack.toml"
server_dir="/opt/reimagined"
state_root="/opt/reimagined-deploy"
backup_root="/opt/reimagined-backups"
service_name="reimagined.service"
bootstrap_url="https://github.com/packwiz/packwiz-installer-bootstrap/releases/download/v0.0.3/packwiz-installer-bootstrap.jar"
bootstrap_sha256="a8fbb24dc604278e97f4688e82d3d91a318b98efc08d5dbfcbcbcab6443d116c"
sawmill_original_sha256="7a685707b9393868e2a55affd5ebedfd80665f8c3f4c82310bf1d697c94ccdbe"
sawmill_patched_sha256="85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8"
expected_server_mods=221
force_players=0

if [[ "${1:-}" == "--force" ]]; then
    force_players=1
elif [[ -n "${1:-}" ]]; then
    pack_url="$1"
fi
if [[ "${2:-}" == "--force" ]]; then
    force_players=1
fi

if [[ $EUID -ne 0 ]]; then
    echo "This deploy script must run as root." >&2
    exit 1
fi
if [[ "$server_dir" != "/opt/reimagined" || "$state_root" != "/opt/reimagined-deploy" ]]; then
    echo "Refusing unexpected deployment paths." >&2
    exit 1
fi
if [[ ! -d "$server_dir/world" || ! -d "$server_dir/mods" ]]; then
    echo "Production server layout is incomplete: $server_dir" >&2
    exit 1
fi

# Shared with the idle generator: no resume during staging, backup or restart.
touch "$server_dir/.maintenance.lock"
chown minecraft:minecraft "$server_dir/.maintenance.lock"
exec 9>"$server_dir/.maintenance.lock"
flock -w 15 9 || { echo "Another maintenance operation is running." >&2; exit 1; }
if systemctl is-active --quiet chunky-idle.service; then
    systemctl stop chunky-idle.service
    idle_was_active=1
else
    idle_was_active=0
fi
trap 'if (( idle_was_active == 1 )); then systemctl start chunky-idle.service; fi' EXIT
if [[ -f /usr/local/lib/reimagined/chunky-idle.py ]] && systemctl is-active --quiet "$service_name"; then
    python3 -c 'import runpy; print(runpy.run_path("/usr/local/lib/reimagined/chunky-idle.py")["pause"]())'
fi

managed_roots=(
    config
    configureddefaults
    coremods
    datapacks
    defaultconfigs
    kubejs
    mods
    moonlight-global-datapacks
    resourcepacks
    shaderpacks
    tlm_custom_pack
)
state_files=(packwiz-installer-bootstrap.jar packwiz-installer.jar packwiz.json)
timestamp="$(date +%Y%m%d-%H%M%S)"
candidate="$state_root/candidates/$timestamp-$$"
backup="$backup_root/$timestamp"
patch_asset="$state_root/assets/sawmill-patched.jar"
service_was_active=0
backup_ready=0
deployment_started=0

restore_backup() {
    echo "Restoring managed files from $backup" >&2
    systemctl stop "$service_name" || true
    for root in "${managed_roots[@]}"; do
        if grep -Fxq "$root" "$backup/existing-roots.txt"; then
            mkdir -p "$server_dir/$root"
            rsync -a --delete --exclude='/chunky/' "$backup/managed/$root/" "$server_dir/$root/"
        else
            rm -rf -- "$server_dir/$root"
        fi
    done
    for file in "${state_files[@]}"; do
        if grep -Fxq "$file" "$backup/existing-state-files.txt"; then
            install -o minecraft -g minecraft -m 0644 "$backup/state/$file" "$server_dir/$file"
        else
            rm -f -- "$server_dir/$file"
        fi
    done
    chown -R minecraft:minecraft "$server_dir"
}

handle_error() {
    local code=$?
    trap - ERR
    set +e
    echo "Deployment failed (exit $code)." >&2
    if (( deployment_started == 1 && backup_ready == 1 )); then
        restore_backup
    fi
    if (( service_was_active == 1 )); then
        systemctl start "$service_name" || true
    fi
    exit "$code"
}
trap handle_error ERR

mkdir -p "$candidate" "$backup/live-world" "$state_root/assets"
if [[ ! -f "$patch_asset" ]]; then
    echo "Missing private Sawmill patch asset: $patch_asset" >&2
    exit 1
fi
actual_patch_sha256="$(sha256sum "$patch_asset" | awk '{print $1}')"
if [[ "$actual_patch_sha256" != "$sawmill_patched_sha256" ]]; then
    echo "Unexpected private Sawmill patch hash: $actual_patch_sha256" >&2
    exit 1
fi

echo "Preparing candidate at $candidate"
for root in "${managed_roots[@]}"; do
    if [[ -d "$server_dir/$root" ]]; then
        mkdir -p "$candidate/$root"
        rsync -a "$server_dir/$root/" "$candidate/$root/"
    fi
done
for file in "${state_files[@]}"; do
    if [[ -f "$server_dir/$file" ]]; then
        cp -a "$server_dir/$file" "$candidate/$file"
    fi
done

if [[ ! -f "$candidate/packwiz-installer-bootstrap.jar" ]]; then
    wget -q -O "$candidate/packwiz-installer-bootstrap.jar" "$bootstrap_url"
fi
actual_bootstrap_sha256="$(sha256sum "$candidate/packwiz-installer-bootstrap.jar" | awk '{print $1}')"
if [[ "$actual_bootstrap_sha256" != "$bootstrap_sha256" ]]; then
    echo "Unexpected packwiz bootstrap hash: $actual_bootstrap_sha256" >&2
    exit 1
fi

chown -R minecraft:minecraft "$candidate"
runuser -u minecraft -- /bin/bash -c \
    'cd "$1" && exec /usr/bin/java -jar packwiz-installer-bootstrap.jar -g -s server "$2"' \
    _ "$candidate" "$pack_url"

mapfile -t sawmill_jars < <(find "$candidate/mods" -maxdepth 1 -type f -iname '*sawmill*.jar' -print)
if [[ ${#sawmill_jars[@]} -ne 1 ]]; then
    echo "Expected exactly one Sawmill JAR, found ${#sawmill_jars[@]}." >&2
    exit 1
fi
sawmill_sha256="$(sha256sum "${sawmill_jars[0]}" | awk '{print $1}')"
if [[ "$sawmill_sha256" == "$sawmill_original_sha256" ]]; then
    install -o minecraft -g minecraft -m 0644 "$patch_asset" "${sawmill_jars[0]}"
elif [[ "$sawmill_sha256" != "$sawmill_patched_sha256" ]]; then
    echo "Unknown Sawmill version/hash: $sawmill_sha256" >&2
    echo "Review whether the server-only patch is still required before deploying." >&2
    exit 1
fi

python3 - "$candidate/config/plasmovoice/server/config.toml" host port 25566 <<'PY'
import pathlib, re, sys
path, target_section, key, value = pathlib.Path(sys.argv[1]), *sys.argv[2:]
lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
section = None
changed = False
for index, line in enumerate(lines):
    match = re.match(r"\s*\[([^]]+)]\s*$", line)
    if match:
        section = match.group(1)
    elif section == target_section and re.match(rf"\s*{re.escape(key)}\s*=", line):
        indent = line[: len(line) - len(line.lstrip())]
        newline = "\n" if line.endswith("\n") else ""
        lines[index] = f"{indent}{key} = {value}{newline}"
        changed = True
        break
if not changed:
    raise SystemExit(f"Could not set {target_section}.{key} in {path}")
path.write_text("".join(lines), encoding="utf-8")
PY

python3 - "$candidate/config/sawmill-common.toml" general sort_recipes false <<'PY'
import pathlib, re, sys
path, target_section, key, value = pathlib.Path(sys.argv[1]), *sys.argv[2:]
lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
section = None
changed = False
for index, line in enumerate(lines):
    match = re.match(r"\s*\[([^]]+)]\s*$", line)
    if match:
        section = match.group(1)
    elif section == target_section and re.match(rf"\s*{re.escape(key)}\s*=", line):
        indent = line[: len(line) - len(line.lstrip())]
        newline = "\n" if line.endswith("\n") else ""
        lines[index] = f"{indent}{key} = {value}{newline}"
        changed = True
        break
if not changed:
    raise SystemExit(f"Could not set {target_section}.{key} in {path}")
path.write_text("".join(lines), encoding="utf-8")
PY

candidate_mods="$(find "$candidate/mods" -maxdepth 1 -type f -name '*.jar' | wc -l)"
if [[ "$candidate_mods" -ne "$expected_server_mods" ]]; then
    echo "Expected $expected_server_mods server Mod JARs, found $candidate_mods." >&2
    echo "Review side classifications and update expected_server_mods intentionally." >&2
    exit 1
fi
if [[ "$(sha256sum "${sawmill_jars[0]}" | awk '{print $1}')" != "$sawmill_patched_sha256" ]]; then
    echo "Sawmill patch verification failed." >&2
    exit 1
fi
grep -Eq '^port = 25566$' "$candidate/config/plasmovoice/server/config.toml"
grep -Eq '^[[:space:]]*sort_recipes = false$' "$candidate/config/sawmill-common.toml"

echo "Candidate validated with $candidate_mods server Mod JARs."
if (( force_players == 0 )) && ss -Htn state established '( sport = :25565 )' | grep -q .; then
    echo "Players are connected to TCP 25565; refusing to stop the server." >&2
    echo "Run with --force only after confirming downtime with players." >&2
    exit 1
fi

if systemctl is-active --quiet "$service_name"; then
    service_was_active=1
fi
echo "Creating live world safety copy."
rsync -a --delete "$server_dir/world/" "$backup/live-world/"

if (( service_was_active == 1 )); then
    echo "Stopping $service_name"
    systemctl stop "$service_name"
fi
if systemctl is-active --quiet "$service_name"; then
    echo "$service_name did not stop." >&2
    exit 1
fi

mkdir -p "$backup/world" "$backup/managed" "$backup/state"
rsync -a --delete "$server_dir/world/" "$backup/world/"
: > "$backup/existing-roots.txt"
: > "$backup/existing-state-files.txt"
for root in "${managed_roots[@]}"; do
    if [[ -d "$server_dir/$root" ]]; then
        echo "$root" >> "$backup/existing-roots.txt"
        mkdir -p "$backup/managed/$root"
        rsync -a "$server_dir/$root/" "$backup/managed/$root/"
    fi
done
for file in "${state_files[@]}"; do
    if [[ -f "$server_dir/$file" ]]; then
        echo "$file" >> "$backup/existing-state-files.txt"
        cp -a "$server_dir/$file" "$backup/state/$file"
    fi
done
sha256sum "$backup/world/level.dat" > "$backup/world-level-dat.sha256"
backup_ready=1
deployment_started=1

echo "Deploying candidate. Backup: $backup"
for root in "${managed_roots[@]}"; do
    if [[ -d "$candidate/$root" ]]; then
        mkdir -p "$server_dir/$root"
        # Preserve live generation config/progress, including changes after staging.
        rsync -a --delete --exclude='/chunky/' "$candidate/$root/" "$server_dir/$root/"
    fi
done
for file in "${state_files[@]}"; do
    if [[ -f "$candidate/$file" ]]; then
        install -o minecraft -g minecraft -m 0644 "$candidate/$file" "$server_dir/$file"
    fi
done
chown -R minecraft:minecraft "$server_dir"

start_marker="$(date --iso-8601=seconds)"
systemctl start "$service_name"
for _ in $(seq 1 150); do
    if ! systemctl is-active --quiet "$service_name"; then
        echo "$service_name stopped before completing startup." >&2
        journalctl -u "$service_name" --since "$start_marker" --no-pager -n 120 >&2
        false
    fi
    # With pipefail, grep -q closes the pipe early and journalctl exits with
    # SIGPIPE, making a successful match look like a failed pipeline.
    if journalctl -u "$service_name" --since "$start_marker" --no-pager -o cat | grep -F 'Done (' >/dev/null; then
        break
    fi
    sleep 2
done
if ! journalctl -u "$service_name" --since "$start_marker" --no-pager -o cat | grep -F 'Done (' >/dev/null; then
    echo "Timed out waiting for Minecraft startup." >&2
    journalctl -u "$service_name" --since "$start_marker" --no-pager -n 120 >&2
    false
fi
python3 - <<'PY'
import socket
with socket.create_connection(("127.0.0.1", 25565), timeout=5):
    pass
PY

deployment_started=0
rm -rf -- "$candidate"
printf '%s\n' "$backup" > "$state_root/last-successful-backup"
echo "Deployment successful. Backup retained at $backup"
systemctl --no-pager --full status "$service_name" | sed -n '1,18p'
