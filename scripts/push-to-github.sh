#!/bin/bash
# =============================================================================
#  Precision Dental: put a release on GitHub, safely, from Terminal.
#
#    bash scripts/push-to-github.sh stage <zip or folder>
#        Builds the `cms` branch from what is live on `main`, replaces every file
#        with the release, shows what changes, asks "yes", then pushes `cms`.
#        Vercel builds a preview of it. Nothing on the live site changes.
#
#    bash scripts/push-to-github.sh status
#        What is live (main), what is staged (cms), and whether they differ.
#
#    bash scripts/push-to-github.sh promote
#        Type LIVE to make the tested `cms` commit the live site (fast-forward
#        of main, never a force push). The previous main is recorded for rollback.
#
#    bash scripts/push-to-github.sh rollback
#        Type ROLLBACK to put main back to what it was before the last promote.
#
#  Works in a fresh clone under ~/gya-deploy every time, so nothing on your Mac
#  is pushed by accident. macOS bash 3.2 and BSD tools are fine.
# =============================================================================
set -eu

DEFAULT_REPO="https://github.com/rowaynekapugama-GYA/precision-site-update.git"
BASE="${GYA_DEPLOY_DIR:-$HOME/gya-deploy}"
NAME="precision-site-update"
REPO_FILE="$BASE/$NAME.repo"
HISTORY="$BASE/$NAME.promotions"
WORK="$BASE/$NAME"
BRANCH_LIVE="main"
BRANCH_STAGE="cms"

say()  { printf '\n%s\n' "$*"; }
fail() { printf '\nStopped: %s\n' "$*" >&2; exit 1; }

mkdir -p "$BASE"
if [ -n "${REPO:-}" ]; then
  echo "$REPO" > "$REPO_FILE"
elif [ ! -f "$REPO_FILE" ]; then
  printf 'GitHub repo address [%s]: ' "$DEFAULT_REPO"
  read -r answer || answer=""
  echo "${answer:-$DEFAULT_REPO}" > "$REPO_FILE"
fi
REPO_URL="$(cat "$REPO_FILE")"

fresh_clone() {
  rm -rf "$WORK"
  say "Getting a fresh copy of $REPO_URL ..."
  git clone -q "$REPO_URL" "$WORK" || fail "could not clone the repo. Check the address and your GitHub sign in."
  cd "$WORK"
  git fetch -q origin
}

