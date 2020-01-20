'use strict';

const cpus = {
    "AMD A4 9120C":         {"cores":2, "frequency":1.6,    "burst":2.4 },
    "AMD A6 9220C":         {"cores":2, "frequency":1.8,    "burst":2.7 },
    "Intel Celeron 3865U":  {"cores":2, "frequency":1.8 },
    "Intel Celeron N3350":  {"cores":2, "frequency":1.1,    "burst":2.4 },
    "Intel Celeron N4000":  {"cores":2, "frequency":1.1,    "burst":2.6 },
    "Intel Celeron N4100":  {"cores":4, "frequency":1.1,    "burst":2.4 },
    "Intel Core i3-7100U":  {"cores":2, "frequency":2.4 },
    "Intel Core i3-8130U":  {"cores":2, "frequency":2.2,    "burst":3.4 },
    "Intel Core i5-7300U":  {"cores":2, "frequency":2.6,    "burst":3.5 },
    "Intel Core i5-8250U":  {"cores":4, "frequency":1.6,    "burst":3.4 },
    "Intel Core i5-8350U":  {"cores":4, "frequency":1.7,    "burst":3.6 },
    "Intel Core i7-8550U":  {"cores":4, "frequency":1.8,    "burst":4   },
    "Intel Core i7-8650U":  {"cores":4, "frequency":1.9,    "burst":4.2 },
    "Intel Core m3-8100Y":  {"cores":2, "frequency":1.1,    "burst":3.4 },
    "Intel Pentium 4415U":  {"cores":2, "frequency":2.3 },
    "Intel Pentium 4415Y":  {"cores":2, "frequency":1.6 },
    "Intel Pentium 4417U":  {"cores":2, "frequency":2.3 },
    "Intel Pentium N4200":  {"cores":4, "frequency":1.1,    "burst":2.5 },
    "Intel Pentium N5000":  {"cores":4, "frequency":1.1,    "burst":2.7 },
    "MediaTek MT8173C":     {"cores":4, "frequency":2.1 },
    "Rockship RK3399":      {"cores":6, "frequency":2   },
};

/*
const devices_defaults = {
    id: "default",
    cpu: "default",
    productId: "default",
    expirationId: "default",
    flip: false,
    priceUpdated: "1900-01-01T00:00:00.000Z",
    screenGlare: false,
    brand: "default",
    screenResolution: "default",
    screenSize: 0,
    stylus: false,
    screenTouch: false,
    price: 9999999999,
    specLink: "default",
    type: "default",
    memory: 0,
    variant: "default",
    biometricUnlock: false,
    model: "default",
    productProvider: "default"
  };
*/

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


function toEuro(num) {
    return num.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "&nbsp;€";
}

function cpuToText(cpu, notfound="") {
    try {
        let burstinfo = ("burst" in cpus[cpu] ? `-${cpus[cpu].burst}` : "");
        return `${cpus[cpu].cores}x ${toNumber(cpus[cpu].frequency)}${burstinfo} GHz`;
    } catch(err) {
        console.error(err);
        return notfound;
    }
}

function monthDiff(dateFrom, dateTo) {
    // from https://stackoverflow.com/a/4312956/2042547 with some known inprecisions
    return dateTo.getMonth() - dateFrom.getMonth() + 
      (12 * (dateTo.getFullYear() - dateFrom.getFullYear()))
}

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
            data = '<a title="Aktualisiert: ' + new Date(row.priceUpdated).toLocaleString() + '">' + toEuro(data) + '</a>';
        }
        return data;
    };

    var renderPricePerMonth = function ( data, type, row ) {
        if ( type === 'display') {
            data = `${toEuro(data)} (${toEuro(data * 12)})`;
        }
        return data;
    };

    var renderExpiration = function ( data, type, row ) {
        if ( type === 'display') {
            data = `<a title="${row.expirationId}">${data}</a>`;
        }
        return data;
    };

    var search_field = undefined;
    var dt = undefined;
    
    function persistSearch(search_term) {
        console.log(`persisting >${search_term}<`);
        window.location.hash = encodeURIComponent(search_term);
    };
    
    function setSearch(search_term) {
        search_term = decodeURIComponent(search_term);
        console.log(`Setting search to >${search_term}<`);
        search_field.val(search_term);
        dt.search(search_term, false, false).draw();
    };

    function setSearchExampleClickHandler(e) {
        setSearch($( this ).text());
        e.preventDefault();
    };

    var stage2setup = function () {
        search_field = $('#chromebooks_filter input');
        dt = $('#chromebooks').DataTable();
        dt.on( 'search.dt', function () {
            persistSearch(dt.search());
        } );
        search_field.focus();
        var search_term = window.location.hash.split('#')[1];
        if (search_term) {
            setSearch(search_term);
        }
        let search_field_div = search_field.parent().parent();
        search_field_div.on("click", "a", setSearchExampleClickHandler);
        search_field_div.append(`, z.B. Geräte mit <a href="#">14"</a> Bildschirm, mit <a href="#">16 GB</a> RAM oder Updates bis <a href="#">2026</a>`);
    }


    function prepareTableData(data) {
        let now = new Date();
        let result = [];
        Object.entries(data.devices).forEach(([id, entry]) => {
            try {
                if (! (entry.expirationId in data.expiration)) {
                    throw `Invalid Expiration ID >${entry.expirationId}<!`;
                }
                // use YYYY-MM from ISO date string as display date, can be improved
                entry.expiration = data.expiration[entry.expirationId].expiration.substr(0,7);
                entry.supportMonths = monthDiff(now, new Date(entry.expiration));
                if (! (entry.price && entry.price > 0 && entry.price < 9999) ) {
                    throw `Invalid price >${entry.price}<!`;
                }
                entry.pricePerMonth = entry.price / entry.supportMonths;
                entry.pricePerYear = entry.pricePerMonth * 12;

                entry.ausstattung = 
                    (entry.type == "chromebook" ?
                        // screen info only for chromebooks, else show type
                        toNumber(entry.screenSize) + '" ' + 
                        (entry.screenGlare ? "spiegelnd " : "matt ") + 
                        screenResToText(entry.screenResolution) + " " +
                        (entry.screenTouch ? "touch " : "") +
                        (entry.flip ? "flip " : "" ) +
                        (entry.stylus ? "stylus " : "" )
                    : entry.type) +
                    (entry.biometricUnlock ? "biometrisch " : "") +
                    "\n" + 
                    entry.memory + " GB RAM" + "\n" +
                    entry.cpu + " " + cpuToText(entry.cpu)
                ;
                result.push(entry);
            } catch(err) {
                console.error(`ERROR loading >${id}<`, entry, err);
            }
        });
        return result;
    }

    firebase.database().ref('/').once('value').then(function(snapshot) {
        var data = snapshot.val();
        console.debug("Read data from database:", data);
        let tableData = prepareTableData(data);
        console.debug("Table data:", tableData);
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
                    title: "Preis / Monat (/&nbsp;Jahr)",
                    data: 'pricePerMonth',
                    render: renderPricePerMonth,
                },
                {
                    title: "Updates bis",
                    data: 'expiration',
                    render: renderExpiration,
                },
            ],
            order: [[ 3, "asc" ]],
            language: {
                search: "Suche _INPUT_ in allen Feldern",
            },
            search: {
                smart: false
            },
            initComplete: stage2setup,
        });
        $('#AUP_updated').html(`AUP Daten vom ${new Date(data.expiration_timestamp).toLocaleString()}.`);
    });
});
