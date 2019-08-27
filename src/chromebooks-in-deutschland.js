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
        });
    });
});