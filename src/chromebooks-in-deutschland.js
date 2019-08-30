$(document).ready(function(){

    var renderModell = function ( data, type, row ) {
        if ( type === 'display') {
            data = '<a href="' + row.link + '">' + $('<div/>').text(data).html() + '</a>';
        }
        return data;
    };

    var renderAusstattung = function ( data, type, row ) {
        if ( type === 'display') {
            data = $('<div/>').text(data).html().replace(/[\n\r]+/g,"<br>");
        }
        return data;
    };

    var renderPreis = function ( data, type, row ) {
        if ( type === 'display') {
            data = '<a title="Aktualisiert: ' + row.aktualisiert + '">' + $('<div/>').text(data).html() + '</a>';
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

    firebase.database().ref('/data').once('value').then(function(snapshot) {
        var data = snapshot.val();

        $('#chromebooks').DataTable({
            paging: false,
            info: false,
            responsive: true,
            autoWidth: false,
            data: data,
            columns: [
                { 
                    title: "Modell",
                    data: 'modell',
                    render: renderModell,
                },
                {
                    title: "Ausstattung",
                    data: 'ausstattung',
                    render: renderAusstattung,
                },
                {
                    title: "Preis",
                    data: 'preis',
                    render: renderPreis,
                },
                {
                    title: "Updates bis",
                    data: 'updateende'
                },
                {
                    title: "Preis / Monat",
                    data: 'preisMonat'
                },
                {
                    title: "Preis / Jahr",
                    data: 'preisJahr'
                },
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