cmd="${1:-}"
case "$cmd" in
# ---------------------------------------------------------------------------
stage)
  SRC="${2:-}"
  [ -n "$SRC" ] || fail "give the release zip or folder, for example: bash scripts/push-to-github.sh stage ~/Downloads/precision-dental-site-cms.zip"
  [ -e "$SRC" ] || fail "$SRC does not exist."
  case "$SRC" in /*) ;; *) SRC="$(pwd)/$SRC" ;; esac
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  if [ -d "$SRC" ]; then
    cp -R "$SRC/." "$TMP/"
  else
    unzip -q "$SRC" -d "$TMP" || fail "could not unzip $SRC."
  fi
  # the release may sit in one top folder inside the zip
  ROOT="$(find "$TMP" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | awk '{ print length, $0 }' | sort -n | head -1 | cut -d' ' -f2-)"
  [ -n "$ROOT" ] || fail "no package.json found in the release. Is this the right zip?"
  ROOT="$(dirname "$ROOT")"
  [ -f "$ROOT/src/payload.config.ts" ] || fail "this release has no src/payload.config.ts, so it is not the dashboard build."
  if find "$ROOT" -maxdepth 2 -name '.env' -o -maxdepth 2 -name '.env.local' -o -maxdepth 2 -name '.env.production' | grep -q .; then
    fail "the release contains a .env file. Secrets never go in the repo; remove it and try again."
  fi

  fresh_clone
  git switch -q -C "$BRANCH_STAGE" "origin/$BRANCH_LIVE"
  # replace everything except git's own folder and Vercel's local link
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .vercel -exec rm -rf {} +
  (cd "$ROOT" && tar cf - --exclude=node_modules --exclude=.next --exclude=.git --exclude=.vercel --exclude=media .) | tar xf -
  git add -A
  if git diff --cached --quiet; then
    say "The release is identical to what is live on $BRANCH_LIVE. Nothing to stage."
    exit 0
  fi
  ADDED=$(git diff --cached --name-status | awk '$1=="A"' | wc -l | tr -d ' ')
  CHANGED=$(git diff --cached --name-status | awk '$1=="M"' | wc -l | tr -d ' ')
  REMOVED=$(git diff --cached --name-status | awk '$1=="D"' | wc -l | tr -d ' ')
  say "Staging on the '$BRANCH_STAGE' branch (the live '$BRANCH_LIVE' branch is not touched):"
  echo "   $ADDED new, $CHANGED changed, $REMOVED removed"
  if [ "$REMOVED" != "0" ]; then
    echo "   Removed files:"
    git diff --cached --name-status | awk '$1=="D" { print "     " $2 }' | head -40
    [ "$REMOVED" -gt 40 ] && echo "     ... and $((REMOVED - 40)) more"
  fi
  printf '\nPush this to the %s branch for a Vercel preview? Type yes: ' "$BRANCH_STAGE"
  read -r ok || ok=""
  [ "$ok" = "yes" ] || fail "nothing was pushed."
  VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)"
  git -c user.name="${GIT_AUTHOR_NAME:-GYA}" -c user.email="${GIT_AUTHOR_EMAIL:-rowayne@gyaclients.com}" \
    commit -q -m "Precision Dental website with the client dashboard (v${VERSION:-?})"
  git push -q -f origin "$BRANCH_STAGE" || fail "the push was refused. Nothing changed on GitHub."
  say "Staged. Vercel is building a preview of the '$BRANCH_STAGE' branch now."
  echo "Check it, then run:  bash $0 promote"
  ;;
# ---------------------------------------------------------------------------
status)
  fresh_clone
  echo
  echo "Live ($BRANCH_LIVE):   $(git log -1 --format='%h  %ad  %s' --date=short "origin/$BRANCH_LIVE")"
  if git rev-parse -q --verify "origin/$BRANCH_STAGE" >/dev/null; then
    echo "Staged ($BRANCH_STAGE): $(git log -1 --format='%h  %ad  %s' --date=short "origin/$BRANCH_STAGE")"
    if [ "$(git rev-parse "origin/$BRANCH_LIVE")" = "$(git rev-parse "origin/$BRANCH_STAGE")" ]; then
      echo "The staged release is live."
    elif git merge-base --is-ancestor "origin/$BRANCH_LIVE" "origin/$BRANCH_STAGE"; then
      echo "The staged release is ready to promote."
    else
      echo "Something was added to $BRANCH_LIVE after staging. Stage again before promoting."
    fi
  else
    echo "Nothing is staged."
  fi
  [ -f "$HISTORY" ] && echo "Last promote: $(tail -1 "$HISTORY")"
  ;;
# ---------------------------------------------------------------------------
promote)
  fresh_clone
  git rev-parse -q --verify "origin/$BRANCH_STAGE" >/dev/null || fail "nothing is staged. Run stage first."
  LIVE_SHA="$(git rev-parse "origin/$BRANCH_LIVE")"
  STAGE_SHA="$(git rev-parse "origin/$BRANCH_STAGE")"
  [ "$LIVE_SHA" != "$STAGE_SHA" ] || { say "The staged release is already live."; exit 0; }
  git merge-base --is-ancestor "$LIVE_SHA" "$STAGE_SHA" || \
    fail "someone changed $BRANCH_LIVE after this release was staged (for example through GitHub's web uploader). Stage again so that change is not lost."
  echo
  echo "Live now:   $(git log -1 --format='%h %s' "$LIVE_SHA")"
  echo "Going live: $(git log -1 --format='%h %s' "$STAGE_SHA")"
  printf '\nThis changes the live website. Type LIVE to go ahead: '
  read -r ok || ok=""
  [ "$ok" = "LIVE" ] || fail "nothing changed."
  git push -q origin "$STAGE_SHA:refs/heads/$BRANCH_LIVE" || fail "the push was refused. The live site is unchanged."
  echo "$(date '+%Y-%m-%d %H:%M') $LIVE_SHA -> $STAGE_SHA" >> "$HISTORY"
  say "Live. Vercel is building the production site now (about two minutes)."
  echo "If anything is wrong:  bash $0 rollback"
  ;;
# ---------------------------------------------------------------------------
rollback)
  [ -f "$HISTORY" ] || fail "there is no promote on record to roll back."
  LAST="$(tail -1 "$HISTORY")"
  OLD="$(echo "$LAST" | awk '{ print $3 }')"
  fresh_clone
  git cat-file -e "$OLD^{commit}" 2>/dev/null || fail "the previous commit $OLD is not in the repo."
  echo
  echo "Live now:          $(git log -1 --format='%h %s' "origin/$BRANCH_LIVE")"
  echo "Back to (before):  $(git log -1 --format='%h %s' "$OLD")"
  printf '\nType ROLLBACK to put the live site back: '
  read -r ok || ok=""
  [ "$ok" = "ROLLBACK" ] || fail "nothing changed."
  git push -q -f origin "$OLD:refs/heads/$BRANCH_LIVE" || fail "the push was refused."
  echo "$(date '+%Y-%m-%d %H:%M') rollback to $OLD" >> "$HISTORY"
  say "Rolled back. Vercel is rebuilding the previous version."
  ;;
*)
  sed -n '3,22p' "$0"
  ;;
esac
