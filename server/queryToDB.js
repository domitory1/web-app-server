const express = require('express');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
app.use(morgan('dev'));
//app.use(morgan('combined'));
app.use(bodyParser.json());
app.use((req, res, next) => {
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
	const chatId = parseInt(req.query.chatId);
	try {
		const productCategory = await queryDatabase('SELECT * FROM `категории блюд`');
		const priceList = await queryDatabase('SELECT * FROM `прейскурант`');
		const productInBusket = await queryDatabase(`SELECT * FROM \`Корзина\` WHERE \`ID чата\` = ${chatId}`)
		for (let productIndex = 0; productIndex < priceList.length; productIndex++) {
			for (let productIndexBusket = 0; productIndexBusket < productInBusket.length; productIndexBusket++) {
				if (chatId === productInBusket[productIndexBusket]['ID чата'] && priceList[productIndex]['ID товара'] === productInBusket[productIndexBusket]['ID товара']){
					priceList[productIndex]["Количество"] = `${productInBusket[productIndexBusket]['Количество']}`;
				}
			}
		}

		priceList.forEach(item => {
			if (item.Превью instanceof Buffer) {
				item.Превью = item.Превью.toString('base64');
			}
		});
		res.json([productCategory, priceList]);
	} catch (error) {
		console.error('Error fetching data from MySQL:', error);
		res.status(500).send('Error fetching data from MySQL');
	}
});

app.get('/data/productInBusket', async(req, res) => {
	const chatId = parseInt(req.query.chatId);
	try {
		const productsInBusket = await queryDatabase(`SELECT \`ID товара\`, \`Количество\` FROM \`корзина\` WHERE \`ID чата\` = ${chatId}`);
		const result = await queryDatabase(`SELECT * FROM \`прейскурант\` WHERE \`ID товара\` IN (${productsInBusket.map(item => item['ID товара'])})`);
		for (let i=0; i < productsInBusket.length; i++) {
			for (let j=0; j < result.length; j++) {
				if (productsInBusket[i]['ID товара'] === result[j]['ID товара']) {
					result[j]['Количество'] = productsInBusket[i]['Количество'];
				}
			}
		}
		result.forEach(item => {
			if (item.Превью instanceof Buffer) {
				item.Превью = item.Превью.toString('base64');
			}
		});
		res.json(result);
	} catch (error) {
		console.error('Error fetching data from MySQL:', error);
		res.status(500).send('Error fetching data from MySQL');
	}
})

app.post('/data/addToBusket', async (req, res) => {
	const { chatId, productId, productQuantity } = req.body;
	try {
		const result = await queryDatabase(
			`INSERT INTO корзина (\`ID чата\`, \`ID товара\`, \`Количество\`) VALUES ('${chatId}', '${productId}', '${productQuantity}')`
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
	const { chatId, productId } = req.body;
	try {
		await queryDatabase(
			`UPDATE корзина SET \`Количество\` = \`Количество\` + 1 WHERE \`ID чата\` = ${chatId} AND \`ID товара\` = '${productId}'`
		);
		const quantity = await queryDatabase(`SELECT \`Количество\` FROM \`корзина\` WHERE \`ID чата\` = ${chatId} AND \`ID товара\` = '${productId}'`)
		res.status(200).json({
			quantity: quantity[0]['Количество']
		});
	} catch (error) {
		console.error('Error adding item to MySQL:', error);
		res.status(500).send('Error adding item to MySQL');
	}
});

app.post('/data/reduceNumber', async (req, res) => {
	const { chatId, productId } = req.body;
	try {
		await queryDatabase(
			`UPDATE корзина SET \`Количество\` = if(\`Количество\` != 0, \`Количество\` - 1, 0) WHERE \`ID чата\` = ${chatId} AND \`ID товара\` = '${productId}'`
		);
		const quantity = await queryDatabase(
			`SELECT \`Количество\` FROM \`корзина\` WHERE \`ID чата\` = ${chatId} AND \`ID товара\` = '${productId}'`
		);
		if (quantity[0]['Количество'] != 0){
			res.status(200).json({
				quantity: quantity[0]['Количество']
			});
		} else {
			await queryDatabase(
				`DELETE FROM \`корзина\` WHERE \`ID чата\` = ${chatId} AND \`ID товара\` = '${productId}'`
			);
			const price = await queryDatabase(
				`SELECT \`Стоимость\` FROM \`прейскурант\` WHERE  \`ID товара\` = '${productId}'`
			);
			res.status(200).json({
				contentButtonSpace: `<button class="buttonAddToBusket">${price[0]['Стоимость']} ₽</button>`
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