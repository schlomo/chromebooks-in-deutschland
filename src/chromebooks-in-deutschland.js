'use strict';

$(document).ready(function(){

    function getProductLink(entry) {
        let provider = entry.productProvider;
        let id = entry.productId;
        let url = "";
        switch (provider) {
          case "idealo": url = "http://idealo.de/preisvergleich/OffersOfProduct/" + id; break;
          case "geizhals": url = "https://geizhals.de/-a" + id + ".html"; break;
          case "metacomp": url = "https://shop.metacomp.de/Shop-DE/Produkt-1_" + id; break;
          default: url = "";
        }
        return url;
    }

    var renderModel = function ( data, type, row ) {
        if ( type === 'display') {
            data = '<a href="' + getProductLink(row) + '" target="_blank">' + $('<div/>').text(data).html() + '</a>';
        }
        return data;
    };

    var renderFeatures = function ( data, type, row ) {
        if ( type === 'display') {
            data = $('<div/>').text(data).html().replace(/[\n\r]+/g,"<br>");
        }
        return data;
    };

    var renderPrice = function ( data, type, row ) {
        if ( type === 'display') {
            data = '<a title="Aktualisiert: ' + new Date(row.priceUpdated).toLocaleString() + '">' + $('<div/>').text(data).html() + ' €</a>';
        }
        return data;
    };

    var search_field = undefined;
    var dt = undefined;
    
    function persistSearch(search_term) {
        console.log(`persisting ${search_term}`);
        window.location.hash = encodeURIComponent(search_term);
    };
    
    function setSearch(search_term) {
        search_term = decodeURIComponent(search_term);
        console.log(`Setting search to ${search_term}`);
        search_field.val(search_term);
        persistSearch(search_term);
        dt.search(search_term, false, false).draw();
    };

    function setSearchExampleClickHandler(e) {
        setSearch($( this ).text());
        e.preventDefault();
    };

    var stage2setup = function () {
        search_field = $('#chromebooks_filter input');
        dt = $('#chromebooks').DataTable();
        search_field.focus();
        var search_term = window.location.hash.split('#')[1];
        if (search_term) {
            setSearch(search_term);
        }
        search_field.keyup(function() {
            persistSearch($( this ).val());
        });
        search_field_div = search_field.parent().parent();
        search_field_div.on("click", "a", setSearchExampleClickHandler);
        search_field_div.append(`, z.B. Geräte mit <a href="#">14"</a> Bildschirm, mit <a href="#">16 GB</a> RAM oder Updates bis <a href="#">2025</a>`);
    }

    function monthDiff(dateFrom, dateTo) {
        // from https://stackoverflow.com/a/4312956/2042547 with some known inprecisions
        return dateTo.getMonth() - dateFrom.getMonth() + 
          (12 * (dateTo.getFullYear() - dateFrom.getFullYear()))
    }
    
    function screenResToText(res) {
        switch (res) {
            case "1366x768": return "HD" ;
            case "1920x1080":
            case "1920x1200": return "FHD" ;
            default: return res;
        }
    }

    function toNumber(num) {
        return num.toLocaleString("de-DE", { maximumFractionDigits: 2});
    }

    function prepareTableData(data) {
        let now = new Date();
        let result = [];
        Object.entries(data.devices).forEach(([id, entry]) => {
            // use YYYY-MM from ISO date string as display date, can be improved
            entry.expiration = data.expiration[entry.expirationId].expiration.substr(0,7);
            entry.supportMonths = monthDiff(now, new Date(entry.expiration));
            entry.pricePerMonth = entry.price / entry.supportMonths;
            entry.pricePerYear = entry.pricePerMonth * 12;

            entry.ausstattung = 
                (entry.type == "chromebook" ?
                    // screen info only for chromebooks, else show type
                    toNumber(entry.screenSize) + '" ' + 
                    (entry.screenGlare ? "spiegelnd " : "matt ") + 
                    screenResToText(entry.screenResolution) + " " +
                    (entry.screenTouch ? "touch " : "") +
                    (entry.flip ? "flip " : "" )
                : entry.type) +
                (entry.biometricUnlock ? "biometrisch " : "") +
                "\n" + 
                entry.memory + " GB RAM " + entry.cpu

            ;
            result.push(entry);
        });
        return result;
    }

    function toEuro(num) {
        return num.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + " €";
    }

    firebase.database().ref('/').once('value').then(function(snapshot) {
        var data = snapshot.val();
        console.log(data);
        let tableData = prepareTableData(data);
        console.log(tableData);
        $('#chromebooks').DataTable({
            paging: false,
            info: false,
            responsive: true,
            autoWidth: false,
            data: tableData,
            columns: [
                { 
                    title: "Modell",
                    data: 'id',
                    render: renderModel,
                },
                {
                    title: "Ausstattung",
                    data: 'ausstattung',
                    render: renderFeatures,
                },
                {
                    title: "Preis",
                    data: 'price',
                    render: renderPrice,
                },
                {
                    title: "Updates bis",
                    data: 'expiration'
                },
                {
                    title: "Preis / Monat",
                    data: 'pricePerMonth',
                    render: toEuro,
                },
                {
                    title: "Preis / Jahr",
                    data: 'pricePerYear',
                    render: toEuro,
                }
            ],
            order: [[ 4, "asc" ]],
            language: {
                search: "Suche _INPUT_ in allen Feldern",
            },
            search: {
                smart: false
            },
            initComplete: stage2setup,
        });
    });
});
