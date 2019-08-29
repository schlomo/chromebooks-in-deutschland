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

    var stage2setup = function () {
        var search_field = $('#chromebooks_filter input');
        search_field.focus();
        var dt = $('#chromebooks').DataTable();
        var search_term = window.location.hash.split('#')[1];
        if (search_term) {
            dt.search(search_term, false, false).draw();
            search_field.val(search_term);
        }
        search_field.keyup(function() {
            window.location.hash = encodeURIComponent(search_field.val());
        });
    }

    firebase.database().ref('/data').once('value').then(function(snapshot) {
        var data = snapshot.val();

        $('#chromebooks').DataTable({
            paging: false,
            info: false,
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
