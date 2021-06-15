#!/bin/bash
price=1

while sleep 0.1 ; do
    read provider id device< <(http localhost:5000/api/devicesbypriceage"?slice=1" | jq -r '.[] | "\(.productProvider) \(.productId) \(.id)"' -)
    read price priceDate < <(http localhost:5000/api/data | jq -r ".priceData.$provider.\"$id\" | @tsv" -)
    echo Next price device is $device with $price from $priceDate
    newPrice=$((RANDOM%9999))
    if ((newPrice < 1000)) ; then
        newPrice=0
    fi
    echo "Updating $device with $newPrice"
    read -r -d '' JSON <<-EOF
    {
        "priceData": [
            {
                "id": "$device",
                "productProvider": "$provider",
                "productId": "$id",
                "price": $newPrice
            }
        ]
    }
EOF
    http -b http://localhost:5000/api/price key==random_key <<<"$JSON"
done