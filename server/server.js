const express = require('express');
const morgan = require('morgan');
const { connectDB } = require('./src/DB/connection');
const { routerPriceList, routerProductInBusket, routerAddTBusket, routerIncreaseQuantity, routerReduceNumber, routerOrder, routerMakeOrder } = require('./src/Routers/routers')
const bodyParser = require('body-parser');
const app = express();

app.use(morgan('dev'));
//app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
	next();
});
app.use('/data', routerPriceList);
app.use('/data', routerProductInBusket);
app.use('/data', routerAddTBusket);
app.use('/data', routerIncreaseQuantity);
app.use('/data', routerReduceNumber);
app.use('/data', routerOrder);
app.use('/data', routerOrder)

connectDB();

app.listen(3002, () => {
  	console.log('Server running on port 3002');
});

process.on('SIGINT', () => {
	connection.end((err) => {
		if (err) {
			console.error('Error closing MySQL connection:', err);
		} else {
			console.log('MySQL connection closed');
		}
		process.exit();
	});
});