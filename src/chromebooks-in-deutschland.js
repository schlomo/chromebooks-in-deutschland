'use strict';

import "./style.css";

import $ from 'jquery';

import select2 from 'select2';
select2($);

import 'datatables.net-dt';
import 'datatables.net-responsive-dt';

import { icons } from "./icons";
import { expirationData, expirationTimestamp } from "./generated/expiration-data";
import { cpus, resolutions } from "./consts";
import deviceData from "./generated/chromebooks.json";

window.cid = {
    deviceData, expirationData
};

console.log(window.cid);

import jtslogo from "./jtslogo.png";

var search_field = undefined;
var last_search_term = undefined;

var used_device_model_select = undefined;
var used_device_price_input = undefined;

const jts_search = '1(2|2,.|3|3,.|4)".*(FHD|2K|3:2).*(Ryzen|Pentium|Core|Snapdragon).*(4|8|10|12)x.*20(27|28|29|3?)';

// take state from history API or from URL hash
const wlhash = window.location.hash.split('#')[1];
const initial_search_term = history.state ?
    history.state.search :
    (wlhash ? decodeURIComponent(wlhash) : undefined);

var dt = undefined;
const html_body = $('html, body');

const epochDate = new Date(0);

let oldestprice = new Date();
let newestprice = new Date(0);
let oldestpriceInactive = new Date();
let newestpriceInactive = new Date(0);

var screenSizesMap = {};
var data = {};

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
    extraLinks: { title: "url"}
  };
*/

var debugMode = window.location.search.includes("debug") || (window.localStorage.getItem("debug") !== null);
if (debugMode) {
    console.log("Enabling & persisting debug mode");
    window.localStorage.setItem("debug", true);
} else {
    window.localStorage.removeItem("debug");
}

if (debugMode) {
    var debug = (...args) => {
        console.log(...args);
    }
} else {
    var debug = (...args) => { };
}

function screenResToText(res) {
    if (res in resolutions) {
        return resolutions[res];
    }
    return res;
}

function toNumber(num) {
    return num.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}


function toEuro(num) {
    return num.toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + "&nbsp;€";
}

