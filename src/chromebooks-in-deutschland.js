'use strict';

const cpus = {
    "AMD A4 9120C":         {"cores":2, "frequency":1.6,    "burst":2.4 },
    "AMD A6 9220C":         {"cores":2, "frequency":1.8,    "burst":2.7 },
    "Intel Celeron 3865U":  {"cores":2, "frequency":1.8 },
    "Intel Celeron 3867U":  {"cores":2, "frequency":1.8 },
    "Intel Celeron N3160":  {"cores":4, "frequency":1.6,    "burst":2.24 },
    "Intel Celeron N3350":  {"cores":2, "frequency":1.1,    "burst":2.4 },
    "Intel Celeron N3450":  {"cores":4, "frequency":1.1,    "burst":2.2 },
    "Intel Celeron N4000":  {"cores":2, "frequency":1.1,    "burst":2.6 },
    "Intel Celeron N4100":  {"cores":4, "frequency":1.1,    "burst":2.4 },
    "Intel Core i3-7100U":  {"cores":2, "frequency":2.4 },
    "Intel Core i3-8130U":  {"cores":2, "frequency":2.2,    "burst":3.4 },
    "Intel Core i5-7300U":  {"cores":2, "frequency":2.6,    "burst":3.5 },
    "Intel Core i5-8250U":  {"cores":4, "frequency":1.6,    "burst":3.4 },
    "Intel Core i5-8350U":  {"cores":4, "frequency":1.7,    "burst":3.6 },
    "Intel Core i5-10210U": {"cores":4, "frequency":1.6,    "burst":4.2 },
    "Intel Core i7-8550U":  {"cores":4, "frequency":1.8,    "burst":4   },
    "Intel Core i7-8650U":  {"cores":4, "frequency":1.9,    "burst":4.2 },
    "Intel Core m3-8100Y":  {"cores":2, "frequency":1.1,    "burst":3.4 },
    "Intel Pentium 4415U":  {"cores":2, "frequency":2.3 },
    "Intel Pentium 4415Y":  {"cores":2, "frequency":1.6 },
    "Intel Pentium 4417U":  {"cores":2, "frequency":2.3 },
    "Intel Pentium N4200":  {"cores":4, "frequency":1.1,    "burst":2.5 },
    "Intel Pentium N5000":  {"cores":4, "frequency":1.1,    "burst":2.7 },
    "MediaTek MT8173C":     {"cores":4, "frequency":2.1 },
    "Rockchip RK3399":      {"cores":6, "frequency":2   },
};

var search_field = undefined;
var last_search_term = undefined;
var dt = undefined;
const html_body = $('html, body');

var screenSizesMap = {};
var data = {};
var dataDump = "";

/*
const devices_defaults = {
    id: "default",
    cpu: "default",
    productId: "default",
    expirationId: "default",
    disabled: false,
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
    productProvider: "default",
    extraInfo: "",
    extraLinks: {}
  };
*/

const debugMode = window.location.search.includes("debug");

if (debugMode) {
    var debug = (...args) => {
        console.log(...args);
    }
} else {
    var debug = (...args) => {};
}

function screenResToText(res) {
    switch (res) {
        case "1366x768": return "HD" ;
        case "1920x1080": return "FHD" ;
        case "1920x1200": return "FHD 16:10" ;
        case "2256x1504": return "2K 3:2" ;
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
        debug(`ERROR looking up CPU >${cpu}<`, err);
        return notfound;
    }
}

function monthDiff(dateFrom, dateTo) {
    // from https://stackoverflow.com/a/4312956/2042547 with some known inprecisions
    return dateTo.getMonth() - dateFrom.getMonth() + 
      (12 * (dateTo.getFullYear() - dateFrom.getFullYear()))
}

function encodeEntities(text) {
    return document.createElement( 'div' ).appendChild( document.createTextNode( text ) ).parentNode.innerHTML;
}


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

var extraLinkClickHandler = (event) => {
    let a = $(event.target);
    let content = a.closest("td").find(".extralinks-content");
    if (content) {
        content.toggle();
        a.toggleClass("extralinks-open");
    } else {
        console.error("ERROR toggling extra links", event);
    }
    event.preventDefault();
}

