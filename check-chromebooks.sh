#!/usr/bin/env bash
#
# read paste from stdin, filter with regex in $1 and check for devices in database file
#

die() { echo 1>&2 "$*" ; exit 1 ; }
default_regex_parts=(
    # Acer
    'NX\.[A-Z0-9]+\.[0-9][0-9][0-9]'
    'C[0-9BP]+-[123THLW]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    'C[0-9BPTHLW]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    'C[0-9]+[BPTHLW]+'
    # Lenovo
    '[0-9][0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    # HP
    '[1-9][2345][abc]-[abcdn][abcdn][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]ng'
)
default_regex="$( tr " " "|" <<<"${default_regex_parts[*]}")"

test "$1" = "--help" -o "$1" = "-h" && die "Please give regex as first arg, default: $default_regex"

regex="${1:-$default_regex}"

echo "Paste lines and finish with CTRL-D"
devices=( 
    $( 
        tr -C -d "[:print:]" | \
        egrep -oi "$regex" | \
        sort -u
    ) 
)

res=()
for device in "${devices[@]}"; do
    if grep -q "$device" chromebooks/* ; then
        res+=(" 🟢 $device")
    else
        res+=(" 🔴 $device")
    fi
done < <( grep -Eoi "$regex" | tr -d '()/,' | sort -u )
echo -e "\n\n--- RESULT --- ${#res[*]} DEVICES ---"
IFS=$'\n'
echo "${res[*]}"