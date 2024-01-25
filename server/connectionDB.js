const express = require('express');
const mysql = require('mysql');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'webappmenu',
  charset: 'utf8mb4'
});

connection.connect((err) => {
	if (err) {
		console.error('Error connecting to MySQL:', err);
		return;
	}
	console.log('Connected to MySQL database');
});

app.get('/data/price-list', async (req, res) => {
	try {
	const results = await queryDatabase('SELECT * FROM `прейскурант`');
	results.forEach(item => {
		if (item.Превью instanceof Buffer) {
			item.Превью = item.Превью.toString('base64');
		}
	});
	res.json(results);
	} catch (error) {
	console.error('Error fetching data from MySQL:', error);
	res.status(500).send('Error fetching data from MySQL');
	}
});

app.get('/data/food-categories', async (req, res) => {
	try {
	  const results = await queryDatabase('SELECT * FROM `категории блюд`');
	  res.json(results);
	} catch (error) {
	  console.error('Error fetching data from MySQL:', error);
	  res.status(500).send('Error fetching data from MySQL');
	}
});

app.listen(3001, () => {
  	console.log('Server running on port 3001');
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

function queryDatabase(sql) {
	return new Promise((resolve, reject) => {
		connection.query(sql, (error, results) => {
			if (error) {
				reject(error);
			} else {
				resolve(results);
			}
		});
	});
 }