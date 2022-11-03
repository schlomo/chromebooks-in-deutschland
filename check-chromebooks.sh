#!/usr/bin/env bash
#
# read paste from stdin, filter with regex in $1 and check for devices in database file
#
# Dev tools:
# jq -r '.[].variant' chromebooks/*.json -> All variants
# jq -r '.[].variant' chromebooks/*.json | wc -l -> count all variants
# jq -r '.[].variant' chromebooks/*.json | ./check-chromebooks.sh -> should find all devices

shopt -s globstar

die() { echo 1>&2 "$*" ; exit 1 ; }
default_regex_parts=(
    # Acer
    '[DN][TQX]\.[A-Z0-9]+\.[0-9][0-9][A-Z0-9]'
    'C[0-9BP]+-[12349NTHLW]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    'C[0-9BPTHLW]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
    'C[0-9]+[BPTHLW]+'
    'R[0-9][0-9][0-9][A-Z]+-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # R853TNA-C0EX
    'R[0-9][0-9][0-9][A-Z]+-[A-Z0-9][A-Z0-9][A-Z0-9]' # R852TN-C1Y which is is an Idealo error for R852TN-C1YV :-(
    # Asus
    '90[MN][SX][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]-M[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # 90MS01B1-M00080
    'C[MX][0-9][0-9][0-9][0-9][A-Z][A-Z][0-9][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # CM3200FM1A-HW0017
    'C[MRX][0-9][0-9][0-9][0-9][A-Z][A-Z][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # CR1100FKA-BP0023
    'CT[0-9][0-9][0-9][A-Z][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # CT100PA-AW0035
    'C[0-9][0-9][0-9][A-Z][A-Z]-[A-Z][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # C425TA-H50125
    # Lenovo
    '[28Z][012A][A-Z0-9][A-Z0-9][0-9][0-9][0-9][A-Z0-9]'
    # HP
    '[1-9][2345][abc]-[abcdn][abcdn][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]ng' # 14b-cb0030ng
    '[1-9][12345]-[abcdn][abcden][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]ng' # 14-cb0030ng
    '[1-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]EA' # 305R0EA
    # Samsung
    '[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]' # XE345XDA-KA1DE
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
    chromebooks_file=src/generated/chromebooks.json
    test -s $chromebooks_file || die "Please run 'yarn prep' first to generate Chromebooks data file"

    errors=0
    count=0
    while read -r d ; do
        let count++
        filtered="$(input2devices <<<"$d")"
        if test "$d" != "$filtered" ; then
            echo "$d <-> $filtered"
            let errors++
        fi
    done < <( sed -ne '/variant.*:/s/.*"\(.*\)"/\1/p' $chromebooks_file )
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
let red=0 green=0
for device in "${devices[@]}"; do
    if grep -q "$device" chromebooks/**/*.yaml ; then
        res+=(" 🟢 $device")
        let green++
    else
        res+=(" 🔴 $device")
        let red++
    fi
done
echo -e "\n\n--- RESULT --- ${#res[*]} DEVICES --- $red 🔴 $green 🟢"
IFS=$'\n'
echo "${res[*]}"