var renderModel = function ( data, type, row ) {
    if ( type === 'display') {
        let result = $("<p>").text(data);
        let deviceLinks = [
            $("<a>")
                .addClass("material-icons-two-tone")
                .attr("href", getProductLink(row))
                .attr("title", `Angebote für ${data}`)
                .attr("target", "_blank")
                .text("shopping_cart")
        ];
        if (row.specLink.startsWith("http")) {
            deviceLinks.push(
                $("<a>")
                    .addClass("material-icons-two-tone")
                    .attr("href", row.specLink)
                    .attr("title", `Technische Spezifikation für ${data}`)
                    .attr("target", "_blank")
                    .text("info")
            );
        }
        let extraLinksElements = [];
        if (row.extraLinks) {
            debug("Adding extra Links");
            deviceLinks.push(
                $("<a>")
                    .attr("href","")
                    .addClass("material-icons-two-tone")
                    .addClass("extralinks")
                    .attr("title", `Weitere Links für ${data}`)
                    .text("insert_link")
                    .attr("data-extralinks", JSON.stringify(row.extraLinks))
            )
            for (const text in row.extraLinks) {
                let url = row.extraLinks[text];
                extraLinksElements.push(`<a href="${url}" target="_blank">${text}</a>`);
            }
        }
        result.append($("<div>").addClass("devicelinks").append(...deviceLinks));
        if (extraLinksElements.length > 0) {
            result.append(
                $("<div>")
                    .addClass("extralinks-content")
                    .append(...extraLinksElements)
            )
        }
        data = result.html();
    }
    return data;
};

var renderFeatures = function ( data, type, row ) {
    if ( type === 'display') {
        data = encodeEntities(data).replace(/[\n\r]+/g,"<br>");
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
        data = `<a title="${row.supportMonths} Monate">${toEuro(data)} (${toEuro(data * 12)})</a>`;
    }
    return data;
};

var renderExpiration = function ( data, type, row ) {
    if ( type === 'display') {
        data = `<a title="${row.expirationId}">${data}</a>`;
    }
    return data;
};

function prepareTableData(data) {
    let now = new Date();
    let result = [];
    Object.entries(data.devices).forEach(([id, entry]) => {
        try {
            if (! (entry.expirationId in data.expiration)) {
                throw `Invalid Expiration ID >${entry.expirationId}<!`;
            }

            entry = Object.assign({}, entry); // create copy of entry
            // use YYYY-MM from ISO date string as display date, can be improved
            entry.expiration = data.expiration[entry.expirationId].expiration.substr(0,7);
            entry.supportMonths = monthDiff(now, new Date(entry.expiration));
            if (! (entry.price && entry.price > 0 && entry.price < 9999) ) {
                throw `Invalid price >${entry.price}<!`;
            }
            entry.pricePerMonth = entry.price / entry.supportMonths;
            entry.pricePerYear = entry.pricePerMonth * 12;

            entry.ausstattung = "";
            if (entry.screenSize > 0) {
                // screen info only for chromebooks, else show type
                entry.ausstattung +=
                    toNumber(entry.screenSize) + '" ' + 
                    (entry.screenGlare ? "spiegelnd " : "matt ") + 
                    screenResToText(entry.screenResolution) + " " +
                    (entry.screenTouch ? "touch " : "") +
                    (entry.flip ? "flip " : "" ) +
                    (entry.stylus ? "stylus " : "" ) +
                    (entry.biometricUnlock ? "biometrisch " : "") +
                    "\n";
                screenSizesMap[entry.screenSize] = (entry.screenSize in screenSizesMap ? ++screenSizesMap[entry.screenSize] : 1 );
            }
            entry.ausstattung += 
                entry.memory + " GB RAM " + 
                entry.cpu + " " + cpuToText(entry.cpu) +
                ("extraInfo" in entry ? "\n" + entry.extraInfo + " " : "")
            ;

            if (entry.disabled && entry.disabled === true) {
                debug(`Disabled ${id}`);
                if (debugMode) {
                    entry.ausstattung += "\nNICHT VERFÜGBAR";
                } else {
                    return; // skip disabled unless in debug mode
                }
            }

            result.push(entry);
        } catch(err) {
            console.error(`ERROR loading >${id}<`, entry, err);
        }
    });
    return result;
}

