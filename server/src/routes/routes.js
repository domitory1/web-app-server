const express = require('express');
const router = express.Router();
const authentificateToken = require('../JWT/verifyToken');
const queryDataBase = require('../DB/connection');

function convert(list) {
    list.forEach(row => {
        if (row.ProductPhoto instanceof Buffer) {
            row.ProductPhoto = row.ProductPhoto.toString('base64');
        }
    })
    return list;
}

router.get('/priceList', authentificateToken, async(req, res) => {
    const userId =req.jwt.user['id'];
    let productCategory;
    let productsMenu;

    try {
        productCategory = await queryDataBase(`SELECT * FROM categories`);
        productsMenu = await queryDataBase(`SELECT p.*, b.Quantity 
                                        FROM priceList p 
                                        LEFT JOIN busket b ON p.ProductId = m.ProductId 
                                        WHERE b.UserId = ? 
                                        UNION 
                                        SELECT p.*, b.Quantity 
                                        FROM priceList p 
                                        LEFT JOIN busket b ON p.ProductId = b.ProductId 
                                        WHERE b.ProductId IS NULL`, [userId]);
    } catch (error) {
        console.error('Error fetching data from MySQL:', error);

        return res.status(500).json({err: 'Ой-ой, кажется, наш сервер решил устроить себе небольшой перерывчик' +
                                    'на кофе! Он так старательно собирал информацию о ваших любимых блюдах, что немного перестарался. ' +
                                    'Обещаем, что наш трудоголик скоро вернется к работе, полный сил и энтузиазма!'})
    }

    productsMenu = convert(productsMenu);

    return res.status(200).json([productCategory, productsMenu]);
})

router.get('/productInBusket', authentificateToken, async(req, res) => {
    const userId = req.jwt.user['id'];
    let productsBusket;

    try {
        productsBusket = await queryDataBase(`SELECT p.*, b.Quantity
                                                    FROM priceList p
                                                    LEFT JOIN busket b ON p.ProductId = b.ProductId
                                                    WHERE b.UserId = ?`, [userId]) 
    } catch (error) {
        console.error('Error fetching data from MySQL:', error);

        return res.status(500).json({err: 'Ой-ой, кажется, наш сервер решил устроить себе небольшой перерывчик' +
                                    'на кофе! Он так старательно собирал информацию о ваших любимых блюдах, что немного перестарался. ' +
                                    'Обещаем, что наш трудоголик скоро вернется к работе, полный сил и энтузиазма!'})
    }

    if (productsBusket.lenght > 0) {
        productsBusket = convert(productsBusket);
        return res.status(200).json(productsBusket)
    } else {
        return res.status(200).json([]);
    }
})

router.post('/addToBusket', authentificateToken, async(req, res) => {
    const userId = req.jwt.user['id'];
    const productId = req.body['productId'];

    try {
        await queryDataBase(`INSERT INTO busket (UserId, ProductId, Quantity) VALUES ('?', '?', 1)`, [userId, productId]);
    } catch(error) {
        console.log('Error adding item to MySQL:', error);
        
        return res.status(500).json({err: 'Ой-ой, кажется, наш сервер решил устроить себе небольшой перерывчик' +
                                        'на кофе! Он так старательно собирал информацию о ваших любимых блюдах, что немного перестарался. ' +
                                        'Обещаем, что наш трудоголик скоро вернется к работе, полный сил и энтузиазма!'})
    }

    return res.sendStatus(200);
})

router.post('/increaseQuantity', authentificateToken, async(req, res) => {
    const userId = req.jwt.user['id'];
    const productId = req.body['productId']
    let quantity;

    try {
        await queryDataBase(`UPDATE busket SET Quantity = Quantity + 1 WHERE UserId = ? AND ProductId = ?`, [userId, productId]);
        quantity = await queryDataBase(`SELECT Quantity FROM busket WHERE UserId = ? AND ProductId = ?`, [userId, productId])
    } catch (error) {
        console.error('Error increase quantity to MySQL:', error)
        return res.status(500).json({err: 'Ой-ой, кажется, наш сервер решил устроить себе небольшой перерывчик' +
            'на кофе! Он так старательно добавлял блюда в корзину, что немного перестарался. ' +
            'Обещаем, что наш трудоголик скоро вернется к работе, полный сил и энтузиазма!'})
    }

    return res.status(200).json({quantity: quantity});
})

router.post('/resuceNumber', authentificateToken, async(req, res) => {
    const userId = req.jwt.user['id'];
    const productId = req.body['productId'];
    let quantity;

    try {
        await queryDataBase(`UPDATE busket 
            SET Quantity = if(Quantity != 0, Quantity - 1, 0) 
            WHERE UserId = ? AND ProductId = ?`, [userId, productId]);
        quantity = await queryDataBase(`SELECT Quantity 
                                        FROM busket 
                                        WHERE UserId = ? AND ProductId = ?`, [userId, productId]);
    } catch(error) {
        console.error('Error reduce quantity to MySQL:', error);
		return res.status(500).send({err: 'Ой-ой, кажется, наш сервер решил устроить себе'+
                                    'небольшой перерывчик на кофе! Он так старательно убирал блюда из корзины,'+
                                    ' что немного перестарался. Обещаем, что наш трудоголик скоро вернется к работе, '+
                                    'полный сил и энтузиазма!'});
    }

    if (quantity[0]['Quantity'] == 0) {
        let price
        try {
            await queryDataBase(`DELETE FROM busket 
                WHERE UserId = ? AND ProductId = ?`, [userId, productId]);
            price = await queryDataBase(`SELECT ProductPrice
                                        FROM  priceList
                                        WHERE ProductId = ?`, [productId]);
        } catch (error) {
            console.error('Error reduce quantity to MySQL:', error);
		    return res.status(500).send({err: 'Ой-ой, кажется, наш сервер решил устроить себе'+
                                        'небольшой перерывчик на кофе! Он так старательно убирал блюда из корзины,'+
                                        ' что немного перестарался. Обещаем, что наш трудоголик скоро вернется к работе, '+
                                        'полный сил и энтузиазма!'});
        }
        return res.status(200).json({price: price});
    } else {
        return res.status(200).json({quantity: quantity[0]['Quantity']})
    }
})

router.get('/order', authentificateToken, async(req, res) => {
    const userId = req.jwt.user['id'];
    const hour = req['_startTime'].getHour();
    const minutes = req['_startTime'].getMinutes();

    if (hour < 8 && minutes < 30 || hour > 17 && minutes > 30) {
        return res.status(503).send("Сервер спит после тяжелого рабочего дня.\nПопробуйте еще раз в рабочее время");
    }

    let data;

    try {
        data = await queryDataBase(`SELECT p.ProductPrice, b.Quantity 
            FROM priceList p JOIN busket b ON p.ProductId = b.ProductId 
            WHERE b.UserId = ?`, [userId]);
    } catch (error) {
        console.error('Error get order to MySQL:', error);
        res.status(500).json({err: "Ой, что-то пошло не так"})
    }
    

    const arrayPrice = data.map(dataRow => {
        return dataRow['ProductPrice'] * dataRow['Quantity'];
    })

    const totalPrice = arrayPrice.reduce((partialSum, a) => partialSum + a, 0);

    res.status(200).json({totalPrice: totalPrice});
})

module.exports = router; 