#!/usr/bin/env bash
#
# read paste from stdin, filter with regex in $1 and check for devices in database file
#
# Dev tools:
# jq -r '.[].variant' chromebooks/*.json -> All variants
# jq -r '.[].variant' chromebooks/*.json | wc -l -> count all variants
# jq -r '.[].variant' chromebooks/*.json | ./check-chromebooks.sh -> should find all devices

die() { echo 1>&2 "$*" ; exit 1 ; }
default_regex_parts=(
    # Acer
    '[DN][TQX]\.[A-Z0-9]+\.[0-9][0-9][A-Z0-9]'
    'C[0-9BP]+-[12349NTHLW]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    'C[0-9BPTHLW]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    'C[0-9]+[BPTHLW]+'
    'R[0-9][0-9][0-9][A-Z]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # R853TNA-C0EX
    # Asus
    '90MS[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]-M[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # 90MS01B1-M00080
    'C[MX][0-9][0-9][0-9][0-9][A-Z][A-Z][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # CM5500FDA-E60003
    'CT[0-9][0-9][0-9][A-Z][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # CT100PA-AW0035
    'C[0-9][0-9][0-9][A-Z][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # C425TA-H50125
    # Lenovo
    '[28Z][012A][A-Z0-9][A-Z0-9][0-9][0-9][0-9][A-Z0-9]'
    # HP
    '[1-9][2345][abc]-[abcdn][abcdn][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]ng' # 14b-cb0030ng
    '[1-9][12345]-[abcdn][abcden][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]ng' # 14-cb0030ng
    '[1-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]EA' # 305R0EA
)
default_regex="$( tr " " "|" <<<"${default_regex_parts[*]}")"

test "$1" = "--help" -o "$1" = "-h" && die "Please give regex as first arg, default: $default_regex"

validate=""

if test "$1" == "--validate" ; then
    validate=1
    shift
fi

regex="${1:-$default_regex}"

function input2devices {
    tr -C -d "[:print:]" | \
        egrep -oi "$regex" | \
        sort -u
}

if test "$validate" ; then
    errors=0
    count=0
    while read -r d ; do
        let count++
        filtered="$(input2devices <<<"$d")"
        if test "$d" != "$filtered" ; then
            echo "$d <-> $filtered"
            let errors++
        fi
    done < <( sed -ne '/variant.*:/s/.*"\(.*\)"/\1/p' chromebooks/*.json )
    if (( errors==0 )) ; then
        echo "OK All $count devices matched by regex"
        exit 0
    else
        echo "ERROR From $count devices $errors devices could not be matched"
        exit 1
    fi
fi

echo "Paste lines and finish with CTRL-D"

devices=( 
    $( input2devices )
)
res=()
for device in "${devices[@]}"; do
    if grep -q "\"$device\"" chromebooks/* ; then
        res+=(" 🟢 $device")
    else
        res+=(" 🔴 $device")
    fi
done
echo -e "\n\n--- RESULT --- ${#res[*]} DEVICES ---"
IFS=$'\n'
echo "${res[*]}"