function cpuToText(cpu, notfound = "") {
    try {
        if (cpu in cpus) {
            let burstinfo = ("burst" in cpus[cpu] ? `-${cpus[cpu].burst}` : "");
            return `${cpus[cpu].cores}x ${toNumber(cpus[cpu].frequency)}${burstinfo} GHz`;
        } else {
            return notfound;
        }
    } catch (err) {
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
    return document.createElement('div').appendChild(document.createTextNode(text)).parentNode.innerHTML;
}


function getProductLink(entry) {
    let provider = entry.productProvider;
    let id = entry.productId;
    let url = "";
    switch (provider) {
        case "idealo": url = "https://www.idealo.de/preisvergleich/OffersOfProduct/" + id; break;
        case "geizhals": url = "https://geizhals.de/-a" + id + ".html"; break;
        case "metacomp": url = "https://shop.metacomp.de/Shop-DE/Produkt-1_" + id; break;
        default: url = "";
    }
    return url;
}

var extraLinkClickHandler = (event) => {
    let a = $(event.target).closest("a");
    let content = a.closest("td").find(".extralinks-content");
    if (content) {
        content.toggle();
        a.toggleClass("extralinks-open");
    } else {
        console.error("ERROR toggling extra links", event);
    }
    event.preventDefault();
}

var renderModel = function (model, type, row) {
    if (type === 'display') {
        let result = $("<p>").text(model);
        let deviceLinks = [
            $("<a>")
                .attr("href", getProductLink(row))
                .attr("title", `Angebote für ${model}`)
                .attr("target", "_blank")
                .html(icons["mdi-cart-outline"])
                .attr("rel", "external noopener")
        ];
        if (row.specLink && row.specLink.startsWith("http")) {
            deviceLinks.push(
                $("<a>")
                    .attr("href", row.specLink)
                    .attr("title", `Technische Spezifikation für ${model}`)
                    .attr("target", "_blank")
                    .html(icons["mdi-information-outline"])
                    .attr("rel", "external noopener")
            );
        }
        let extraLinksElements = [];
        if (row.extraLinks) {
            deviceLinks.push(
                $("<a>")
                    .attr("href", "")
                    .addClass("extralinks")
                    .attr("title", `Weitere Links für ${model}`)
                    .attr("data-extralinks", JSON.stringify(row.extraLinks))
                    .html(icons["mdi-link"])
            )
            for (const text in row.extraLinks) {
                let url = row.extraLinks[text];
                extraLinksElements.push(`<a href="${url}" target="_blank" rel="external noopener">${text}</a>`);
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
        model = result.html();
    }
    return model;
};

var renderFeatures = function (features, type, row) {
    if (type === 'display') {
        features = encodeEntities(features).replace(/[\n\r]+/g, "<br>");
    }
    return features;
};


function renderZeroPrice(type, row) {
    switch (type) {
        case "display":
            return '<nv title="kein Preis verfügbar' + (row ? ": " + row.priceUpdated.toLocaleString() : "") + '">&circleddash;</nv>';
        case "sort":
            return 9999;
        case "filter":
            return "kein Preis verfügbar";
        default:
            return null;
    }
}

var renderPrice = function (price, type, row) {
    if (price === 0) {
        return renderZeroPrice(type, row);
    } else {
        if (type === 'display') {
            price = '<span title="Aktualisiert: ' + row.priceUpdated.toLocaleString() + '">' + toEuro(price) + '</span>';
        }
        return price;
    }
};

var renderPricePerMonth = function (pricePerMonth, type, row) {
    if (pricePerMonth === 0) {
        return renderZeroPrice(type);
    } else {
        if (type === 'display') {
            pricePerMonth = `<span title="${row.supportMonths} Monate">${toEuro(pricePerMonth)} (${toEuro(pricePerMonth * 12)})</span>`;
        }
        return pricePerMonth;
    }
};

var renderExpiration = function (expiration, type, row) {
    if (type === 'display') {
        expiration = `<span title="${row.expirationId}">${expiration}</span>`;
    } else if (type === "filter") {
        expiration = `${row.expirationId} ${expiration}`;
    }
    return expiration;
};

function calculatePricesFromExpiration(price, expiration) {
    var result = {};
    var now = new Date();
    result.supportMonths = monthDiff(now, new Date(expiration));
    result.pricePerMonth = price / result.supportMonths;
    result.pricePerYear = result.pricePerMonth * 12;
    return result;
}

function getPriceData(rawData, productProvider, productId) {
    if ((productProvider in rawData.priceData) && (productId in rawData.priceData[productProvider])) {
        let [price, priceUpdated] = rawData.priceData[productProvider][productId];
        let priceUpdatedDate = new Date(priceUpdated);
        return [price, priceUpdatedDate];
    } else {
        return [0, epochDate]; // fake data for missing price items
    }
}

function prepareTableData(rawData) {
    let result = [];
    Object.entries(deviceData).forEach(([id, entry]) => {
        try {
            const { expirationId, productProvider, productId } = entry;

            entry = Object.assign({}, entry); // create copy of entry
            // use YYYY-MM from ISO date string as display date, can be improved
            const expirationDate = entry.expirationDate = expirationData[expirationId].expiration
            entry.expiration = entry.expirationDate.substr(0, 7);

            const [price, priceUpdated] = getPriceData(rawData, productProvider, productId);
            if (!(price && price > 0 && price < 9999)) {
                if (price === 0) {
                    debug(`No price for ${id}`);
                } else {
                    throw `Invalid price >${price}<!`;
                }
            }
            entry.price = price;
            entry.priceUpdated = priceUpdated;
            if (priceUpdated > epochDate) {
                if (price > 0) {
                    if (priceUpdated > newestprice) {
                        newestprice = priceUpdated;
                    }
                    if (priceUpdated < oldestprice) {
                        oldestprice = priceUpdated;
                    }
                } else {
                    if (priceUpdated > newestpriceInactive) {
                        newestpriceInactive = priceUpdated;
                    }
                    if (priceUpdated < oldestpriceInactive) {
                        oldestpriceInactive = priceUpdated;
                    }
                }
            }

            Object.assign(entry, calculatePricesFromExpiration(price, expirationDate));

            entry.ausstattung = "";
            if (entry.screenSize > 0) {
                // screen info only for chromebooks, else show type
                entry.ausstattung +=
                    toNumber(entry.screenSize) + '" ' +
                    (entry.screenGlare ? "spiegelnd " : "matt ") +
                    screenResToText(entry.screenResolution) + " " +
                    (entry.screenTouch ? "touch " : "") +
                    (entry.flip ? "flip " : "") +
                    (entry.stylus ? "stylus " : "") +
                    (entry.biometricUnlock ? "biometrisch " : "") +
                    "\n";
                screenSizesMap[entry.screenSize] = (entry.screenSize in screenSizesMap ? ++screenSizesMap[entry.screenSize] : 1);
            }
            entry.ausstattung +=
                entry.memory + " GB RAM " +
                entry.cpu + " " + cpuToText(entry.cpu) +
                ("extraInfo" in entry ? "\n" + entry.extraInfo + " " : "")
                ;

            if (entry.disabled && entry.disabled === true) {
                debug(`Disabled ${id}`);
                if (debugMode) {
                    entry.ausstattung += "\nDISABLED";
                } else {
                    return; // skip disabled unless in debug mode
                }
            }

            result.push(entry);
        } catch (err) {
            console.error(`ERROR loading >${id}<`, entry, err);
        }
    });
    return result;
}

var tableDataFromApi = (rawData) => {
    debug("Read data from database:", rawData);
    data = rawData; // make data globally accessible
    let tableData = prepareTableData(rawData);
    debug("Table data:", tableData);
    return tableData;
};

function persistSearch(search_term) {
    debug(`Persisting >${search_term}<`);
    if (search_term) {
        if (search_term == jts_search) {
            search_term = "jts";
        }
        if (search_term != last_search_term) {
            debug(`Persisting >${search_term}< to browser`);
            history.replaceState(
                { search: search_term },
                document.title,
                // mask * in URL to not confuse WhatsApp
                window.location.pathname + "#" + encodeURI(search_term).replaceAll("*", "%2A")
            );
            last_search_term = search_term;
        } else {
            debug("Ignoring repeat persistSearch call for " + search_term);
        }
    } else {
        debug("Clearing search persistance");
        history.replaceState(
            { search: "" },
            document.title,
            window.location.pathname
        );
        last_search_term = "";
    }
};

function setSearch(search_term) {
    if (search_term.startsWith("#")) {
        search_term = search_term.substr(1); // strip leading #
    }
    debug(`Setting search to >${search_term}<`);
    if (search_term.toLowerCase() == "jts") {
        debug(`Substituting JTS search ${jts_search}`);
        search_term = jts_search;
    }
    try {
        new RegExp(search_term);
        search_field.val(search_term).trigger("input");
        handleJtsInfoBanner(search_term);
        // function search( input [, regex[ , smart[ , caseInsen ]]] ) https://datatables.net/reference/api/search()
        dt.search(search_term, true, false, true).draw();
        if (search_term) {
            debug("Scrolling to search");
            html_body.stop().animate({ scrollTop: search_field.offset().top }, 500);
        } else {
            debug("setSearch not scrolling to top");
        }
    } catch (err) {
        console.error(`Search term >${search_term}< is invalid RegEx: ${err}`);
    }
};

function handleUsedDevice(e) {
    var expirationId = used_device_model_select.val(),
        price = used_device_price_input.val();
    const
        used_device_results = $('#used_device_results'),
        used_device_error = $('#used_device_error'),
        used_device_search_new = $("#used_device_search_new");

    if (expirationId && price) {
        if (expirationId in expirationData) {
            const
                expirationDate = expirationData[expirationId].expiration,
                expirationYearMonth = expirationDate.substr(0, 7),
                { supportMonths, pricePerMonth, pricePerYear } = calculatePricesFromExpiration(price, expirationDate);
            if (pricePerMonth < 0) {
                used_device_error.html(`Das <b>${expirationId}</b> erhält seit <b>${expirationYearMonth} keine</b> Updates mehr!`).show();
                used_device_results.hide();
            } else {
                $('#used_device_aue').text(expirationYearMonth);
                $('#used_price_per_month').html(toEuro(pricePerMonth));
                $('#used_price_per_year').html(toEuro(pricePerYear));
                used_device_error.text("").hide();
                used_device_results.show();
                if (Object.values(deviceData).filter(entry => entry.expirationId == expirationId).length > 0) {
                    used_device_search_new.show()
                        .attr("href", expirationId.replace(/[()]/g, ".")
                        );
                }
            }
        } else {
            used_device_error.text(`Modell ${expirationId} nicht bekannt`).show();
        }
    } else {
        used_device_results.hide();
        used_device_error.text("").hide();
        used_device_search_new.hide();
    }
    e.preventDefault();
}

function showDebugInfo(e) {
    const footer = $("footer");

    // count devices per expiration ID
    let devicesPerExpirationId = {};
    let devicesWithPricePerExpirationId = {};
    Object.values(deviceData).forEach((entry) => {
        const { expirationId, variant } = entry;
        if (expirationId in devicesPerExpirationId) {
            devicesPerExpirationId[expirationId].push(variant);
        } else {
            devicesPerExpirationId[expirationId] = [variant];
            devicesWithPricePerExpirationId[expirationId] = 0;
        }
        const [price, priceUpdated] = getPriceData(data, entry.productProvider, entry.productId);
        if (price > 0) {
            devicesWithPricePerExpirationId[expirationId]++;
        }
    });

    console.log("devicesPerExpirationId", devicesPerExpirationId);
    console.log("devicesWithPricePerExpirationId", devicesWithPricePerExpirationId);

    // transform expiration list into list of model by year
    let expirationModelsByYear = {};
    Object.entries(expirationData).forEach(([id, entry]) => {
        let year = entry.expiration.substr(0, 4);
        if (!(year in expirationModelsByYear)) {
            expirationModelsByYear[year] = {};
        }
        expirationModelsByYear[year][id] =
            (id in devicesPerExpirationId) ?
                devicesPerExpirationId[id].length :
                0;
    });

    console.log("expirationModelsByYear", expirationModelsByYear);

    // add last 4 years to dump output
    let interestingYears = Object.keys(expirationModelsByYear).sort().slice(-4);

    let result = [
        $("<h1>", { text: "Devices" }).append(
            $("<button>", {
                id: "debugToggle",
                css: {
                    float: "right",
                },
                text: `${debugMode ? "Disable" : "Enable"} Debug Mode`,
                click: (event) => {
                    var button = $(event.target);
                    if (debugMode) {
                        window.localStorage.removeItem("debug");
                        debugMode = false;
                    } else {
                        window.localStorage.setItem("debug", true);
                        debugMode = true;
                    }
                    location.reload();
                }
            })
        ),
    ];

    // show table with stats and links for all devices with long run-time
    let table = $("<table>", {
        class: "interestingYears",
        css: {
            width: "100%",

        }
    });
    interestingYears.forEach((year) => {
        let rows = [];
        Object.keys(expirationModelsByYear[year]).sort().forEach((id) => {
            const id_encoded = encodeURI(id);
            let row = `
            <tr>
                <td>
                    ${id}
                    <span style="float:right">
                        ${id in devicesWithPricePerExpirationId ? devicesWithPricePerExpirationId[id] + " /" : ""}
                        ${id in devicesPerExpirationId ?
                    devicesPerExpirationId[id].length : ""}
                    </span>
                </td>
                <td>
                    ${devicesPerExpirationId[id] ?
                    devicesPerExpirationId[id].sort()
                        .join("<br>") :
                    "&circleddash;"}
                </td>
                <td>
                    <a target="_blank" 
                        href="https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${id_encoded}"
                        title="Idealo search for ${id}"
                        rel="external noopener" >
                        Idealo
                    </a>
                </td>
                <td>
                    <a target="_blank" 
                        href="https://geizhals.de/?fs=${id_encoded}"
                        title="Geizhals search for ${id}"
                        rel="external noopener" >
                    Geizhals
                    </a>
                </td>
            </tr>
            `;
            rows.push(row);
        });
        table.append(`
            <thead><tr><td colspan=4>
                <h2>Supported till ${year}</h2>
            </td></tr></thead>`,
            $("<tbody>").append(rows)
        );
    });
    result.push(table);

    footer.after($("<debuginfo>", { html: result }));

    if (e) {
        e.preventDefault();
    }
}

function stage1setup(tableData) {

    $('#chromebooks').DataTable({
        paging: true,
        info: true,
        dom: "frtilp",
        responsive: true,
        autoWidth: false, // responsive needs autoWidth to respond correctly to rotation / screen size changes
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
        order: [[2, "asc"]],
        language: {
            decimal: ",",
            thousands: ".",
            info: "Anzeige _START_ bis _END_ von _TOTAL_ Einträgen",
            infoEmpty: "Keine Einträge",
            infoPostFix: "",
            infoFiltered: "(gefiltert aus insgesamt _MAX_ Einträgen)",
            lengthMenu: "Jeweils _MENU_ Einträge anzeigen",
            paginate: {
                first: "Erste",
                last: "Letzte",
                next: "Nächste",
                previous: "Zurück"
            },
            processing: "Verarbeitung läuft ...",
            searchPlaceholder: "Suchbegriff",
            zeroRecords: "Keine Daten! Bitte ändern Sie Ihren Suchbegriff.",
            emptyTable: "Keine Daten vorhanden",
            aria: {
                sortAscending: ": aktivieren, um Spalte aufsteigend zu sortieren",
                sortDescending: ": aktivieren, um Spalte absteigend zu sortieren"
            },
            search: 'Suche 🔎_INPUT_ in allen Feldern, z.B. Geräte mit <a class="search" href="">11,6"</a>, <a class="search" href="">14"</a>, <a class="search" href="">15,6"</a> Bildschirm, mit <a class="search" href="">8 GB</a> RAM, <a class="search" href="">Intel Core</a> CPU, einem <a class="search" href="stylus">Stift</a> oder Updates bis <a class="search" href="20(27|28|29|30|3?)-">mind. 2027</a>',
            loadingRecords: "Daten werden geladen...",
        },
        search: {
            smart: false,
            regex: true,
        },
        initComplete: stage2setup,
    });

    const oldestpriceDate = oldestprice.toLocaleDateString(),
        newestpriceDate = newestprice.toLocaleDateString();
    const priceDateInfo = (oldestpriceDate == newestpriceDate) ?
        `Preise vom ${newestpriceDate}.` :
        `Preise von ${oldestpriceDate} bis ${newestpriceDate}.`
    $("#notices")
        .append(
            ` ${new Date(expirationTimestamp).toLocaleDateString()}.`,
            " ",
            $("<span>")
                .text(priceDateInfo)
                .attr("title",
                    `€ ${oldestprice.toLocaleString()} - ${newestprice.toLocaleString()}` + "\n" +
                    `⊝ ${oldestpriceInactive.toLocaleString()} - ${newestpriceInactive.toLocaleString()}`
                )
        );

    // used device price calculator
    used_device_model_select = $('#used_device_model')
    .on("change", handleUsedDevice);
    used_device_model_select.append(
        Object.keys(expirationData).map((entry) => {
            return $("<option>").text(entry)
        })).select2();
    used_device_price_input = $('#used_device_price')
        .on("propertychange keyup paste input", handleUsedDevice);

    // on-page links implemented via scrolling
    $(document).on("click", ".scroll_to", (event) => {
        var jump = $(event.target).attr('href');
        scrollToElement(jump);
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
    $('a:not([class])').each(function () {
        let el = $(this);
        let target = el.attr("target");
        if (!target) {
            el.attr("target", "_blank")
                .attr("rel", "external noopener")
        }
    });

    // h1 get a scroll-to-top button
    $('h1').each(function () {
        $(this).append('<button class="scroll_to_top">⬆</button>');
    });

    $(document).on("click", ".scroll_to_top", (event) => {
        $('html, body').stop().animate({ scrollTop: 0 }, 500);
        event.preventDefault();
    });

    // extralinks toggle in table
    $("#chromebooks").on("click", ".extralinks", extraLinkClickHandler);

    window.onpopstate = function (event) {
        debug("onpopstate", event.state);
        if (event.state && "search" in event.state) {
            setSearch(event.state.search);
        }
    };

    if (debugMode) {
        showDebugInfo();
    } else {
        $('#show_debuginfo').one("click", showDebugInfo);
    }
}

function handleJtsInfoBanner(search_term) {
    $("jtsinfo").remove();
    if (search_term == '14".*FHD.*Intel.*202(6|7|8)' ||
        search_term == jts_search
    ) {
        $("#chromebooks_filter").append($("<jtsinfo>").html(
            `<img src="${jtslogo}">` +
            "Diese Auswahl an Chromebooks entspricht der Empfehlung für Schülerlaptops für die JTS."));
    }
}
const searchInputChangedHandler = (event) => {
    var search_term = event.target.value;
    if (search_term.toLowerCase() == "jts") {
        event.target.value = jts_search;
        search_term = jts_search;
    }
    debug(`INPUT changed >${search_term}<`);
    handleJtsInfoBanner(search_term);
};

function stage2setup(settings) {
    dt = settings.oInstance.api();
    search_field = $('#chromebooks_filter input');

    if (initial_search_term) {
        try {
            const linkElements = $(`#${initial_search_term}`);
            const linkElement = linkElements[0];
            if ((linkElement instanceof Element) && ("id" in linkElement)) {
                debug(`Search is actually link element`, linkElement);
                scrollToElement(linkElement);
            } else {
                throw 0;
            }
        } catch {
            debug("Restoring saved search", initial_search_term);
            setSearch(initial_search_term);
        }
    } else {
        // no initial search or link, focus on search input field
        search_field.trigger("focus");
    }

    dt.on('search.dt', function (event) {
        var search_term = dt.search();
        debug(`DT Search Event >${search_term}<`);
        persistSearch(search_term);
    });

    search_field.on("input", searchInputChangedHandler);

    // move "need help" to be visible for searches, too
    const needHelp = $("#needhelp");
    needHelp.remove();
    $("#chromebooks_filter").after(needHelp);
}

function scrollToElement(jump) {
    const el = $(jump),
        new_position = el.offset().top,
        id = el.attr("id");
    if (id) {
        persistSearch(id);
    }
    $('html, body').stop().animate({ scrollTop: new_position }, 500);
}

const apiSettings = {
    url: "api/data",
    cache: true,
    dataType: "json",
    data: initial_search_term ? { search: initial_search_term } : {},
};

$.when(
    $.ajax(apiSettings).then(tableDataFromApi),
    $.ready
).then(stage1setup);




