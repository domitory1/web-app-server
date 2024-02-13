const express = require('express');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');


const app = express();

const pool = mysql.createPool({
	host: '127.0.0.1',
	user: 'root',
	password: 'root',
	database: 'webappmenu',
	charset: 'utf8mb4',
	connectionLimit: 10 // max количество соединений в пуле
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

app.use(morgan('dev'));
//app.use(morgan('combined'));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});

pool.getConnection()
	.then(connection => {
		console.log('Connection to MySQL database');
		connection.release();
	})
	.catch(error => {
		console.log('Error connection to MySQL: ', error);
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

app.get('/data/price-list', async (req, res) => {
	const chatId = parseInt(req.query.chatId);
	try {
		const priceList = await queryDatabase('SELECT * FROM `прейскурант`');
		const productsInBasket = await queryDatabase(`SELECT * FROM \`Корзина\` WHERE \`ID чата\` = ${111111111}`)
		const productCategories = await queryDatabase('SELECT * FROM `категории блюд`');

		priceList.forEach(item => {
			if (item.Превью instanceof Buffer) {
				item.Превью = item.Превью.toString('base64');
			}
		});

		let showCase = `<div class='productList'>`;
		
		for (let categoryIndex = 0; categoryIndex < productCategories.length; categoryIndex++) {
			showCase += `<div id=categoryCell_${productCategories[categoryIndex]['ID категории']}>
			<h2 style="margin-left: 10px">${productCategories[categoryIndex]['Лого категории']} ${productCategories[categoryIndex]['Название категории']}</h2>\n
			<div class='list'>`;
			for (let productIndex = 0; productIndex < priceList.length; productIndex++) {
				if (priceList[productIndex]['ID категории'] === productCategories[categoryIndex]['ID категории']) {
					showCase += `<div class='cardProduct' id='${priceList[productIndex]['ID товара']}' onClick=popupShow>
					<picture><img src='data:image/jpeg;base64,${priceList[productIndex]['Превью']}' alt=''></picture>
					<h3 id='nameProduct'>
					${priceList[productIndex]['Название']}
					</h3>\n
					<p id='descriptionProduct'>
					${priceList[productIndex]['Описание']}
					</p>\n
					<div class='buttonSpace'>\n`;
					let Flag = false;
					for (let productIndexInBasket = 0; productIndexInBasket < productsInBasket.length; productIndexInBasket++) {
						if (chatId === productsInBasket[productIndexInBasket]['ID чата'] & priceList[productIndex]['Название'] === productsInBasket[productIndexInBasket]['Название товара']) {
							Flag = true;
							showCase += `<button class="buttonRemove">-</button> <input class="quantity" readonly value = ${productsInBasket[productIndexInBasket]['Количество']}> <button class="buttonAdd">+</button>`;
							break;
						}
					}
					if (!Flag) {
						showCase += `<button class="buttonAddToBasket">${priceList[productIndex]['Стоимость']}</button>`;
					}
					showCase += `</div>\n</div>\n`;
				}
			}
			showCase += `</div>\n</div>\n`;
		}
		
		showCase += `</div>\n`;
		
		res.json(showCase);
	} catch (error) {
		console.error('Error fetching data from MySQL:', error);
		res.status(500).send('Error fetching data from MySQL');
	}
});

app.post('/data/addToBusket', async (req, res) => {
	const { chatId, productName, productQuantity, productPrice } = req.body;
	try {
		const result = await queryDatabase(
			`INSERT INTO корзина (\`ID чата\`, \`Название товара\`, \`Количество\`, \`Стоимость\`) VALUES ('${chatId}', '${productName}', '${productQuantity}', '${productPrice}')`
		);
		res.status(200).json({
			buttonSpace: '<button class="buttonRemove">-</button> <input class="quantity" readonly value = 1> <button class="buttonAdd">+</button>'
		});
	} catch (error) {
		console.error('Error adding item to MySQL:', error);
		res.status(500).send('Error adding item to MySQL');
	}
});

app.post('/data/increaseQuantity', async (req, res) => {
	const { chatId, productName } = req.body;
	try {
		await queryDatabase(
			`UPDATE корзина SET \`Количество\` = \`Количество\` + 1 WHERE \`ID чата\` = ${chatId} AND \`Название товара\` = '${productName}'`
		);
		const quantity = await queryDatabase(`SELECT \`Количество\` FROM \`корзина\` WHERE \`ID чата\` = ${chatId} AND \`Название товара\` = '${productName}'`)
		res.status(200).json({
			quantity: quantity[0]['Количество']
		});
	} catch (error) {
		console.error('Error adding item to MySQL:', error);
		res.status(500).send('Error adding item to MySQL');
	}
});

app.post('/data/reduceNumber', async (req, res) => {
	const { chatId, productName } = req.body;
	try {
		await queryDatabase(
			`UPDATE корзина SET \`Количество\` = if(\`Количество\` != 0, \`Количество\` - 1, 0) WHERE \`ID чата\` = ${chatId} AND \`Название товара\` = '${productName}'`
		);
		const quantity = await queryDatabase(
			`SELECT \`Количество\`, \`Стоимость\` FROM \`корзина\` WHERE \`ID чата\` = ${chatId} AND \`Название товара\` = '${productName}'`
		);
		if (quantity[0]['Количество'] != 0){
			res.status(200).json({
				quantity: quantity[0]['Количество']
			});
		} else {
			await queryDatabase(
				`DELETE FROM \`корзина\` WHERE \`ID чата\` = ${chatId} AND \`Название товара\` = '${productName}'`
			);
			res.status(200).json({
				status: '',
				buttonSpace: `<button class="buttonAddToBasket">${quantity[0]['Стоимость']}</button>`
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