#!/usr/bin/env bash
#
# read paste from stdin, filter with regex in $1 and check for devices in database file
#
regex="$1" ; shift

die() { echo 1>&2 "$*" ; exit 1 ; }

test "$regex" || die "Please give regex as first arg"

res=()
while read device foo ; do
    if grep -q "$device" chromebooks/* ; then
        res+=(" 🟢 $device")
    else
        res+=(" 🔴 $device")
    fi
done < <( grep -Eoi "$regex" | tr -d '()/,' | sort -u )
echo -e "\n\n--- RESULT --- ${#res[*]} DEVICES ---"
IFS=$'\n'
echo "${res[*]}"