$(document).ready(function(){

    // on-page links implemented via scrolling
    $(document).on("click", ".scroll_to", (event) => {
        var jump = $(event.target).attr('href');
        var new_position = $(jump).offset();
        $('html, body').stop().animate({ scrollTop: new_position.top }, 500);
        event.preventDefault();
    });

    // search links
    $(document).on("click", ".search", (event) => {
        let el = $(event.target);
        let href = el.attr("href");
        let text = el.text();
        setSearch(href != "" ? href : text);
        event.preventDefault();
    });

    // links without a class are external and open a new window
    $('a:not([class])').each(function() {
        let el = $(this);
        let target = $(this).attr("target");
        if (! target) {
            $(this).attr("target", "_blank");
        }
    });

    // h1 get a scroll-to-top button
    $('h1').each(function() {
        $(this).append('<button onclick="$(\'html, body\').stop().animate({ scrollTop: 0 }, 500);return false;" style="float:right;font-size:80%;">⬆</button>');
    });

    // extralinks toggle in table
    $("#chromebooks").on("click", ".extralinks", extraLinkClickHandler);

    var stage2setup = function () {
        search_field = $('#chromebooks_filter input');
        search_field.focus();

        // take state from history API or from URL hash
        let search_term = history.state ? 
            history.state.search : 
            window.location.hash.split('#')[1];
        if (search_term) {
            debug("Restoring saved search", search_term);
            setSearch(search_term);
        }

        dt.on( 'search.dt', function (event) {
            persistSearch(dt.search());
        });

        let search_field_div = search_field.parent();
        search_field_div.append(`, z.B. Geräte mit <a class="search" href="">11,6"</a>, <a class="search" href="">14"</a>, <a class="search" href="">15,6"</a> Bildschirm, mit <a class="search" href="">8 GB</a> RAM, <a class="search" href="">Intel Core</a> CPU, einem <a class="search" href="stylus">Stift</a> oder Updates bis <a class="search" href="">2026</a>`);
 
        $('#AUP_updated').html(`${new Date(data.expiration_timestamp).toLocaleString()}. Insgesamt ${dt.data().count()} Geräte.`);
    }

    function persistSearch(search_term) {
        debug(`Persisting >${search_term}<`);
        if (search_term) {
            if (search_term != last_search_term) {
                debug(`Persisting >${search_term}< to browser`);
                //window.location.hash = encodeURIComponent(search_term);
                history.replaceState(
                    {search:search_term}, 
                    document.title,
                    window.location.pathname + "#" + encodeURI(search_term)
                );
                last_search_term = search_term;
            } else {
                debug("Ignoring repeat persistSearch call for " + search_term);
            }
        } else {
            debug("Clearing search persistance");
            history.replaceState(
                {search:""},
                document.title,
                window.location.pathname
            );
            last_search_term = "";
        }
    };

    function setSearch(search_term) {
        search_term = decodeURIComponent(search_term);
        debug(`Setting search to >${search_term}<`);
        search_field.val(search_term);
        dt.search(search_term, true, false).draw();
        if (search_term) {
            debug("Scrolling to search");
            html_body.stop().animate({ scrollTop: search_field.offset().top }, 500);
        } else {
            debug("setSearch not scrolling to top");
        }
    };

    window.onpopstate = function(event) {
        debug("onpopstate", event.state);
        setSearch(event.state.search);
      };
    
    var loadTableDataFromFirebase = (ajaxData, callback, dtSettings) => {
        // load data from Firebase and call callback with result
        return firebase.database().ref('/').once('value').then((snapshot) => {
            data = snapshot.val();
            dataDump = JSON.stringify(data, null, 2);
            debug("Read data from database:", data);
            let tableData = prepareTableData(data);
            debug("Table data:", tableData);
            return callback({data: tableData});
        });
    };

    dt = $('#chromebooks').DataTable({
        paging: false,
        info: false,
        responsive: true,
        autoWidth: false,
        ajax: loadTableDataFromFirebase,
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
            loadingRecords: "Daten werden geladen...",
        },
        search: {
            smart: false
        },
        initComplete: stage2setup,
    });

    $('#dump').click(function(e) {
        // transform expiration list into list of model by year
        let expirationModelsByYear = {};
        Object.entries(data.expiration).forEach(([id, entry]) => {
            let year = entry.expiration.substr(0,4);
            if (!(year in expirationModelsByYear)) {
                expirationModelsByYear[year] = {};
            }
            expirationModelsByYear[year][id] = true;
        });
        
        // remove listed devices
        Object.entries(data.devices).forEach(([id, entry]) => {
            let expirationId = entry.expirationId;
            if (expirationId in data.expiration) {
                let year = data.expiration[expirationId].expiration.substr(0,4);
                if (expirationId in expirationModelsByYear[year]) {
                    delete expirationModelsByYear[year][expirationId];
                }
            } else {
                debug(`Invalid expiration ID ${expirationId} for ${id}`);
            }
        });
        
        debug("expirationModelsByYear", expirationModelsByYear);

        // add last 3 years to dump output
        let interestingYears = Object.keys(expirationModelsByYear).sort().slice(-3);
        let result = [$("<h1>", { text: "Additional Devices"})];
        interestingYears.forEach((year) => {
            let yearContainer = $("<ul>");
            result.push($("<h2>", {text: `Supported till ${year}`}));
            Object.keys(expirationModelsByYear[year]).forEach((id) => {
                let li = $("<li>")
                li.append($("<a>",{
                    text: id,
                    target: "_blank",
                    href: "https://idealo.de/preisvergleich/MainSearchProductCategory.html?q=" + encodeURI(id),
                    title: `Idealo search for $id`
                }))
                yearContainer.append(li);
            });
            result.push(yearContainer);
        });
        result.push(
            $("<h1>", {text: "Data Dump"}),
            $("<pre>").html(dataDump)
        );
        let dumpElement = $(this);
        let footer = dumpElement.parent().parent();
        dumpElement.remove();
        footer.after($("<div>", {class: "dumpzone", html: result}));
    });
});
