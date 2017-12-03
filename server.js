var mysql = require('mysql')
// Let’s make node/socketio listen on port 3000
/*var io = require('socket.io')
io = io.listen(3000, function(err){
    console.log("error thrown:" + err)
})*/
//console.log(__dirname)
/*var server = require('http').createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(res.sendFile(__dirname));
});
var io = require('socket.io')(server);

server.listen(3000);*/
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
io.on('connection', function(){ /* … */ });
server.listen(3000);

//var express = app();
//app.use(express.static(__dirname, { index: 'index.html' }));
app.use(express.static('public'))

app.get('/', function(req, res){
    res.render('index.html');
});

app.listen(process.env.PORT);
// Define our db creds
var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'socketstest'
})
 
// Log any errors connected to the db
db.connect(function(err){
    if (err) {console.log(err)}
    else {console.log("connected")}
})
 
// Define/initialize our global vars
var notes = []
var isInitNotes = false
var socketCount = 0
 
io.sockets.on('connection', function(socket){
    // Socket has connected, increase socket count
    socketCount++
    // Let all sockets know how many are connected
    io.sockets.emit('users connected', socketCount)
 
    socket.on('disconnect', function() {
        // Decrease the socket count on a disconnect, emit
        socketCount--
        io.sockets.emit('users connected', socketCount)
    })
 
    socket.on('new note', function(data){
        // New note added, push to all sockets and insert into db
        notes.push(data)
        io.sockets.emit('new note', data)
        // Use node's db injection format to filter incoming data
        db.query('INSERT INTO notes (note) VALUES (?)', data.note)
    })

    function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
    }

    function getlatlong(airport) {
        db.query('SELECT * FROM socketstest.airports WHERE Code = (?)', airport)
        .on('result', function(port){
                // Push results onto the array of flights   
                console.log(port.lat)
                toreturn = {lat: port.lat, lon: port.long} 
                console.log(toreturn)
                return toreturn
            })
    }

    socket.on('max price', function(data){
        // New note added, push to all sockets and insert into db
        max = Math.round(data.amt)
        var flights = []
        var airports = {}
        airportdata = getlatlong(data.loc)
        console.log(airportdata)
        airports[data.loc] = airportdata
        console.log(airports)
        // Filter all flights by the maximum price
        db.query('SELECT * FROM socketstest.LowestFares WHERE (DollarFare + DollarTax) < (?) AND Origin = (?) Order BY DollarFare ASC', [max, data.loc])
            .on('result', function(flight){
                // Push results onto the array of flights
                dest_code = flight.Destination;
                //console.log(dest_code);
                if (contains(dest_code, airports)) {
                    flights.push(flight.push(airports[dest_code]))
                } 
            })
            .on('end', function(){
                // Only emit flights after query has been completed
                socket.emit('we got da flights!', flights)
            })
    })
 
    // Check to see if initial query/notes are set
    if (! isInitNotes) {
        // Initial app start, run db query
        db.query('SELECT * FROM notes')
            .on('result', function(data){
                // Push results onto the notes array
                notes.push(data)
            })
            .on('end', function(){
                // Only emit notes after query has been completed
                socket.emit('initial notes', notes)
            })
 
        isInitNotes = true
    } else {
        // Initial notes already exist, send out
        socket.emit('initial notes', notes)
    }
})