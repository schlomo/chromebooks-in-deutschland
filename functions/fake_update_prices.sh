#!/bin/bash
price=1

while [ "$price" != "0" ] ; do
    read provider id device< <(http localhost:5000/api/devicesbypriceage"?slice=1" | jq -r '.[] | "\(.productProvider) \(.productId) \(.id)"' -)
    read price priceDate < <(http localhost:5000/api/data | jq -r ".priceData.$provider.\"$id\" | @tsv" -)
    echo Next price device is $device with $price from $priceDate
    if [ "$price" != "0" ] ; then
        read -r -d '' JSON <<-EOF
        {
            "priceData": [
                {
                    "id": "$device",
                    "productProvider": "$provider",
                    "productId": "$id",
                    "price": $((RANDOM*1000+1))
                }
            ]
        }
EOF
        echo "Updating $device with random price"
        http -b http://localhost:5000/api/price key==random_key <<<"$JSON"
    fi
done