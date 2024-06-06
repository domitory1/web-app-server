const express = require('express');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
app.use(morgan('dev'));
//app.use(morgan('combined'));
app.use(bodyParser.json());
app.use((req, res, next) => {
	// Разрешаем все источники (*)
    res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const pool = mysql.createPool({
	host: '127.0.0.1',
	user: 'root',
	password: 'root',
	database: 'webappmenu',
	charset: 'utf8mb4',
	connectionLimit: 10
});

const queryDatabase = async (query) => {
	const connection = await pool.getConnection();
	try {
		const [rows] = await connection.query(query);
		return rows;
	} finally {
		connection.release();
	}
}

pool.getConnection()
	.then(connection => {
		console.log('Connection to MySQL database');
		connection.release();
	})
	.catch(error => {
		console.log('Error connection to MySQL: ', error);
	});

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/data/price-list', async (req, res) => {
	const userId = parseInt(req.query.userId);
	try {
		const productCategory = await queryDatabase('SELECT * FROM `categories`');
		const priceList = await queryDatabase('SELECT * FROM `pricelist`');
		const productInBusket = await queryDatabase(`SELECT * FROM \`busket\` WHERE \`UserId\` = ${userId}`)
		for (let productIndex = 0; productIndex < priceList.length; productIndex++) {
			for (let productIndexBusket = 0; productIndexBusket < productInBusket.length; productIndexBusket++) {
				if (userId === productInBusket[productIndexBusket]['UserId'] && priceList[productIndex]['ProductId'] === productInBusket[productIndexBusket]['ProductId']){
					priceList[productIndex]["Quantity"] = `${productInBusket[productIndexBusket]['Quantity']}`;
				}
			}
		}
		priceList.forEach(item => {
			if (item.ProductPhoto instanceof Buffer) {
				item.ProductPhoto = item.ProductPhoto.toString('base64');
			}
		});
		res.json([productCategory, priceList]);
	} catch (error) {
		console.error('Error fetching data from MySQL:', error);
		res.status(500).send('Error fetching data from MySQL');
	}
});

app.get('/data/productInBusket', async(req, res) => {
	const userId = parseInt(req.query.userId);
	try {
		const productsInBusket = await queryDatabase(`SELECT \`ProductId\`, \`Quantity\` FROM \`busket\` WHERE \`UserId\` = ${userId}`);
		if (productsInBusket.length > 0) {
			const result = await queryDatabase(`SELECT * FROM \`pricelist\` WHERE \`ProductId\` IN (${productsInBusket.map(item => item['ProductId'])})`);
			for (let i=0; i < productsInBusket.length; i++) {
				for (let j=0; j < result.length; j++) {
					if (productsInBusket[i]['ProductId'] === result[j]['ProductId']) {
						result[j]['Quantity'] = productsInBusket[i]['Quantity'];
					}
				}
			}
			result.forEach(item => {
				if (item.ProductPhoto instanceof Buffer) {
					item.ProductPhoto = item.ProductPhoto.toString('base64');
				}
			});
			res.status(200).json(result);
		} else {
			res.status(200).json([]);
		}
		
	} catch (error) {
		console.error('Error fetching data from MySQL:', error);
		res.status(500).send('Error fetching data from MySQL');
	}
})

app.post('/data/addToBusket', async (req, res) => {
	const { userId, productId, productQuantity } = req.body;
	try {
		const result = await queryDatabase(
			`INSERT INTO busket (\`UserId\`, \`ProductId\`, \`Quantity\`) VALUES ('${userId}', '${productId}', '${productQuantity}')`
		);
		res.status(200).json({
			contentButtonSpace: '<button class="buttonReduce">-</button> <input class="quantity" readonly value = 1> <button class="buttonIncrease">+</button>'
		});
	} catch (error) {
		console.error('Error adding item to MySQL:', error);
		res.status(500).send('Error adding item to MySQL');
	}
});

app.post('/data/increaseQuantity', async (req, res) => {
	const { userId, productId } = req.body;
	try {
		await queryDatabase(
			`UPDATE busket SET \`Quantity\` = \`Quantity\` + 1 WHERE \`UserId\` = ${userId} AND \`ProductId\` = '${productId}'`
		);
		const quantity = await queryDatabase(`SELECT \`Quantity\` FROM \`busket\` WHERE \`UserId\` = ${userId} AND \`ProductId\` = '${productId}'`)
		res.status(200).json({
			quantity: quantity[0]['Quantity']
		});
	} catch (error) {
		console.error('Error adding item to MySQL:', error);
		res.status(500).send('Error adding item to MySQL');
	}
});

app.post('/data/reduceNumber', async (req, res) => {
	const { userId, productId } = req.body;
	try {
		await queryDatabase(
			`UPDATE busket SET \`Quantity\` = if(\`Quantity\` != 0, \`Quantity\` - 1, 0) WHERE \`UserId\` = ${userId} AND \`ProductId\` = '${productId}'`
		);
		const quantity = await queryDatabase(
			`SELECT \`Quantity\` FROM \`busket\` WHERE \`UserId\` = ${userId} AND \`ProductId\` = '${productId}'`
		);
		if (quantity[0]['Quantity'] != 0){
			res.status(200).json({
				quantity: quantity[0]['Quantity']
			});
		} else {
			await queryDatabase(
				`DELETE FROM \`busket\` WHERE \`UserId\` = ${userId} AND \`ProductId\` = '${productId}'`
			);
			const price = await queryDatabase(
				`SELECT \`ProductPrice\` FROM \`pricelist\` WHERE  \`ProductId\` = '${productId}'`
			);
			res.status(200).json({
				contentButtonSpace: `<button class="buttonAddToBusket">${price[0]['ProductPrice']} ₽</button>`
			});
		}

	} catch (error) {
		console.error('Error adding item to MySQL:', error);
		res.status(500).send('Error adding item to MySQL');
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